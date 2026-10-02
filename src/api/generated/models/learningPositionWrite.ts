/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Navigation } from './navigation';

/**
 * 后端验证目标属于课程及发布内容；用户身份来自JWT。无模块内滚动偏移字段，因为现有数据库不保存它。
 */
export interface LearningPositionWrite {
  target: Navigation;
}
