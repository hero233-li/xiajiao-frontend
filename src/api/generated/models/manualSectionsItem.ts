/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ManualSectionsItemExercisesItem } from './manualSectionsItemExercisesItem';

export type ManualSectionsItem = {
  /** 稳定UUID */
  chapterId: string;
  title: string;
  /** 已拆除标准答案的手册正文 */
  markdown: string;
  /** @minItems 0 */
  exercises: ManualSectionsItemExercisesItem[];
};
