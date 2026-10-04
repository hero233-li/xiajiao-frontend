/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  LocalCallback,
  LocalFailure,
  LocalGrading21200,
  LocalGrading22200,
  LocalGrading22Body,
  LocalGrading23200,
  LocalGrading24200,
  LocalGrading25200,
  LocalGrading26200,
  LocalHeartbeat,
  LocalLease
} from '.././models';

import { apiRequest } from '../../http';
import type { BodyType } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 工作程序在线、暂停及原因
 * @summary 工作程序在线、暂停及原因
 */
export const localGrading21 = (
    localHeartbeat: BodyType<LocalHeartbeat>,
 options?: SecondParameter<typeof apiRequest<LocalGrading21200>>,) => {
      return apiRequest<LocalGrading21200>(
      {url: `/api/v1/grading-worker/heartbeat`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localHeartbeat
    },
      options);
    }
  /**
 * 原子串行领取本人任务，120秒租约，最长15分钟，最多3次处理
 * @summary 原子串行领取本人任务，120秒租约，最长15分钟，最多3次处理
 */
export const localGrading22 = (
    localGrading22Body: BodyType<LocalGrading22Body>,
 options?: SecondParameter<typeof apiRequest<LocalGrading22200>>,) => {
      return apiRequest<LocalGrading22200>(
      {url: `/api/v1/grading-worker/claim`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localGrading22Body
    },
      options);
    }
  /**
 * 本次领取凭据续租，不能延长15分钟截止
 * @summary 本次领取凭据续租，不能延长15分钟截止
 */
export const localGrading23 = (
    id: string,
    localLease: BodyType<LocalLease>,
 options?: SecondParameter<typeof apiRequest<LocalGrading23200>>,) => {
      return apiRequest<LocalGrading23200>(
      {url: `/api/v1/grading-worker/tasks/${id}/renew`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localLease
    },
      options);
    }
  /**
 * 凭有效领取凭据读取冻结材料及哈希
 * @summary 凭有效领取凭据读取冻结材料及哈希
 */
export const localGrading24 = (
    id: string,
    file: string,
 options?: SecondParameter<typeof apiRequest<LocalGrading24200>>,) => {
      return apiRequest<LocalGrading24200>(
      {url: `/api/v1/grading-worker/tasks/${id}/materials/${file}`, method: 'GET'
    },
      options);
    }
  /**
 * 验证全部题号和评分点、独立总分；幂等回传；原子结果/成绩/照片/状态
 * @summary 验证全部题号和评分点、独立总分；幂等回传；原子结果/成绩/照片/状态
 */
export const localGrading25 = (
    id: string,
    localCallback: BodyType<LocalCallback>,
 options?: SecondParameter<typeof apiRequest<LocalGrading25200>>,) => {
      return apiRequest<LocalGrading25200>(
      {url: `/api/v1/grading-worker/tasks/${id}/result`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localCallback
    },
      options);
    }
  /**
 * 失败报告、最多两次重试；授权/用量问题暂停领取
 * @summary 失败报告、最多两次重试；授权/用量问题暂停领取
 */
export const localGrading26 = (
    id: string,
    localFailure: BodyType<LocalFailure>,
 options?: SecondParameter<typeof apiRequest<LocalGrading26200>>,) => {
      return apiRequest<LocalGrading26200>(
      {url: `/api/v1/grading-worker/tasks/${id}/failure`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: localFailure
    },
      options);
    }
  export type LocalGrading21Result = NonNullable<Awaited<ReturnType<typeof localGrading21>>>
export type LocalGrading22Result = NonNullable<Awaited<ReturnType<typeof localGrading22>>>
export type LocalGrading23Result = NonNullable<Awaited<ReturnType<typeof localGrading23>>>
export type LocalGrading24Result = NonNullable<Awaited<ReturnType<typeof localGrading24>>>
export type LocalGrading25Result = NonNullable<Awaited<ReturnType<typeof localGrading25>>>
export type LocalGrading26Result = NonNullable<Awaited<ReturnType<typeof localGrading26>>>
