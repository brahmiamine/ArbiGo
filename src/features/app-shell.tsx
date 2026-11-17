'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Notice } from '@/components/ui';
import { Home, CalendarDays, Backpack, UserRound, ArrowUpRight, X, Flag } from 'lucide-react';
import { AppProvider, useApp } from './app-provider';
import { Dashboard, Matches, MatchDetail } from './dashboard';
import { InventoryScreen } from './bag/inventory';
import { Profile } from './profile';
import { ProfileAvatar } from './media';
import { Tunnel } from './tunnel/tunnel';
import { SportcashCheckout } from './tunnel/checkout';
import { requiresCheckout } from '@/domain/match';
import { History } from './history/history';
const navigation = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'matches', label: 'Mes matchs', icon: CalendarDays },
  { id: 'bag', label: 'Mon sac', icon: Backpack },
  { id: 'profile', label: 'Profil', icon: UserRound },
] as const;
export function AppRoot({ demo = false }: { demo?: boolean }) {
  return (
    <AppProvider demo={demo}>
      <Shell />
    </AppProvider>
  );
}
function Shell() {
  const app = useApp();
  const active = app.matches.find((m) => m.id === app.activeId);
  if (!app.ready)
    return (
      <main className="loading-screen">
        <div className="brand">
          ArbiGo<span>.</span>
        </div>
        <p>Préparation de votre espace…</p>
      </main>
    );
  if (!app.profile)
    return (
      <main className="loading-screen">
        <h1>Votre espace est indisponible</h1>
        <p>{app.error}</p>
        <Link href="/auth/login">Se connecter</Link>
      </main>
    );
  const toast = app.error && (
    <div role="alert" className="toast">
      <span>{app.error}</span>
      <button
        className="icon-button"
        aria-label="Fermer le message"
        onClick={() => app.setError('')}
      >
        <X size={18} />
      </button>
    </div>
  );
  if (active && requiresCheckout(active))
    return (
      <>
        {toast}
        <SportcashCheckout match={active} />
      </>
    );
  if (active?.status === 'ACTIVE')
    return (
      <>
        {toast}
        <Tunnel match={active} />
      </>
    );
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link href={app.demo ? '/demo' : '/app'} className="brand">
          ArbiGo<span>.</span>
        </Link>
        <span className="sidebar-caption">VOTRE AVANT-MATCH</span>
        <nav aria-label="Navigation principale">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={app.tab === n.id ? 'active' : ''}
              aria-current={app.tab === n.id ? 'page' : undefined}
              onClick={() => {
                app.setActiveId(null);
                app.setTab(n.id);
              }}
            >
              <n.icon size={21} />
              <span>{n.label}</span>
              {app.tab === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-card">
            <Flag size={25} />
            <strong>
              L’esprit libre.
              <br />
              Le terrain en tête.
            </strong>
            <span>
              Votre carnet de préparation,
              <br />à portée de main.
            </span>
          </div>
          <div className="sidebar-user">
            <ProfileAvatar
              name={app.profile.name}
              photoId={app.profile.preferences.avatarPhotoId}
            />
            <div>
              <strong>{app.profile.name}</strong>
              <span>Arbitre de football</span>
            </div>
            <ArrowUpRight size={17} />
          </div>
        </div>
      </aside>
      <div className="app-main">
        <main className="page-content">
          {!app.demo && app.matches.length === 1 && !app.profile.preferences.pushEnabled && (
            <PushInvitation />
          )}
          {active ? (
            active.status === 'DRAFT' ? (
              <MatchDetail match={active} />
            ) : (
              <History key={active.id} match={active} />
            )
          ) : app.tab === 'home' ? (
            <Dashboard />
          ) : app.tab === 'matches' ? (
            <Matches />
          ) : app.tab === 'bag' ? (
            <InventoryScreen />
          ) : (
            <Profile />
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navigation mobile">
        {navigation.map((n) => (
          <button
            key={n.id}
            aria-current={app.tab === n.id ? 'page' : undefined}
            className={app.tab === n.id ? 'active' : ''}
            onClick={() => {
              app.setActiveId(null);
              app.setTab(n.id);
            }}
          >
            <n.icon size={21} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      {toast}
    </div>
  );
}
function PushInvitation() {
  const app = useApp();
  const key = `arbigo:push-invitation:${app.profile!.id}`;
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(key) === 'seen',
  );
  if (dismissed) return null;
  const dismiss = () => {
    localStorage.setItem(key, 'seen');
    setDismissed(true);
  };
  return (
    <Notice>
      Votre premier match est créé. Vous pouvez activer les rappels du sac et des étapes dans votre
      profil. Sur iPhone compatible, installez d’abord ArbiGo sur l’écran d’accueil.
      <div className="row-actions">
        <Button
          variant="secondary"
          onClick={() => {
            dismiss();
            app.setActiveId(null);
            app.setTab('profile');
          }}
        >
          Configurer les notifications
        </Button>
        <Button variant="ghost" onClick={dismiss}>
          Plus tard
        </Button>
      </div>
    </Notice>
  );
}
