/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type SessionSummaryStatus = typeof SessionSummaryStatus[keyof typeof SessionSummaryStatus];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const SessionSummaryStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  TIMED_OUT: 'TIMED_OUT',
} as const;
