/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyPracticeCreditResult } from './legacyPracticeCreditResult';
import type { AdminDecideLegacyCreditResponseMessage } from './adminDecideLegacyCreditResponseMessage';

export interface AdminDecideLegacyCreditResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: LegacyPracticeCreditResult;
  message: AdminDecideLegacyCreditResponseMessage;
}
