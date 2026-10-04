/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type LocalTaskKind = typeof LocalTaskKind[keyof typeof LocalTaskKind];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const LocalTaskKind = {
  GRADE: 'GRADE',
  RUBRIC: 'RUBRIC',
} as const;
