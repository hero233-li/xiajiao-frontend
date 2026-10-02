/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface PracticeStats {
  /** 稳定UUID */
  courseId: string;
  /**
   * 稳定UUID
   * @nullable
   */
  chapterId: string | null;
  /** @minimum 0 */
  availableOriginalCount: number;
  /**
   * 当前章有效原创ID集合内已正式答过数；跨周期合并练习及终态检测
   * @minimum 0
   */
  answeredOriginalCount: number;
  /**
   * 仅逐次练习提交数，不用旧attempts生成假记录
   * @minimum 0
   */
  practiceAttemptCount: number;
  /** @minimum 0 */
  practiceCorrectCount: number;
  /**
   * 逐次练习正确率，空样本0
   * @minimum 0
   * @maximum 100
   */
  practiceAccuracy: number;
  /**
   * 按每题最新有效练习提交计算
   * @minimum 0
   */
  latestWrongCount: number;
  /**
   * 默认min(100,max(20,ceil(N*0.6)))或章节覆盖
   * @minimum 0
   * @nullable
   */
  gateThreshold: number | null;
  /** @nullable */
  canApplyChapterAssessment: boolean | null;
  /** @minItems 0 */
  blockReasons: string[];
}
