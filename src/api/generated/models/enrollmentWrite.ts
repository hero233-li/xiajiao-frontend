/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 只改本人报考状态与正式成绩；不接受考试日期、课程目录、用户ID或派生进度。
 */
export interface EnrollmentWrite {
  paid: boolean;
  /**
   * @minimum 0
   * @maximum 99999999.99
   * @nullable
   */
  fee: number | null;
  /**
   * @minimum 0
   * @maximum 100
   * @nullable
   */
  officialScore: number | null;
  /** @nullable */
  officialPassed: boolean | null;
  /**
   * @nullable
   * @pattern ^\d{4}-(0[1-9]|1[0-2])$
   */
  passedMonth: string | null;
  /** @maxLength 10000 */
  note: string;
  /**
   * 资源乐观锁修订号；不存在的用户状态按0；冲突返回40901
   * @minimum 0
   */
  expectedRevision: number;
}
