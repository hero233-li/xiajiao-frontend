/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ScoreSnapshot } from './scoreSnapshot';
import type { ScoreRevisionCaptureKind } from './scoreRevisionCaptureKind';

export interface ScoreRevision {
  record: ScoreSnapshot;
  captureKind: ScoreRevisionCaptureKind;
  /** @nullable */
  actorId: string | null;
  capturedAt: string;
}
