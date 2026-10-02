/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { HealthResponseCode } from './healthResponseCode';
import type { HealthData } from './healthData';
import type { HealthResponseMessage } from './healthResponseMessage';

export interface HealthResponse {
  code: HealthResponseCode;
  data: HealthData;
  message: HealthResponseMessage;
}
