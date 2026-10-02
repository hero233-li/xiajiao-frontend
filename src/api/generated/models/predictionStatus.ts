/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type PredictionStatus = typeof PredictionStatus[keyof typeof PredictionStatus];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const PredictionStatus = {
  AVAILABLE: 'AVAILABLE',
  INSUFFICIENT_SAMPLES: 'INSUFFICIENT_SAMPLES',
} as const;
