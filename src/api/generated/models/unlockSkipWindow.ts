/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type UnlockSkipWindow = {
  /**
   * 上海时区业务日期
   * @nullable
   */
  examDate: string | null;
  /**
   * 上海时区业务日期
   * @nullable
   */
  windowStart: string | null;
  /**
   * 上海时区业务日期
   * @nullable
   */
  windowEnd: string | null;
  canConfirm: boolean;
  /** @nullable */
  reason: string | null;
};
