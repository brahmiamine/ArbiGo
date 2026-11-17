import type { Match, OperationInput } from '@/domain/types';

/** Complete a test match through the same commands accepted by synchronization. */
export function preparationActions(match: Match): OperationInput[] {
  return match.template.steps.flatMap((step): OperationInput[] => {
    if (step.kind === 'final' || match.runs[step.code].completedAt) return [];
    if (step.kind === 'locker')
      return [
        {
          type: 'LOCKER_ROOMS',
          rooms: step.code === 'referee-locker' ? { referee: 'A1' } : { home: '2', away: '3' },
        },
      ];
    if (step.code === 'captains' || step.code === 'assistants')
      return [{ type: 'BRIEFING', stepCode: step.code }];
    return [
      ...step.controls.map((control): OperationInput => ({
        type: 'ANSWER',
        stepCode: step.code,
        controlCode: control.code,
        value: 'OK',
      })),
      ...(step.kind === 'warmup'
        ? [0, 1, 2, 3].flatMap((phase): OperationInput[] => [
            { type: 'WARMUP', phase, command: 'START' },
            { type: 'WARMUP', phase, command: 'FINISH' },
          ])
        : []),
      { type: 'COMPLETE', stepCode: step.code },
    ];
  });
}
