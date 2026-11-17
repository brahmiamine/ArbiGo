import { z } from 'zod';
import type { Template } from './types';
export const preparationStepCodes = [
  'arrival',
  'referee-locker',
  'team-lockers',
  'sportcash',
  'pitch',
  'sheet-progress',
  'kit',
  'sheet',
  'captains',
  'warmup',
  'assistants',
  'players',
  'protocol',
] as const;
export type PreparationStepCode = (typeof preparationStepCodes)[number];
const uniqueCodes = z
  .array(z.enum(preparationStepCodes))
  .max(preparationStepCodes.length)
  .refine(
    (values) => new Set(values).size === values.length,
    'Une étape ne peut apparaître qu’une fois.',
  );
export const stepPreferencesSchema = z
  .object({
    order: uniqueCodes,
    disabled: uniqueCodes,
    checkoutEnabled: z.boolean().default(true),
  })
  .strict();
export type StepPreferences = z.infer<typeof stepPreferencesSchema>;
export function normalizeStepPreferences(input?: StepPreferences): StepPreferences {
  const parsed = stepPreferencesSchema.parse(input ?? { order: [], disabled: [] });
  return {
    ...parsed,
    order: [
      ...parsed.order,
      ...preparationStepCodes.filter((code) => !parsed.order.includes(code)),
    ],
  };
}
/** Positions keep the existing countdown slots; disabled positions are simply skipped. */
export function personalizeTemplate(template: Template, preferences: StepPreferences): Template {
  const settings = normalizeStepPreferences(preferences);
  const preparation = template.steps.filter((step) => step.kind !== 'final');
  const positions = new Map<string, number>(settings.order.map((code, index) => [code, index]));
  const ordered = [...preparation].sort(
    (a, b) => (positions.get(a.code) ?? 100) - (positions.get(b.code) ?? 100),
  );
  const steps = ordered
    .map((step, index) => ({ ...structuredClone(step), offset: preparation[index].offset }))
    .filter((step) => !settings.disabled.includes(step.code as PreparationStepCode));
  return {
    ...structuredClone(template),
    steps: [...steps, ...structuredClone(template.steps.filter((step) => step.kind === 'final'))],
  };
}
