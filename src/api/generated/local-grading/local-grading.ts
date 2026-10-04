/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  LocalApply,
  LocalGrading10200,
  LocalGrading11200,
  LocalGrading1200,
  LocalGrading12200,
  LocalGrading13200,
  LocalGrading13Params,
  LocalGrading14200,
  LocalGrading14Params,
  LocalGrading15200,
  LocalGrading16200,
  LocalGrading17200,
  LocalGrading17Params,
  LocalGrading18200,
  LocalGrading19200,
  LocalGrading1Params,
  LocalGrading20200,
  LocalGrading2200,
  LocalGrading3200,
  LocalGrading4200,
  LocalGrading4Body,
  LocalGrading4Params,
  LocalGrading5200,
  LocalGrading6200,
  LocalGrading6Params,
  LocalGrading7200,
  LocalGrading8200,
  LocalGrading9200,
  LocalPageOrder,
  LocalPairWrite,
  LocalResult,
  LocalRubricDocument,
  LocalSubmissionWrite
} from '.././models';

import { apiRequest } from '../../http';
import type { BodyType } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 列出本人成绩周期答卷（最近100份）
 * @summary 列出本人成绩周期答卷（最近100份）
 */
export const localGrading1 = (
    params: LocalGrading1Params,
 options?: SecondParameter<typeof apiRequest<LocalGrading1200>>,) => {
      return apiRequest<LocalGrading1200>(
      {url: `/api/v1/grading/submissions`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 新建独立答卷；复用成绩写入权限
 * @summary 新建独立答卷；复用成绩写入权限
 */
export const localGrading2 = (
    localSubmissionWrite: BodyType<LocalSubmissionWrite>,
 options?: SecondParameter<typeof apiRequest<LocalGrading2200>>,) => {
      return apiRequest<LocalGrading2200>(
      {url: `/api/v1/grading/submissions`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localSubmissionWrite
    },
      options);
    }
  /**
 * 读取本人答卷
 * @summary 读取本人答卷
 */
export const localGrading3 = (
    id: string,
 options?: SecondParameter<typeof apiRequest<LocalGrading3200>>,) => {
      return apiRequest<LocalGrading3200>(
      {url: `/api/v1/grading/submissions/${id}`, method: 'GET'
    },
      options);
    }
  /**
 * 上传真实JPG/PNG；8MiB每张，最多20张
 * @summary 上传真实JPG/PNG；8MiB每张，最多20张
 */
export const localGrading4 = (
    id: string,
    localGrading4Body: BodyType<LocalGrading4Body>,
    params: LocalGrading4Params,
 options?: SecondParameter<typeof apiRequest<LocalGrading4200>>,) => {const formData = new FormData();
formData.append(`file`, localGrading4Body.file)

      return apiRequest<LocalGrading4200>(
      {url: `/api/v1/grading/submissions/${id}/pages`, method: 'POST',
      headers: {'Content-Type': 'multipart/form-data', },
       data: formData,
        params
    },
      options);
    }
  /**
 * 调整全部页序；乐观版本校验
 * @summary 调整全部页序；乐观版本校验
 */
export const localGrading5 = (
    id: string,
    localPageOrder: BodyType<LocalPageOrder>,
 options?: SecondParameter<typeof apiRequest<LocalGrading5200>>,) => {
      return apiRequest<LocalGrading5200>(
      {url: `/api/v1/grading/submissions/${id}/pages`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: localPageOrder
    },
      options);
    }
  /**
 * 移除答卷页；任务已冻结的实体文件保留
 * @summary 移除答卷页；任务已冻结的实体文件保留
 */
export const localGrading6 = (
    id: string,
    file: string,
    params: LocalGrading6Params,
 options?: SecondParameter<typeof apiRequest<LocalGrading6200>>,) => {
      return apiRequest<LocalGrading6200>(
      {url: `/api/v1/grading/submissions/${id}/pages/${file}`, method: 'DELETE',
        params
    },
      options);
    }
  /**
 * 申请批改，冻结页序、哈希、评分标准及练习信息；同版本重复申请幂等
 * @summary 申请批改，冻结页序、哈希、评分标准及练习信息；同版本重复申请幂等
 */
export const localGrading7 = (
    id: string,
    localApply: BodyType<LocalApply>,
 options?: SecondParameter<typeof apiRequest<LocalGrading7200>>,) => {
      return apiRequest<LocalGrading7200>(
      {url: `/api/v1/grading/submissions/${id}/tasks`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localApply
    },
      options);
    }
  /**
 * 答卷任务历史（最近100项）
 * @summary 答卷任务历史（最近100项）
 */
export const localGrading8 = (
    id: string,
 options?: SecondParameter<typeof apiRequest<LocalGrading8200>>,) => {
      return apiRequest<LocalGrading8200>(
      {url: `/api/v1/grading/submissions/${id}/tasks`, method: 'GET'
    },
      options);
    }
  /**
 * 任务状态、逐题结果及本人工作程序在线原因
 * @summary 任务状态、逐题结果及本人工作程序在线原因
 */
export const localGrading11 = (
    id: string,
 options?: SecondParameter<typeof apiRequest<LocalGrading11200>>,) => {
      return apiRequest<LocalGrading11200>(
      {url: `/api/v1/grading/tasks/${id}`, method: 'GET'
    },
      options);
    }
  /**
 * 本人核对；全部待核对项处理后原子生成CODEX成绩
 * @summary 本人核对；全部待核对项处理后原子生成CODEX成绩
 */
export const localGrading12 = (
    id: string,
    localResult: BodyType<LocalResult>,
 options?: SecondParameter<typeof apiRequest<LocalGrading12200>>,) => {
      return apiRequest<LocalGrading12200>(
      {url: `/api/v1/grading/tasks/${id}/review`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localResult
    },
      options);
    }
  /**
 * 管理员可维护尚未解锁的试卷评分标准（校验周期与课程关联）；普通用户继续受真题解锁与报考限制。
 * @summary 已发布评分标准；管理员同时可读草稿
 */
export const localGrading13 = (
    params: LocalGrading13Params,
 options?: SecondParameter<typeof apiRequest<LocalGrading13200>>,) => {
      return apiRequest<LocalGrading13200>(
      {url: `/api/v1/grading/rubrics`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 管理员建立评分标准新版本草稿，总分100
 * @summary 管理员建立评分标准新版本草稿，总分100
 */
export const localGrading14 = (
    localRubricDocument: BodyType<LocalRubricDocument>,
    params: LocalGrading14Params,
 options?: SecondParameter<typeof apiRequest<LocalGrading14200>>,) => {
      return apiRequest<LocalGrading14200>(
      {url: `/api/v1/grading/rubrics`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localRubricDocument,
        params
    },
      options);
    }
  /**
 * 管理员修改草稿；发布后不可变
 * @summary 管理员修改草稿；发布后不可变
 */
export const localGrading15 = (
    id: string,
    localRubricDocument: BodyType<LocalRubricDocument>,
 options?: SecondParameter<typeof apiRequest<LocalGrading15200>>,) => {
      return apiRequest<LocalGrading15200>(
      {url: `/api/v1/grading/rubrics/${id}`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: localRubricDocument
    },
      options);
    }
  /**
 * 管理员人工核对并发布评分标准
 * @summary 管理员人工核对并发布评分标准
 */
export const localGrading16 = (
    id: string,
 options?: SecondParameter<typeof apiRequest<LocalGrading16200>>,) => {
      return apiRequest<LocalGrading16200>(
      {url: `/api/v1/grading/rubrics/${id}/publish`, method: 'POST'
    },
      options);
    }
  /**
 * 管理员请求本地从试卷和答案PDF生成草稿；不自动发布
 * @summary 管理员请求本地从试卷和答案PDF生成草稿；不自动发布
 */
export const localGrading17 = (
    params: LocalGrading17Params,
 options?: SecondParameter<typeof apiRequest<LocalGrading17200>>,) => {
      return apiRequest<LocalGrading17200>(
      {url: `/api/v1/grading/rubric-tasks`, method: 'POST',
        params
    },
      options);
    }
  /**
 * 本人配对设备及心跳状态（90秒离线）
 * @summary 本人配对设备及心跳状态（90秒离线）
 */
export const localGrading18 = (
    
 options?: SecondParameter<typeof apiRequest<LocalGrading18200>>,) => {
      return apiRequest<LocalGrading18200>(
      {url: `/api/v1/grading/workers`, method: 'GET'
    },
      options);
    }
  /**
 * 创建仅本人任务权限的随机凭证；服务器仅存SHA256，明文只返回一次
 * @summary 创建仅本人任务权限的随机凭证；服务器仅存SHA256，明文只返回一次
 */
export const localGrading19 = (
    localPairWrite: BodyType<LocalPairWrite>,
 options?: SecondParameter<typeof apiRequest<LocalGrading19200>>,) => {
      return apiRequest<LocalGrading19200>(
      {url: `/api/v1/grading/workers`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localPairWrite
    },
      options);
    }
  /**
 * 本人撤销专用凭证；轮换使用新增配对后撤销旧凭证
 * @summary 本人撤销专用凭证；轮换使用新增配对后撤销旧凭证
 */
export const localGrading20 = (
    id: string,
 options?: SecondParameter<typeof apiRequest<LocalGrading20200>>,) => {
      return apiRequest<LocalGrading20200>(
      {url: `/api/v1/grading/workers/${id}`, method: 'DELETE'
    },
      options);
    }
  /**
 * 本人读取任务冻结输入及评分标准
 * @summary 本人读取任务冻结输入及评分标准
 */
export const localGrading9 = (
    id: string,
 options?: SecondParameter<typeof apiRequest<LocalGrading9200>>,) => {
      return apiRequest<LocalGrading9200>(
      {url: `/api/v1/grading/tasks/${id}/inputs`, method: 'GET'
    },
      options);
    }
  /**
 * 本人读取本次原始答卷供核对
 * @summary 本人读取本次原始答卷供核对
 */
export const localGrading10 = (
    id: string,
    file: string,
 options?: SecondParameter<typeof apiRequest<LocalGrading10200>>,) => {
      return apiRequest<LocalGrading10200>(
      {url: `/api/v1/grading/tasks/${id}/materials/${file}`, method: 'GET'
    },
      options);
    }
  export type LocalGrading1Result = NonNullable<Awaited<ReturnType<typeof localGrading1>>>
export type LocalGrading2Result = NonNullable<Awaited<ReturnType<typeof localGrading2>>>
export type LocalGrading3Result = NonNullable<Awaited<ReturnType<typeof localGrading3>>>
export type LocalGrading4Result = NonNullable<Awaited<ReturnType<typeof localGrading4>>>
export type LocalGrading5Result = NonNullable<Awaited<ReturnType<typeof localGrading5>>>
export type LocalGrading6Result = NonNullable<Awaited<ReturnType<typeof localGrading6>>>
export type LocalGrading7Result = NonNullable<Awaited<ReturnType<typeof localGrading7>>>
export type LocalGrading8Result = NonNullable<Awaited<ReturnType<typeof localGrading8>>>
export type LocalGrading11Result = NonNullable<Awaited<ReturnType<typeof localGrading11>>>
export type LocalGrading12Result = NonNullable<Awaited<ReturnType<typeof localGrading12>>>
export type LocalGrading13Result = NonNullable<Awaited<ReturnType<typeof localGrading13>>>
export type LocalGrading14Result = NonNullable<Awaited<ReturnType<typeof localGrading14>>>
export type LocalGrading15Result = NonNullable<Awaited<ReturnType<typeof localGrading15>>>
export type LocalGrading16Result = NonNullable<Awaited<ReturnType<typeof localGrading16>>>
export type LocalGrading17Result = NonNullable<Awaited<ReturnType<typeof localGrading17>>>
export type LocalGrading18Result = NonNullable<Awaited<ReturnType<typeof localGrading18>>>
export type LocalGrading19Result = NonNullable<Awaited<ReturnType<typeof localGrading19>>>
export type LocalGrading20Result = NonNullable<Awaited<ReturnType<typeof localGrading20>>>
export type LocalGrading9Result = NonNullable<Awaited<ReturnType<typeof localGrading9>>>
export type LocalGrading10Result = NonNullable<Awaited<ReturnType<typeof localGrading10>>>
