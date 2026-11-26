'use client';
import dynamic from 'next/dynamic';
import { useState, type FormEvent } from 'react';
import { useApp } from '../app-provider';
import { api } from '@/lib/api';
import { Button, Badge, Modal, Notice } from '@/components/ui';
import type { Match } from '@/domain/types';
import { parseLocalKickoff } from '@/domain/time';
import { DeleteMatchButton } from '../delete-match';
import { MatchHero } from '../match-hero';
import { MatchIndemnity } from '../indemnity';
import { Journal } from './journal';
const Debrief = dynamic(() => import('../debrief/debrief'), {
  loading: () => <p>Chargement du débrief…</p>,
});
export function History({ match: m }: { match: Match }) {
  const app = useApp();
  const [report, setReport] = useState(false),
    [finishing, setFinishing] = useState(false),
    [error, setError] = useState('');
  const debriefOpen = app.matchView === 'debrief';
  const setDebriefOpen = (open: boolean) => app.setMatchView(open ? 'debrief' : 'summary');
  if (debriefOpen && m.finishedAt)
    return <Debrief key={m.id} match={m} onBack={() => setDebriefOpen(false)} />;
  return (
    <>
      <button className="text-button" onClick={() => app.setActiveId(null)}>
        ← Mes rencontres
      </button>
      <MatchHero
        match={m}
        badge={
          <Badge tone={m.status === 'COMPLETED' ? 'green' : 'amber'}>
            {m.status === 'COMPLETED'
              ? m.finishedAt
                ? 'Match terminé'
                : 'Coup d’envoi effectué'
              : m.status === 'POSTPONED'
                ? 'Reportée'
                : m.status === 'CANCELED'
                  ? 'Annulée'
                  : 'Non débutée'}
          </Badge>
        }
      >
        <DeleteMatchButton match={m} />
      </MatchHero>
      {m.status === 'COMPLETED' && (
        <section className="panel debrief-entry">
          <div>
            <h2>Débrief d’après-match</h2>
            <p>
              {m.finishedAt
                ? 'Votre auto-évaluation, vos points forts et votre objectif pour le prochain match.'
                : 'Une fois la rencontre terminée, prenez le temps de faire votre bilan.'}
            </p>
          </div>
          <Button
            disabled={finishing}
            onClick={async () => {
              setFinishing(true);
              try {
                if (!m.finishedAt) await app.dispatch(m.id, { type: 'FINISH_MATCH' });
                setDebriefOpen(true);
              } catch {
              } finally {
                setFinishing(false);
              }
            }}
          >
            {finishing
              ? 'Ouverture…'
              : m.finishedAt
                ? 'Ouvrir le débrief'
                : 'Match terminé · faire le débrief'}
          </Button>
        </section>
      )}
      {m.status === 'COMPLETED' && <MatchIndemnity match={m} />}
      <Journal match={m}>
        {m.status === 'POSTPONED' && (
          <Button onClick={() => setReport(true)}>Créer la nouvelle rencontre liée</Button>
        )}
      </Journal>
      <section className="history-notes">
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
          Instantané {m.template.code}. Le journal ne se réécrit pas lors d’un changement de modèle.
        </div>
      </section>
      {report && (
        <Modal title="Nouvelle date de la rencontre" onClose={() => setReport(false)}>
          {error && <Notice>{error}</Notice>}
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
