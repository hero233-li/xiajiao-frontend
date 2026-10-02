/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Enrollment } from './enrollment';
import type { GetEnrollmentResponseMessage } from './getEnrollmentResponseMessage';

export interface GetEnrollmentResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: Enrollment;
  message: GetEnrollmentResponseMessage;
}
