import type { Match, MatchInput, Equipment, Template, Operation } from './types';
import { z } from 'zod';
import { withLockerSteps } from './templates';
import { rankOutfits } from './equipment';
import { createMatchDebrief, debriefChangesSchema } from './debrief/schema';

export const matchInputSchema = z.object({
  homeTeam: z.string().trim().min(1).max(100),
  awayTeam: z.string().trim().min(1).max(100),
  practice: z.enum(['FOOT_11', 'FOOT_8', 'FUTSAL']),
  kickoffAt: z.iso.datetime({ offset: true }),
  timezone: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat('fr', { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }),
  stadium: z.string().trim().max(200).optional(),
  competition: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
});
const roomNumber = z.string().trim().min(1).max(30);
export const lockerRoomsSchema = z.union([
  z.object({ referee: roomNumber }).strict(),
  z.object({ home: roomNumber, away: roomNumber }).strict(),
]);
export function needsLockerSteps(match: Match) {
  return (
    ['DRAFT', 'ACTIVE'].includes(match.status) &&
    match.template.steps.some((step) => step.kind === 'arrival') &&
    !['referee-locker', 'team-lockers'].every((code) =>
      match.template.steps.some((step) => step.code === code),
    )
  );
}
function addLockerSteps(match: Match) {
  if (!needsLockerSteps(match)) return;
  const currentCode = match.template.steps[match.currentStep]?.code;
  match.template.steps = withLockerSteps(match.template.steps);
  for (const step of match.template.steps) match.runs[step.code] ??= { answers: {} };
  match.currentStep = Math.max(
    0,
    match.template.steps.findIndex((step) => step.code === currentCode),
  );
}
export function createMatch(
  input: MatchInput,
  inventory: Equipment[],
  template: Template,
  id = crypto.randomUUID(),
): Match {
  const parsed = matchInputSchema.parse(input);
  if (template.practice !== parsed.practice) throw new Error('TEMPLATE_MISMATCH');
  return {
    ...parsed,
    id,
    version: 0,
    status: 'DRAFT',
    template: structuredClone(template),
    bag: inventory
      .filter((i) => i.active !== false)
      .map((i) => ({ ...structuredClone(i), packed: false })),
    outfits: [],
    colors: { home: [], homeKeeper: [], away: [], awayKeeper: [] },
    currentStep: 0,
    runs: Object.fromEntries(template.steps.map((s) => [s.code, { answers: {} }])),
    issues: [],
    warmup: Array.from({ length: 4 }, () => ({ status: 'IDLE', pausedMs: 0 })),
    fencingVersion: 0,
    notes: [],
    appliedOperations: [],
  };
}
export function applyOperation(match: Match, op: Operation): Match {
  if (match.id !== op.matchId) throw new Error('MATCH_MISMATCH');
  if (match.appliedOperations.includes(op.id)) return match;
  if (op.expectedVersion !== match.version) throw new Error('VERSION_CONFLICT');
  const a = op.action;
  if (
    match.status !== 'DRAFT' &&
    match.status !== 'ACTIVE' &&
    !['NOTE', 'DEBRIEF', 'FINISH_MATCH'].includes(a.type)
  )
    throw new Error('CLOSED');
  if (
    match.ownerDeviceId &&
    !['NOTE', 'DEBRIEF', 'FINISH_MATCH'].includes(a.type) &&
    (op.deviceId !== match.ownerDeviceId || op.fencingVersion !== match.fencingVersion)
  )
    throw new Error('DEVICE_REVOKED');
  if (!Number.isFinite(Date.parse(op.occurredAt))) throw new Error('INVALID_TIME');
  if (match.status === 'DRAFT' && !['START', 'BAG'].includes(a.type))
    throw new Error('NOT_STARTED');
  const m = structuredClone(match);
  const at = op.occurredAt;
  switch (a.type) {
    case 'ADD_LOCKER_STEPS':
      addLockerSteps(m);
      break;
    case 'LOCKER_ROOMS': {
      const rooms = lockerRoomsSchema.parse(a.rooms);
      const code = 'referee' in rooms ? 'referee-locker' : 'team-lockers';
      if (!m.template.steps.some((step) => step.code === code && step.kind === 'locker'))
        throw new Error('STEP_UNKNOWN');
      m.lockerRooms = { ...m.lockerRooms, ...rooms };
      m.runs[code].completedAt = at;
      break;
    }
    case 'START':
      if (m.status !== 'DRAFT') throw new Error('ALREADY_STARTED');
      m.status = 'ACTIVE';
      m.ownerDeviceId = op.deviceId;
      m.fencingVersion = 1;
      m.startedAt = at;
      break;
    case 'NAVIGATE':
      if (!Number.isInteger(a.index) || a.index < 0 || a.index >= m.template.steps.length)
        throw new Error('STEP_UNKNOWN');
      m.currentStep = a.index;
      break;
    case 'BAG': {
      const item = m.bag.find((i) => i.id === a.itemId);
      if (!item) throw new Error('ITEM_UNKNOWN');
      item.packed = a.packed;
      break;
    }
    case 'SELECT_SHIRT': {
      if (!m.bag.some((item) => item.id === a.itemId && item.type === 'SHIRT'))
        throw new Error('SHIRT_UNAVAILABLE');
      m.selectedShirtId = a.itemId;
      break;
    }
    case 'ANSWER': {
      const step = m.template.steps.find((s) => s.code === a.stepCode);
      const control = step?.controls.find((c) => c.code === a.controlCode);
      if (!control) throw new Error('CONTROL_UNKNOWN');
      if (a.value === 'NA' && !control.allowNA) throw new Error('NA_FORBIDDEN');
      if (a.value === 'PROBLEM' && !a.reason?.trim()) throw new Error('REASON_REQUIRED');
      if (
        m.issues.some(
          (i) =>
            i.stepCode === a.stepCode && i.controlCode === a.controlCode && i.status !== 'RESOLVED',
        ) &&
        a.value !== 'PROBLEM'
      )
        throw new Error('RECHECK_REQUIRED');
      m.runs[a.stepCode].answers[a.controlCode] = {
        value: a.value,
        at,
        comment: a.comment,
        photoId: a.photoId,
      };
      delete m.runs[a.stepCode].completedAt;
      if (a.value === 'PROBLEM')
        m.issues.push({
          id: op.id,
          stepCode: a.stepCode,
          controlCode: a.controlCode,
          critical: !!control.critical,
          reason: a.reason!,
          comment: a.comment,
          photoId: a.photoId,
          status: 'REQUESTED',
          createdAt: at,
        });
      break;
    }
    case 'BRIEFING': {
      const step = m.template.steps.find((s) => s.code === a.stepCode);
      if (!step || !['captains', 'assistants'].includes(step.code)) throw new Error('STEP_UNKNOWN');
      const run = m.runs[step.code];
      // Keep earlier answers and unresolved issues from existing match journals.
      for (const control of step.controls) run.answers[control.code] ??= { value: 'OK', at };
      run.completedAt = at;
      break;
    }
    case 'COMPLETE': {
      const step = m.template.steps.find((s) => s.code === a.stepCode);
      if (!step || step.kind === 'final') throw new Error('STEP_UNKNOWN');
      if (step.kind === 'locker') throw new Error('LOCKER_ROOMS_REQUIRED');
      if (step.controls.some((c) => !m.runs[step.code].answers[c.code]))
        throw new Error('CHECKS_REQUIRED');
      if (step.kind === 'warmup' && m.warmup.some((p) => p.status !== 'FINISHED'))
        throw new Error('WARMUP_REQUIRED');
      m.runs[step.code].completedAt = at;
      break;
    }
    case 'ISSUE_UPDATE': {
      const issue = m.issues.find((i) => i.id === a.issueId);
      if (!issue) throw new Error('ISSUE_UNKNOWN');
      issue.status = a.status;
      if (a.comment) issue.comment = a.comment;
      if (a.status === 'RESOLVED') {
        issue.resolvedAt = at;
        m.runs[issue.stepCode].answers[issue.controlCode] = { value: 'OK', at, comment: a.comment };
      }
      break;
    }
    case 'COLORS': {
      const outfit = rankOutfits(m.outfits, m.bag, a.colors).find(
        (o) => o.id === a.selectedOutfitId,
      );
      if (a.selectedOutfitId && !outfit) throw new Error('OUTFIT_NOT_PACKED');
      m.colors = structuredClone(a.colors);
      m.colorsConfirmedAt = Object.values(a.colors).every((c) => c.length) ? at : undefined;
      if (a.selectedOutfitId !== undefined) m.selectedOutfitId = a.selectedOutfitId;
      break;
    }
    case 'WARMUP': {
      const p = m.warmup[a.phase];
      if (!p) throw new Error('PHASE_UNKNOWN');
      if (a.command === 'START') {
        if (p.status !== 'IDLE' || (a.phase > 0 && m.warmup[a.phase - 1].status !== 'FINISHED'))
          throw new Error('PHASE_ORDER');
        p.status = 'RUNNING';
        p.startedAt = at;
      } else if (a.command === 'PAUSE') {
        if (p.status !== 'RUNNING') throw new Error('PHASE_STATE');
        p.status = 'PAUSED';
        p.pausedAt = at;
      } else if (a.command === 'RESUME') {
        if (p.status !== 'PAUSED') throw new Error('PHASE_STATE');
        p.pausedMs += Math.max(0, Date.parse(at) - Date.parse(p.pausedAt!));
        delete p.pausedAt;
        p.status = 'RUNNING';
      } else {
        if (!['RUNNING', 'PAUSED'].includes(p.status)) throw new Error('PHASE_STATE');
        if (p.status === 'PAUSED')
          p.pausedMs += Math.max(0, Date.parse(at) - Date.parse(p.pausedAt!));
        p.status = 'FINISHED';
        p.endedAt = at;
        delete p.pausedAt;
      }
      break;
    }
    case 'KICKOFF':
      if (!a.acknowledged) throw new Error('REVIEW_REQUIRED');
      m.status = 'COMPLETED';
      m.closedAt = at;
      m.runs.final.completedAt = at;
      break;
    case 'CLOSE':
      if (!a.comment.trim()) throw new Error('COMMENT_REQUIRED');
      m.status = a.reason;
      m.closedAt = at;
      m.closeComment = a.comment;
      break;
    case 'FINISH_MATCH':
      if (m.status !== 'COMPLETED') throw new Error('DEBRIEF_UNAVAILABLE');
      m.finishedAt ??= at;
      break;
    case 'DEBRIEF': {
      if (m.status !== 'COMPLETED' || !m.finishedAt) throw new Error('DEBRIEF_UNAVAILABLE');
      const changes = debriefChangesSchema.parse(a.changes);
      m.debrief = {
        form: { ...(m.debrief?.form ?? createMatchDebrief(m)), ...changes },
        updatedAt: at,
      };
      break;
    }
    case 'NOTE':
      if (['ACTIVE', 'DRAFT'].includes(m.status) || !a.content.trim())
        throw new Error('NOTE_AFTER_CLOSURE');
      m.notes.push({ id: op.id, content: a.content.trim(), at });
      break;
  }
  m.version++;
  m.appliedOperations.push(op.id);
  return m;
}
export function summarize(match: Match) {
  const relevant = match.template.steps.filter((s) => s.kind !== 'final');
  const missing = relevant.filter((s) => !match.runs[s.code].completedAt).map((s) => s.title);
  const openIssues = match.issues.filter((i) => i.status !== 'RESOLVED');
  return {
    safe: !openIssues.some((i) => i.critical),
    complete: missing.length === 0 && openIssues.length === 0,
    done: relevant.length - missing.length,
    total: relevant.length,
    missing,
    openIssues,
  };
}
// Browsing cards must never move the preparation clock. An unfinished stage
// stays active even when the referee consults an earlier or later card.
export function activeStage(match: Match) {
  const index = match.template.steps.findIndex((step) => !match.runs[step.code].completedAt);
  const activeIndex = index < 0 ? match.template.steps.length - 1 : index;
  return {
    active: match.template.steps[activeIndex],
    next: match.template.steps[Math.min(activeIndex + 1, match.template.steps.length - 1)],
  };
}
export function stageStatus(match: Match, step: Template['steps'][number], now = Date.now()) {
  const run = match.runs[step.code];
  if (run.completedAt) {
    if (match.issues.some((issue) => issue.stepCode === step.code && issue.status !== 'RESOLVED'))
      return { label: 'Validée avec anomalie à suivre', tone: 'amber' as const };
    if (
      step.controls.length &&
      step.controls.every((control) => run.answers[control.code]?.value === 'NA')
    )
      return { label: 'Sans objet', tone: 'gray' as const };
    return { label: 'Validée', tone: 'green' as const };
  }
  if (!['DRAFT', 'ACTIVE'].includes(match.status))
    return { label: 'Non validée', tone: 'gray' as const };
  if (now > Date.parse(match.kickoffAt) + step.offset * 60000)
    return { label: 'En retard · non validée', tone: 'amber' as const };
  if (
    Object.keys(run.answers).length ||
    (step.kind === 'arrival' && match.startedAt) ||
    (step.kind === 'warmup' && match.warmup.some((phase) => phase.status !== 'IDLE'))
  )
    return { label: 'En cours', tone: 'blue' as const };
  return { label: 'À venir', tone: 'gray' as const };
}
export function createRematch(match: Match, kickoffAt: string) {
  if (match.status !== 'POSTPONED') throw new Error('NOT_POSTPONED');
  const next = createMatch({ ...match, kickoffAt }, match.bag, match.template);
  next.outfits = structuredClone(match.outfits);
  next.originalMatchId = match.id;
  return next;
}
