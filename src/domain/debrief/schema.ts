import { z } from 'zod';
import { createEmptyForm, normalizeForm } from './formModel';
import { localDateParts } from '@/domain/time';

const identity = z.string().max(200);
const narrative = z.string().max(5000);
export const debriefFormSchema = z
  .object({
    matchNumber: identity,
    homeTeam: identity,
    awayTeam: identity,
    date: z
      .string()
      .max(10)
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v)),
    time: z
      .string()
      .max(5)
      .refine((v) => !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v)),
    competition: identity,
    referee: identity,
    assistant1: identity,
    assistant2: identity,
    words: z.array(z.string().max(28)).length(3),
    strengths: z.array(narrative).length(2),
    improvement: narrative,
    facts: z.array(narrative).length(2),
    relation: z
      .string()
      .refine((v) => ['', 'Très satisfaisante', 'Satisfaisante', 'À améliorer'].includes(v)),
    relationWhy: narrative,
    rating: z.string().refine((v) => /^(?:[1-9](?:\.5)?|10)$/.test(v)),
    redo: narrative,
    objective: narrative,
  })
  .strict();
export const debriefChangesSchema = debriefFormSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0);
export type DebriefForm = z.infer<typeof debriefFormSchema>;
export interface DebriefRecord {
  form: DebriefForm;
  updatedAt: string;
}
export function createMatchDebrief(
  match: {
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
    timezone: string;
    competition?: string;
  },
  referee = '',
): DebriefForm {
  const local = localDateParts(match.kickoffAt, match.timezone);
  return {
    ...createEmptyForm(),
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    date: local.date,
    time: local.time,
    competition: match.competition ?? '',
    referee,
  };
}

/** Recover older or partially damaged local drafts without sending invalid values to controls. */
export function restoreDebriefForm(value: unknown, fallback: DebriefForm): DebriefForm {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const normalized = normalizeForm(value) as Record<string, unknown>;
  const result = { ...fallback };
  for (const [key, schema] of Object.entries(debriefFormSchema.shape)) {
    if (!Object.hasOwn(value, key)) continue;
    const raw = (value as Record<string, unknown>)[key];
    if (Array.isArray(fallback[key as keyof DebriefForm]) !== Array.isArray(raw)) continue;
    if (!Array.isArray(raw) && typeof raw !== 'string' && typeof raw !== 'number') continue;
    const parsed = schema.safeParse(normalized[key]);
    if (parsed.success) Object.assign(result, { [key]: parsed.data });
  }
  return result;
}
