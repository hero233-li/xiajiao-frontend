/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type PlanTaskKind = typeof PlanTaskKind[keyof typeof PlanTaskKind];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const PlanTaskKind = {
  ITEM: 'ITEM',
  PAPER: 'PAPER',
  REVIEW: 'REVIEW',
} as const;
