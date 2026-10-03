/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalRubricState } from './localRubricState';
import type { LocalRubricDocument } from './localRubricDocument';

export interface LocalRubric {
  id: string;
  paperId: string;
  version: number;
  state: LocalRubricState;
  document: LocalRubricDocument;
}
