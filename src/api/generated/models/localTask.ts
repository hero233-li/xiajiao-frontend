/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalTaskKind } from './localTaskKind';
import type { LocalTaskState } from './localTaskState';
import type { LocalTaskResult } from './localTaskResult';
import type { LocalTaskRubricDraft } from './localTaskRubricDraft';

export interface LocalTask {
  id: string;
  kind: LocalTaskKind;
  state: LocalTaskState;
  /** @nullable */
  submissionId: string | null;
  /** @nullable */
  rubricId: string | null;
  /** @nullable */
  model: string | null;
  /** @nullable */
  result: LocalTaskResult;
  /** @nullable */
  rubricDraft: LocalTaskRubricDraft;
  /** @nullable */
  scoreId: string | null;
  /** @nullable */
  error: string | null;
  /** @nullable */
  leaseUntil: string | null;
  workerOnline: boolean;
  /** @nullable */
  workerReason: string | null;
}
