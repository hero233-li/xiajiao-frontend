/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Navigation } from './navigation';

/**
 * 没有真实最近位置时聚合返回NULL；禁止固定课程/固定9%。持久化到现有recent_learning_position列。
 */
export interface LearningPosition {
  /** 稳定UUID */
  courseId: string;
  target: Navigation;
  title: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  updatedAt: string;
}
