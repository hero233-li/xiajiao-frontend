/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type AssessmentResultAnswersItem = {
  /** 稳定UUID */
  revisionId: string;
  /**
   * @minimum 0
   * @nullable
   */
  selectedOption: number | null;
  correct: boolean;
  /** @minimum 0 */
  correctOption: number;
  correctAnswer: string;
  explanation: string;
};
