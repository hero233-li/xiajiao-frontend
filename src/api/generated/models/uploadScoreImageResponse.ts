/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { FileMetadata } from './fileMetadata';
import type { UploadScoreImageResponseMessage } from './uploadScoreImageResponseMessage';

export interface UploadScoreImageResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: FileMetadata;
  message: UploadScoreImageResponseMessage;
}
