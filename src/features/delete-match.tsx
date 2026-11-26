'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import type { Match } from '@/domain/types';
import { useApp } from './app-provider';
export function DeleteMatchButton({ match }: { match: Match }) {
  const app = useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await app.remove(match.id);
      app.setActiveId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.');
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        className="delete-match"
        aria-label="Supprimer"
        title="Supprimer la rencontre"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={18} aria-hidden="true" />
      </Button>
      {open && (
        <Modal title="Supprimer la rencontre" onClose={() => !busy && setOpen(false)}>
          <p>
            Supprimer définitivement <strong>{match.homeTeam}</strong> /{' '}
            <strong>{match.awayTeam}</strong> ? Le sac, le bilan et le débrief associés seront
            perdus. Cette action est irréversible.
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" disabled={busy} onClick={confirm}>
              {busy ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
