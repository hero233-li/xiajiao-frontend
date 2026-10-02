/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ManualSectionsItem } from './manualSectionsItem';

/**
 * 练习勾选复用目录API；需要解答时用exampleId按需取，不携带答案。内容来源为ADMIN维护的私有MANUAL文件/内容资源；缺失映射必须显式报告。
 */
export interface Manual {
  /** 稳定UUID */
  courseId: string;
  /** 稳定UUID */
  releaseId: string;
  /** @minItems 0 */
  sections: ManualSectionsItem[];
}
