/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface CycleCourse {
  /** 稳定UUID */
  courseId: string;
  /**
   * 上海时区业务日期
   * @nullable
   */
  examDate: string | null;
  /**
   * HH:mm:ss或NULL
   * @nullable
   */
  startsAt: string | null;
  /**
   * HH:mm:ss或NULL
   * @nullable
   */
  endsAt: string | null;
}
