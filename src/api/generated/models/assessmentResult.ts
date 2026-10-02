/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AssessmentResultStatus } from './assessmentResultStatus';
import type { AssessmentResultPass } from './assessmentResultPass';
import type { AssessmentResultAnswersItem } from './assessmentResultAnswersItem';
import type { PracticeStats } from './practiceStats';
import type { Unlock } from './unlock';

/**
 * 原始correctCount*100与passScore*questionCount比较；显示分数不先取整用于判通过。仅本人终态开放；普通纸卷成绩不写pass。
 */
export interface AssessmentResult {
  /** 稳定UUID */
  sessionId: string;
  status: AssessmentResultStatus;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  submittedAt: string;
  /** @minimum 0 */
  correctCount: number;
  /** @minimum 1 */
  questionCount: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  score: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  passScore: number;
  passed: boolean;
  /** @nullable */
  pass: AssessmentResultPass;
  /** @minItems 0 */
  answers: AssessmentResultAnswersItem[];
  stats: PracticeStats;
  unlock: Unlock;
}
