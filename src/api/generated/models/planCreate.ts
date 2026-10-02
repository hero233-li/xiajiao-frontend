/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PlanConfig } from './planConfig';

export interface PlanCreate {
  config: PlanConfig;
  /** 创建命令是否明确接受无法排入的任务；false且有缺口则不创建 */
  acceptUnscheduled: boolean;
}
