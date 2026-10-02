/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 标签后端从正文派生；无独立标签编辑或未保存的minutes字段。
 */
export interface NoteUpdate {
  /** 上海时区业务日期 */
  noteDate: string;
  /**
   * @minLength 1
   * @maxLength 5000
   */
  content: string;
  /**
   * 资源乐观锁修订号；不存在的用户状态按0；冲突返回40901
   * @minimum 0
   */
  expectedRevision: number;
}
