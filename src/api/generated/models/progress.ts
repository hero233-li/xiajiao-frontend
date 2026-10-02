/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 课程进度按本课当前发布条目数；overallProgress按固定首版六科当前发布条目汇总，四舍五入/空目录0，不受考试周期、列表筛选或学习计划选择改变。
 */
export interface Progress {
  /** @minimum 0 */
  completedItems: number;
  /** @minimum 0 */
  totalItems: number;
  /**
   * 后端四舍五入的百分数；空目录为0
   * @minimum 0
   * @maximum 100
   */
  percent: number;
}
