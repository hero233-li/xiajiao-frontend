/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  AdminCreateCycleResponse,
  AdminCreatePaperResponse,
  AdminDecideLegacyPassResponse,
  AdminGetLegacyPassReviewResponse,
  AdminListLegacyPassReviewsParams,
  AdminListLegacyPassReviewsResponse,
  AdminUpdateCycleResponse,
  AdminUpdatePaperResponse,
  ConfirmUnlockOverrideResponse,
  CreateScoreResponse,
  CycleWrite,
  DeleteLegacyAttachmentResponse,
  DeleteScoreImageResponse,
  DownloadLegacyAttachmentResponse,
  DownloadPaperParams,
  DownloadPaperResponse,
  DownloadScoreImageResponse,
  GetCycleResponse,
  GetLegacyHistoryResponse,
  GetPaperResponse,
  GetPredictionResponse,
  GetScoreResponse,
  GetScoreTrendParams,
  GetScoreTrendResponse,
  GetUnlockParams,
  GetUnlockResponse,
  ImageUpload,
  LegacyReviewDecision,
  ListCyclesParams,
  ListCyclesResponse,
  ListLegacyHistoryParams,
  ListLegacyHistoryResponse,
  ListPapersParams,
  ListPapersResponse,
  ListScoresParams,
  ListScoresResponse,
  OverrideConfirm,
  OverrideRevoke,
  PaperWrite,
  RevokeUnlockOverrideResponse,
  ScoreUpdate,
  ScoreWrite,
  UpdateScoreResponse,
  UploadScoreImageResponse
} from '.././models';

import { apiRequest } from '../../http';
import type { BodyType } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 本人数据，身份来自JWT。
 * @summary 考试周期列表
 */
export const listCycles = (
    params?: ListCyclesParams,
 options?: SecondParameter<typeof apiRequest<ListCyclesResponse>>,) => {
      return apiRequest<ListCyclesResponse>(
      {url: `/api/v1/exams/cycles`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 周期与各科考试安排
 */
export const getCycle = (
    cycleId: string,
 options?: SecondParameter<typeof apiRequest<GetCycleResponse>>,) => {
      return apiRequest<GetCycleResponse>(
      {url: `/api/v1/exams/cycles/${cycleId}`, method: 'GET'
    },
      options);
    }
  /**
 * 前端仅展示后端结果；真题下载和成绩写入再校验同一服务。任次有效pass，题库升级继续有效；临考override只开放真题和成绩。
本人数据，身份来自JWT。
 * @summary 获取统一解锁与临考跳过窗口
 */
export const getUnlock = (
    courseId: string,
    params: GetUnlockParams,
 options?: SecondParameter<typeof apiRequest<GetUnlockResponse>>,) => {
      return apiRequest<GetUnlockResponse>(
      {url: `/api/v1/exams/courses/${courseId}/unlock`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 按上海日期考试前14日至当天含，考试日未知禁止；一条活动记录。已活动同范围重复确认返回当前结果，不造第二条。考试后旧记录继续有效，不能跳过检测申请。
本人数据，身份来自JWT。
 * @summary 本人确认临考跳过
 */
export const confirmUnlockOverride = (
    courseId: string,
    cycleId: string,
    overrideConfirm: BodyType<OverrideConfirm>,
 options?: SecondParameter<typeof apiRequest<ConfirmUnlockOverrideResponse>>,) => {
      return apiRequest<ConfirmUnlockOverrideResponse>(
      {url: `/api/v1/exams/courses/${courseId}/cycles/${cycleId}/overrides`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: overrideConfirm
    },
      options);
    }
  /**
 * 保留撤销历史；若仍有有效模拟通过，正常权限保留。
本人数据，身份来自JWT。
 * @summary 本人撤销手动跳过
 */
export const revokeUnlockOverride = (
    courseId: string,
    cycleId: string,
    overrideRevoke: BodyType<OverrideRevoke>,
 options?: SecondParameter<typeof apiRequest<RevokeUnlockOverrideResponse>>,) => {
      return apiRequest<RevokeUnlockOverrideResponse>(
      {url: `/api/v1/exams/courses/${courseId}/cycles/${cycleId}/overrides/current/revocation`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: overrideRevoke
    },
      options);
    }
  /**
 * 登录后可读索引；实际文件需统一解锁，不在索引发直链。无卷实践科返回空列表。
本人数据，身份来自JWT。
 * @summary 历年试卷与题答合一标记
 */
export const listPapers = (
    courseId: string,
    params: ListPapersParams,
 options?: SecondParameter<typeof apiRequest<ListPapersResponse>>,) => {
      return apiRequest<ListPapersResponse>(
      {url: `/api/v1/exams/courses/${courseId}/papers`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 试卷元数据
 */
export const getPaper = (
    courseId: string,
    paperId: string,
 options?: SecondParameter<typeof apiRequest<GetPaperResponse>>,) => {
      return apiRequest<GetPaperResponse>(
      {url: `/api/v1/exams/courses/${courseId}/papers/${paperId}`, method: 'GET'
    },
      options);
    }
  /**
 * 每次查统一权限，QUESTION题答合一必须标注containsAnswers；ANSWER无单独文件40401，界面据元数据提示合一。响应统一JSON/Base64，不重定向公共PDF；下载不自动把answersSeenBefore写为true。
本人数据，身份来自JWT。
 * @summary 登录且已解锁的题卷或答案下载
 */
export const downloadPaper = (
    courseId: string,
    paperId: string,
    params: DownloadPaperParams,
 options?: SecondParameter<typeof apiRequest<DownloadPaperResponse>>,) => {
      return apiRequest<DownloadPaperResponse>(
      {url: `/api/v1/exams/courses/${courseId}/papers/${paperId}/file`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 查看本人已有记录不要求重新解锁；按practicedOn/createdAt/ID倒序；筛选周期不改变跨周期预测规则。
本人数据，身份来自JWT。
 * @summary 纸卷成绩列表
 */
export const listScores = (
    courseId: string,
    params?: ListScoresParams,
 options?: SecondParameter<typeof apiRequest<ListScoresResponse>>,) => {
      return apiRequest<ListScoresResponse>(
      {url: `/api/v1/exams/courses/${courseId}/scores`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 服务端校验本人周期报名/已收录paper和解锁；createdAt服务端生成，用户自报完整/闭卷/看答案/用时；纸卷成绩永不授权真题或模拟。
本人数据，身份来自JWT。
 * @summary 录入纸卷成绩并重算预测
 */
export const createScore = (
    courseId: string,
    scoreWrite: BodyType<ScoreWrite>,
 options?: SecondParameter<typeof apiRequest<CreateScoreResponse>>,) => {
      return apiRequest<CreateScoreResponse>(
      {url: `/api/v1/exams/courses/${courseId}/scores`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: scoreWrite
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 查看成绩及图片存档
 */
export const getScore = (
    courseId: string,
    scoreId: string,
 options?: SecondParameter<typeof apiRequest<GetScoreResponse>>,) => {
      return apiRequest<GetScoreResponse>(
      {url: `/api/v1/exams/courses/${courseId}/scores/${scoreId}`, method: 'GET'
    },
      options);
    }
  /**
 * 按原记录cycleId判写入权限；createdAt/所属paper/cycle不改。旧未知看答案字段必须由本人明确填入才能参与预测，原旧历史不改写。
本人数据，身份来自JWT。
 * @summary 编辑成绩、重新选首有效及预测
 */
export const updateScore = (
    courseId: string,
    scoreId: string,
    scoreUpdate: BodyType<ScoreUpdate>,
 options?: SecondParameter<typeof apiRequest<UpdateScoreResponse>>,) => {
      return apiRequest<UpdateScoreResponse>(
      {url: `/api/v1/exams/courses/${courseId}/scores/${scoreId}`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: scoreUpdate
    },
      options);
    }
  /**
 * 跨全部考试周期，同试卷先取首有效再过滤60天；不足3套predictedScore/实际最低最高为NULL，status=INSUFFICIENT_SAMPLES，samples仍显示已有样本，不杜撰概率。
本人数据，身份来自JWT。
 * @summary 后端成绩预测与样本解释
 */
export const getPrediction = (
    courseId: string,
 options?: SecondParameter<typeof apiRequest<GetPredictionResponse>>,) => {
      return apiRequest<GetPredictionResponse>(
      {url: `/api/v1/exams/courses/${courseId}/prediction`, method: 'GET'
    },
      options);
    }
  /**
 * 最新limit条；与预测样本分开，可包含重复卷和无效预测记录，后端返回绘图数据。
本人数据，身份来自JWT。
 * @summary 最近成绩趋势原记录
 */
export const getScoreTrend = (
    courseId: string,
    params?: GetScoreTrendParams,
 options?: SecondParameter<typeof apiRequest<GetScoreTrendResponse>>,) => {
      return apiRequest<GetScoreTrendResponse>(
      {url: `/api/v1/exams/courses/${courseId}/score-trend`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 新上传JPG/PNG/WebP，单张≤8MiB；私有且属于成绩owner；需该记录周期成绩写入权限。每次一张，可重复请求上传多张；不创建批改任务。
本人数据，身份来自JWT。
 * @summary 成绩记录附带图片存档
 */
export const uploadScoreImage = (
    courseId: string,
    scoreId: string,
    imageUpload: BodyType<ImageUpload>,
 options?: SecondParameter<typeof apiRequest<UploadScoreImageResponse>>,) => {const formData = new FormData();
formData.append(`file`, imageUpload.file)

      return apiRequest<UploadScoreImageResponse>(
      {url: `/api/v1/exams/courses/${courseId}/scores/${scoreId}/images`, method: 'POST',
      headers: {'Content-Type': 'multipart/form-data', },
       data: formData
    },
      options);
    }
  /**
 * 本人归属即可查看历史存档，无需重新解锁；删除或非本记录文件40401。
本人数据，身份来自JWT。
 * @summary 下载本人已存档成绩图片
 */
export const downloadScoreImage = (
    courseId: string,
    scoreId: string,
    fileId: string,
 options?: SecondParameter<typeof apiRequest<DownloadScoreImageResponse>>,) => {
      return apiRequest<DownloadScoreImageResponse>(
      {url: `/api/v1/exams/courses/${courseId}/scores/${scoreId}/images/${fileId}`, method: 'GET'
    },
      options);
    }
  /**
 * 立即阻断下载，保留必要元数据与审计；无需重新解锁才能删除本人附件。
本人数据，身份来自JWT。
 * @summary 删除本人成绩图片
 */
export const deleteScoreImage = (
    courseId: string,
    scoreId: string,
    fileId: string,
 options?: SecondParameter<typeof apiRequest<DeleteScoreImageResponse>>,) => {
      return apiRequest<DeleteScoreImageResponse>(
      {url: `/api/v1/exams/courses/${courseId}/scores/${scoreId}/images/${fileId}`, method: 'DELETE'
    },
      options);
    }
  /**
 * 不开放新的批改/补题任务。
本人数据，身份来自JWT。
 * @summary 旧检测、批改和计划只读历史
 */
export const listLegacyHistory = (
    params?: ListLegacyHistoryParams,
 options?: SecondParameter<typeof apiRequest<ListLegacyHistoryResponse>>,) => {
      return apiRequest<ListLegacyHistoryResponse>(
      {url: `/api/v1/exams/history`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 只读评分、扣分、照片、旧排期；旧通过默认待确认，不等价新系统通过。
本人数据，身份来自JWT。
 * @summary 旧任务只读详情与附件
 */
export const getLegacyHistory = (
    legacyId: string,
 options?: SecondParameter<typeof apiRequest<GetLegacyHistoryResponse>>,) => {
      return apiRequest<GetLegacyHistoryResponse>(
      {url: `/api/v1/exams/history/${legacyId}`, method: 'GET'
    },
      options);
    }
  /**
 * 保留旧PDF，用户白名单只约束新增成绩图片；每次验证原历史归属和关联。旧照片下载不需要新解锁。
本人数据，身份来自JWT。
 * @summary 本人旧照片/PDF受控下载
 */
export const downloadLegacyAttachment = (
    legacyId: string,
    fileId: string,
 options?: SecondParameter<typeof apiRequest<DownloadLegacyAttachmentResponse>>,) => {
      return apiRequest<DownloadLegacyAttachmentResponse>(
      {url: `/api/v1/exams/history/${legacyId}/files/${fileId}`, method: 'GET'
    },
      options);
    }
  /**
 * 可删除照片/PDF附件，旧task原文只读且保留；状态显示已删除，不能继续返回旧URL。
本人数据，身份来自JWT。
 * @summary 删除本人旧附件
 */
export const deleteLegacyAttachment = (
    legacyId: string,
    fileId: string,
 options?: SecondParameter<typeof apiRequest<DeleteLegacyAttachmentResponse>>,) => {
      return apiRequest<DeleteLegacyAttachmentResponse>(
      {url: `/api/v1/exams/history/${legacyId}/files/${fileId}`, method: 'DELETE'
    },
      options);
    }
  /**
 * 仅ADMIN。
 * @summary 管理员创建考试周期和各科安排
 */
export const adminCreateCycle = (
    cycleWrite: BodyType<CycleWrite>,
 options?: SecondParameter<typeof apiRequest<AdminCreateCycleResponse>>,) => {
      return apiRequest<AdminCreateCycleResponse>(
      {url: `/api/v1/admin/exams/cycles`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: cycleWrite
    },
      options);
    }
  /**
 * 更新让已有顺延预览指纹失效；已确认计划快照不自动改排，若新考试日与旧安排冲突返回警示并由用户重新预览。旧override按确认快照继续有效。
仅ADMIN。
 * @summary 管理员维护考试日与时段
 */
export const adminUpdateCycle = (
    cycleId: string,
    cycleWrite: BodyType<CycleWrite>,
 options?: SecondParameter<typeof apiRequest<AdminUpdateCycleResponse>>,) => {
      return apiRequest<AdminUpdateCycleResponse>(
      {url: `/api/v1/admin/exams/cycles/${cycleId}`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: cycleWrite
    },
      options);
    }
  /**
 * 课程代码+年月业务键，文件ID须有效PAPER用途，题答合一标记必须准确。
仅ADMIN。
 * @summary 管理员登记历年试卷
 */
export const adminCreatePaper = (
    courseId: string,
    paperWrite: BodyType<PaperWrite>,
 options?: SecondParameter<typeof apiRequest<AdminCreatePaperResponse>>,) => {
      return apiRequest<AdminCreatePaperResponse>(
      {url: `/api/v1/admin/exams/courses/${courseId}/papers`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: paperWrite
    },
      options);
    }
  /**
 * 已有paperMonth不可更改，避免改变首有效分组；替换文件/页数/说明，历史成绩身份不变。
仅ADMIN。
 * @summary 管理员维护试卷文件与说明
 */
export const adminUpdatePaper = (
    courseId: string,
    paperId: string,
    paperWrite: BodyType<PaperWrite>,
 options?: SecondParameter<typeof apiRequest<AdminUpdatePaperResponse>>,) => {
      return apiRequest<AdminUpdatePaperResponse>(
      {url: `/api/v1/admin/exams/courses/${courseId}/papers/${paperId}`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: paperWrite
    },
      options);
    }
  /**
 * 导出到位后填真实行；旧检测通过默认不计入新状态，未知旧版本明确NULL，不伪装新版本。
仅ADMIN。
 * @summary 旧通过逐条确认清单
 */
export const adminListLegacyPassReviews = (
    params?: AdminListLegacyPassReviewsParams,
 options?: SecondParameter<typeof apiRequest<AdminListLegacyPassReviewsResponse>>,) => {
      return apiRequest<AdminListLegacyPassReviewsResponse>(
      {url: `/api/v1/admin/exams/legacy-pass-reviews`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 仅ADMIN。
 * @summary 旧通过证据和映射详情
 */
export const adminGetLegacyPassReview = (
    reviewId: string,
 options?: SecondParameter<typeof apiRequest<AdminGetLegacyPassReviewResponse>>,) => {
      return apiRequest<AdminGetLegacyPassReviewResponse>(
      {url: `/api/v1/admin/exams/legacy-pass-reviews/${reviewId}`, method: 'GET'
    },
      options);
    }
  /**
 * 首版本人ADMIN确认；有原因与稳定映射。ACCEPT同事务生成legacy来源pass，保留reviewId，不制造新session；同一旧任务不能重复认领。
仅ADMIN。
 * @summary 本人逐条接受或拒绝旧通过
 */
export const adminDecideLegacyPass = (
    reviewId: string,
    legacyReviewDecision: BodyType<LegacyReviewDecision>,
 options?: SecondParameter<typeof apiRequest<AdminDecideLegacyPassResponse>>,) => {
      return apiRequest<AdminDecideLegacyPassResponse>(
      {url: `/api/v1/admin/exams/legacy-pass-reviews/${reviewId}/decision`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: legacyReviewDecision
    },
      options);
    }
  export type ListCyclesResult = NonNullable<Awaited<ReturnType<typeof listCycles>>>
export type GetCycleResult = NonNullable<Awaited<ReturnType<typeof getCycle>>>
export type GetUnlockResult = NonNullable<Awaited<ReturnType<typeof getUnlock>>>
export type ConfirmUnlockOverrideResult = NonNullable<Awaited<ReturnType<typeof confirmUnlockOverride>>>
export type RevokeUnlockOverrideResult = NonNullable<Awaited<ReturnType<typeof revokeUnlockOverride>>>
export type ListPapersResult = NonNullable<Awaited<ReturnType<typeof listPapers>>>
export type GetPaperResult = NonNullable<Awaited<ReturnType<typeof getPaper>>>
export type DownloadPaperResult = NonNullable<Awaited<ReturnType<typeof downloadPaper>>>
export type ListScoresResult = NonNullable<Awaited<ReturnType<typeof listScores>>>
export type CreateScoreResult = NonNullable<Awaited<ReturnType<typeof createScore>>>
export type GetScoreResult = NonNullable<Awaited<ReturnType<typeof getScore>>>
export type UpdateScoreResult = NonNullable<Awaited<ReturnType<typeof updateScore>>>
export type GetPredictionResult = NonNullable<Awaited<ReturnType<typeof getPrediction>>>
export type GetScoreTrendResult = NonNullable<Awaited<ReturnType<typeof getScoreTrend>>>
export type UploadScoreImageResult = NonNullable<Awaited<ReturnType<typeof uploadScoreImage>>>
export type DownloadScoreImageResult = NonNullable<Awaited<ReturnType<typeof downloadScoreImage>>>
export type DeleteScoreImageResult = NonNullable<Awaited<ReturnType<typeof deleteScoreImage>>>
export type ListLegacyHistoryResult = NonNullable<Awaited<ReturnType<typeof listLegacyHistory>>>
export type GetLegacyHistoryResult = NonNullable<Awaited<ReturnType<typeof getLegacyHistory>>>
export type DownloadLegacyAttachmentResult = NonNullable<Awaited<ReturnType<typeof downloadLegacyAttachment>>>
export type DeleteLegacyAttachmentResult = NonNullable<Awaited<ReturnType<typeof deleteLegacyAttachment>>>
export type AdminCreateCycleResult = NonNullable<Awaited<ReturnType<typeof adminCreateCycle>>>
export type AdminUpdateCycleResult = NonNullable<Awaited<ReturnType<typeof adminUpdateCycle>>>
export type AdminCreatePaperResult = NonNullable<Awaited<ReturnType<typeof adminCreatePaper>>>
export type AdminUpdatePaperResult = NonNullable<Awaited<ReturnType<typeof adminUpdatePaper>>>
export type AdminListLegacyPassReviewsResult = NonNullable<Awaited<ReturnType<typeof adminListLegacyPassReviews>>>
export type AdminGetLegacyPassReviewResult = NonNullable<Awaited<ReturnType<typeof adminGetLegacyPassReview>>>
export type AdminDecideLegacyPassResult = NonNullable<Awaited<ReturnType<typeof adminDecideLegacyPass>>>
