/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { NavigationPane } from './navigationPane';

/**
 * 前端统一路由映射使用结构化目标；不得把章节标题当关联键。
 */
export interface Navigation {
  pane: NavigationPane;
  /**
   * 五位课程代码；保留前导零
   * @pattern ^[0-9]{5}$
   */
  courseCode: string;
  /**
   * 稳定UUID
   * @nullable
   */
  chapterId: string | null;
  /**
   * 稳定UUID
   * @nullable
   */
  itemId: string | null;
  /**
   * 稳定UUID
   * @nullable
   */
  questionId: string | null;
}
