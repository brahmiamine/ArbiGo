'use client';
import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui';
import { templates } from '@/domain/templates';
import { normalizeStepPreferences } from '@/domain/step-settings';
import { useApp } from './app-provider';

export function StepSettings({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const [settings, setSettings] = useState(() =>
    normalizeStepPreferences(app.profile?.preferences.steps),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const offline = !app.demo && !app.online;
  const labels = new Map(templates.FOOT_11.steps.map((step) => [step.code, step.title]));
  function move(index: number, delta: number) {
    setSettings((current) => {
      const order = [...current.order];
      [order[index], order[index + delta]] = [order[index + delta], order[index]];
      return { ...current, order };
    });
  }
  return (
    <form
      className="form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          await app.updateProfile({ preferences: { steps: settings } });
          onDone();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="muted">
        Pour vos prochaines rencontres. Le bilan du coup d’envoi reste à la fin du parcours.
      </p>
      <fieldset className="settings-fieldset" disabled={busy || offline}>
        <ol className="step-settings-list">
          {settings.order.map((code, index) => {
            const label = labels.get(code) ?? code,
              enabled = !settings.disabled.includes(code);
            return (
              <li key={code} className={enabled ? '' : 'step-disabled'}>
                <label>
                  <input
                    type="checkbox"
                    checked={enabled}
                    aria-label={`Activer ${label}`}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        disabled: event.target.checked
                          ? current.disabled.filter((item) => item !== code)
                          : [...current.disabled, code],
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
                <div className="step-order-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Monter ${label}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Descendre ${label}`}
                    disabled={index === settings.order.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        <label className="checkout-setting">
          <input
            type="checkbox"
            checked={settings.checkoutEnabled}
            onChange={(event) =>
              setSettings((current) => ({ ...current, checkoutEnabled: event.target.checked }))
            }
          />
          Check-out SPORTCASH après le coup d’envoi
        </label>
        <div className="row-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSettings(normalizeStepPreferences())}
          >
            Ordre par défaut
          </Button>
          <Button type="submit">Enregistrer mon parcours</Button>
        </div>
      </fieldset>
      {offline && <p className="muted">Connectez-vous pour modifier votre parcours.</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
