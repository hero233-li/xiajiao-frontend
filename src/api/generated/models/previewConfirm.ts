/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface PreviewConfirm {
  /** @minimum 1 */
  baseRevision: number;
  /**
   * SHA-256十六进制
   * @pattern ^[0-9a-f]{64}$
   */
  inputFingerprint: string;
  /** 有缺口时必须true；先看预览后本人选择 */
  acceptUnscheduled: boolean;
  /** 本人明确确认 */
  confirm: boolean;
}
