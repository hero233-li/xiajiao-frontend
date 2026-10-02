/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { FileMetadataState } from './fileMetadataState';
import type { FileMetadataPurpose } from './fileMetadataPurpose';

/**
 * 不返回storageKey或公开/长期有效对象链接。
 */
export interface FileMetadata {
  /** 稳定UUID */
  id: string;
  name: string;
  mimeType: string;
  /**
   * 真实字节数
   * @minimum 1
   */
  sizeBytes: number;
  /**
   * SHA-256十六进制
   * @pattern ^[0-9a-f]{64}$
   */
  sha256: string;
  /** 题答合一/含答案标记 */
  containsAnswers: boolean;
  state: FileMetadataState;
  purpose: FileMetadataPurpose;
}
