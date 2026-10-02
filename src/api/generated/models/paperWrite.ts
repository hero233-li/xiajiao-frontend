/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * courseId+年月唯一；文件须ADMIN上传的PAPER用途，题答合一标记来自文件metadata。
 */
export interface PaperWrite {
  /** @pattern ^\d{4}-(0[1-9]|1[0-2])$ */
  paperMonth: string;
  /**
   * @maxLength 20
   * @nullable
   */
  sourceCourseCode: string | null;
  /** 稳定UUID */
  questionFileId: string;
  /**
   * 稳定UUID
   * @nullable
   */
  answerFileId: string | null;
  /**
   * @minimum 1
   * @nullable
   */
  questionPages: number | null;
  /**
   * @minimum 1
   * @nullable
   */
  answerPages: number | null;
  note: string;
}
