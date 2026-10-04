/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  ReadinessResponse
} from '.././models';

import { apiRequest } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * @summary 数据库就绪检查
 */
export const getReadiness = (
    
 options?: SecondParameter<typeof apiRequest<ReadinessResponse>>,) => {
      return apiRequest<ReadinessResponse>(
      {url: `/api/v1/health/readiness`, method: 'GET'
    },
      options);
    }
  export type GetReadinessResult = NonNullable<Awaited<ReturnType<typeof getReadiness>>>
