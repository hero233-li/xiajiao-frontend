/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface Enrollment {
  /** 稳定UUID */
  cycleId: string;
  /** 稳定UUID */
  courseId: string;
  paid: boolean;
  /**
   * 报考费，元
   * @minimum 0
   * @maximum 99999999.99
   * @nullable
   */
  fee: number | null;
  /**
   * 正式考试成绩，不用于检测解锁
   * @minimum 0
   * @maximum 100
   * @nullable
   */
  officialScore: number | null;
  /** @nullable */
  officialPassed: boolean | null;
  /**
   * 通过年月，不把合格伪造成60分
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
  revision: number;
}
