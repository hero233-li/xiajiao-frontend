/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface LocalWorker {
  id: string;
  label: string;
  online: boolean;
  paused: boolean;
  /** @nullable */
  reason: string | null;
  revoked: boolean;
}
