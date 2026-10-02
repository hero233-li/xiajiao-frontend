/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  AdminListAuditEventsParams,
  AdminListAuditEventsResponse,
  GetDashboardParams,
  GetDashboardResponse,
  HealthResponse
} from '.././models';

import { apiRequest } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 一个请求返回继续学习位置、今日建议、总进度、倒计时及课程卡片。同一后端一致性快照，所有页面使用当前六科发布目录按条目汇总的进度，课程/搜索筛选和周期不改变分母。最近位置按updatedAt倒序/课程ID取首条。今日建议取今日计划首个未完成任务，按sortOrder/segmentId排序；没有时todaySuggestion=NULL且todaySuggestionMessage=暂无今日安排。未指定planId时，取本人该周期按createdAt、ID倒序的首份计划及其当前确认版本；显式planId须属于本人及该周期。没有计划或今天无未完成安排时建议NULL并显示暂无今日安排。
本人数据，身份来自JWT。
 * @summary 首页与备考总览聚合
 */
export const getDashboard = (
    params: GetDashboardParams,
 options?: SecondParameter<typeof apiRequest<GetDashboardResponse>>,) => {
      return apiRequest<GetDashboardResponse>(
      {url: `/api/v1/dashboard`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 包括发布、作废、跳过/撤销、迁移确认、附件删除；脱敏且只读，不提供改写/删除审计接口。
仅ADMIN。
 * @summary 管理员查看关键操作审计
 */
export const adminListAuditEvents = (
    params?: AdminListAuditEventsParams,
 options?: SecondParameter<typeof apiRequest<AdminListAuditEventsResponse>>,) => {
      return apiRequest<AdminListAuditEventsResponse>(
      {url: `/api/v1/admin/dashboard/audit-events`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 无需登录，仅表示HTTP进程存活，不代表数据库或其他依赖此刻就绪；没有新增业务模块。带无效Bearer会被认证过滤器拒绝。
 * @summary HTTP进程存活检查
 */
export const getHealth = (
    
 options?: SecondParameter<typeof apiRequest<HealthResponse>>,) => {
      return apiRequest<HealthResponse>(
      {url: `/api/v1/health`, method: 'GET'
    },
      options);
    }
  export type GetDashboardResult = NonNullable<Awaited<ReturnType<typeof getDashboard>>>
export type AdminListAuditEventsResult = NonNullable<Awaited<ReturnType<typeof adminListAuditEvents>>>
export type GetHealthResult = NonNullable<Awaited<ReturnType<typeof getHealth>>>
