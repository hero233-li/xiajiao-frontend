import { listAdminCourses } from '../../api/generated/courses/courses';
import { listPapers } from '../../api/generated/exams/exams';
import type { ListPapersParams, Paper } from '../../api/generated/models';
import { apiRequest } from '../../api/http';
export type Json = null | string | number | boolean | Json[] | { [key: string]: Json };
export type Row = { [key: string]: Json };
export async function request<T>(
  url: string,
  method = 'GET',
  data?: unknown,
  revision?: number,
): Promise<T> {
  return (
    await apiRequest<{ data: T }>({
      url: `/api/v1${url}`,
      method,
      data,
      silent: true,
      headers: revision === undefined ? {} : { 'If-Match': String(revision) },
    })
  ).data;
}
export async function all<T>(url: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const r = await request<{ items: T[]; total: number }>(
      `${url}${url.includes('?') ? '&' : '?'}page=${page}&size=100`,
    );
    items.push(...r.items);
    if (items.length >= r.total || !r.items.length) return items;
  }
}
export function message(e: unknown) {
  return e instanceof Error ? e.message : '操作未完成，请重试。';
}
export const titles: Record<string, string> = {
  catalog: '学习目录',
  knowledge: '知识内容',
  questions: '题库',
  'assessment-policy': '检测策略',
  'task-templates': '计划任务',
};

export async function paperPage(courseId: string, params: ListPapersParams) {
  return (await listPapers(courseId, params, { silent: true })).data;
}
export async function allPapers(courseId: string, cycleId: string): Promise<Paper[]> {
  const items: Paper[] = [];
  for (let page = 1; ; page++) {
    const r = await paperPage(courseId, { cycleId, page, size: 100 });
    items.push(...r.items);
    if (items.length >= r.total || !r.items.length) return items;
  }
}

export type AdminCourse = import('../../api/generated/models').AdminCourseEntry;

export async function courseDirectory(cycleId?: string): Promise<AdminCourse[]> {
  const items: AdminCourse[] = [];
  for (let page = 1; ; page++) {
    const r = (await listAdminCourses({ cycleId, page, size: 100 }, { silent: true })).data;
    items.push(...r.items);
    if (items.length >= r.total || !r.items.length) return items;
  }
}
