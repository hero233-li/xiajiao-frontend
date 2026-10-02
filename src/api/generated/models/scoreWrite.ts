/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 纸卷自报，不参与解锁；后端选择首有效，不存在first；日期不能晚于今天，必须对应已收录paper。
 */
export interface ScoreWrite {
  /** 稳定UUID */
  cycleId: string;
  /** 稳定UUID */
  paperId: string;
  /** 上海时区业务日期 */
  practicedOn: string;
  /**
   * @minimum 0
   * @maximum 100
   */
  score: number;
  /**
   * @minimum 1
   * @maximum 1440
   */
  minutes: number;
  /**
   * @minimum 1
   * @maximum 1440
   */
  limitMinutes: number;
  complete: boolean;
  closedBook: boolean;
  /** 用户自报做题前是否看过本卷答案；true不参与预测 */
  answersSeenBefore: boolean;
  /** @maxLength 5000 */
  note: string;
}
