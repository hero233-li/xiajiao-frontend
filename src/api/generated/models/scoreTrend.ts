/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ScoreRecord } from './scoreRecord';

/**
 * 最近成绩原记录趋势，可包含重复或不参与预测的记录；不以趋势样本替代预测筛选。
 */
export interface ScoreTrend {
  /** 稳定UUID */
  courseId: string;
  /** @minItems 0 */
  records: ScoreRecord[];
}
