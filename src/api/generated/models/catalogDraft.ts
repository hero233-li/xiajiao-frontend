/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ChapterDraft } from './chapterDraft';

/**
 * 只允许ADMIN替换草稿公共目录；用户不保存整棵树；ID重复/错误关联拒绝，重命名ID不变。
 */
export interface CatalogDraft {
  /** @minItems 0 */
  chapters: ChapterDraft[];
}
