'use client';
import { useState, useEffect, type FormEvent } from 'react';
import { Flag, Clock3, Check, AlertTriangle } from 'lucide-react';
import { useApp } from '../app-provider';
import { api } from '@/lib/api';
import { Button, Badge, Modal, Notice } from '@/components/ui';
import type { Match, OperationInput } from '@/domain/types';
import { formatTime, parseLocalKickoff } from '@/domain/time';
import { summarize } from '@/domain/match';
interface Event {
  id: string;
  type: string;
  occurredAt: string;
  receivedAt: string;
  payload: OperationInput;
}
const labels: Record<string, string> = {
  START: 'Préparation démarrée',
  ANSWER: 'Contrôle renseigné',
  COMPLETE: 'Étape validée',
  COLORS: 'Couleurs et tenue confirmées',
  ISSUE_UPDATE: 'Suivi d’anomalie',
  WARMUP: 'Échauffement',
  KICKOFF: 'Coup d’envoi confirmé',
  CLOSE: 'Rencontre non débutée',
  TRANSFER: 'Appareil propriétaire transféré',
  NOTE: 'Note ajoutée',
  BAG: 'Sac modifié',
  NAVIGATE: 'Fiche consultée',
};
export function History({ match: m }: { match: Match }) {
  const app = useApp();
  const [events, setEvents] = useState<Event[]>([]),
    [report, setReport] = useState(false),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const summary = summarize(m);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        if (app.demo) {
          setEvents([]);
          return;
        }
        const b = await api<{ events: Event[] }>(`matches/${m.id}/history`);
        if (alive) setEvents(b.events);
        await app.store?.cache(`history:${m.id}`, b.events);
      } catch {
        const cached = await app.store?.cached<Event[]>(`history:${m.id}`);
        if (alive && cached) setEvents(cached);
        else if (alive)
          setError('Le journal serveur nécessite une connexion. Le bilan local reste disponible.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [m.id, app.demo, app.store]);
  return (
    <>
      <button className="text-button" onClick={() => app.setActiveId(null)}>
        ← Mes rencontres
      </button>
      <div className="page-heading">
        <div>
          <div className="eyebrow">JOURNAL DE PRÉPARATION</div>
          <h1>
            {m.homeTeam} <span className="muted">/</span> {m.awayTeam}
          </h1>
          <p>
            {new Date(m.kickoffAt).toLocaleDateString('fr-FR')} ·{' '}
            {formatTime(m.kickoffAt, m.timezone)}
          </p>
        </div>
        <Badge tone={m.status === 'COMPLETED' ? 'green' : 'amber'}>
          {m.status === 'COMPLETED'
            ? 'Coup d’envoi effectué'
            : m.status === 'POSTPONED'
              ? 'Reportée'
              : m.status === 'CANCELED'
                ? 'Annulée'
                : 'Non débutée'}
        </Badge>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <h2>
            <Flag size={21} />
            Le bilan conservé
          </h2>
          <p>Clôturée le {m.closedAt ? new Date(m.closedAt).toLocaleString('fr-FR') : ''}</p>
          {m.closeComment && <Notice>{m.closeComment}</Notice>}
          <div className="review-steps">
            {m.template.steps.map((s) => (
              <div key={s.code}>
                <span>{s.title}</span>
                <Badge tone={m.runs[s.code].completedAt ? 'green' : 'gray'}>
                  {m.runs[s.code].completedAt ? 'Validée' : 'Non validée'}
                </Badge>
              </div>
            ))}
          </div>
          <p>{summary.openIssues.length} anomalie(s) restée(s) ouverte(s).</p>
          {m.issues.map((i) => (
            <div className="history-issue" key={i.id}>
              {i.status === 'RESOLVED' ? <Check size={18} /> : <AlertTriangle size={18} />}
              <div>
                <strong>{i.reason}</strong>
                <p>
                  {i.comment} · {i.status === 'RESOLVED' ? 'Résolue' : 'Non résolue'}
                </p>
              </div>
            </div>
          ))}
          {m.status === 'POSTPONED' && (
            <Button onClick={() => setReport(true)}>Créer la nouvelle rencontre liée</Button>
          )}
        </section>
        <section>
          <div className="panel">
            <h2>Notes après clôture</h2>
            <p className="muted">Ajoutées séparément, sans modifier le journal d’origine.</p>
            {m.notes.map((n) => (
              <div className="history-note" key={n.id}>
                <p>{n.content}</p>
                <time>{new Date(n.at).toLocaleString('fr-FR')}</time>
              </div>
            ))}
            <form
              className="form"
              onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const form = e.currentTarget;
                try {
                  await app.dispatch(m.id, {
                    type: 'NOTE',
                    content: String(new FormData(form).get('note')),
                  });
                  form.reset();
                } catch {}
              }}
            >
              <label>
                Nouvelle note
                <textarea name="note" required maxLength={5000} />
              </label>
              <Button type="submit" variant="secondary">
                Ajouter la note
              </Button>
            </form>
          </div>
          <div className="model-note">
            Instantané {m.template.code}. Le journal ne se réécrit pas lors d’un changement de
            modèle.
          </div>
        </section>
      </div>
      <section className="panel journal">
        <h2>
          <Clock3 size={21} />
          Journal des événements
        </h2>
        {loading && <p>Chargement…</p>}
        {error && <Notice>{error}</Notice>}
        {app.demo && (
          <p className="muted">
            Le journal serveur est disponible avec un compte. Le bilan de démonstration est conservé
            sur cet appareil.
          </p>
        )}
        {events.map((e) => (
          <details key={e.id}>
            <summary>
              <time>{formatTime(e.occurredAt, m.timezone)}</time>
              <strong>{labels[e.type] ?? e.type}</strong>
              <span>{new Date(e.receivedAt).toLocaleTimeString('fr-FR')} reçu</span>
            </summary>
            <pre>{JSON.stringify(e.payload, null, 2)}</pre>
          </details>
        ))}
      </section>
      {report && (
        <Modal title="Nouvelle date de la rencontre" onClose={() => setReport(false)}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const data = new FormData(e.currentTarget);
                const kickoffAt = parseLocalKickoff(
                  String(data.get('date')),
                  String(data.get('time')),
                  m.timezone,
                );
                let next: Match;
                if (app.demo) {
                  const { createRematch } = await import('@/domain/match');
                  next = createRematch(m, kickoffAt);
                } else
                  next = await api<Match>(`matches/${m.id}/create-rematch`, 'POST', { kickoffAt });
                await app.store!.putMatch(next);
                await app.refresh();
                app.setActiveId(next.id);
                setReport(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Erreur');
              }
            }}
          >
            <Notice>
              L’ancien journal est conservé. Le nouveau sac est décoché et aucune validation n’est
              recopiée.
            </Notice>
            <label>
              Date
              <input type="date" name="date" required />
            </label>
            <label>
              Heure de Paris
              <input type="time" name="time" defaultValue="15:00" required />
            </label>
            <Button type="submit">Créer le brouillon lié</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
