/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type ScoreRecordPredictionExclusionReasonsItem = typeof ScoreRecordPredictionExclusionReasonsItem[keyof typeof ScoreRecordPredictionExclusionReasonsItem];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ScoreRecordPredictionExclusionReasonsItem = {
  INCOMPLETE: 'INCOMPLETE',
  OPEN_BOOK: 'OPEN_BOOK',
  OVERTIME: 'OVERTIME',
  ANSWERS_SEEN: 'ANSWERS_SEEN',
  ANSWERS_STATE_UNKNOWN: 'ANSWERS_STATE_UNKNOWN',
  NOT_FIRST_VALID: 'NOT_FIRST_VALID',
  FIRST_VALID_TOO_OLD: 'FIRST_VALID_TOO_OLD',
  OUTSIDE_LATEST_FIVE: 'OUTSIDE_LATEST_FIVE',
} as const;
