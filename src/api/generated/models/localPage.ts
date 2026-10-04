/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface LocalPage {
  fileId: string;
  /**
   * @minimum 1
   * @maximum 20
   */
  pageNo: number;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}
