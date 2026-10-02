/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type LegacyRecordSummaryKind = typeof LegacyRecordSummaryKind[keyof typeof LegacyRecordSummaryKind];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const LegacyRecordSummaryKind = {
  ability: 'ability',
  grading: 'grading',
  sprint: 'sprint',
  practice: 'practice',
  task: 'task',
  practice_request: 'practice_request',
  other: 'other',
} as const;
