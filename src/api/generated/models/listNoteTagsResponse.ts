/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { NoteTags } from './noteTags';
import type { ListNoteTagsResponseMessage } from './listNoteTagsResponseMessage';

export interface ListNoteTagsResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: NoteTags;
  message: ListNoteTagsResponseMessage;
}
