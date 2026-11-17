import type { Match, MatchInput, Equipment, Template, Operation } from './types';
import { z } from 'zod';
import { rankOutfits } from './equipment';

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
  if (match.status !== 'DRAFT' && match.status !== 'ACTIVE' && a.type !== 'NOTE')
    throw new Error('CLOSED');
  if (
    match.ownerDeviceId &&
    a.type !== 'NOTE' &&
    (op.deviceId !== match.ownerDeviceId || op.fencingVersion !== match.fencingVersion)
  )
    throw new Error('DEVICE_REVOKED');
  if (!Number.isFinite(Date.parse(op.occurredAt))) throw new Error('INVALID_TIME');
  if (match.status === 'DRAFT' && !['START', 'BAG'].includes(a.type))
    throw new Error('NOT_STARTED');
  const m = structuredClone(match);
  const at = op.occurredAt;
  switch (a.type) {
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
    case 'COMPLETE': {
      const step = m.template.steps.find((s) => s.code === a.stepCode);
      if (!step || step.kind === 'final') throw new Error('STEP_UNKNOWN');
      if (step.controls.some((c) => !m.runs[step.code].answers[c.code]))
        throw new Error('CHECKS_REQUIRED');
      if (step.kind === 'kit' && (!m.colorsConfirmedAt || !m.selectedOutfitId))
        throw new Error('KIT_REQUIRED');
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
      if (Object.values(a.colors).some((c) => !c.length)) throw new Error('COLORS_REQUIRED');
      const outfit = rankOutfits(m.outfits, m.bag, a.colors).find(
        (o) => o.id === a.selectedOutfitId,
      );
      if (!outfit) throw new Error('OUTFIT_NOT_PACKED');
      m.colors = structuredClone(a.colors);
      m.colorsConfirmedAt = at;
      m.selectedOutfitId = a.selectedOutfitId;
      delete m.runs.kit.completedAt;
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
export function createRematch(match: Match, kickoffAt: string) {
  if (match.status !== 'POSTPONED') throw new Error('NOT_POSTPONED');
  const next = createMatch({ ...match, kickoffAt }, match.bag, match.template);
  next.outfits = structuredClone(match.outfits);
  next.originalMatchId = match.id;
  return next;
}
