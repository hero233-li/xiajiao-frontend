/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type ListQuestionsFilter = typeof ListQuestionsFilter[keyof typeof ListQuestionsFilter];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ListQuestionsFilter = {
  ALL: 'ALL',
  UNANSWERED: 'UNANSWERED',
  WRONG: 'WRONG',
  BOOKMARKED: 'BOOKMARKED',
  UNCERTAIN: 'UNCERTAIN',
} as const;
