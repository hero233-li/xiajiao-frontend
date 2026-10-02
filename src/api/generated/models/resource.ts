/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ResourceKind } from './resourceKind';

/**
 * FILE使用资源下载接口；url仅LINK非空。管理员发布验证不得把受保护答案/PDF放入公共URL。
 */
export interface Resource {
  kind: ResourceKind;
  label: string;
  /**
   * 仅公开外部学习链接；受控附件不能在此暴露直链
   * @nullable
   */
  url: string | null;
  /**
   * 稳定UUID
   * @nullable
   */
  fileId: string | null;
}
