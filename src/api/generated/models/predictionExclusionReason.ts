/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type PredictionExclusionReason = typeof PredictionExclusionReason[keyof typeof PredictionExclusionReason];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const PredictionExclusionReason = {
  NO_VALID_RECORD: 'NO_VALID_RECORD',
  FIRST_VALID_TOO_OLD: 'FIRST_VALID_TOO_OLD',
  OUTSIDE_LATEST_FIVE: 'OUTSIDE_LATEST_FIVE',
} as const;
