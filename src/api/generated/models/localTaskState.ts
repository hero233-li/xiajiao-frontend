/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type LocalTaskState = typeof LocalTaskState[keyof typeof LocalTaskState];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const LocalTaskState = {
  QUEUED: 'QUEUED',
  GRADING: 'GRADING',
  REVIEW: 'REVIEW',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
