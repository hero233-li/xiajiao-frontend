/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 仅作废该条，保留原session与审计；最后模拟依据作废且无其他有效模拟通过/活动override时立即关闭真题下载和成绩写入。
 */
export interface InvalidatePass {
  /** @minLength 1 */
  reason: string;
  /** 本人明确确认 */
  confirm: boolean;
}
