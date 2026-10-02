/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ReleaseValidation } from './releaseValidation';
import type { AdminValidateReleaseResponseMessage } from './adminValidateReleaseResponseMessage';

export interface AdminValidateReleaseResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: ReleaseValidation;
  message: AdminValidateReleaseResponseMessage;
}
