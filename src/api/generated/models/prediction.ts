/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PredictionStatus } from './predictionStatus';
import type { PredictionMinimumSamples } from './predictionMinimumSamples';
import type { PredictionMaximumSamples } from './predictionMaximumSamples';
import type { PredictionWindowDays } from './predictionWindowDays';
import type { PredictionSample } from './predictionSample';
import type { PredictionExclusion } from './predictionExclusion';

/**
 * 先按练习日/创建时间/ID取每卷首个完整、闭卷、未超时、未看答案记录，再过滤0–60天含边界；首有效过期不换后续。至少3、最近最多5，旧到新权重1…n；预测四舍五入整数。
 */
export interface Prediction {
  /** 稳定UUID */
  courseId: string;
  /** 上海时区业务日期 */
  asOf: string;
  status: PredictionStatus;
  /**
   * @minimum 0
   * @maximum 100
   * @nullable
   */
  predictedScore: number | null;
  /**
   * @minimum 0
   * @maximum 5
   */
  sampleCount: number;
  /** @minimum 0 */
  minimumSamples: PredictionMinimumSamples;
  /** @minimum 0 */
  maximumSamples: PredictionMaximumSamples;
  /** @minimum 0 */
  windowDays: PredictionWindowDays;
  /** @minItems 0 */
  samples: PredictionSample[];
  /** @minItems 0 */
  exclusions: PredictionExclusion[];
  /**
   * @minimum 0
   * @maximum 100
   * @nullable
   */
  actualMinimum: number | null;
  /**
   * @minimum 0
   * @maximum 100
   * @nullable
   */
  actualMaximum: number | null;
  /** @minimum 0 */
  scoresAtLeast60: number;
  ruleVersion: string;
}
