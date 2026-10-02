/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CountdownStatus } from './countdownStatus';

export interface Countdown {
  /** 稳定UUID */
  courseId: string;
  courseCode: string;
  /**
   * 上海时区业务日期
   * @nullable
   */
  examDate: string | null;
  /**
   * 按上海日期的有符号日差；考试后允许负数
   * @minimum -100000
   * @nullable
   */
  daysRemaining: number | null;
  status: CountdownStatus;
}
