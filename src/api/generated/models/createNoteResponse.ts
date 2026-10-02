/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Note } from './note';
import type { CreateNoteResponseMessage } from './createNoteResponseMessage';

export interface CreateNoteResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: Note;
  message: CreateNoteResponseMessage;
}
