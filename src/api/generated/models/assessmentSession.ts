/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AssessmentSessionKind } from './assessmentSessionKind';
import type { AssessmentSessionStatus } from './assessmentSessionStatus';
import type { SessionQuestion } from './sessionQuestion';

/**
 * 此响应任何状态都不含答案或解析；终态结果单独获取。GET只读，不触发超时评分。
 */
export interface AssessmentSession {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  courseId: string;
  /**
   * 稳定UUID
   * @nullable
   */
  chapterId: string | null;
  kind: AssessmentSessionKind;
  /** 稳定UUID */
  releaseId: string;
  /** 稳定UUID */
  policyId: string;
  status: AssessmentSessionStatus;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  startedAt: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  deadlineAt: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  serverTime: string;
  deadlineReached: boolean;
  /** @minimum 1 */
  questionCount: number;
  /** @minimum 1 */
  limitMinutes: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  passScore: number;
  /**
   * SHA-256十六进制
   * @pattern ^[0-9a-f]{64}$
   */
  answerFingerprint: string;
  /** @minItems 0 */
  questions: SessionQuestion[];
}
