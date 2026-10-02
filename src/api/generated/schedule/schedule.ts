/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  AdminGetTaskTemplatesResponse,
  AdminPutTaskTemplatesResponse,
  CompletePlanTaskResponse,
  ConfirmRescheduleResponse,
  CreatePlanResponse,
  GetPlanResponse,
  GetPlanRevisionResponse,
  GetReschedulePreviewResponse,
  ListPlansParams,
  ListPlansResponse,
  PlanCreate,
  PreviewConfirm,
  PreviewRescheduleResponse,
  RescheduleRequest,
  TaskCompletionWrite,
  TemplateDraft
} from '.././models';

import { apiRequest } from '../../http';
import type { BodyType } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 本人数据，身份来自JWT。
 * @summary 本人学习计划列表
 */
export const listPlans = (
    params?: ListPlansParams,
 options?: SecondParameter<typeof apiRequest<ListPlansResponse>>,) => {
      return apiRequest<ListPlansResponse>(
      {url: `/api/v1/schedule/plans`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 显式创建命令即确认配置；参数/估时缺失拒绝，不造默认时长。有缺口且acceptUnscheduled=false拒绝并message给缺口小时；true仅表示本人明确接受未排入，不延长考试日期。每科任务严格早于考试日，未知日AWAITING_DATE。顺延另走预览确认，不在此自动覆盖已有计划。
本人数据，身份来自JWT。
 * @summary 按配置生成并保存计划快照
 */
export const createPlan = (
    planCreate: BodyType<PlanCreate>,
 options?: SecondParameter<typeof apiRequest<CreatePlanResponse>>,) => {
      return apiRequest<CreatePlanResponse>(
      {url: `/api/v1/schedule/plans`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: planCreate
    },
      options);
    }
  /**
 * 返回同一当前plan_revision及目录关联完成状态；GET不重建计划，已发布目录升级不重排快照。
本人数据，身份来自JWT。
 * @summary 计划快照、每日安排与完成进度
 */
export const getPlan = (
    planId: string,
 options?: SecondParameter<typeof apiRequest<GetPlanResponse>>,) => {
      return apiRequest<GetPlanResponse>(
      {url: `/api/v1/schedule/plans/${planId}`, method: 'GET'
    },
      options);
    }
  /**
 * 历史版本只读；完成状态来自任务/目录的当前事实，排期标题/时长是版本快照。
本人数据，身份来自JWT。
 * @summary 查看旧计划排期快照
 */
export const getPlanRevision = (
    planId: string,
    revisionNo: number,
 options?: SecondParameter<typeof apiRequest<GetPlanRevisionResponse>>,) => {
      return apiRequest<GetPlanRevisionResponse>(
      {url: `/api/v1/schedule/plans/${planId}/revisions/${revisionNo}`, method: 'GET'
    },
      options);
    }
  /**
 * ITEM与目录同步，不能让两个完成字段独立漂移；非ITEM任务独立勾选。按baseRevision、expectedCompleted及ITEM的expectedItemRevision串行校验，返回最新课程/总进度，前端刷新计划与聚合。
本人数据，身份来自JWT。
 * @summary 完成计划任务并同步目录
 */
export const completePlanTask = (
    planId: string,
    taskId: string,
    taskCompletionWrite: BodyType<TaskCompletionWrite>,
 options?: SecondParameter<typeof apiRequest<CompletePlanTaskResponse>>,) => {
      return apiRequest<CompletePlanTaskResponse>(
      {url: `/api/v1/schedule/plans/${planId}/tasks/${taskId}/completion`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: taskCompletionWrite
    },
      options);
    }
  /**
 * 保留已完成、今天、未来安排；仅过去未完成段从明天排入剩余空闲；不越过各科考试日。预览不切正式版本，返回移动、缺口分钟/小时和三个选项；调整时长/优先级重新预览。
本人数据，身份来自JWT。
 * @summary 生成一键顺延预览
 */
export const previewReschedule = (
    planId: string,
    rescheduleRequest: BodyType<RescheduleRequest>,
 options?: SecondParameter<typeof apiRequest<PreviewRescheduleResponse>>,) => {
      return apiRequest<PreviewRescheduleResponse>(
      {url: `/api/v1/schedule/plans/${planId}/reschedule-previews`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: rescheduleRequest
    },
      options);
    }
  /**
 * 本人归属；已过期或输入变化提示重新预览，不把旧预览当当前计划。
本人数据，身份来自JWT。
 * @summary 读取顺延预览
 */
export const getReschedulePreview = (
    planId: string,
    previewId: string,
 options?: SecondParameter<typeof apiRequest<GetReschedulePreviewResponse>>,) => {
      return apiRequest<GetReschedulePreviewResponse>(
      {url: `/api/v1/schedule/plans/${planId}/reschedule-previews/${previewId}`, method: 'GET'
    },
      options);
    }
  /**
 * 确认锁基准revision、上海today、进度/考试日/容量指纹；变化或跨午夜40903。有缺口且未接受禁止写入；接受只保留UNSCHEDULED，不延长考试日期。重复确认返回已创建版本，不再次移动任务。
本人数据，身份来自JWT。
 * @summary 本人确认顺延预览并写新版本
 */
export const confirmReschedule = (
    planId: string,
    previewId: string,
    previewConfirm: BodyType<PreviewConfirm>,
 options?: SecondParameter<typeof apiRequest<ConfirmRescheduleResponse>>,) => {
      return apiRequest<ConfirmRescheduleResponse>(
      {url: `/api/v1/schedule/plans/${planId}/reschedule-previews/${previewId}/confirmation`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: previewConfirm
    },
      options);
    }
  /**
 * 已发布内容可读，答案仅管理用途，不供学习页面预载；无当前配置返回404，不造默认数据。
仅ADMIN。
 * @summary 管理员读取版本纸卷/复习任务模板与估时
 */
export const adminGetTaskTemplates = (
    courseId: string,
    releaseId: string,
 options?: SecondParameter<typeof apiRequest<AdminGetTaskTemplatesResponse>>,) => {
      return apiRequest<AdminGetTaskTemplatesResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/task-templates`, method: 'GET'
    },
      options);
    }
  /**
 * 仅DRAFT允许替换；已发布或被session引用禁止原地改。共享内容稳定ID与用户状态分离；实际关联/去重/配置由后端校验。管理答案读取写入必须单独审计，不作为学生答题旁路。
仅ADMIN。
 * @summary 管理员维护草稿纸卷/复习任务模板与估时
 */
export const adminPutTaskTemplates = (
    courseId: string,
    releaseId: string,
    templateDraft: BodyType<TemplateDraft>,
 options?: SecondParameter<typeof apiRequest<AdminPutTaskTemplatesResponse>>,) => {
      return apiRequest<AdminPutTaskTemplatesResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/task-templates`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: templateDraft
    },
      options);
    }
  export type ListPlansResult = NonNullable<Awaited<ReturnType<typeof listPlans>>>
export type CreatePlanResult = NonNullable<Awaited<ReturnType<typeof createPlan>>>
export type GetPlanResult = NonNullable<Awaited<ReturnType<typeof getPlan>>>
export type GetPlanRevisionResult = NonNullable<Awaited<ReturnType<typeof getPlanRevision>>>
export type CompletePlanTaskResult = NonNullable<Awaited<ReturnType<typeof completePlanTask>>>
export type PreviewRescheduleResult = NonNullable<Awaited<ReturnType<typeof previewReschedule>>>
export type GetReschedulePreviewResult = NonNullable<Awaited<ReturnType<typeof getReschedulePreview>>>
export type ConfirmRescheduleResult = NonNullable<Awaited<ReturnType<typeof confirmReschedule>>>
export type AdminGetTaskTemplatesResult = NonNullable<Awaited<ReturnType<typeof adminGetTaskTemplates>>>
export type AdminPutTaskTemplatesResult = NonNullable<Awaited<ReturnType<typeof adminPutTaskTemplates>>>
