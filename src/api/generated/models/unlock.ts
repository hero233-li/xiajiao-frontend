/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { UnlockSourcesItem } from './unlockSourcesItem';
import type { UnlockActiveOverride } from './unlockActiveOverride';
import type { UnlockSkipWindow } from './unlockSkipWindow';

/**
 * 每次后端判定；临考跳过不能授权章节检测或模拟申请；新增章节不撤回已有模拟通过的真题权限。最后有效模拟通过作废且无其他有效模拟通过/活动override时立即关闭真题下载和成绩写入。
 */
export interface Unlock {
  /** 稳定UUID */
  courseId: string;
  /** 稳定UUID */
  cycleId: string;
  canDownloadPapers: boolean;
  canWriteScores: boolean;
  canApplyMock: boolean;
  /** @minItems 0 */
  missingChapterIds: string[];
  /** @minItems 0 */
  sources: UnlockSourcesItem[];
  /** @nullable */
  activeOverride: UnlockActiveOverride;
  skipWindow: UnlockSkipWindow;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  evaluatedAt: string;
}
