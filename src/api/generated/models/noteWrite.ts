/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface NoteWrite {
  /** 稳定UUID */
  courseId: string;
  /** 上海时区业务日期 */
  noteDate: string;
  /**
   * @minLength 1
   * @maxLength 5000
   */
  content: string;
}
