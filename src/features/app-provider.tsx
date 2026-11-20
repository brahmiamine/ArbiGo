'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage } from '@/domain/errors';
import {
  initialNavigation,
  readNavigation,
  resolveNavigation,
  navigationSearch,
  type AppNavigation,
  type Tab,
} from '@/lib/navigation';
import { operationBatch } from '@/lib/operation-batch';
import { LocalStore } from '@/lib/local-store';
import { api, ApiError } from '@/lib/api';
import { createMatch, requiresCheckout } from '@/domain/match';
import { templates } from '@/domain/templates';
import { defaultEquipment, upgradeInventory, INVENTORY_CATALOG_VERSION } from '@/domain/equipment';
import { mergePreferences, type ProfilePatch, type ProfilePreferences } from '@/domain/profile';
import { signOut } from 'next-auth/react';
import type { Match, MatchInput, Inventory, OperationInput } from '@/domain/types';
interface Profile {
  id: string;
  name: string;
  email: string;
  preferences: ProfilePreferences;
  vapidPublicKey: string;
}
interface AppContextType {
  matches: Match[];
  inventory: Inventory;
  profile: Profile | null;
  deviceId: string;
  ready: boolean;
  online: boolean;
  pending: number;
  error: string;
  setError: (s: string) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  matchFilter: AppNavigation['matchFilter'];
  setMatchFilter: (v: AppNavigation['matchFilter']) => void;
  matchView: AppNavigation['matchView'];
  setMatchView: (v: AppNavigation['matchView']) => void;
  activeId: string | null;
  setActiveId: (s: string | null) => void;
  demo: boolean;
  conflicts: Awaited<ReturnType<LocalStore['conflicts']>>;
  dispatch: (id: string, a: OperationInput) => Promise<void>;
  create: (i: MatchInput) => Promise<Match>;
  saveInventory: (v: Inventory) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  sync: () => Promise<void>;
  transfer: (m: Match) => Promise<void>;
  resolve: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  store: LocalStore | null;
  refresh: () => Promise<void>;
}
const AppContext = createContext<AppContextType | null>(null);
export function useApp() {
  const v = useContext(AppContext);
  if (!v) throw new Error('APP_CONTEXT');
  return v;
}
export function AppProvider({ children, demo = false }: { children: ReactNode; demo?: boolean }) {
  const router = useRouter();
  const profileRef = useRef<Profile | null>(null);
  const profileWrites = useRef<Promise<void>>(Promise.resolve());
  const loggingOut = useRef(false);
  const profileEpoch = useRef(0);
  const [localStore, setLocalStore] = useState<LocalStore | null>(null);
  const [matches, setMatches] = useState<Match[]>([]),
    [inventory, setInventory] = useState<Inventory>({ equipment: [], outfits: [] }),
    [profile, setProfile] = useState<Profile | null>(null),
    [ready, setReady] = useState(false),
    [online, setOnline] = useState(true),
    [pending, setPending] = useState(0),
    [error, setError] = useState(''),
    [deviceId, setDeviceId] = useState(''),
    [conflicts, setConflicts] = useState<AppContextType['conflicts']>([]);
  const [navigation, setNavigation] = useState<AppNavigation>(initialNavigation);
  const { tab, activeId, matchView, matchFilter } = navigation;
  const matchesRef = useRef<Match[]>([]);
  const replaceNavigation = useRef(false);
  const setTab = (tab: Tab) => {
    const next: AppNavigation = { ...navigation, tab, activeId: null, matchView: 'summary' };
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.delete('quiz');
    if (tab === 'quiz') params.set('quiz', 'home');
    const search = navigationSearch(next, params.toString());
    if (search !== window.location.search)
      window.history.pushState(null, '', `${url.pathname}${search}${url.hash}`);
    setNavigation(next);
    if (tab === 'quiz') window.dispatchEvent(new Event('arbigo:quiz-home'));
  };
  const setActiveId = (id: string | null) =>
    setNavigation((n) => {
      const match = matchesRef.current.find((m) => m.id === id);
      return {
        ...n,
        activeId: id,
        matchView: 'summary',
        ...(id
          ? {
              tab: 'matches' as const,
              matchFilter:
                match && !['DRAFT', 'ACTIVE'].includes(match.status)
                  ? ('history' as const)
                  : ('upcoming' as const),
            }
          : {}),
      };
    });
  const setMatchFilter = (matchFilter: AppNavigation['matchFilter']) =>
    setNavigation((n) => ({ ...n, matchFilter }));
  const setMatchView = (matchView: AppNavigation['matchView']) =>
    setNavigation((n) => ({ ...n, matchView }));
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    const search = navigationSearch(navigation, url.search);
    if (search !== url.search) {
      const method = replaceNavigation.current ? 'replaceState' : 'pushState';
      window.history[method](null, '', `${url.pathname}${search}${url.hash}`);
    }
    replaceNavigation.current = false;
  }, [navigation, ready]);
  useEffect(() => {
    if (!ready) return;
    const restore = () => {
      replaceNavigation.current = true;
      setNavigation(resolveNavigation(readNavigation(window.location.search), matchesRef.current));
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [ready]);
  const storeRef = useRef<LocalStore | null>(null),
    syncing = useRef(false),
    demoRef = useRef(demo);
  const refresh = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return;
    const ms = await store.matches();
    matchesRef.current = ms;
    setMatches(ms.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)));
    setInventory((await store.inventory()) ?? { equipment: [], outfits: [] });
    setPending((await store.pending()).length);
    setConflicts(await store.conflicts());
    const active = ms.find((m) => m.status === 'ACTIVE' || requiresCheckout(m));
    if (active)
      setNavigation((n) =>
        n.activeId === active.id
          ? n
          : { ...n, tab: 'matches', activeId: active.id, matchView: 'summary' },
      );
  }, []);
  const sync = useCallback(async () => {
    if (syncing.current || !storeRef.current || !navigator.onLine) return;
    syncing.current = true;
    try {
      const store = storeRef.current;
      while (navigator.onLine) {
        const queue = await store.pending();
        const blocked = new Set((await store.conflicts()).map((q) => q.operation.matchId));
        const operations = operationBatch(queue.filter((op) => !blocked.has(op.matchId)));
        if (!operations.length) break;
        let interrupted = false;
        if (demoRef.current) {
          for (const op of operations) {
            const m = (await store.matches()).find((m) => m.id === op.matchId)!;
            await store.acknowledge(op.id, m);
          }
        } else {
          const { results } = await api<{
            results: { id: string; status: string; reason?: string; match?: Match }[];
          }>('sync/batch', 'POST', { operations });
          interrupted = results.length !== operations.length;
          for (const result of results) {
            if (result.status === 'APPLIED' && result.match)
              await store.acknowledge(result.id, result.match);
            else {
              interrupted = true;
              await store.markConflict(
                result.id,
                result.reason ?? 'VERSION_CONFLICT',
                result.match,
              );
              setError(
                'Une action nécessite une résolution dans votre profil. Elle reste conservée sur cet appareil.',
              );
            }
          }
        }
        await refresh();
        if (interrupted) break;
      }
      await refresh();
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
    } finally {
      syncing.current = false;
    }
  }, [refresh]);
  useEffect(() => {
    let canceled = false;
    async function init() {
      try {
        let p: Profile;
        if (demo) {
          p = {
            id: 'demo',
            name: 'Amine',
            email: 'demo@arbigo.local',
            preferences: {
              soundEnabled: true,
              pushEnabled: false,
              timezone: 'Europe/Paris',
              locale: 'fr',
            },
            vapidPublicKey: '',
          };
          try {
            const saved = JSON.parse(localStorage.getItem('arbigo:demo-profile') ?? 'null');
            if (saved?.id === 'demo') p = saved;
          } catch {}
        } else if (navigator.onLine) {
          p = await api<Profile>('me');
          localStorage.setItem('arbigo:identity', JSON.stringify(p));
        } else {
          const cached = localStorage.getItem('arbigo:identity');
          if (!cached) {
            router.replace('/auth/login');
            return;
          }
          p = JSON.parse(cached);
        }
        const deviceKey = `arbigo:device:${p.id}`;
        let did = localStorage.getItem(deviceKey);
        if (!did) {
          did = crypto.randomUUID();
          localStorage.setItem(deviceKey, did);
        }
        setDeviceId(did);
        if (!demo && navigator.onLine)
          await api('devices', 'POST', {
            id: did,
            label: /Android|iPhone/.test(navigator.userAgent) ? 'Mon téléphone' : 'Mon navigateur',
          });
        const store = new LocalStore(p.id);
        storeRef.current = store;
        setLocalStore(store);
        if (demo && !(await store.matches()).length) {
          const inv = {
            equipment: defaultEquipment(),
            catalogVersion: INVENTORY_CATALOG_VERSION,
            outfits: [],
          };
          await store.putInventory(inv);
          const date = new Date();
          date.setDate(date.getDate() + ((7 - date.getDay()) % 7 || 7));
          date.setHours(15, 0, 0, 0);
          const m = createMatch(
            {
              homeTeam: 'Paris 13 Atletico',
              awayTeam: 'FC Belleville',
              practice: 'FOOT_11',
              kickoffAt: date.toISOString(),
              timezone: 'Europe/Paris',
              stadium: 'Stade Charléty',
              competition: 'Championnat D4',
              category: 'Seniors',
            },
            inv.equipment,
            templates.FOOT_11,
            undefined,
            p.preferences.steps,
          );
          m.outfits = inv.outfits;
          await store.putMatch(m);
        }
        if (!demo && navigator.onLine) {
          const b = await api<{ matches: Match[]; inventory: Inventory }>('sync/bootstrap');
          await store.bootstrap(b.matches);
          await store.putInventory(b.inventory);
          const photos = new Set(
            [...b.inventory.equipment, ...b.matches.flatMap((m) => m.bag)].flatMap((i) =>
              i.photoId ? [i.photoId] : [],
            ),
          );
          for (const match of b.matches) {
            if (match.homeLogoId) photos.add(match.homeLogoId);
            if (match.awayLogoId) photos.add(match.awayLogoId);
          }
          for (const id of photos) void store.media(id).catch(() => {});
        }
        if (p.preferences.avatarPhotoId)
          void store.media(p.preferences.avatarPhotoId).catch(() => {});
        const storedInventory = await store.inventory();
        if (storedInventory) await store.putInventory(upgradeInventory(storedInventory));
        if (canceled) return;
        if (localStorage.getItem(`arbigo:mute:${p.id}`) === null)
          localStorage.setItem(`arbigo:mute:${p.id}`, String(!p.preferences.soundEnabled));
        profileRef.current = p;
        setProfile(p);
        setOnline(navigator.onLine);
        await refresh();
        replaceNavigation.current = true;
        setNavigation(
          resolveNavigation(readNavigation(window.location.search), matchesRef.current),
        );
        setReady(true);
        void sync();
        if ('serviceWorker' in navigator) await navigator.serviceWorker.register('/sw.js');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'UNAUTHORIZED') {
          localStorage.removeItem('arbigo:identity');
          router.replace('/auth/login');
          return;
        }
        setError(e instanceof Error ? e.message : 'Impossible de charger vos données.');
        setReady(true);
      }
    }
    void init();
    const onOnline = () => {
        setOnline(true);
        void sync();
      },
      onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const interval = setInterval(() => void sync(), 15000);
    return () => {
      canceled = true;
      profileEpoch.current += 1;
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [demo, refresh, sync, router]);
  const dispatch = async (id: string, a: OperationInput) => {
    try {
      if (!storeRef.current) return;
      await storeRef.current.dispatch(id, deviceId, a);
      await refresh();
      void sync();
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  };
  const create = async (input: MatchInput) => {
    if (!storeRef.current) throw new Error('NOT_READY');
    if (!navigator.onLine && !demo)
      throw new Error('La création d’un match nécessite une connexion.');
    const m = demo
      ? createMatch(
          input,
          inventory.equipment,
          templates[input.practice],
          undefined,
          profileRef.current?.preferences.steps,
        )
      : await api<Match>('matches', 'POST', input);
    if (demo) m.outfits = structuredClone(inventory.outfits);
    await storeRef.current.putMatch(m);
    await refresh();
    return m;
  };
  const saveInventory = async (inv: Inventory) => {
    const current = upgradeInventory(inv);
    const saved = !demo ? await api<Inventory>('inventory', 'PUT', current) : current;
    await storeRef.current!.putInventory(saved);
    setInventory(saved);
  };
  const updateProfile = (patch: ProfilePatch) => {
    if (loggingOut.current) return Promise.reject(new Error('La déconnexion est en cours.'));
    const epoch = profileEpoch.current;
    const write = profileWrites.current.then(async () => {
      const current = profileRef.current;
      if (!current) throw new Error('NOT_READY');
      if (!demo && !navigator.onLine) throw new Error('Connectez-vous pour modifier votre profil.');
      const next: Profile = demo
        ? {
            ...current,
            ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
            preferences: mergePreferences(current.preferences, patch.preferences),
          }
        : await api<Profile>('me', 'PATCH', patch);
      if (epoch !== profileEpoch.current) return;
      localStorage.setItem(demo ? 'arbigo:demo-profile' : 'arbigo:identity', JSON.stringify(next));
      profileRef.current = next;
      setProfile(next);
      if (next.preferences.avatarPhotoId)
        void storeRef.current?.media(next.preferences.avatarPhotoId).catch(() => {});
    });
    profileWrites.current = write.catch(() => {});
    return write;
  };
  const transfer = async (m: Match) => {
    if ((await storeRef.current!.pending()).some((o) => o.matchId === m.id))
      throw new Error('Résolvez les actions locales avant de transférer.');
    const next = await api<Match>(`tunnels/${m.id}/transfer`, 'POST', {
      deviceId,
      expectedVersion: m.version,
    });
    await storeRef.current!.putMatch(next);
    await refresh();
  };
  const resolve = async (id: string) => {
    const m = await api<Match>(`matches/${id}`);
    await storeRef.current!.adoptServer(m);
    setActiveId(m.status === 'ACTIVE' ? m.id : null);
    await refresh();
  };
  const logout = async () => {
    if (pending) throw new Error('Synchronisez ou résolvez vos actions avant de vous déconnecter.');
    loggingOut.current = true;
    try {
      await profileWrites.current;
      await storeRef.current?.clear();
      localStorage.removeItem('arbigo:identity');
      if (demo) localStorage.removeItem('arbigo:demo-profile');
      if ('caches' in window)
        for (const name of await caches.keys())
          if (name.startsWith('arbigo')) await caches.delete(name);
      await signOut({ redirect: false });
      router.replace('/auth/login');
    } catch (error) {
      loggingOut.current = false;
      throw error;
    }
  };
  return (
    <AppContext
      value={{
        matches,
        inventory,
        profile,
        deviceId,
        ready,
        online,
        pending,
        error,
        setError,
        tab,
        setTab,
        matchFilter,
        setMatchFilter,
        matchView,
        setMatchView,
        activeId,
        setActiveId,
        demo,
        conflicts,
        dispatch,
        create,
        saveInventory,
        updateProfile,
        sync,
        transfer,
        resolve,
        logout,
        store: localStore,
        refresh,
      }}
    >
      {children}
    </AppContext>
  );
}
