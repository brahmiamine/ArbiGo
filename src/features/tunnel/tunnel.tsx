'use client';
import { TeamIdentity } from '@/components/team-identity';
import { FileDropzone } from '@/components/file-dropzone';
import { StageAlerts } from './alerts';
import { JerseyArt } from '@/components/equipment-art';
import { ControlIllustration } from '@/components/control-illustration';
import { JerseyPreview } from './jersey-preview';
import { Briefing } from './briefing';
import { LockerRooms } from './locker-rooms';
import { ArrivalPosition, currentPosition } from './arrival-position';
import { preparationTiming, stageTiming } from '@/domain/preparation-timing';
import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  ArrowDown,
  ExternalLink,
  CircleCheck,
  TrendingUp,
  ArrowUp,
  Check,
  Flag,
  Volume2,
  VolumeX,
  MoreHorizontal,
  AlertTriangle,
  WifiOff,
  CloudCheck,
  Shirt,
  Play,
  Pause,
  Activity,
  Footprints,
  Zap,
  StretchHorizontal,
} from 'lucide-react';
import { useApp } from '../app-provider';
import { Badge, Button, Modal, Notice, Progress } from '@/components/ui';
import type { Match, Step, Control, OperationInput, KitColors } from '@/domain/types';
import { countdown, formatTime, scheduledAt } from '@/domain/time';
import { summarize, needsLockerSteps, needsSportcashStep, stageStatus } from '@/domain/match';
import { warmupPhases } from '@/domain/templates';
import { elapsedWarmup } from '@/domain/warmup';
import { palette, rankMatchShirts, previousTeamColors } from '@/domain/equipment';
import { ColorPicker } from '../bag/inventory';
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    const update = () => setNow(Date.now());
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return now;
}
function Countdown({ target, label }: { target: string; label: string }) {
  const now = useNow();
  const late = Date.parse(target) < now;
  return (
    <div className={`countdown ${Date.parse(target) < now ? 'late' : ''}`}>
      <span>{late ? `${label} · RETARD` : label}</span>
      <strong>{countdown(target, now)}</strong>
    </div>
  );
}
function StepStatusBadge({ match, step }: { match: Match; step: Step }) {
  const now = useNow();
  const status = stageStatus(match, step, now);
  return <Badge tone={status.tone}>{status.label}</Badge>;
}
export function TeamHeader({ match }: { match: Match }) {
  return (
    <div className="tunnel-teams" aria-label="Équipes et vestiaires">
      {(['home', 'away'] as const).map((side) => {
        const name = side === 'home' ? match.homeTeam : match.awayTeam;
        const colors = match.colors[side];
        return (
          <div className="tunnel-team" key={side}>
            <strong title={name}>
              <TeamIdentity
                name={name}
                logoId={side === 'home' ? match.homeLogoId : match.awayLogoId}
              />
            </strong>
            <div className="tunnel-team-details">
              <span
                className="team-color-dots"
                role="img"
                aria-label={`${name} · ${colors.length ? colors.join(' et ') : 'couleur non renseignée'}`}
              >
                {(colors.length ? colors : ['']).map((color, i) => (
                  <i
                    key={`${color}-${i}`}
                    style={{ backgroundColor: palette[color] ?? '#e4eaf2' }}
                  />
                ))}
              </span>
              <span className="team-color-name">{colors.join(' / ') || 'Couleur —'}</span>
              <span className="team-locker" title={`Vestiaire · ${name}`}>
                Vest. {match.lockerRooms?.[side] || '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function AdjacentStep({
  match,
  step,
  direction,
  disabled,
  onClick,
}: {
  match: Match;
  step: Step;
  direction: 'previous' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'previous' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      className={`adjacent-step ${direction}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={`${direction === 'previous' ? 'Étape précédente' : 'Étape suivante'} · ${step.title}`}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{step.title}</span>
      <StepStatusBadge match={match} step={step} />
    </button>
  );
}
function beep(muted: boolean) {
  if (muted) return;
  try {
    const ctx = new AudioContext(),
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 640;
    gain.gain.setValueAtTime(0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
    osc.onended = () => void ctx.close();
    navigator.vibrate?.(30);
  } catch {}
}
export function Tunnel({ match }: { match: Match }) {
  const app = useApp();
  if (match.ownerDeviceId === app.deviceId) {
    if (needsLockerSteps(match))
      return <PreparationUpgrade key="lockers" match={match} type="ADD_LOCKER_STEPS" />;
    if (needsSportcashStep(match))
      return <PreparationUpgrade key="sportcash" match={match} type="ADD_SPORTCASH_STEP" />;
  }
  return <TunnelContent match={match} />;
}
function PreparationUpgrade({
  match,
  type,
}: {
  match: Match;
  type: 'ADD_LOCKER_STEPS' | 'ADD_SPORTCASH_STEP';
}) {
  const app = useApp();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  const upgrade = async () => {
    setFailed(false);
    try {
      await app.dispatch(match.id, { type });
    } catch {
      setFailed(true);
    }
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void upgrade();
  });
  return (
    <main className="loading-screen">
      <p>Préparation des étapes…</p>
      {failed && <Button onClick={() => void upgrade()}>Réessayer</Button>}
    </main>
  );
}
function TimingIndicator({
  match,
  onReview,
  disabled,
}: {
  match: Match;
  onReview: () => void;
  disabled: boolean;
}) {
  const now = useNow();
  const timing = preparationTiming(match, now);
  const Icon =
    timing.state === 'ahead' ? TrendingUp : timing.state === 'late' ? AlertTriangle : CircleCheck;
  return (
    <button
      type="button"
      className={`schedule-indicator ${timing.state}`}
      onClick={onReview}
      disabled={disabled}
      aria-label={`Ouvrir le bilan · ${timing.label}`}
    >
      <Icon size={15} aria-hidden="true" />
      <span role="status">{timing.label}</span>
    </button>
  );
}
function NextCountdown({ match }: { match: Match }) {
  const timing = preparationTiming(match, useNow());
  return <Countdown target={timing.nextAt} label={timing.nextLabel} />;
}
function TunnelContent({ match: m }: { match: Match }) {
  const app = useApp();
  const step = m.template.steps[m.currentStep],
    previous = m.template.steps[m.currentStep - 1],
    next = m.template.steps[m.currentStep + 1],
    summary = summarize(m);
  const [muted, setMuted] = useState(() =>
      typeof window === 'undefined'
        ? false
        : localStorage.getItem(`arbigo:mute:${app.profile?.id}`) === 'true',
    ),
    [menu, setMenu] = useState(false),
    [closing, setClosing] = useState(false),
    [busy, setBusy] = useState(false);
  const previewKey = `arbigo:jersey-preview:${app.profile?.id}:${m.id}`;
  const [jerseyPreview, setJerseyPreview] = useState(() => {
    try {
      return typeof window !== 'undefined' && sessionStorage.getItem(previewKey) === '1';
    } catch {
      return false;
    }
  });
  const readonly = m.ownerDeviceId !== app.deviceId;
  const completed = !!m.runs[step.code].completedAt;
  const showJersey = !readonly && step.kind === 'kit' && jerseyPreview;
  const briefing = step.code === 'captains' || step.code === 'assistants';
  const body = useRef<HTMLElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    body.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, [m.currentStep, showJersey]);
  function preview(open: boolean) {
    setJerseyPreview(open);
    try {
      if (open) sessionStorage.setItem(previewKey, '1');
      else sessionStorage.removeItem(previewKey);
    } catch {}
  }
  async function act(a: OperationInput) {
    setBusy(true);
    try {
      await app.dispatch(m.id, a);
      if (
        ['COMPLETE', 'BRIEFING', 'ANSWER', 'KICKOFF'].includes(a.type) ||
        (a.type === 'WARMUP' && a.command === 'FINISH')
      )
        beep(muted);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function go(index: number, direct = false) {
    if (readonly || busy) return;
    if (!direct && step.kind === 'kit' && index === m.currentStep + 1 && !showJersey) {
      if (!completed && !m.selectedShirtId) {
        const suggested = rankMatchShirts(m)[0];
        if (suggested && !(await act({ type: 'SELECT_SHIRT', itemId: suggested.id }))) return;
      }
      preview(true);
      return;
    }
    if (await act({ type: 'NAVIGATE', index })) preview(false);
  }
  const reviewIndex = m.template.steps.findIndex((item) => item.kind === 'final');
  function openReview() {
    if (readonly || busy || reviewIndex < 0) return;
    if (m.currentStep === reviewIndex && !showJersey) {
      window.scrollTo(0, 0);
      body.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    } else void go(reviewIndex, true);
  }
  return (
    <div className={`tunnel ${showJersey ? 'jersey-mode' : ''}`}>
      <StageAlerts match={m} muted={muted} />
      <header className="tunnel-header">
        <div className="tunnel-match">
          <TeamHeader match={m} />
          <div className="tunnel-tools">
            <button
              className="icon-button"
              aria-label={muted ? 'Activer le son' : 'Couper le son'}
              aria-pressed={muted}
              onClick={() => {
                setMuted(!muted);
                localStorage.setItem(`arbigo:mute:${app.profile?.id}`, String(!muted));
              }}
            >
              {muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
            </button>
            <button
              className="icon-button"
              aria-label="Options de la rencontre"
              onClick={() => setMenu(true)}
            >
              <MoreHorizontal size={23} />
            </button>
          </div>
        </div>
        <div className="tunnel-timers">
          <Countdown target={m.kickoffAt} label="COUP D’ENVOI DANS" />
          <div className="timer-divider" />
          <NextCountdown match={m} />
          <TimingIndicator
            match={m}
            onReview={openReview}
            disabled={readonly || busy || reviewIndex < 0}
          />
          <span className="tunnel-sync">
            {app.online ? <CloudCheck size={16} /> : <WifiOff size={16} />}
            <span>
              {app.pending
                ? `${app.pending} action(s) en attente`
                : app.online
                  ? 'Synchronisé'
                  : 'Sur cet appareil'}
            </span>
          </span>
        </div>
        <Progress
          value={summary.total ? (summary.done / summary.total) * 100 : 100}
          label="Progression de la préparation"
        />
      </header>
      {showJersey && (
        <div className="jersey-timing">
          <TimingIndicator
            match={m}
            onReview={openReview}
            disabled={readonly || busy || reviewIndex < 0}
          />
          <span>
            Coup d’envoi <Countdown target={m.kickoffAt} label="" />
          </span>
        </div>
      )}
      <main className="tunnel-body" ref={body}>
        {(showJersey || previous) && (
          <AdjacentStep
            match={m}
            step={showJersey ? step : previous}
            direction="previous"
            disabled={readonly || busy}
            onClick={() => (showJersey ? preview(false) : void go(m.currentStep - 1, true))}
          />
        )}
        {showJersey ? (
          <JerseyPreview
            match={m}
            busy={busy || completed}
            onSelect={(itemId) => act({ type: 'SELECT_SHIRT', itemId })}
          />
        ) : (
          <>
            <div className="tunnel-step-position">
              <span>
                ÉTAPE {String(m.currentStep + 1).padStart(2, '0')} / {m.template.steps.length}
              </span>
              <span>{formatTime(scheduledAt(m.kickoffAt, step.offset), m.timezone)} prévu</span>
            </div>
            {readonly && (
              <Notice>
                Ce tunnel appartient à un autre appareil. Vous pouvez le consulter.{' '}
                <Button
                  variant="secondary"
                  disabled={!app.online}
                  onClick={() => void app.transfer(m).catch((e) => app.setError(e.message))}
                >
                  Transférer sur cet appareil
                </Button>
              </Notice>
            )}
            <section className={`step-card step-${step.kind}`} key={step.code}>
              <div className="step-title">
                <span className="step-icon">
                  {step.kind === 'warmup' ? (
                    <Activity />
                  ) : step.kind === 'kit' ? (
                    <Shirt />
                  ) : step.kind === 'final' ? (
                    <Flag />
                  ) : (
                    <Check />
                  )}
                </span>
                <div>
                  <h1 tabIndex={-1}>{step.title}</h1>
                </div>
                <StepStatusBadge match={m} step={step} />
              </div>
              {completed && <p className="muted">Étape validée : consultation uniquement.</p>}
              <fieldset className="step-fieldset" disabled={readonly || busy || completed}>
                {step.kind === 'locker' && <LockerRooms match={m} code={step.code} act={act} />}
                {step.kind === 'checkin' && (
                  <div className="sportcash-checkin">
                    <p>Effectuez votre check-in dans SPORTCASH, puis confirmez ici.</p>
                    <a
                      className="button secondary"
                      href="https://app.sportcash.fr/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ouvrir SPORTCASH <ExternalLink size={18} aria-hidden="true" />
                    </a>
                  </div>
                )}
                {step.kind === 'kit' && <KitControl m={m} act={act} />}
                {step.kind === 'warmup' && <Warmup m={m} act={act} />}
                {briefing && <Briefing match={m} step={step} />}
                {!briefing &&
                  step.controls.map((control) => (
                    <CheckControl
                      key={control.code}
                      match={m}
                      step={step}
                      control={control}
                      act={act}
                    />
                  ))}
                {step.kind === 'arrival' && (
                  <div className="arrival-details">
                    <MapMark />
                    <p>
                      Arrivée prévue à{' '}
                      <strong>
                        {formatTime(scheduledAt(m.kickoffAt, step.offset), m.timezone)}
                      </strong>
                    </p>
                    <p className="muted">
                      {m.stadium || 'Votre stade'} · Prenez le temps de vous présenter.
                    </p>
                    {m.arrivalPosition && <ArrivalPosition position={m.arrivalPosition} />}
                  </div>
                )}
                {step.kind === 'final' ? (
                  <FinalReview m={m} act={act} go={go} />
                ) : step.kind === 'locker' ? null : (
                  <Button
                    className="validate-step"
                    disabled={!!m.runs[step.code].completedAt || busy || readonly}
                    onClick={async () => {
                      if (briefing)
                        return void act({
                          type: 'BRIEFING',
                          stepCode: step.code as 'captains' | 'assistants',
                        });
                      if (step.kind !== 'arrival')
                        return void act({ type: 'COMPLETE', stepCode: step.code });
                      setBusy(true);
                      const position = await currentPosition();
                      // A missing GPS fix never blocks the preparation.
                      const done = await act({
                        type: 'COMPLETE',
                        stepCode: step.code,
                        ...(position ? { position } : {}),
                      });
                      if (done && !position)
                        app.setError(
                          'Arrivée confirmée, mais la position GPS n’a pas pu être relevée.',
                        );
                    }}
                  >
                    <Check size={19} />
                    {m.runs[step.code].completedAt
                      ? 'Étape validée'
                      : step.kind === 'arrival'
                        ? 'Confirmer mon arrivée'
                        : step.kind === 'checkin'
                          ? 'Confirmer mon check-in'
                          : briefing
                            ? 'Confirmer les consignes données'
                            : 'Valider cette étape'}
                  </Button>
                )}
              </fieldset>
              {m.issues
                .filter((i) => i.stepCode === step.code && i.status !== 'RESOLVED')
                .map((issue) => (
                  <div className="issue-card" key={issue.id}>
                    <AlertTriangle size={20} />
                    <div>
                      <strong>
                        {issue.critical ? 'Sécurité · ' : ''}
                        {issue.reason}
                      </strong>
                      <p>{issue.comment || 'Correction demandée'}</p>
                      <div className="issue-actions">
                        <Button
                          variant="ghost"
                          disabled={readonly || busy || completed}
                          onClick={() =>
                            void act({ type: 'ISSUE_UPDATE', issueId: issue.id, status: 'WAITING' })
                          }
                        >
                          En attente
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={readonly || busy || completed}
                          onClick={() =>
                            void act({
                              type: 'ISSUE_UPDATE',
                              issueId: issue.id,
                              status: 'RESOLVED',
                              comment: issue.comment,
                            })
                          }
                        >
                          Revérifiée et résolue
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </section>
          </>
        )}
        {next && (
          <AdjacentStep
            match={m}
            step={next}
            direction="next"
            disabled={readonly || busy}
            onClick={() => void go(m.currentStep + 1, true)}
          />
        )}
      </main>
      <footer className="tunnel-footer">
        <Button
          variant="secondary"
          disabled={!previous || readonly || busy}
          onClick={() => (showJersey ? preview(false) : void go(m.currentStep - 1))}
        >
          <ArrowUp size={18} />
          Précédent
        </Button>
        <span>
          {summary.done} / {summary.total} validées
        </span>
        <Button disabled={!next || readonly || busy} onClick={() => void go(m.currentStep + 1)}>
          Suivant
          <ArrowDown size={18} />
        </Button>
      </footer>
      {menu && (
        <Modal title="Votre rencontre" onClose={() => setMenu(false)}>
          <div className="form">
            <p>
              La navigation entre les fiches ne valide aucun contrôle. Le journal est conservé en
              cas d’annulation ou de report.
            </p>
            <Notice>
              Les anomalies signalées restent visibles jusqu’à leur résolution. Les décisions
              arbitrales restent les vôtres.
            </Notice>
            {app.conflicts.length > 0 && (
              <Notice>
                Des actions sont conservées en attente de résolution.{' '}
                {app.conflicts
                  .filter((q) => q.operation.matchId === m.id)
                  .map((q) => (
                    <details key={q.id}>
                      <summary>
                        {q.operation.action.type} · {q.reason}
                      </summary>
                      <pre>{JSON.stringify(q.operation.action, null, 2)}</pre>
                    </details>
                  ))}
                <Button
                  variant="secondary"
                  onClick={() =>
                    void app
                      .resolve(m.id)
                      .then(() => setMenu(false))
                      .catch((e) => app.setError(e.message))
                  }
                >
                  Reprendre l’état du serveur et conserver les actions en quarantaine
                </Button>
              </Notice>
            )}
            <Button
              variant="danger"
              disabled={readonly}
              onClick={() => {
                setMenu(false);
                setClosing(true);
              }}
            >
              Signaler une rencontre non débutée
            </Button>
          </div>
        </Modal>
      )}
      {closing && (
        <Modal title="Rencontre non débutée" onClose={() => setClosing(false)}>
          <form
            className="form"
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const closed = await act({
                type: 'CLOSE',
                reason: String(d.get('reason')) as 'CANCELED' | 'POSTPONED' | 'OTHER',
                comment: String(d.get('comment')),
              });
              if (!closed) return;
              setClosing(false);
              app.setActiveId(null);
            }}
          >
            <label>
              Motif
              <select name="reason">
                <option value="CANCELED">Annulée</option>
                <option value="POSTPONED">Reportée</option>
                <option value="OTHER">Autre</option>
              </select>
            </label>
            <label>
              Précision
              <textarea name="comment" required maxLength={2000} />
            </label>
            <Notice>
              Votre journal sera clôturé et conservé. Un report permettra de créer un nouveau
              brouillon indépendant.
            </Notice>
            <Button type="submit" variant="danger">
              Clôturer la préparation
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function MapMark() {
  return (
    <div className="arrival-mark">
      <Flag size={42} strokeWidth={1.3} />
    </div>
  );
}
function CheckControl({
  match: m,
  step,
  control,
  act,
}: {
  match: Match;
  step: Step;
  control: Control;
  act: (a: OperationInput) => Promise<boolean>;
}) {
  const answer = m.runs[step.code].answers[control.code];
  const [problem, setProblem] = useState(false),
    [photoId, setPhotoId] = useState<string>(),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState('');
  const { demo } = useApp();
  return (
    <div
      className={`control ${answer?.value === 'OK' ? 'ok' : answer?.value === 'PROBLEM' ? 'problem' : ''}`}
    >
      <div className="control-heading">
        <ControlIllustration code={control.code} label={control.label} />
        <div>
          <strong>{control.label}</strong>
          {control.critical && <span className="tiny">Point de sécurité</span>}
        </div>
      </div>
      <div className="answer-options">
        <button
          type="button"
          className={answer?.value === 'OK' ? 'selected ok' : ''}
          aria-pressed={answer?.value === 'OK'}
          onClick={() =>
            void act({
              type: 'ANSWER',
              stepCode: step.code,
              controlCode: control.code,
              value: 'OK',
            })
          }
        >
          <Check size={16} />
          Conforme / fait
        </button>
        <button
          type="button"
          className={answer?.value === 'PROBLEM' ? 'selected problem' : ''}
          aria-pressed={answer?.value === 'PROBLEM'}
          onClick={() => setProblem(true)}
        >
          <AlertTriangle size={16} />
          Problème
        </button>
        {control.allowNA && (
          <button
            type="button"
            className={answer?.value === 'NA' ? 'selected' : ''}
            aria-pressed={answer?.value === 'NA'}
            onClick={() =>
              void act({
                type: 'ANSWER',
                stepCode: step.code,
                controlCode: control.code,
                value: 'NA',
              })
            }
          >
            Sans objet
          </button>
        )}
      </div>
      {problem && !m.runs[step.code].completedAt && (
        <Modal title="Signaler un problème" onClose={() => setProblem(false)}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const recorded = await act({
                type: 'ANSWER',
                stepCode: step.code,
                controlCode: control.code,
                value: 'PROBLEM',
                reason: String(d.get('reason')),
                comment: String(d.get('comment')),
                photoId,
              });
              if (recorded) setProblem(false);
            }}
          >
            <p>{control.label}</p>
            <label>
              Motif
              <select name="reason" required>
                <option>Absent</option>
                <option>Détérioré</option>
                <option>Mal fixé</option>
                <option>Dangereux</option>
                <option>Autre</option>
              </select>
            </label>
            <label>
              Commentaire facultatif
              <textarea name="comment" maxLength={2000} />
            </label>
            <FileDropzone
              label="Photo facultative"
              hint={
                demo
                  ? 'Ajout de photos disponible avec un compte'
                  : 'JPEG, PNG ou WebP · 10 Mo maximum'
              }
              disabled={demo || !navigator.onLine}
              busy={uploading}
              onFile={async (file) => {
                setUploading(true);
                setError('');
                try {
                  const data = new FormData();
                  data.set('file', file);
                  const response = await fetch('/api/media', { method: 'POST', body: data });
                  const body = await response.json();
                  if (!response.ok) throw new Error(body.error.message);
                  setPhotoId(body.data.id);
                } catch (error) {
                  setError(error instanceof Error ? error.message : 'Photo non enregistrée');
                } finally {
                  setUploading(false);
                }
              }}
            />
            {photoId && <Badge tone="green">Photo enregistrée</Badge>}
            {error && <p role="alert">{error}</p>}
            <Button type="submit" disabled={uploading}>
              Enregistrer l’anomalie
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function KitControl({ m, act }: { m: Match; act: (a: OperationInput) => Promise<boolean> }) {
  const { matches } = useApp();
  const suggestions = previousTeamColors(matches, m);
  const colors = Object.fromEntries(
    Object.entries(m.colors).map(([key, values]) => [key, values.slice(0, 1)]),
  ) as KitColors;
  const save = (next: KitColors) => void act({ type: 'COLORS', colors: next });
  return (
    <div className="kit-control">
      {!m.colorsConfirmedAt && Object.keys(suggestions).length > 0 && (
        <Notice>
          Des couleurs ont déjà été enregistrées pour ces équipes. Vous pouvez les reprendre et les
          ajuster.
          <Button
            variant="secondary"
            onClick={() =>
              save({
                ...colors,
                ...Object.fromEntries(
                  Object.entries(suggestions).map(([key, values]) => [key, values.slice(0, 1)]),
                ),
              })
            }
          >
            Reprendre ces pastilles pour vérification
          </Button>
        </Notice>
      )}
      <div className="kit-teams">
        {(
          [
            { side: 'Domicile', name: m.homeTeam, players: 'home', keeper: 'homeKeeper' },
            { side: 'Extérieur', name: m.awayTeam, players: 'away', keeper: 'awayKeeper' },
          ] as const
        ).map((team) => (
          <section
            className="kit-team"
            key={team.players}
            aria-label={`${team.side} · ${team.name}`}
          >
            <header className="kit-team-heading">
              <span className="eyebrow">{team.side}</span>
              <h2>
                <TeamIdentity
                  name={team.name}
                  logoId={team.players === 'home' ? m.homeLogoId : m.awayLogoId}
                />
              </h2>
            </header>
            <div className="kit-colors">
              {(
                [
                  [team.players, 'Joueurs'],
                  [team.keeper, 'Gardien'],
                ] as const
              ).map(([key, role]) => (
                <div className="kit-role" key={key}>
                  <div className="kit-preview">
                    <JerseyArt
                      color={colors[key][0]}
                      label={`${team.name} · ${role} · ${colors[key][0] || 'couleur à choisir'}`}
                    />
                    <span>{colors[key][0] || 'À choisir'}</span>
                  </div>
                  <ColorPicker
                    label={role}
                    value={colors[key][0] ?? ''}
                    onChange={(color) => save({ ...colors, [key]: [color] })}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
function Warmup({ m, act }: { m: Match; act: (a: OperationInput) => Promise<boolean> }) {
  const now = useNow();
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      m.warmup.findIndex((p) => p.status !== 'FINISHED'),
    ),
  );
  const phase = m.warmup[index],
    config = warmupPhases[index];
  const elapsed = elapsedWarmup(phase, now);
  const remaining = Math.max(0, config.duration * 1000 - elapsed);
  const Icon = [Activity, Footprints, StretchHorizontal, Zap][index];
  return (
    <div className="warmup">
      <div className="phase-tabs">
        {warmupPhases.map((p, i) => (
          <button
            type="button"
            key={p.title}
            aria-label={`Phase ${i + 1} : ${p.title}`}
            aria-pressed={index === i}
            className={index === i ? 'selected' : m.warmup[i].status === 'FINISHED' ? 'done' : ''}
            onClick={() => setIndex(i)}
          >
            {m.warmup[i].status === 'FINISHED' ? <Check size={16} /> : i + 1}
          </button>
        ))}
      </div>
      <div className="warmup-phase">
        <div className={`warmup-illustration ${phase.status === 'RUNNING' ? 'running' : ''}`}>
          <Icon size={84} strokeWidth={1.2} />
          <span />
          <span />
        </div>
        <div className="warmup-phase-copy">
          <span className="eyebrow">
            PHASE {index + 1} · {config.duration / 60} MINUTES
          </span>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
      </div>
      <strong className="warmup-clock">
        {String(Math.floor(remaining / 60000)).padStart(2, '0')}:
        {String(Math.floor(remaining / 1000) % 60).padStart(2, '0')}
      </strong>
      <Progress
        value={(elapsed / (config.duration * 1000)) * 100}
        label={`Progression phase ${index + 1}`}
      />
      {remaining === 0 && phase.status === 'RUNNING' && (
        <p role="status">Temps indicatif écoulé. Terminez la phase manuellement.</p>
      )}
      <div className="warmup-actions">
        {phase.status === 'IDLE' && (
          <Button
            onClick={() => void act({ type: 'WARMUP', phase: index, command: 'START' })}
            disabled={index > 0 && m.warmup[index - 1].status !== 'FINISHED'}
          >
            <Play size={17} />
            Démarrer
          </Button>
        )}
        {phase.status === 'RUNNING' && (
          <Button
            variant="secondary"
            onClick={() => void act({ type: 'WARMUP', phase: index, command: 'PAUSE' })}
          >
            <Pause size={17} />
            Pause
          </Button>
        )}
        {phase.status === 'PAUSED' && (
          <Button onClick={() => void act({ type: 'WARMUP', phase: index, command: 'RESUME' })}>
            <Play size={17} />
            Reprendre
          </Button>
        )}
        {['RUNNING', 'PAUSED'].includes(phase.status) && (
          <Button onClick={() => void act({ type: 'WARMUP', phase: index, command: 'FINISH' })}>
            Terminer la phase
          </Button>
        )}
        {phase.status === 'FINISHED' && <Badge tone="green">Phase terminée</Badge>}
      </div>
    </div>
  );
}
function StepTimingDetails({ match, step }: { match: Match; step: Step }) {
  const timing = stageTiming(match, step);
  const planned = scheduledAt(match.kickoffAt, step.offset);
  return (
    <small className="review-step-times">
      Prévu {formatTime(planned, match.timezone)}
      {timing ? (
        <> · Validé {formatTime(timing.completedAt, match.timezone)}</>
      ) : match.runs[step.code]?.completedAt ? (
        ' · Heure de validation indisponible'
      ) : (
        ' · Non validée'
      )}
    </small>
  );
}
function StepTimingBadge({ match, step }: { match: Match; step: Step }) {
  const timing = stageTiming(match, step);
  if (!timing) return null;
  const Icon =
    timing.state === 'ahead' ? TrendingUp : timing.state === 'late' ? AlertTriangle : CircleCheck;
  return (
    <span
      className={`step-timing ${timing.state}`}
      aria-label={`${timing.label} · ${timing.value}`}
      title={`${timing.label} · écart arrondi à la minute`}
    >
      <Icon size={12} aria-hidden="true" />
      {timing.value}
    </span>
  );
}
function FinalReview({
  m,
  act,
  go,
}: {
  m: Match;
  act: (a: OperationInput) => Promise<boolean>;
  go: (index: number) => Promise<void>;
}) {
  const summary = summarize(m);
  const [ack, setAck] = useState(false);
  const app = useApp();
  return (
    <div className="final-review">
      {!summary.complete && (
        <Notice tone="amber">
          {`${summary.missing.length} étape(s) non validée(s), ${summary.openIssues.length} anomalie(s) à suivre.${!summary.safe ? ' Un danger de sécurité reste ouvert.' : ''}`}
        </Notice>
      )}
      <p className="review-timing-legend">
        Écart à la validation, arrondi à la minute : − en avance, + en retard.
      </p>
      <div className="review-steps">
        {m.template.steps
          .filter((s) => s.kind !== 'final')
          .map((s) => (
            <button
              type="button"
              key={s.code}
              onClick={() => void go(m.template.steps.findIndex((step) => step.code === s.code))}
            >
              <span className="review-step-name">
                <span>{s.title}</span>
                <StepTimingDetails match={m} step={s} />
              </span>
              <span className="review-step-status">
                <StepStatusBadge match={m} step={s} />
                <StepTimingBadge match={m} step={s} />
              </span>
            </button>
          ))}
      </div>
      {summary.openIssues.map((i) => (
        <p className="form-error" key={i.id}>
          {i.critical ? 'Sécurité · ' : ''}
          {i.reason} : {i.comment}
        </p>
      ))}
      <label className="acknowledgment">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        J’ai pris connaissance du bilan et je confirme ma décision de donner le coup d’envoi.
      </label>
      <Button
        disabled={!ack || !summary.complete}
        onClick={async () => {
          if (
            (await act({ type: 'KICKOFF', acknowledged: ack })) &&
            m.stepPreferences?.checkoutEnabled === false
          )
            app.setActiveId(null);
        }}
      >
        <Flag size={18} />
        Coup d’envoi effectué
      </Button>
      <p className="tiny muted">
        L’heure réelle sera enregistrée. L’horloge ne déclenche jamais cette action.
      </p>
    </div>
  );
}
