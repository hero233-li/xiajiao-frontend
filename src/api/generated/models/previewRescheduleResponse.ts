/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PlanPreview } from './planPreview';
import type { PreviewRescheduleResponseMessage } from './previewRescheduleResponseMessage';

export interface PreviewRescheduleResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: PlanPreview;
  message: PreviewRescheduleResponseMessage;
}
