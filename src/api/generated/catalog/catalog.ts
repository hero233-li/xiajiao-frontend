/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  AdminCreateReleaseResponse,
  AdminFileUpload,
  AdminGetCatalogResponse,
  AdminGetKnowledgeResponse,
  AdminListFilesParams,
  AdminListFilesResponse,
  AdminListReleasesParams,
  AdminListReleasesResponse,
  AdminPublishReleaseResponse,
  AdminPutCatalogResponse,
  AdminPutKnowledgeResponse,
  AdminUploadContentFileResponse,
  AdminValidateReleaseResponse,
  BatchCompletionWrite,
  CatalogDraft,
  CompleteCatalogBatchResponse,
  CompleteCatalogItemResponse,
  CompletionWrite,
  DownloadCourseResourceResponse,
  GetCatalogResponse,
  GetExampleSolutionResponse,
  GetKnowledgeResponse,
  GetManualResponse,
  KnowledgeDraft,
  KnowledgeNoteWrite,
  ListKnowledgeParams,
  ListKnowledgeResponse,
  OverrideConfirm,
  ReleaseCreate,
  SaveKnowledgeNoteResponse
} from '.././models';

import { apiRequest } from '../../http';
import type { BodyType } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 公共发布目录+本人状态；title只是展示，关联用稳定章节/条目ID；GET不重建或保存目录。
本人数据，身份来自JWT。
 * @summary 课程目录及完成状态
 */
export const getCatalog = (
    courseId: string,
 options?: SecondParameter<typeof apiRequest<GetCatalogResponse>>,) => {
      return apiRequest<GetCatalogResponse>(
      {url: `/api/v1/catalog/courses/${courseId}`, method: 'GET'
    },
      options);
    }
  /**
 * expectedRevision防止多设备覆盖；同事务更新完成状态及关联计划。返回最新课程/总进度和clientMutationId。409时前端回滚当前乐观操作并重新读取，不覆盖较新revision。
本人数据，身份来自JWT。
 * @summary 勾选或取消目录条目
 */
export const completeCatalogItem = (
    courseId: string,
    itemId: string,
    completionWrite: BodyType<CompletionWrite>,
 options?: SecondParameter<typeof apiRequest<CompleteCatalogItemResponse>>,) => {
      return apiRequest<CompleteCatalogItemResponse>(
      {url: `/api/v1/catalog/courses/${courseId}/items/${itemId}/completion`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: completionWrite
    },
      options);
    }
  /**
 * 原子提交；整章操作传明确itemId集合及各自revision，不能隐藏跨版本条目变化。
本人数据，身份来自JWT。
 * @summary 整章或选中条目批量勾选
 */
export const completeCatalogBatch = (
    courseId: string,
    batchCompletionWrite: BodyType<BatchCompletionWrite>,
 options?: SecondParameter<typeof apiRequest<CompleteCatalogBatchResponse>>,) => {
      return apiRequest<CompleteCatalogBatchResponse>(
      {url: `/api/v1/catalog/courses/${courseId}/completions`, method: 'PATCH',
      headers: {'Content-Type': 'application/json', },
      data: batchCompletionWrite
    },
      options);
    }
  /**
 * 公开内容不含例题答案，返回用户知识笔记/掌握等级以避免前端合并公共/私有数据。
本人数据，身份来自JWT。
 * @summary 知识合集搜索与难度筛选
 */
export const listKnowledge = (
    courseId: string,
    params?: ListKnowledgeParams,
 options?: SecondParameter<typeof apiRequest<ListKnowledgeResponse>>,) => {
      return apiRequest<ListKnowledgeResponse>(
      {url: `/api/v1/catalog/courses/${courseId}/knowledge`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 知识模块详情
 */
export const getKnowledge = (
    courseId: string,
    moduleId: string,
 options?: SecondParameter<typeof apiRequest<GetKnowledgeResponse>>,) => {
      return apiRequest<GetKnowledgeResponse>(
      {url: `/api/v1/catalog/courses/${courseId}/knowledge/${moduleId}`, method: 'GET'
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 保存知识掌握与备注
 */
export const saveKnowledgeNote = (
    courseId: string,
    moduleId: string,
    knowledgeNoteWrite: BodyType<KnowledgeNoteWrite>,
 options?: SecondParameter<typeof apiRequest<SaveKnowledgeNoteResponse>>,) => {
      return apiRequest<SaveKnowledgeNoteResponse>(
      {url: `/api/v1/catalog/courses/${courseId}/knowledge/${moduleId}/note`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: knowledgeNoteWrite
    },
      options);
    }
  /**
 * 显式揭示教学例题解答；不累计刷题门槛。接口响应no-store，不在列表/前端包预载。
本人数据，身份来自JWT。
 * @summary 按需获取知识例题解答
 */
export const getExampleSolution = (
    courseId: string,
    exampleId: string,
 options?: SecondParameter<typeof apiRequest<GetExampleSolutionResponse>>,) => {
      return apiRequest<GetExampleSolutionResponse>(
      {url: `/api/v1/catalog/courses/${courseId}/examples/${exampleId}/solution`, method: 'GET'
    },
      options);
    }
  /**
 * 仅hasManual课程；正文无标准答案，练习勾选复用目录API，例题通过exampleId按需获取解答。不存在或缺少内容映射404/422，不造占位手册。
本人数据，身份来自JWT。
 * @summary 实践手册与同步练习状态
 */
export const getManual = (
    courseId: string,
 options?: SecondParameter<typeof apiRequest<GetManualResponse>>,) => {
      return apiRequest<GetManualResponse>(
      {url: `/api/v1/catalog/courses/${courseId}/manual`, method: 'GET'
    },
      options);
    }
  /**
 * 只允许当前发布内容明确引用的MANUAL文件；此入口绝不下载PAPER/答案/用户附件。返回Base64统一JSON封装；每次授权，no-store。
本人数据，身份来自JWT。
 * @summary 下载受控手册资源
 */
export const downloadCourseResource = (
    courseId: string,
    fileId: string,
 options?: SecondParameter<typeof apiRequest<DownloadCourseResourceResponse>>,) => {
      return apiRequest<DownloadCourseResourceResponse>(
      {url: `/api/v1/catalog/courses/${courseId}/resources/${fileId}`, method: 'GET'
    },
      options);
    }
  /**
 * 仅ADMIN。
 * @summary 管理员查看内容版本
 */
export const adminListReleases = (
    courseId: string,
    params?: AdminListReleasesParams,
 options?: SecondParameter<typeof apiRequest<AdminListReleasesResponse>>,) => {
      return apiRequest<AdminListReleasesResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 仅ADMIN。
 * @summary 管理员创建内容版本草稿
 */
export const adminCreateRelease = (
    courseId: string,
    releaseCreate: BodyType<ReleaseCreate>,
 options?: SecondParameter<typeof apiRequest<AdminCreateReleaseResponse>>,) => {
      return apiRequest<AdminCreateReleaseResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: releaseCreate
    },
      options);
    }
  /**
 * 已发布内容可读，答案仅管理用途，不供学习页面预载；无当前配置返回404，不造默认数据。
仅ADMIN。
 * @summary 管理员读取版本目录/考点/预计时长
 */
export const adminGetCatalog = (
    courseId: string,
    releaseId: string,
 options?: SecondParameter<typeof apiRequest<AdminGetCatalogResponse>>,) => {
      return apiRequest<AdminGetCatalogResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/catalog`, method: 'GET'
    },
      options);
    }
  /**
 * 仅DRAFT允许替换；已发布或被session引用禁止原地改。共享内容稳定ID与用户状态分离；实际关联/去重/配置由后端校验。管理答案读取写入必须单独审计，不作为学生答题旁路。
仅ADMIN。
 * @summary 管理员维护草稿目录/考点/预计时长
 */
export const adminPutCatalog = (
    courseId: string,
    releaseId: string,
    catalogDraft: BodyType<CatalogDraft>,
 options?: SecondParameter<typeof apiRequest<AdminPutCatalogResponse>>,) => {
      return apiRequest<AdminPutCatalogResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/catalog`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: catalogDraft
    },
      options);
    }
  /**
 * 已发布内容可读，答案仅管理用途，不供学习页面预载；无当前配置返回404，不造默认数据。
仅ADMIN。
 * @summary 管理员读取版本知识/公式/例题解答
 */
export const adminGetKnowledge = (
    courseId: string,
    releaseId: string,
 options?: SecondParameter<typeof apiRequest<AdminGetKnowledgeResponse>>,) => {
      return apiRequest<AdminGetKnowledgeResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/knowledge`, method: 'GET'
    },
      options);
    }
  /**
 * 仅DRAFT允许替换；已发布或被session引用禁止原地改。共享内容稳定ID与用户状态分离；实际关联/去重/配置由后端校验。管理答案读取写入必须单独审计，不作为学生答题旁路。
仅ADMIN。
 * @summary 管理员维护草稿知识/公式/例题解答
 */
export const adminPutKnowledge = (
    courseId: string,
    releaseId: string,
    knowledgeDraft: BodyType<KnowledgeDraft>,
 options?: SecondParameter<typeof apiRequest<AdminPutKnowledgeResponse>>,) => {
      return apiRequest<AdminPutKnowledgeResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/knowledge`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: knowledgeDraft
    },
      options);
    }
  /**
 * 只读校验并列出字段/映射/原创去重/考点/题量/参数/文件错误，不自动生成题或发布。检查本身不写bank_alert；正式申请失败时告警由写命令保存。
仅ADMIN。
 * @summary 管理员校验发布前内容完整性
 */
export const adminValidateRelease = (
    courseId: string,
    releaseId: string,
 options?: SecondParameter<typeof apiRequest<AdminValidateReleaseResponse>>,) => {
      return apiRequest<AdminValidateReleaseResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/validation`, method: 'GET'
    },
      options);
    }
  /**
 * 同事务校验后发布；已有用户通过不因版本新增章节而失效，今后模拟申请用新参与章节；失败不发布。参数缺失禁止相关能力，不可悄悄补默认数据。
仅ADMIN。
 * @summary 管理员确认发布不可变内容版本
 */
export const adminPublishRelease = (
    courseId: string,
    releaseId: string,
    overrideConfirm: BodyType<OverrideConfirm>,
 options?: SecondParameter<typeof apiRequest<AdminPublishReleaseResponse>>,) => {
      return apiRequest<AdminPublishReleaseResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/publication`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: overrideConfirm
    },
      options);
    }
  /**
 * 仅公共教学文件，不把所有用户附件列入公共管理结果。
仅ADMIN。
 * @summary 管理员教学文件清单
 */
export const adminListFiles = (
    params: AdminListFilesParams,
 options?: SecondParameter<typeof apiRequest<AdminListFilesResponse>>,) => {
      return apiRequest<AdminListFilesResponse>(
      {url: `/api/v1/admin/files`, method: 'GET',
        params
    },
      options);
    }
  /**
 * MANUAL文件正文按AdminManualDocument校验；PAPER真题PDF必须标containsAnswers并审核拆分。新文件无公开URL，必须建立内容/试卷关联才可被学习页面获取。
仅ADMIN。
 * @summary 管理员上传私有题卷或结构化手册
 */
export const adminUploadContentFile = (
    adminFileUpload: BodyType<AdminFileUpload>,
 options?: SecondParameter<typeof apiRequest<AdminUploadContentFileResponse>>,) => {const formData = new FormData();
formData.append(`file`, adminFileUpload.file)
formData.append(`purpose`, adminFileUpload.purpose)
formData.append(`containsAnswers`, adminFileUpload.containsAnswers.toString())

      return apiRequest<AdminUploadContentFileResponse>(
      {url: `/api/v1/admin/files`, method: 'POST',
      headers: {'Content-Type': 'multipart/form-data', },
       data: formData
    },
      options);
    }
  export type GetCatalogResult = NonNullable<Awaited<ReturnType<typeof getCatalog>>>
export type CompleteCatalogItemResult = NonNullable<Awaited<ReturnType<typeof completeCatalogItem>>>
export type CompleteCatalogBatchResult = NonNullable<Awaited<ReturnType<typeof completeCatalogBatch>>>
export type ListKnowledgeResult = NonNullable<Awaited<ReturnType<typeof listKnowledge>>>
export type GetKnowledgeResult = NonNullable<Awaited<ReturnType<typeof getKnowledge>>>
export type SaveKnowledgeNoteResult = NonNullable<Awaited<ReturnType<typeof saveKnowledgeNote>>>
export type GetExampleSolutionResult = NonNullable<Awaited<ReturnType<typeof getExampleSolution>>>
export type GetManualResult = NonNullable<Awaited<ReturnType<typeof getManual>>>
export type DownloadCourseResourceResult = NonNullable<Awaited<ReturnType<typeof downloadCourseResource>>>
export type AdminListReleasesResult = NonNullable<Awaited<ReturnType<typeof adminListReleases>>>
export type AdminCreateReleaseResult = NonNullable<Awaited<ReturnType<typeof adminCreateRelease>>>
export type AdminGetCatalogResult = NonNullable<Awaited<ReturnType<typeof adminGetCatalog>>>
export type AdminPutCatalogResult = NonNullable<Awaited<ReturnType<typeof adminPutCatalog>>>
export type AdminGetKnowledgeResult = NonNullable<Awaited<ReturnType<typeof adminGetKnowledge>>>
export type AdminPutKnowledgeResult = NonNullable<Awaited<ReturnType<typeof adminPutKnowledge>>>
export type AdminValidateReleaseResult = NonNullable<Awaited<ReturnType<typeof adminValidateRelease>>>
export type AdminPublishReleaseResult = NonNullable<Awaited<ReturnType<typeof adminPublishRelease>>>
export type AdminListFilesResult = NonNullable<Awaited<ReturnType<typeof adminListFiles>>>
export type AdminUploadContentFileResult = NonNullable<Awaited<ReturnType<typeof adminUploadContentFile>>>
