'use client';
import { updateDraft } from './matches/update-draft';
import { useState } from 'react';
import {
  ArrowUpRight,
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
import { Button, Badge, Modal, Progress, Empty } from '@/components/ui';
import { MatchForm } from './matches/match-form';
import { practiceLabels } from '@/domain/templates';
import { formatTime, scheduledAt } from '@/domain/time';
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
    <button className="match-card" onClick={onOpen}>
      <div className="match-card-top">
        <span className="eyebrow">{dateLabel(match)}</span>
        <Badge
          tone={match.status === 'ACTIVE' ? 'green' : match.status === 'DRAFT' ? 'blue' : 'gray'}
        >
          {match.status === 'ACTIVE'
            ? 'En préparation'
            : match.status === 'DRAFT'
              ? practiceLabels[match.practice]
              : match.status === 'COMPLETED'
                ? 'Coup d’envoi effectué'
                : 'Rencontre non débutée'}
        </Badge>
      </div>
      <div className="match-teams">
        <strong>{match.homeTeam}</strong>
        <span>VS</span>
        <strong>{match.awayTeam}</strong>
      </div>
      <div className="match-meta">
        <span>
          <Clock3 size={15} />
          {formatTime(match.kickoffAt, match.timezone)}
        </span>
        <span>
          <MapPin size={15} />
          {match.stadium || 'Stade à préciser'}
        </span>
        <ChevronRight size={20} />
      </div>
      <div className="bag-mini">
        <Backpack size={15} />
        <span>
          Sac : {packed}/{match.bag.length} articles
        </span>
        <div className="mini-track">
          <span style={{ width: `${(packed / match.bag.length) * 100}%` }} />
        </div>
      </div>
    </button>
  );
}
export function Dashboard() {
  const app = useApp();
  const [creating, setCreating] = useState(false);
  const next = app.matches.find((m) => m.status === 'DRAFT' || m.status === 'ACTIVE');
  const finished = app.matches.filter((m) => !['DRAFT', 'ACTIVE'].includes(m.status));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">VOTRE RENDEZ-VOUS AVEC LE TERRAIN</div>
          <h1>
            Prêt pour le prochain coup de sifflet<span className="gold">.</span>
          </h1>
          <p>
            Bonjour {app.profile?.name?.split(' ')[0] ?? ''}, chaque détail compte. Préparez-vous
            sereinement.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={18} />
          Nouveau match
        </Button>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <span /> LA PRÉPARATION FAIT LA DIFFÉRENCE
          </span>
          <h2>
            Le match commence
            <br />
            bien avant le terrain.
          </h2>
          <p>
            Votre sac, vos contrôles, vos repères.
            <br />
            Tout est là pour arriver l’esprit libre.
          </p>
          <button
            className="hero-link"
            onClick={() => (next ? app.setActiveId(next.id) : setCreating(true))}
          >
            {next ? 'Préparer ma prochaine rencontre' : 'Créer ma première rencontre'}
            <ArrowUpRight size={21} />
          </button>
        </div>
        <PitchArt />
        <span className="hero-corner">AVANT-MATCH / ARBIGO</span>
      </section>
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
            <span>Rencontres à venir</span>
          </div>
        </div>
        <div>
          <span className="stat-icon gold-bg">
            <Backpack />
          </span>
          <div>
            <strong>{app.inventory.equipment.length.toString().padStart(2, '0')}</strong>
            <span>Articles dans l’inventaire</span>
          </div>
        </div>
        <div>
          <span className="stat-icon green-bg">
            <ClipboardCheck />
          </span>
          <div>
            <strong>{finished.length.toString().padStart(2, '0')}</strong>
            <span>Préparations archivées</span>
          </div>
        </div>
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="section-heading">
            <h2>Prochaine rencontre</h2>
            <button className="text-button" onClick={() => app.setTab('matches')}>
              Tous mes matchs
              <ArrowRight size={16} />
            </button>
          </div>
          {next ? (
            <MatchCard match={next} onOpen={() => app.setActiveId(next.id)} />
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
    </>
  );
}
export function Matches() {
  const app = useApp();
  const [history, setHistory] = useState(false),
    [creating, setCreating] = useState(false);
  const filtered = app.matches.filter((m) =>
    history ? !['DRAFT', 'ACTIVE'].includes(m.status) : ['DRAFT', 'ACTIVE'].includes(m.status),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CHAQUE RENCONTRE A SON PARCOURS</div>
          <h1>
            Mes matchs<span className="gold">.</span>
          </h1>
          <p>Préparez les prochains. Retrouvez la trace des précédents.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={18} />
          Nouveau match
        </Button>
      </div>
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
  const [starting, setStarting] = useState(false),
    [editing, setEditing] = useState(false);
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
      <div className="detail-actions">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Modifier la rencontre
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            app.setActiveId(null);
            app.setTab('bag');
          }}
        >
          Mon inventaire
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await updateDraft(m, m, app.inventory, app.store!, app.demo);
              await app.refresh();
            } catch (e) {
              app.setError(e instanceof Error ? e.message : 'Actualisation impossible');
            }
          }}
        >
          Actualiser le sac depuis l’inventaire
        </Button>
      </div>
      {editing && (
        <Modal title="Modifier la rencontre" onClose={() => setEditing(false)}>
          <MatchForm initial={m} onDone={() => setEditing(false)} />
        </Modal>
      )}
      <div className="detail-banner">
        <Badge>{practiceLabels[m.practice]}</Badge>
        <Badge tone={m.template.status === 'VERIFIED' ? 'green' : 'amber'}>
          {m.template.status === 'VERIFIED' ? 'Modèle vérifié' : 'Modèle en brouillon'}
        </Badge>
        <h1>
          {m.homeTeam}
          <span>vs</span>
          {m.awayTeam}
        </h1>
        <p>
          {dateLabel(m)} · {formatTime(m.kickoffAt, m.timezone)} ·{' '}
          {m.stadium || 'Stade non précisé'}
        </p>
        {m.template.status === 'DRAFT' && (
          <p>
            Ce parcours est un repère de préparation à vérifier pour la catégorie et la compétition.
          </p>
        )}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Le sac de cette rencontre</h2>
            <Badge tone={packed === m.bag.length ? 'green' : 'amber'}>
              {packed}/{m.bag.length}
            </Badge>
          </div>
          <p className="muted">
            Les coches sont propres à ce match. Le sac incomplet n’empêche pas de démarrer.
          </p>
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
                <span>{item.label}</span>
                {item.photoId && <span className="tiny muted">photo</span>}
              </label>
            ))}
          </div>
        </section>
        <section>
          <div className="panel">
            <h2>Votre compte à rebours</h2>
            <p className="muted">Planning fixe · {m.template.season}</p>
            <div className="schedule">
              {m.template.steps.map((step) => (
                <div key={step.code}>
                  <time>{formatTime(scheduledAt(m.kickoffAt, step.offset), m.timezone)}</time>
                  <span>{step.title}</span>
                </div>
              ))}
            </div>
            <Button disabled={starting} onClick={() => void start()}>
              <Flag size={18} />
              {starting ? 'Démarrage…' : 'Je suis arrivé · démarrer le tunnel'}
            </Button>
            <p className="tiny muted">Vous resterez sur cette rencontre jusqu’à sa clôture.</p>
          </div>
          <div className="model-note">
            Modèle de préparation à vérifier pour votre compétition. Les horaires intermédiaires
            sont des repères pédagogiques.
          </div>
        </section>
      </div>
    </div>
  );
}
