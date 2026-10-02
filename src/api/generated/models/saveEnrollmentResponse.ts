/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Enrollment } from './enrollment';
import type { SaveEnrollmentResponseMessage } from './saveEnrollmentResponseMessage';

export interface SaveEnrollmentResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: Enrollment;
  message: SaveEnrollmentResponseMessage;
}
