/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ReleaseValidationIssuesItem } from './releaseValidationIssuesItem';
import type { ReleaseValidationContentCounts } from './releaseValidationContentCounts';

/**
 * 校验本身不发布；题量不足告警，不用占位/复制题补齐。
 */
export interface ReleaseValidation {
  valid: boolean;
  /** @minItems 0 */
  issues: ReleaseValidationIssuesItem[];
  contentCounts: ReleaseValidationContentCounts;
}
