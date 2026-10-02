/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AdminManualDocumentSectionsItem } from './adminManualDocumentSectionsItem';

/**
 * MANUAL上传文件内部的结构化JSON，服务端核对本版章节/目录/例题映射；例题答案仍在example_solution，不写进文件。
 */
export interface AdminManualDocument {
  /** @minItems 0 */
  sections: AdminManualDocumentSectionsItem[];
}
