/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ListQuestionsMode } from './listQuestionsMode';
import type { ListQuestionsFilter } from './listQuestionsFilter';
import type { PageParameter } from './pageParameter';
import type { SizeParameter } from './sizeParameter';

export type ListQuestionsParams = {
/**
 * 稳定UUID
 */
chapterId?: string;
mode?: ListQuestionsMode;
filter?: ListQuestionsFilter;
/**
 * @minimum 1
 * @maximum 5
 */
difficulty?: number;
/**
 * @maxLength 200
 */
q?: string;
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
