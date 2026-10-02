/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { TaskTemplateKind } from './taskTemplateKind';
import type { TaskTemplateResource } from './taskTemplateResource';

export interface TaskTemplate {
  /** 稳定UUID */
  id: string;
  kind: TaskTemplateKind;
  /**
   * @minLength 1
   * @maxLength 500
   */
  title: string;
  /** @minimum 1 */
  estimatedMinutes: number;
  /** @nullable */
  resource: TaskTemplateResource;
  /** @minimum 0 */
  sortOrder: number;
}
