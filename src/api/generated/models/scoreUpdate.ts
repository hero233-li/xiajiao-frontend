/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 编辑不能改变所属周期/试卷，createdAt不变；修改后重新选择首有效记录和计算预测。
 */
export interface ScoreUpdate {
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
  /**
   * 资源乐观锁修订号；不存在的用户状态按0；冲突返回40901
   * @minimum 0
   */
  expectedRevision: number;
}
