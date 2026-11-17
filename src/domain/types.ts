import type { DebriefForm, DebriefRecord } from './debrief/schema';
export type Practice = 'FOOT_11' | 'FOOT_8' | 'FUTSAL';
export type MatchStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELED' | 'POSTPONED' | 'OTHER';
export type AnswerValue = 'OK' | 'PROBLEM' | 'NA';
export type EquipmentType = 'SHIRT' | 'SHORTS' | 'SOCKS' | 'SHOES' | 'TOOL' | 'OTHER';
export interface Equipment {
  id: string;
  label: string;
  type: EquipmentType;
  colors: string[];
  photoId?: string;
  active?: boolean;
}
export interface BagItem extends Equipment {
  packed: boolean;
}
export interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  primaryColor: string;
  secondaryColor?: string;
}
export type KitColors = Record<'home' | 'homeKeeper' | 'away' | 'awayKeeper', string[]>;
export interface Control {
  code: string;
  label: string;
  allowNA?: boolean;
  critical?: boolean;
}
export interface Step {
  code: string;
  title: string;
  offset: number;
  description: string;
  kind: 'checks' | 'arrival' | 'kit' | 'warmup' | 'final';
  controls: Control[];
}
export interface Template {
  code: string;
  practice: Practice;
  season: string;
  version: number;
  organizer: string;
  status: 'VERIFIED' | 'DRAFT';
  sources: string[];
  steps: Step[];
}
export interface Answer {
  value: AnswerValue;
  at: string;
  comment?: string;
  photoId?: string;
}
export interface StepRun {
  answers: Record<string, Answer>;
  completedAt?: string;
}
export interface Issue {
  id: string;
  stepCode: string;
  controlCode: string;
  critical: boolean;
  reason: string;
  comment?: string;
  photoId?: string;
  status: 'REQUESTED' | 'WAITING' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
}
export interface WarmupPhase {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED';
  startedAt?: string;
  pausedAt?: string;
  endedAt?: string;
  pausedMs: number;
}
export interface MatchInput {
  homeTeam: string;
  awayTeam: string;
  practice: Practice;
  kickoffAt: string;
  timezone: string;
  stadium?: string;
  competition?: string;
  category?: string;
}
export interface Match extends MatchInput {
  id: string;
  version: number;
  status: MatchStatus;
  template: Template;
  bag: BagItem[];
  outfits: Outfit[];
  colors: KitColors;
  colorsConfirmedAt?: string;
  selectedOutfitId?: string;
  currentStep: number;
  runs: Record<string, StepRun>;
  issues: Issue[];
  warmup: WarmupPhase[];
  ownerDeviceId?: string;
  fencingVersion: number;
  startedAt?: string;
  closedAt?: string;
  finishedAt?: string;
  debrief?: DebriefRecord;
  closeComment?: string;
  originalMatchId?: string;
  notes: { id: string; content: string; at: string }[];
  appliedOperations: string[];
}
export type OperationInput =
  | { type: 'START' }
  | { type: 'NAVIGATE'; index: number }
  | { type: 'BAG'; itemId: string; packed: boolean }
  | {
      type: 'ANSWER';
      stepCode: string;
      controlCode: string;
      value: AnswerValue;
      reason?: string;
      comment?: string;
      photoId?: string;
    }
  | { type: 'COMPLETE'; stepCode: string }
  | { type: 'BRIEFING'; stepCode: 'captains' | 'assistants' }
  | { type: 'ISSUE_UPDATE'; issueId: string; status: Issue['status']; comment?: string }
  | { type: 'COLORS'; colors: KitColors; selectedOutfitId?: string }
  | { type: 'WARMUP'; phase: number; command: 'START' | 'PAUSE' | 'RESUME' | 'FINISH' }
  | { type: 'KICKOFF'; acknowledged: boolean }
  | { type: 'CLOSE'; reason: 'CANCELED' | 'POSTPONED' | 'OTHER'; comment: string }
  | { type: 'NOTE'; content: string }
  | { type: 'FINISH_MATCH' }
  | { type: 'DEBRIEF'; changes: Partial<DebriefForm> };
export interface Operation {
  id: string;
  matchId: string;
  deviceId: string;
  fencingVersion: number;
  expectedVersion: number;
  occurredAt: string;
  action: OperationInput;
}
export interface Inventory {
  catalogVersion?: number;
  equipment: Equipment[];
  outfits: Outfit[];
}
