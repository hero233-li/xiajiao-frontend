/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type ContentReleaseState = typeof ContentReleaseState[keyof typeof ContentReleaseState];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ContentReleaseState = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  RETIRED: 'RETIRED',
} as const;
