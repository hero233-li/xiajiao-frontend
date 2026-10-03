/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  AdminCreateCourseParams,
  AdminCreateCourseResponse,
  AdminUpdateCourseParams,
  AdminUpdateCourseResponse,
  CourseAdminWrite,
  EnrollmentWrite,
  GetCourseByCodeParams,
  GetCourseByCodeResponse,
  GetCourseParams,
  GetCourseResponse,
  GetEnrollmentResponse,
  GetLearningPositionResponse,
  LearningPositionWrite,
  ListAdminCourses200,
  ListAdminCoursesParams,
  ListCoursesParams,
  ListCoursesResponse,
  SaveEnrollmentResponse,
  SaveLearningPositionResponse
} from '.././models';

import { apiRequest } from '../../http';
import type { BodyType } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 首版仅六科；响应包含本人报名和实时进度，理论/实践筛选由后端执行。
本人数据，身份来自JWT。
 * @summary 我的科目与六科列表
 */
export const listCourses = (
    params: ListCoursesParams,
 options?: SecondParameter<typeof apiRequest<ListCoursesResponse>>,) => {
      return apiRequest<ListCoursesResponse>(
      {url: `/api/v1/courses`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 课程详情与功能能力
 */
export const getCourse = (
    courseId: string,
    params: GetCourseParams,
 options?: SecondParameter<typeof apiRequest<GetCourseResponse>>,) => {
      return apiRequest<GetCourseResponse>(
      {url: `/api/v1/courses/${courseId}`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 无记录40401，首页聚合则使用NULL；不拿固定高数位置当真实历史。
本人数据，身份来自JWT。
 * @summary 读取本科最近学习位置
 */
export const getLearningPosition = (
    courseId: string,
 options?: SecondParameter<typeof apiRequest<GetLearningPositionResponse>>,) => {
      return apiRequest<GetLearningPositionResponse>(
      {url: `/api/v1/courses/${courseId}/learning-position`, method: 'GET'
    },
      options);
    }
  /**
 * 仅保存现有数据库支持的pane/chapter/item/question位置；关联必须属于本课程。
本人数据，身份来自JWT。
 * @summary 保存本科最近学习位置
 */
export const saveLearningPosition = (
    courseId: string,
    learningPositionWrite: BodyType<LearningPositionWrite>,
 options?: SecondParameter<typeof apiRequest<SaveLearningPositionResponse>>,) => {
      return apiRequest<SaveLearningPositionResponse>(
      {url: `/api/v1/courses/${courseId}/learning-position`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: learningPositionWrite
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 读取报名与正式成绩
 */
export const getEnrollment = (
    courseId: string,
    cycleId: string,
 options?: SecondParameter<typeof apiRequest<GetEnrollmentResponse>>,) => {
      return apiRequest<GetEnrollmentResponse>(
      {url: `/api/v1/courses/${courseId}/enrollments/${cycleId}`, method: 'GET'
    },
      options);
    }
  /**
 * 本人的初始化报考记录不存在时expectedRevision=0可创建；需ADMIN已配置cycle_course，不能由用户修改考试安排。
本人数据，身份来自JWT。
 * @summary 保存报名与正式成绩
 */
export const saveEnrollment = (
    courseId: string,
    cycleId: string,
    enrollmentWrite: BodyType<EnrollmentWrite>,
 options?: SecondParameter<typeof apiRequest<SaveEnrollmentResponse>>,) => {
      return apiRequest<SaveEnrollmentResponse>(
      {url: `/api/v1/courses/${courseId}/enrollments/${cycleId}`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: enrollmentWrite
    },
      options);
    }
  /**
 * 支持00023等五位代码深链接，后端解析稳定UUID及本人进度；不让前端查找所有课程再拼出课程定义。
本人数据，身份来自JWT。
 * @summary 按课程代码解析现有页面深链接
 */
export const getCourseByCode = (
    courseCode: string,
    params: GetCourseByCodeParams,
 options?: SecondParameter<typeof apiRequest<GetCourseByCodeResponse>>,) => {
      return apiRequest<GetCourseByCodeResponse>(
      {url: `/api/v1/courses/by-code/${courseCode}`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 仅 ADMIN。省略 cycleId 读取全部课程；提供 cycleId 读取周期关联课程，均包含停用项，可重新启用。无需返回个人报名或进度。
 * @summary 管理员课程目录（包含停用课程）
 */
export const listAdminCourses = (
    params?: ListAdminCoursesParams,
 options?: SecondParameter<typeof apiRequest<ListAdminCourses200>>,) => {
      return apiRequest<ListAdminCourses200>(
      {url: `/api/v1/admin/courses`, method: 'GET',
        params
    },
      options);
    }
  /**
 * 首版限制确认的六个代码，不能提前开放24科。报名状态仍归当前账号，课程基础定义为公共内容。
仅ADMIN。
 * @summary 管理员创建六科基础定义
 */
export const adminCreateCourse = (
    courseAdminWrite: BodyType<CourseAdminWrite>,
    params: AdminCreateCourseParams,
 options?: SecondParameter<typeof apiRequest<AdminCreateCourseResponse>>,) => {
      return apiRequest<AdminCreateCourseResponse>(
      {url: `/api/v1/admin/courses`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: courseAdminWrite,
        params
    },
      options);
    }
  /**
 * 稳定course UUID及课程代码不改，code必须与已有一致；更换名称不影响进度与通过。
仅ADMIN。
 * @summary 管理员修改课程名称与类型
 */
export const adminUpdateCourse = (
    courseId: string,
    courseAdminWrite: BodyType<CourseAdminWrite>,
    params: AdminUpdateCourseParams,
 options?: SecondParameter<typeof apiRequest<AdminUpdateCourseResponse>>,) => {
      return apiRequest<AdminUpdateCourseResponse>(
      {url: `/api/v1/admin/courses/${courseId}`, method: 'PUT',
      headers: {'Content-Type': 'application/json', },
      data: courseAdminWrite,
        params
    },
      options);
    }
  export type ListCoursesResult = NonNullable<Awaited<ReturnType<typeof listCourses>>>
export type GetCourseResult = NonNullable<Awaited<ReturnType<typeof getCourse>>>
export type GetLearningPositionResult = NonNullable<Awaited<ReturnType<typeof getLearningPosition>>>
export type SaveLearningPositionResult = NonNullable<Awaited<ReturnType<typeof saveLearningPosition>>>
export type GetEnrollmentResult = NonNullable<Awaited<ReturnType<typeof getEnrollment>>>
export type SaveEnrollmentResult = NonNullable<Awaited<ReturnType<typeof saveEnrollment>>>
export type GetCourseByCodeResult = NonNullable<Awaited<ReturnType<typeof getCourseByCode>>>
export type ListAdminCoursesResult = NonNullable<Awaited<ReturnType<typeof listAdminCourses>>>
export type AdminCreateCourseResult = NonNullable<Awaited<ReturnType<typeof adminCreateCourse>>>
export type AdminUpdateCourseResult = NonNullable<Awaited<ReturnType<typeof adminUpdateCourse>>>
