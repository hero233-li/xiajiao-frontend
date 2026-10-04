/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ReadinessResponseCode } from './readinessResponseCode';
import type { Readiness } from './readiness';

export interface ReadinessResponse {
  code: ReadinessResponseCode;
  data: Readiness;
  message: string;
}
