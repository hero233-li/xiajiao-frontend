/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PracticeStats } from './practiceStats';

/**
 * 对应本人已经正式提交的这一revision；答案仅在此和本人提交历史详情开放。
 */
export interface PracticeResult {
  /** 稳定UUID */
  submissionId: string;
  /** 稳定UUID */
  questionId: string;
  /** 稳定UUID */
  revisionId: string;
  /** @minimum 0 */
  selectedOption: number;
  correct: boolean;
  /** @minimum 0 */
  correctOption: number;
  correctAnswer: string;
  explanation: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  submittedAt: string;
  stats: PracticeStats;
}
