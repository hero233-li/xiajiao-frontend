/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type CountdownStatus = typeof CountdownStatus[keyof typeof CountdownStatus];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const CountdownStatus = {
  UPCOMING: 'UPCOMING',
  TODAY: 'TODAY',
  FINISHED: 'FINISHED',
  DATE_UNKNOWN: 'DATE_UNKNOWN',
} as const;
