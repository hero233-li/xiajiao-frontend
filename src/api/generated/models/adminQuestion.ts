/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AdminQuestionMode } from './adminQuestionMode';

/**
 * 独立管理员题库编辑DTO；指纹由后端规范化计算，不信用户上传指纹。发布验证答案索引、考点/章节/课程一致性。
 */
export interface AdminQuestion {
  /** 稳定UUID */
  id: string;
  /**
   * @minLength 1
   * @maxLength 200
   */
  originalKey: string;
  /** 稳定UUID */
  chapterId: string;
  /** ADMIN已审核原创性；不得复制换ID */
  eligibleOriginal: boolean;
  mode: AdminQuestionMode;
  /** @minLength 1 */
  stem: string;
  /** @minItems 2 */
  options: string[];
  /**
   * @minimum 1
   * @maximum 5
   */
  difficulty: number;
  /** @minItems 1 */
  pointIds: string[];
  /** @minimum 0 */
  correctOption: number;
  correctAnswer: string;
  explanation: string;
  /** @nullable */
  sourceLocator: string | null;
  /** @minimum 0 */
  sortOrder: number;
}
