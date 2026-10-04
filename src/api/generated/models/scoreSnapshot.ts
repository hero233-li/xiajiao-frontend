/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ScoreSnapshotSource } from './scoreSnapshotSource';

export interface ScoreSnapshot {
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
  source: ScoreSnapshotSource;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  createdAt: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  updatedAt: string;
  /**
   * 资源乐观锁修订号；不存在的用户状态按0；冲突返回40901
   * @minimum 0
   */
  revision: number;
  userId: string;
}
