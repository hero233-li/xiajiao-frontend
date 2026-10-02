/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ErrorResponseData } from './errorResponseData';

/**
 * 失败固定data:null，不在失败响应塞另一种分页/详情结构。
 */
export interface ErrorResponse {
  /**
   * 稳定业务错误码，与HTTP状态配套
   * @minimum 1
   */
  code: number;
  /** @nullable */
  data: ErrorResponseData;
  /** 中文错误原因 */
  message: string;
}
