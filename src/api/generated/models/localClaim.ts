/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalClaimKind } from './localClaimKind';
import type { LocalInputs } from './localInputs';

export interface LocalClaim {
  taskId: string;
  kind: LocalClaimKind;
  leaseToken: string;
  leaseUntil: string;
  deadline: string;
  inputs: LocalInputs;
}
