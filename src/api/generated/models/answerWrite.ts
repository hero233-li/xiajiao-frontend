/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 只接受题revision和选择；禁止传correct、score或passed。
 */
export interface AnswerWrite {
  /** 稳定UUID */
  revisionId: string;
  /**
   * 选项索引从0开始，须小于选项数
   * @minimum 0
   */
  selectedOption: number;
}
