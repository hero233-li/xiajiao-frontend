/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ScoreRecordSource } from './scoreRecordSource';
import type { FileMetadata } from './fileMetadata';
import type { ScoreRecordPredictionExclusionReasonsItem } from './scoreRecordPredictionExclusionReasonsItem';

export interface ScoreRecord {
  /** 稳定UUID */
  cycleId: string;
  /** 稳定UUID */
  paperId: string;
  /** 上海时区业务日期 */
  practicedOn: string;
  /**
   * @minimum 0
   * @maximum 100
   */
  score: number;
  /**
   * @minimum 1
   * @maximum 1440
   */
  minutes: number;
  /**
   * @minimum 1
   * @maximum 1440
   */
  limitMinutes: number;
  complete: boolean;
  closedBook: boolean;
  /** @nullable */
  answersSeenBefore: boolean | null;
  /** @maxLength 5000 */
  note: string;
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  courseId: string;
  paperKey: string;
  source: ScoreRecordSource;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  createdAt: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  updatedAt: string;
  /**
   * 资源乐观锁修订号；不存在的用户状态按0；冲突返回40901
   * @minimum 0
   */
  revision: number;
  /** @minItems 0 */
  images: FileMetadata[];
  /** 完整/闭卷/未超时/未看答案条件是否都满足 */
  eligibleConditionsMet: boolean;
  /** 是否后端选中的本卷首条有效记录 */
  selectedAsFirstValid: boolean;
  /** 是否进入当前60天最近最多5套样本 */
  includedInPrediction: boolean;
  /**
   * 稳定UUID
   * @nullable
   */
  firstValidRecordId: string | null;
  /** @minItems 0 */
  predictionExclusionReasons: ScoreRecordPredictionExclusionReasonsItem[];
}
