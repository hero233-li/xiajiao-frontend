/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type AdminManualDocumentSectionsItem = {
  /** 稳定UUID */
  chapterId: string;
  title: string;
  /** 不含标准答案的Markdown正文 */
  markdown: string;
  /** @minItems 0 */
  exerciseItemIds: string[];
  /** @minItems 0 */
  exampleIds: string[];
};
