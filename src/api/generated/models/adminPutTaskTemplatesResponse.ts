/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { TemplateDraft } from './templateDraft';
import type { AdminPutTaskTemplatesResponseMessage } from './adminPutTaskTemplatesResponseMessage';

export interface AdminPutTaskTemplatesResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: TemplateDraft;
  message: AdminPutTaskTemplatesResponseMessage;
}
