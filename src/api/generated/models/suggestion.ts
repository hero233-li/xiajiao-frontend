/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Navigation } from './navigation';

/**
 * 后端取选中计划今天SCHEDULED分段中首个未完成任务，按sortOrder、segmentId稳定排序并去重任务；无任务时NULL，配套message为暂无今日安排。前端不自行拼装/排序。
 */
export interface Suggestion {
  title: string;
  reason: string;
  /**
   * 稳定UUID
   * @nullable
   */
  taskId: string | null;
  target: Navigation;
}
