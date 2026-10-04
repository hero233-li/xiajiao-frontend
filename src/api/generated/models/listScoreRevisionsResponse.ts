/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ListScoreRevisionsResponseCode } from './listScoreRevisionsResponseCode';
import type { ScoreRevisionPage } from './scoreRevisionPage';

export interface ListScoreRevisionsResponse {
  code: ListScoreRevisionsResponseCode;
  data: ScoreRevisionPage;
  message: string;
}
