/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PageParameter } from './pageParameter';
import type { SizeParameter } from './sizeParameter';

export type ListPracticeHistoryParams = {
/**
 * 稳定UUID
 */
questionId?: string;
/**
 * 稳定UUID
 */
chapterId?: string;
/**
 * 页码，从1开始
 * @minimum 1
 */
page?: PageParameter;
/**
 * 每页条数
 * @minimum 1
 * @maximum 100
 */
size?: SizeParameter;
};
