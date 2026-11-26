'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button, Notice } from '@/components/ui';
import {
  Home,
  CalendarDays,
  FileText,
  UserRound,
  BookOpenCheck,
  ArrowUpRight,
  X,
  Flag,
} from 'lucide-react';
import { AppProvider, useApp } from './app-provider';
import { Dashboard, Matches, MatchDetail } from './dashboard';
import { InventoryScreen } from './bag/inventory';
import { IndemnityScreen } from './indemnity';
import { StatsScreen } from './stats';
import { Profile } from './profile';
import { ProfileAvatar } from './media';
import { Tunnel } from './tunnel/tunnel';
import { SportcashCheckout } from './tunnel/checkout';
import { requiresCheckout } from '@/domain/match';
import { HOME_CHILDREN } from '@/lib/navigation';
import { QuizScreen } from './quiz/quiz-screen';
import { History } from './history/history';
const PROFILE_QUIZ_SCREENS = new Set(['settings', 'answers', 'statistics', 'documents']);
const navigation = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'matches', label: 'Matches', icon: CalendarDays },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'quiz', label: 'Quiz', icon: BookOpenCheck },
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
  const [indemnityFor, setIndemnityFor] = useState<string | null>(null);
  // Un nouvel écran commence en haut ; un retour retrouve la position quittée.
  const { tab, activeId, matchView, matchFilter, ready, takeScroll } = app;
  const restore = useRef(takeScroll);
  useEffect(() => {
    restore.current = takeScroll;
  });
  useEffect(() => {
    window.scrollTo(0, restore.current());
  }, [tab, activeId, matchView, matchFilter, ready]);
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
  if (active && (requiresCheckout(active) || indemnityFor === active.id))
    return (
      <>
        {toast}
        <SportcashCheckout
          match={active}
          onConfirm={() => setIndemnityFor(active.id)}
          onDone={() => setIndemnityFor(null)}
        />
      </>
    );
  if (active?.status === 'ACTIVE')
    return (
      <>
        {toast}
        <Tunnel match={active} />
      </>
    );
  const profileQuiz = PROFILE_QUIZ_SCREENS.has(
    new URLSearchParams(window.location.search).get('quiz') ?? '',
  );
  // Les pages ouvertes depuis l'accueil gardent « Accueil » en surbrillance.
  const section = HOME_CHILDREN.includes(app.tab) ? 'home' : app.tab;
  const current = (id: string) => (app.tab === id ? 'page' : section === id ? 'true' : undefined);
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link
          href={app.demo ? '/demo' : '/app'}
          className="brand"
          onNavigate={(event) => {
            event.preventDefault();
            app.setTab('home');
          }}
        >
          ArbiGo<span>.</span>
        </Link>
        <span className="sidebar-caption">VOTRE AVANT-MATCH</span>
        <nav aria-label="Navigation principale">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={section === n.id ? 'active' : ''}
              aria-current={current(n.id)}
              onClick={() => app.setTab(n.id)}
            >
              <n.icon size={21} />
              <span>{n.label}</span>
              {section === n.id && <span className="nav-dot" />}
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
          ) : app.tab === 'quiz' ? (
            profileQuiz ? (
              <Profile key="quiz-profile" initialSection="quiz" />
            ) : (
              <QuizScreen />
            )
          ) : app.tab === 'documents' ? (
            <QuizScreen key="documents" area="documents" />
          ) : app.tab === 'bag' ? (
            <InventoryScreen />
          ) : app.tab === 'stats' ? (
            <StatsScreen />
          ) : app.tab === 'indemnity' ? (
            <IndemnityScreen />
          ) : (
            <Profile initialSection={profileQuiz ? 'quiz' : 'account'} />
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navigation mobile">
        {navigation.map((n) => (
          <button
            key={n.id}
            aria-current={current(n.id)}
            className={section === n.id ? 'active' : ''}
            onClick={() => app.setTab(n.id)}
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
