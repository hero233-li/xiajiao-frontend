/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ReadinessStatus } from './readinessStatus';
import type { ReadinessDatabase } from './readinessDatabase';

export interface Readiness {
  status: ReadinessStatus;
  database: ReadinessDatabase;
}
