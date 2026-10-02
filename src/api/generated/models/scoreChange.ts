/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ScoreRecord } from './scoreRecord';
import type { Prediction } from './prediction';
import type { Unlock } from './unlock';

export interface ScoreChange {
  record: ScoreRecord;
  prediction: Prediction;
  unlock: Unlock;
}
