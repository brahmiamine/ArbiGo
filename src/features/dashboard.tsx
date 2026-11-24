'use client';
import { MatchJourney } from './matches/match-journey';
import { MatchWeather } from './matches/match-weather';
import { TeamIdentity } from '@/components/team-identity';
import { useState } from 'react';
import {
  Plus,
  MapPin,
  CalendarDays,
  Clock3,
  ArrowRight,
  Check,
  ClipboardCheck,
  Backpack,
  Flag,
  ChevronRight,
} from 'lucide-react';
import { useApp } from './app-provider';
import { Button, Badge, Modal, Progress, Empty, PageHeader } from '@/components/ui';
import { MatchForm } from './matches/match-form';
import { EquipmentImage } from './media';
import { MatchCountdown } from '@/components/match-countdown';
import { equipmentLabel } from '@/domain/equipment';
import { formatTime } from '@/domain/time';
import type { Match } from '@/domain/types';
export function PitchArt() {
  return (
    <svg className="pitch-art" viewBox="0 0 460 320" fill="none" aria-hidden="true">
      <g transform="translate(80 50) rotate(-10 150 110)">
        <rect
          x="0"
          y="0"
          width="310"
          height="220"
          rx="10"
          fill="white"
          fillOpacity=".04"
          stroke="white"
          strokeOpacity=".28"
          strokeWidth="1.5"
        />
        <path
          d="M155 0v220M0 48h56v124H0m310-124h-56v124h56M0 78h24v64H0m310-64h-24v64h24"
          stroke="white"
          strokeOpacity=".25"
          strokeWidth="1.5"
        />
        <circle cx="155" cy="110" r="40" stroke="white" strokeOpacity=".25" />
        <circle cx="155" cy="110" r="3" fill="white" fillOpacity=".5" />
        <path
          d="M95 176c32-38 35-102 91-108"
          stroke="#BE965A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 9"
        />
        <circle cx="192" cy="67" r="17" fill="#BE965A" />
        <path d="m185 67 5 5 9-10" stroke="#003287" strokeWidth="3" />
        <circle cx="94" cy="178" r="7" fill="white" />
      </g>
      <path d="m379 27 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#BE965A" />
      <circle cx="42" cy="248" r="3" fill="white" fillOpacity=".4" />
    </svg>
  );
}
const dateLabel = (m: Match) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: m.timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(m.kickoffAt));
export function MatchCard({ match, onOpen }: { match: Match; onOpen: () => void }) {
  const packed = match.bag.filter((i) => i.packed).length;
  return (
    <article className="match-card">
      <button
        type="button"
        className="match-card-open"
        aria-label={`Ouvrir la rencontre ${match.homeTeam} – ${match.awayTeam}`}
        onClick={onOpen}
      />
      <div className="match-card-top">
        <span className="eyebrow">{dateLabel(match)}</span>
        {match.status !== 'DRAFT' && (
          <Badge tone={match.status === 'ACTIVE' ? 'green' : 'gray'}>
            {match.status === 'ACTIVE'
              ? 'En préparation'
              : match.status === 'COMPLETED'
                ? match.finishedAt
                  ? 'Match terminé'
                  : 'Coup d’envoi effectué'
                : 'Rencontre non débutée'}
          </Badge>
        )}
      </div>
      <div className="match-teams">
        <strong>
          <TeamIdentity name={match.homeTeam} logoId={match.homeLogoId} />
        </strong>
        <span>VS</span>
        <strong>
          <TeamIdentity name={match.awayTeam} logoId={match.awayLogoId} />
        </strong>
      </div>
      <div className="match-meta">
        <span>
          <Clock3 size={15} />
          {formatTime(match.kickoffAt, match.timezone)}
        </span>
        <span>
          <MapPin size={15} />
          {match.stadium || 'Adresse à préciser'}
        </span>
        <ChevronRight size={20} />
      </div>
      {['DRAFT', 'ACTIVE'].includes(match.status) && <MatchCountdown kickoffAt={match.kickoffAt} />}
      <MatchWeather match={match} />
      <MatchJourney match={match} />
      <div className="bag-mini">
        <Backpack size={15} />
        <span>
          Sac : {packed}/{match.bag.length} articles
        </span>
        <div className="mini-track">
          <span style={{ width: `${(packed / match.bag.length) * 100}%` }} />
        </div>
      </div>
    </article>
  );
}
export function Dashboard() {
  const app = useApp();
  const [creating, setCreating] = useState(false);
  const upcoming = app.matches.filter((m) => ['DRAFT', 'ACTIVE'].includes(m.status));
  const [now] = useState(Date.now);
  const future = upcoming
    .filter((m) => Date.parse(m.kickoffAt) > now)
    .sort((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt));
  const next = future.find((m) => m.status === 'ACTIVE') ?? future[0];
  const lastMatch = [...app.matches].sort(
    (a, b) => Date.parse(b.kickoffAt) - Date.parse(a.kickoffAt),
  )[0];
  const finished = app.matches
    .filter((m) => !['DRAFT', 'ACTIVE'].includes(m.status))
    .sort((a, b) => Date.parse(b.kickoffAt) - Date.parse(a.kickoffAt));
  return (
    <div className="dashboard-home">
      <PageHeader title="Accueil">
        <Button onClick={() => setCreating(true)}>
          <Plus size={18} />
          Nouveau match
        </Button>
      </PageHeader>
      <div className="stats">
        <div>
          <span className="stat-icon">
            <CalendarDays />
          </span>
          <div>
            <strong>
              {app.matches
                .filter((m) => ['DRAFT', 'ACTIVE'].includes(m.status))
                .length.toString()
                .padStart(2, '0')}
            </strong>
            <span>Matchs à venir</span>
          </div>
        </div>
        <div>
          <span className="stat-icon gold-bg">
            <Backpack />
          </span>
          <div>
            <strong>{app.inventory.equipment.length.toString().padStart(2, '0')}</strong>
            <span>Articles du sac</span>
          </div>
        </div>
        <div>
          <span className="stat-icon green-bg">
            <ClipboardCheck />
          </span>
          <div>
            <strong>{finished.length.toString().padStart(2, '0')}</strong>
            <span>Archivées</span>
          </div>
        </div>
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="section-heading">
            <h2>
              {next ? 'Prochaine rencontre' : lastMatch ? 'Dernier match' : 'Prochaine rencontre'}
            </h2>
            <button className="text-button" onClick={() => app.setTab('matches')}>
              Tous les matches
              <ArrowRight size={16} />
            </button>
          </div>
          {next ? (
            <MatchCard match={next} onOpen={() => app.setActiveId(next.id)} />
          ) : lastMatch ? (
            <div className="recent-matches">
              <MatchCard match={lastMatch} onOpen={() => app.setActiveId(lastMatch.id)} />
            </div>
          ) : (
            <Empty
              title="Le terrain vous attend"
              description="Ajoutez votre prochaine désignation pour préparer votre rencontre."
            >
              <Button onClick={() => setCreating(true)}>Ajouter un match</Button>
            </Empty>
          )}
          <div className="small-tip">
            <Flag size={20} />
            <div>
              <strong>Les bons réflexes, au bon moment.</strong>
              <p>Votre parcours vous guide sans prendre de décision à votre place.</p>
            </div>
          </div>
        </section>
        <section>
          <div className="prep-list">
            <button onClick={() => app.setTab('bag')}>
              <span className="prep-number">
                <Backpack size={18} />
              </span>
              <div>
                <strong>Sacs</strong>
                <p>Gérer mon matériel et mes articles.</p>
              </div>
              <ChevronRight size={20} />
            </button>
          </div>
        </section>
        <section>
          <div className="section-heading">
            <h2>Votre préparation</h2>
            <span className="eyebrow">EN 3 TEMPS</span>
          </div>
          <div className="prep-list">
            {[
              {
                n: '01',
                title: 'Préparer mon sac',
                text: 'Le matériel essentiel, rien d’oublié.',
                icon: Backpack,
                action: () => (next ? app.setActiveId(next.id) : app.setTab('bag')),
              },
              {
                n: '02',
                title: 'Suivre mon avant-match',
                text: 'Des contrôles clairs, étape par étape.',
                icon: ClipboardCheck,
                action: () => (next ? app.setActiveId(next.id) : setCreating(true)),
              },
              {
                n: '03',
                title: 'Garder une trace',
                text: 'Retrouver le journal de mes rencontres.',
                icon: Flag,
                action: () => app.setTab('matches'),
              },
            ].map((item) => (
              <button key={item.n} onClick={item.action}>
                <span className="prep-number">{item.n}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
                <item.icon size={20} />
              </button>
            ))}
          </div>
        </section>
      </div>
      {creating && (
        <Modal title="Nouvelle rencontre" onClose={() => setCreating(false)}>
          <MatchForm onDone={() => setCreating(false)} />
        </Modal>
      )}
    </div>
  );
}
export function Matches() {
  const app = useApp();
  const history = app.matchFilter === 'history';
  const setHistory = (value: boolean) => app.setMatchFilter(value ? 'history' : 'upcoming');
  const [creating, setCreating] = useState(false);
  const [now] = useState(Date.now);
  const isUpcoming = (m: (typeof app.matches)[number]) =>
    ['DRAFT', 'ACTIVE'].includes(m.status) && Date.parse(m.kickoffAt) > now;
  const filtered = app.matches
    .filter((m) => (history ? !isUpcoming(m) : isUpcoming(m)))
    .sort((a, b) => (history ? Date.parse(b.kickoffAt) - Date.parse(a.kickoffAt) : 0));
  return (
    <>
      <PageHeader title="Matches">
        <Button onClick={() => setCreating(true)}>
          <Plus size={18} />
          Nouveau match
        </Button>
      </PageHeader>
      <div className="tabs">
        <button
          aria-pressed={!history}
          className={!history ? 'selected' : ''}
          onClick={() => setHistory(false)}
        >
          À venir
        </button>
        <button
          aria-pressed={history}
          className={history ? 'selected' : ''}
          onClick={() => setHistory(true)}
        >
          Historique
        </button>
      </div>
      <div className="matches-grid">
        {filtered.map((m) => (
          <MatchCard key={m.id} match={m} onOpen={() => app.setActiveId(m.id)} />
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title={history ? 'Votre journal commence ici' : 'Aucune rencontre à venir'}
          description={
            history
              ? 'Les préparations clôturées apparaîtront ici.'
              : 'Ajoutez votre prochaine désignation.'
          }
        />
      )}{' '}
      {creating && (
        <Modal title="Nouvelle rencontre" onClose={() => setCreating(false)}>
          <MatchForm onDone={() => setCreating(false)} />
        </Modal>
      )}
    </>
  );
}
export function MatchDetail({ match: m }: { match: Match }) {
  const app = useApp();
  const [starting, setStarting] = useState(false);
  const [editing, setEditing] = useState(false);
  const packed = m.bag.filter((i) => i.packed).length;
  async function start() {
    setStarting(true);
    try {
      await app.dispatch(m.id, { type: 'START' });
    } catch {
    } finally {
      setStarting(false);
    }
  }
  return (
    <div className="detail">
      <button className="text-button" onClick={() => app.setActiveId(null)}>
        ← Mes rencontres
      </button>
      <header className="detail-hero">
        <h1 className="detail-hero-teams">
          <TeamIdentity name={m.homeTeam} logoId={m.homeLogoId} />
          <span className="detail-hero-vs" aria-label="contre">
            VS
          </span>
          <TeamIdentity name={m.awayTeam} logoId={m.awayLogoId} />
        </h1>
        <p className="detail-hero-meta">
          <span>
            <CalendarDays size={15} aria-hidden="true" />
            {dateLabel(m)}
          </span>
          <span>
            <Clock3 size={15} aria-hidden="true" />
            {formatTime(m.kickoffAt, m.timezone)}
          </span>
          {m.stadium && (
            <span>
              <MapPin size={15} aria-hidden="true" />
              {m.stadium}
            </span>
          )}
        </p>
        {m.status === 'DRAFT' && (
          <Button variant="secondary" disabled={starting} onClick={() => setEditing(true)}>
            Modifier la rencontre
          </Button>
        )}
      </header>
      {editing && (
        <Modal title="Modifier la rencontre" onClose={() => setEditing(false)}>
          <MatchForm initial={m} onDone={() => setEditing(false)} />
        </Modal>
      )}
      <MatchWeather match={m} compact={false} />
      <div className="dashboard-grid">
        <section className="panel match-bag">
          <div className="section-heading">
            <h2>Sac du match</h2>
            <Badge tone={packed === m.bag.length ? 'green' : 'amber'}>
              {packed}/{m.bag.length}
            </Badge>
          </div>
          <p className="muted">Un sac par match. Vous pouvez démarrer sans tout cocher.</p>
          <Progress value={(packed / m.bag.length) * 100} label="Sac préparé" />
          <div className="bag-checks">
            {m.bag.map((item) => (
              <label key={`${item.id}:${item.packed}`} className={item.packed ? 'checked' : ''}>
                <input
                  type="checkbox"
                  defaultChecked={item.packed}
                  onChange={(e) => {
                    const input = e.currentTarget;
                    void app
                      .dispatch(m.id, { type: 'BAG', itemId: item.id, packed: input.checked })
                      .catch(() => {
                        input.checked = item.packed;
                      });
                  }}
                />
                <span className="check-visual">
                  <Check size={15} />
                </span>
                <EquipmentImage item={item} />
                <span className="bag-item-label">{equipmentLabel(item.label)}</span>
              </label>
            ))}
          </div>
        </section>
        <section className="match-start">
          <Button disabled={starting} onClick={() => void start()}>
            <Flag size={18} />
            {starting ? 'Démarrage…' : 'Je suis arrivé · démarrer le tunnel'}
          </Button>
        </section>
      </div>
    </div>
  );
}
