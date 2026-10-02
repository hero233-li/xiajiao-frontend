/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AdminFileUploadPurpose } from './adminFileUploadPurpose';

/**
 * 仅ADMIN；PAPER允许真实PDF，MANUAL允许符合AdminManualDocument的JSON（Markdown在正文中）。新增用户上传仍只有成绩图片。上传后再由草稿资源引用关联到课程，未关联文件不能从学习接口下载。
 */
export interface AdminFileUpload {
  file: Blob;
  purpose: AdminFileUploadPurpose;
  containsAnswers: boolean;
}
