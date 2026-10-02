/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { QuestionPublicMode } from './questionPublicMode';
import type { QuestionPublicMark } from './questionPublicMark';
import type { QuestionPublicLatestOutcome } from './questionPublicLatestOutcome';

/**
 * 明确不含correctOption、answer、explanation、solution、answerGuide及存储键；旧版本已答结果不泄漏新revision的标准答案。
 */
export interface QuestionPublic {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  revisionId: string;
  /** 稳定UUID */
  releaseId: string;
  /** 稳定UUID */
  courseId: string;
  /** 稳定UUID */
  chapterId: string;
  mode: QuestionPublicMode;
  /** @minItems 0 */
  pointIds: string[];
  stem: string;
  /** @minItems 2 */
  options: string[];
  /**
   * @minimum 1
   * @maximum 5
   */
  difficulty: number;
  /** 公开来源名称，不包含答案位置或私有URL */
  sourceLabel: string;
  mark: QuestionPublicMark;
  /** @nullable */
  latestOutcome: QuestionPublicLatestOutcome;
}
