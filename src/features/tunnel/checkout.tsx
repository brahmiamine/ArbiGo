'use client';
import { useState } from 'react';
import { Check, Euro, ExternalLink } from 'lucide-react';
import { Button, Notice } from '@/components/ui';
import type { Match } from '@/domain/types';
import { useApp } from '../app-provider';
import { TeamHeader } from './tunnel';
import { IndemnityForm } from '../indemnity';

export function SportcashCheckout({
  match,
  onConfirm,
  onDone,
}: {
  match: Match;
  onConfirm: () => void;
  onDone: () => void;
}) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const readonly = match.ownerDeviceId !== app.deviceId;
  const finish = () => {
    onDone();
    app.setActiveId(null);
  };
  if (match.checkout?.completedAt)
    return (
      <div className="tunnel checkout-tunnel">
        <header className="tunnel-header">
          <div className="tunnel-match">
            <TeamHeader match={match} />
          </div>
        </header>
        <main className="tunnel-body">
          <section className="step-card">
            <div className="step-title">
              <span className="step-icon">
                <Euro />
              </span>
              <div>
                <h1>Indemnité du match</h1>
              </div>
            </div>
            <IndemnityForm match={match} onSaved={finish} />
            <Button variant="ghost" onClick={finish}>
              Saisir plus tard
            </Button>
          </section>
        </main>
      </div>
    );
  return (
    <div className="tunnel checkout-tunnel">
      <header className="tunnel-header">
        <div className="tunnel-match">
          <TeamHeader match={match} />
        </div>
      </header>
      <main className="tunnel-body">
        <section className="step-card">
          <div className="step-title">
            <span className="step-icon">
              <Check />
            </span>
            <div>
              <h1>Check-out SPORTCASH</h1>
            </div>
          </div>
          <div className="sportcash-checkin">
            <p>
              Le coup d’envoi est enregistré. Effectuez votre check-out dans SPORTCASH, puis
              confirmez ici.
            </p>
            <a
              className="button secondary"
              href="https://app.sportcash.fr/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir SPORTCASH <ExternalLink size={18} aria-hidden="true" />
            </a>
          </div>
          {readonly && (
            <Notice>
              Ce tunnel appartient à un autre appareil.
              <Button
                variant="secondary"
                disabled={!app.online || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await app.transfer(match);
                  } catch (e) {
                    app.setError(e instanceof Error ? e.message : 'Transfert impossible.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Transférer sur cet appareil
              </Button>
            </Notice>
          )}
          <Button
            className="validate-step"
            disabled={readonly || busy}
            onClick={async () => {
              setBusy(true);
              onConfirm();
              try {
                await app.dispatch(match.id, { type: 'SPORTCASH_CHECKOUT' });
              } catch {
                onDone();
              }
              setBusy(false);
            }}
          >
            <Check size={18} />
            {busy ? 'Enregistrement…' : 'Confirmer mon check-out'}
          </Button>
        </section>
      </main>
    </div>
  );
}
