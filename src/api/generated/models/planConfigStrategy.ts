/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 省略为原连续排期；WEEKLY_35固定35天、4门理论科目，前4周各1门，第5周真题与复习
 */
export type PlanConfigStrategy = typeof PlanConfigStrategy[keyof typeof PlanConfigStrategy];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const PlanConfigStrategy = {
  SEQUENTIAL: 'SEQUENTIAL',
  WEEKLY_35: 'WEEKLY_35',
} as const;
