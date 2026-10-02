/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type TaskSegmentState = typeof TaskSegmentState[keyof typeof TaskSegmentState];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const TaskSegmentState = {
  SCHEDULED: 'SCHEDULED',
  UNSCHEDULED: 'UNSCHEDULED',
  AWAITING_DATE: 'AWAITING_DATE',
} as const;
