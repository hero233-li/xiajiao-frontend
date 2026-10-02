/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  AdminAcknowledgeAlertResponse,
  AdminDecideLegacyCreditResponse,
  AdminGetAssessmentPolicyResponse,
  AdminGetQuestionsResponse,
  AdminInvalidatePassResponse,
  AdminListAlertsParams,
  AdminListAlertsResponse,
  AdminListLegacyCreditsParams,
  AdminListLegacyCreditsResponse,
  AdminPutAssessmentPolicyResponse,
  AdminPutQuestionsResponse,
  AnswerWrite,
  ApplyAssessmentParams,
  ApplyAssessmentResponse,
  AssessmentAnswerWrite,
  AssessmentApply,
  AssessmentPolicyWrite,
  AssessmentSubmit,
  GetAssessmentResponse,
  GetAssessmentResultParams,
  GetAssessmentResultResponse,
  GetPracticeOverviewResponse,
  GetPracticeResultResponse,
  GetPracticeStatsParams,
  GetPracticeStatsResponse,
  GetQuestionResponse,
  InvalidatePass,
  LegacyPracticeCreditDecision,
  ListAssessmentsParams,
  ListAssessmentsResponse,
  ListLegacyPracticeParams,
  ListLegacyPracticeResponse,
  ListPassesParams,
  ListPassesResponse,
  ListPracticeHistoryParams,
  ListPracticeHistoryResponse,
  ListQuestionsParams,
  ListQuestionsResponse,
  OverrideConfirm,
  QuestionBankDraft,
  QuestionMarkWrite,
  SaveAssessmentAnswerResponse,
  SaveQuestionMarkResponse,
  SubmitAssessmentParams,
  SubmitAssessmentResponse,
  SubmitPracticeAnswerResponse
} from '.././models';

import { apiRequest } from '../../http';
import type { BodyType } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 本人数据，身份来自JWT。
 * @summary 刷题章节概览、门槛与通过状态
 */
export const getPracticeOverview = (
    courseId: string,
 options?: SecondParameter<typeof apiRequest<GetPracticeOverviewResponse>>,) => {
      return apiRequest<GetPracticeOverviewResponse>(
      {url: `/api/v1/practice/courses/${courseId}/overview`, method: 'GET'
    },
      options);
    }
  /**
 * 可按章，省略章为全课，课程范围门槛字段为NULL；已答原创合并正式练习、终态检测及审核认领旧汇总。
本人数据，身份来自JWT。
 * @summary 实时刷题统计
 */
export const getPracticeStats = (
    courseId: string,
    params?: GetPracticeStatsParams,
 options?: SecondParameter<typeof apiRequest<GetPracticeStatsResponse>>,) => {
      return apiRequest<GetPracticeStatsResponse>(
      {url: `/api/v1/practice/courses/${courseId}/stats`, method: 'GET',
        params
    },
      options);
    }
  /**
 * WRONG按本人该题最新练习提交为错筛选；其他不变式仅筛选，不生成题。任何列表均不包含答案/解析。稳定排序chapter sort/question sort/ID。
本人数据，身份来自JWT。
 * @summary 章节、变式、错题、收藏题目列表
 */
export const listQuestions = (
    courseId: string,
    params?: ListQuestionsParams,
 options?: SecondParameter<typeof apiRequest<ListQuestionsResponse>>,) => {
      return apiRequest<ListQuestionsResponse>(
      {url: `/api/v1/practice/courses/${courseId}/questions`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 即使曾答过，获取题目接口仍不返回答案；结果需要按本人submissionId取。
本人数据，身份来自JWT。
 * @summary 获取安全题干与选项
 */
export const getQuestion = (
    courseId: string,
    questionId: string,
 options?: SecondParameter<typeof apiRequest<GetQuestionResponse>>,) => {
      return apiRequest<GetQuestionResponse>(
      {url: `/api/v1/practice/courses/${courseId}/questions/${questionId}`, method: 'GET'
    },
      options);
    }
  /**
 * 后端从提交revision取标准答案判对，写不可变逐次历史；相同键/正文返回同一submission。revision已不适用于新练习时40902，不能用旧revision写当前题结果；历史结果仍绑定旧revision。
本人数据，身份来自JWT。
 * @summary 提交练习并返回判对、答案和最新统计
 */
export const submitPracticeAnswer = (
    courseId: string,
    questionId: string,
    answerWrite: BodyType<AnswerWrite>,
 options?: SecondParameter<typeof apiRequest<SubmitPracticeAnswerResponse>>,) => {
      return apiRequest<SubmitPracticeAnswerResponse>(
      {url: `/api/v1/practice/courses/${courseId}/questions/${questionId}/submissions`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: answerWrite
    },
      options);
    }
  /**
 * 按submittedAt、ID倒序；未保存答案草稿/旧attempts不伪造历史。
本人数据，身份来自JWT。
 * @summary 逐次练习历史
 */
export const listPracticeHistory = (
    courseId: string,
    params?: ListPracticeHistoryParams,
 options?: SecondParameter<typeof apiRequest<ListPracticeHistoryResponse>>,) => {
      return apiRequest<ListPracticeHistoryResponse>(
      {url: `/api/v1/practice/courses/${courseId}/submissions`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 验证submission属于本人/课程，答案只对应已提交revision；不得靠questionId直接取当前新版本解析。
本人数据，身份来自JWT。
 * @summary 本人已提交练习结果与解析
 */
export const getPracticeResult = (
    courseId: string,
    submissionId: string,
 options?: SecondParameter<typeof apiRequest<GetPracticeResultResponse>>,) => {
      return apiRequest<GetPracticeResultResponse>(
      {url: `/api/v1/practice/courses/${courseId}/submissions/${submissionId}`, method: 'GET'
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 保存收藏和不确定
 */
export const saveQuestionMark = (
    courseId: string,
    questionId: string,
    questionMarkWrite: BodyType<QuestionMarkWrite>,
 options?: SecondParameter<typeof apiRequest<SaveQuestionMarkResponse>>,) => {
      return apiRequest<SaveQuestionMarkResponse>(
      {url: `/api/v1/practice/courses/${courseId}/questions/${questionId}/mark`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: questionMarkWrite
    },
      options);
    }
  /**
 * 服务端以当前发布版本校验门槛/全部章节/考点覆盖/权重/题量，抽未做题优先；题量不足禁止并管理告警。CHAPTER默认20–40题/40分钟/90分，MOCK40题/80分钟/80分。新章节只影响新模拟申请，不回收旧真题权限。cycleId只用于返回权限上下文，已答门槛/通过本身不按周期重置；门槛计入经本人ADMIN审核认领的旧已答题，联合DISTINCT稳定原创ID。
本人数据，身份来自JWT。
 * @summary 申请章节检测或模拟卷
 */
export const applyAssessment = (
    courseId: string,
    assessmentApply: BodyType<AssessmentApply>,
    params: ApplyAssessmentParams,
 options?: SecondParameter<typeof apiRequest<ApplyAssessmentResponse>>,) => {
      return apiRequest<ApplyAssessmentResponse>(
      {url: `/api/v1/practice/courses/${courseId}/assessments`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: assessmentApply,
        params
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 检测会话及历史
 */
export const listAssessments = (
    courseId: string,
    params?: ListAssessmentsParams,
 options?: SecondParameter<typeof apiRequest<ListAssessmentsResponse>>,) => {
      return apiRequest<ListAssessmentsResponse>(
      {url: `/api/v1/practice/courses/${courseId}/assessments`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 恢复已保存选项，不返回对错/答案。GET只读，不组卷或结算；deadlineReached由时钟派生，即便后台尚未结算也禁止继续保存。
本人数据，身份来自JWT。
 * @summary 恢复检测题目、选择和服务端截止时间
 */
export const getAssessment = (
    courseId: string,
    sessionId: string,
 options?: SecondParameter<typeof apiRequest<GetAssessmentResponse>>,) => {
      return apiRequest<GetAssessmentResponse>(
      {url: `/api/v1/practice/courses/${courseId}/assessments/${sessionId}`, method: 'GET'
    },
      options);
    }
  /**
 * 截止前以expectedSavedAt比较；服务端追加answer_event并更新最后选项；截止后拒绝修改/写命令兜底结算。并发与交卷串行锁会话，不泄漏正确性。
本人数据，身份来自JWT。
 * @summary 保存或改选检测答案
 */
export const saveAssessmentAnswer = (
    courseId: string,
    sessionId: string,
    revisionId: string,
    assessmentAnswerWrite: BodyType<AssessmentAnswerWrite>,
 options?: SecondParameter<typeof apiRequest<SaveAssessmentAnswerResponse>>,) => {
      return apiRequest<SaveAssessmentAnswerResponse>(
      {url: `/api/v1/practice/courses/${courseId}/assessments/${sessionId}/answers/${revisionId}`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: assessmentAnswerWrite
    },
      options);
    }
  /**
 * 读已保存选项，未答算错；精确原始分数比较，通过与结果同事务。截止后按已保存答案TIMED_OUT；重复交卷返回同一终态，终态不再比较指纹。入参绝不接受score/correct/passed。
本人数据，身份来自JWT。
 * @summary 交卷、后端判分与通过状态
 */
export const submitAssessment = (
    courseId: string,
    sessionId: string,
    assessmentSubmit: BodyType<AssessmentSubmit>,
    params: SubmitAssessmentParams,
 options?: SecondParameter<typeof apiRequest<SubmitAssessmentResponse>>,) => {
      return apiRequest<SubmitAssessmentResponse>(
      {url: `/api/v1/practice/courses/${courseId}/assessments/${sessionId}/submission`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: assessmentSubmit,
        params
    },
      options);
    }
  /**
 * 仅本人已交卷/超时终态开放；未交卷40304。超时结算由后台/写命令，GET不写库。
本人数据，身份来自JWT。
 * @summary 获取终态检测结果与解析
 */
export const getAssessmentResult = (
    courseId: string,
    sessionId: string,
    params: GetAssessmentResultParams,
 options?: SecondParameter<typeof apiRequest<GetAssessmentResultResponse>>,) => {
      return apiRequest<GetAssessmentResultResponse>(
      {url: `/api/v1/practice/courses/${courseId}/assessments/${sessionId}/result`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 通过凭据与作废历史
 */
export const listPasses = (
    courseId: string,
    params?: ListPassesParams,
 options?: SecondParameter<typeof apiRequest<ListPassesResponse>>,) => {
      return apiRequest<ListPassesResponse>(
      {url: `/api/v1/practice/courses/${courseId}/passes`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 只展示最新答案/次数，不能伪造逐次记录；经审核的旧已答题按原创ID并入门槛，未审核不计。
本人数据，身份来自JWT。
 * @summary 旧最新作答汇总只读列表
 */
export const listLegacyPractice = (
    params?: ListLegacyPracticeParams,
 options?: SecondParameter<typeof apiRequest<ListLegacyPracticeResponse>>,) => {
      return apiRequest<ListLegacyPracticeResponse>(
      {url: `/api/v1/practice/history`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 同一原创题可有多个旧副本候选，但计数最终DISTINCT稳定原创ID；未知映射/作答证据不自动批准。
仅ADMIN。
 * @summary 管理员查看旧已答题认领候选
 */
export const adminListLegacyCredits = (
    params?: AdminListLegacyCreditsParams,
 options?: SecondParameter<typeof apiRequest<AdminListLegacyCreditsResponse>>,) => {
      return apiRequest<AdminListLegacyCreditsResponse>(
      {url: `/api/v1/admin/practice/legacy-credits`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 只修改规范化旧汇总的映射/认领标记并追加audit，原legacy_record只读。计数并集=新练习+终态已答检测+已审核旧汇总，按当前章原创ID去重；不以attempts值增加题数。
仅ADMIN。 撤销门槛认领不自动作废既有检测通过，作废通过须另走管理员有原因审计接口。
 * @summary 本人审核认领或撤销旧已答题门槛
 */
export const adminDecideLegacyCredit = (
    legacyId: string,
    legacyPracticeCreditDecision: BodyType<LegacyPracticeCreditDecision>,
 options?: SecondParameter<typeof apiRequest<AdminDecideLegacyCreditResponse>>,) => {
      return apiRequest<AdminDecideLegacyCreditResponse>(
      {url: `/api/v1/admin/practice/legacy-credits/${legacyId}/decision`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: legacyPracticeCreditDecision
    },
      options);
    }
  /**
 * 已发布内容可读，答案仅管理用途，不供学习页面预载；无当前配置返回404，不造默认数据。
仅ADMIN。
 * @summary 管理员读取版本原创题与标准答案
 */
export const adminGetQuestions = (
    courseId: string,
    releaseId: string,
 options?: SecondParameter<typeof apiRequest<AdminGetQuestionsResponse>>,) => {
      return apiRequest<AdminGetQuestionsResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/questions`, method: 'GET'
    },
      options);
    }
  /**
 * 仅DRAFT允许替换；已发布或被session引用禁止原地改。共享内容稳定ID与用户状态分离；实际关联/去重/配置由后端校验。管理答案读取写入必须单独审计，不作为学生答题旁路。
仅ADMIN。
 * @summary 管理员维护草稿原创题与标准答案
 */
export const adminPutQuestions = (
    courseId: string,
    releaseId: string,
    questionBankDraft: BodyType<QuestionBankDraft>,
 options?: SecondParameter<typeof apiRequest<AdminPutQuestionsResponse>>,) => {
      return apiRequest<AdminPutQuestionsResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/questions`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: questionBankDraft
    },
      options);
    }
  /**
 * 已发布内容可读，答案仅管理用途，不供学习页面预载；无当前配置返回404，不造默认数据。
仅ADMIN。
 * @summary 管理员读取版本检测参数与近五年章节权重
 */
export const adminGetAssessmentPolicy = (
    courseId: string,
    releaseId: string,
 options?: SecondParameter<typeof apiRequest<AdminGetAssessmentPolicyResponse>>,) => {
      return apiRequest<AdminGetAssessmentPolicyResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/assessment-policy`, method: 'GET'
    },
      options);
    }
  /**
 * 仅DRAFT允许替换；已发布或被session引用禁止原地改。共享内容稳定ID与用户状态分离；实际关联/去重/配置由后端校验。管理答案读取写入必须单独审计，不作为学生答题旁路。
仅ADMIN。
 * @summary 管理员维护草稿检测参数与近五年章节权重
 */
export const adminPutAssessmentPolicy = (
    courseId: string,
    releaseId: string,
    assessmentPolicyWrite: BodyType<AssessmentPolicyWrite>,
 options?: SecondParameter<typeof apiRequest<AdminPutAssessmentPolicyResponse>>,) => {
      return apiRequest<AdminPutAssessmentPolicyResponse>(
      {url: `/api/v1/admin/courses/${courseId}/releases/${releaseId}/assessment-policy`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: assessmentPolicyWrite
    },
      options);
    }
  /**
 * 只作废一条pass，留原检测结果及audit，同事务生效；若无其他有效模拟通过/活动override，立即关闭所有受影响周期的真题下载/成绩写入。示例展示作废最后模拟通过后关闭权限。已有成绩/旧历史仍可查看，章节检测/模拟重考资格依有效章节通过另判。
仅ADMIN。
 * @summary 管理员填写原因作废通过凭据
 */
export const adminInvalidatePass = (
    passId: string,
    invalidatePass: BodyType<InvalidatePass>,
 options?: SecondParameter<typeof apiRequest<AdminInvalidatePassResponse>>,) => {
      return apiRequest<AdminInvalidatePassResponse>(
      {url: `/api/v1/admin/practice/passes/${passId}/invalidation`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: invalidatePass
    },
      options);
    }
  /**
 * 仅ADMIN。
 * @summary 管理员查看题量不足告警
 */
export const adminListAlerts = (
    params?: AdminListAlertsParams,
 options?: SecondParameter<typeof apiRequest<AdminListAlertsResponse>>,) => {
      return apiRequest<AdminListAlertsResponse>(
      {url: `/api/v1/admin/practice/alerts`, method: 'GET',
        params
    },
      options);
    }
  /**
 * acknowledgedBy来自JWT；确认告警不放宽题量/门槛。
仅ADMIN。
 * @summary 管理员确认处理题库告警
 */
export const adminAcknowledgeAlert = (
    alertId: string,
    overrideConfirm: BodyType<OverrideConfirm>,
 options?: SecondParameter<typeof apiRequest<AdminAcknowledgeAlertResponse>>,) => {
      return apiRequest<AdminAcknowledgeAlertResponse>(
      {url: `/api/v1/admin/practice/alerts/${alertId}/acknowledgement`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: overrideConfirm
    },
      options);
    }
  export type GetPracticeOverviewResult = NonNullable<Awaited<ReturnType<typeof getPracticeOverview>>>
export type GetPracticeStatsResult = NonNullable<Awaited<ReturnType<typeof getPracticeStats>>>
export type ListQuestionsResult = NonNullable<Awaited<ReturnType<typeof listQuestions>>>
export type GetQuestionResult = NonNullable<Awaited<ReturnType<typeof getQuestion>>>
export type SubmitPracticeAnswerResult = NonNullable<Awaited<ReturnType<typeof submitPracticeAnswer>>>
export type ListPracticeHistoryResult = NonNullable<Awaited<ReturnType<typeof listPracticeHistory>>>
export type GetPracticeResultResult = NonNullable<Awaited<ReturnType<typeof getPracticeResult>>>
export type SaveQuestionMarkResult = NonNullable<Awaited<ReturnType<typeof saveQuestionMark>>>
export type ApplyAssessmentResult = NonNullable<Awaited<ReturnType<typeof applyAssessment>>>
export type ListAssessmentsResult = NonNullable<Awaited<ReturnType<typeof listAssessments>>>
export type GetAssessmentResult = NonNullable<Awaited<ReturnType<typeof getAssessment>>>
export type SaveAssessmentAnswerResult = NonNullable<Awaited<ReturnType<typeof saveAssessmentAnswer>>>
export type SubmitAssessmentResult = NonNullable<Awaited<ReturnType<typeof submitAssessment>>>
export type GetAssessmentResultResult = NonNullable<Awaited<ReturnType<typeof getAssessmentResult>>>
export type ListPassesResult = NonNullable<Awaited<ReturnType<typeof listPasses>>>
export type ListLegacyPracticeResult = NonNullable<Awaited<ReturnType<typeof listLegacyPractice>>>
export type AdminListLegacyCreditsResult = NonNullable<Awaited<ReturnType<typeof adminListLegacyCredits>>>
export type AdminDecideLegacyCreditResult = NonNullable<Awaited<ReturnType<typeof adminDecideLegacyCredit>>>
export type AdminGetQuestionsResult = NonNullable<Awaited<ReturnType<typeof adminGetQuestions>>>
export type AdminPutQuestionsResult = NonNullable<Awaited<ReturnType<typeof adminPutQuestions>>>
export type AdminGetAssessmentPolicyResult = NonNullable<Awaited<ReturnType<typeof adminGetAssessmentPolicy>>>
export type AdminPutAssessmentPolicyResult = NonNullable<Awaited<ReturnType<typeof adminPutAssessmentPolicy>>>
export type AdminInvalidatePassResult = NonNullable<Awaited<ReturnType<typeof adminInvalidatePass>>>
export type AdminListAlertsResult = NonNullable<Awaited<ReturnType<typeof adminListAlerts>>>
export type AdminAcknowledgeAlertResult = NonNullable<Awaited<ReturnType<typeof adminAcknowledgeAlert>>>
