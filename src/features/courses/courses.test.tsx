import { act, render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component as CoursesPage } from '../../pages/CoursesPage';
import { CycleProvider, cycleKey } from '../cycle/CycleContext';
import { AuthContext } from '../auth/AuthProvider';
import { server } from '../../mocks/server';
import type { Course, CycleWrite, ExamCycle } from '../../api/generated/models';

let cycle: ExamCycle;
let records: Course[];
let writes: CycleWrite[];
const names = [
  '高等数学（工本）',
  '离散数学',
  '计算机系统原理',
  '线性代数（工）',
  '数据库及其应用（实践）',
  'Java语言程序设计（实践）',
];
const response = (data: unknown) => HttpResponse.json({ code: 0, message: 'ok', data });
beforeEach(() => {
  localStorage.clear();
  writes = [];
  records = names.map((name, i) => ({
    id: `course-${i}`,
    code: ['00023', '02324', '13015', '13175', '13171', '13216'][i],
    name,
    courseType: i < 4 ? 'THEORY' : 'PRACTICE',
    active: true,
    releaseId: 'release',
    capabilities: { catalog: true, knowledge: true, practice: i < 4, exams: i < 4, manual: i >= 4 },
    progress: { completedItems: 2, totalItems: 10, percent: 20 },
    enrollment: null,
  }));
  cycle = {
    id: 'period-1',
    name: '当前考试周期',
    startDate: '2026-10-01',
    endDate: '2099-10-31',
    timezone: 'Asia/Shanghai',
    courses: records.map((course, i) => ({
      courseId: course.id,
      examDate: i < 4 ? '2026-10-24' : null,
      startsAt: i < 4 ? '09:00:00' : null,
      endsAt: i < 4 ? '11:30:00' : null,
    })),
  };
  server.use(
    http.get('/api/v1/exams/cycles', () =>
      response({ items: [cycle], page: 1, size: 100, total: 1 }),
    ),
    http.get('/api/v1/exams/cycles/:id', () => response(cycle)),
    http.get('/api/v1/courses', () =>
      response({ items: records, page: 1, size: 100, total: records.length }),
    ),
    http.put('/api/v1/admin/exams/cycles/:id', async ({ request }) => {
      const body = (await request.json()) as CycleWrite;
      writes.push(body);
      cycle = { ...cycle, ...body };
      return response(cycle);
    }),
  );
});
function mount(role: 'ADMIN' | 'USER' = 'ADMIN') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const auth = {
    status: 'authenticated' as const,
    user: { id: 'test-user', username: 'test', email: 'test@example.test', role },
    signIn: async () => {},
    signOut: async () => {},
  };
  const router = createMemoryRouter(
    [
      {
        path: '/zikao/courses',
        element: (
          <CycleProvider>
            <CoursesPage />
          </CycleProvider>
        ),
      },
      { path: '*', element: <p>目标页面</p> },
    ],
    { initialEntries: ['/zikao/courses'], future: { v7_relativeSplatPath: true } },
  );
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return router;
}
const card = (name: string) => screen.getByRole('article', { name });
async function edit(name = names[0]) {
  await screen.findByRole('heading', { name });
  await userEvent.click(within(card(name)).getByRole('button', { name: '修改考试时间' }));
  return screen.getByRole('dialog');
}
it('六科完整卡片无缴费内容和同页管理链接，实践科入口遵循能力', async () => {
  mount();
  await screen.findByRole('heading', { name: names[0] });
  expect(document.title).toBe('我的科目 · 学习知途');
  expect(screen.getAllByRole('article')).toHaveLength(6);
  expect(screen.queryByText(/缴费|付款/)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '管理' })).not.toBeInTheDocument();
  const practice = within(card(names[4]));
  expect(practice.queryByRole('link', { name: '章节练习' })).not.toBeInTheDocument();
  expect(practice.queryByRole('link', { name: '历年试卷' })).not.toBeInTheDocument();
  expect(practice.getByRole('link', { name: '实践手册' })).toBeInTheDocument();
  expect(practice.getByRole('link', { name: '备注' })).toHaveAttribute(
    'href',
    '/zikao/course/13171/notes',
  );
});
it('普通账号只能查看时间，管理员可编辑，保持服务器权限规则', async () => {
  mount('USER');
  await screen.findByRole('heading', { name: names[0] });
  expect(screen.queryByRole('button', { name: '修改考试时间' })).not.toBeInTheDocument();
  expect(within(card(names[0])).getByText('10/24 09:00–11:30')).toBeInTheDocument();
  expect(writes).toHaveLength(0);
});
it('主入口使用有效能力，无内容时不伪造课程入口', async () => {
  records[0].capabilities = {
    catalog: false,
    knowledge: false,
    practice: false,
    exams: false,
    manual: true,
  };
  records[1].capabilities = {
    catalog: false,
    knowledge: false,
    practice: false,
    exams: false,
    manual: false,
  };
  mount();
  await screen.findByRole('heading', { name: names[0] });
  expect(within(card(names[0])).getByRole('link', { name: '进入课程' })).toHaveAttribute(
    'href',
    '/zikao/course/00023/manual',
  );
  expect(within(card(names[1])).queryByRole('link', { name: '进入课程' })).not.toBeInTheDocument();
});
it('只修改本科时间，读取最新周期以保留其他安排，重新进入仍显示保存值', async () => {
  const router = mount();
  await edit();
  fireEvent.change(screen.getByLabelText('考试日期'), { target: { value: '2026-10-25' } });
  fireEvent.change(screen.getByLabelText('开始时间'), { target: { value: '14:30' } });
  fireEvent.change(screen.getByLabelText('结束时间'), { target: { value: '17:00' } });
  // Another course changed since the list was read; it must survive this save.
  cycle = {
    ...cycle,
    name: '最新周期名称',
    courses: cycle.courses.map((exam, i) => (i === 1 ? { ...exam, examDate: '2026-10-26' } : exam)),
  };
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  await screen.findByText(`${names[0]}考试时间已保存。`);
  expect(writes).toHaveLength(1);
  expect(writes[0].name).toBe('最新周期名称');
  expect(writes[0].courses[0]).toEqual({
    courseId: 'course-0',
    examDate: '2026-10-25',
    startsAt: '14:30:00',
    endsAt: '17:00:00',
  });
  expect(writes[0].courses[1].examDate).toBe('2026-10-26');
  expect(writes[0].courses).toHaveLength(6);
  expect(within(card(names[0])).getByText('10/25 14:30–17:00')).toBeInTheDocument();
  await act(() => router.navigate('/other'));
  await act(() => router.navigate('/zikao/courses'));
  await screen.findByRole('heading', { name: names[0] });
  expect(within(card(names[0])).getByText('10/25 14:30–17:00')).toBeInTheDocument();
});
it('校验成对时段与时间先后，错误不写入接口', async () => {
  mount();
  await edit();
  fireEvent.change(screen.getByLabelText('结束时间'), { target: { value: '08:00' } });
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  expect(screen.getByText('结束时间必须晚于开始时间。')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('结束时间'), { target: { value: '' } });
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  expect(screen.getByText(/请填写考试日期及完整/)).toBeInTheDocument();
  expect(writes).toHaveLength(0);
});
it('实践科可由待确认设定时间，也可明确清空为待确认', async () => {
  mount();
  await edit(names[4]);
  fireEvent.change(screen.getByLabelText('考试日期'), { target: { value: '2026-11-02' } });
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  await screen.findByText(`${names[4]}考试时间已保存。`);
  expect(writes[0].courses[4].examDate).toBe('2026-11-02');
  await edit(names[4]);
  await userEvent.click(screen.getByRole('button', { name: '设为日期待确认' }));
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  await screen.findByText(`${names[4]}考试时间已保存。`);
  expect(writes[1].courses[4]).toEqual({
    courseId: 'course-4',
    examDate: null,
    startsAt: null,
    endsAt: null,
  });
});
it('失败保留日期草稿，可再次保存；取消与 Escape 恢复编辑按钮焦点', async () => {
  let fail = true;
  server.use(
    http.put('/api/v1/admin/exams/cycles/:id', async ({ request }) => {
      if (fail)
        return HttpResponse.json(
          { code: 50001, message: '保存失败，请重试', data: null },
          { status: 500 },
        );
      const body = (await request.json()) as CycleWrite;
      cycle = { ...cycle, ...body };
      return response(cycle);
    }),
  );
  mount();
  await edit();
  fireEvent.change(screen.getByLabelText('考试日期'), { target: { value: '2026-10-28' } });
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  await screen.findByText('保存失败，请重试');
  expect(screen.getByLabelText('考试日期')).toHaveValue('2026-10-28');
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  await screen.findByText(`${names[0]}考试时间已保存。`);
  await edit();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(within(card(names[0])).getByRole('button', { name: '修改考试时间' })).toHaveFocus();
});
it('同科安排已变化时阻止覆盖，显式读取最新安排后才可继续', async () => {
  mount();
  await edit();
  cycle = {
    ...cycle,
    courses: cycle.courses.map((exam, i) => (i === 0 ? { ...exam, examDate: '2026-10-26' } : exam)),
  };
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  await screen.findByText('考试安排已被其他操作修改，请读取最新安排后再保存。');
  expect(writes).toHaveLength(0);
  expect(screen.getByRole('button', { name: '保存考试时间' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: '读取最新安排' }));
  await waitFor(() => expect(screen.getByLabelText('考试日期')).toHaveValue('2026-10-26'));
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  await screen.findByText(`${names[0]}考试时间已保存。`);
});
it('切换周期保留课程链接与返回路径，错误和空数据可恢复', async () => {
  const other = {
    ...cycle,
    id: 'period-2',
    name: '另一考试周期',
    startDate: '2099-11-01',
    endDate: '2099-11-30',
  };
  server.use(
    http.get('/api/v1/exams/cycles', () =>
      response({ items: [cycle, other], page: 1, size: 100, total: 2 }),
    ),
  );
  const router = mount();
  await screen.findByRole('heading', { name: names[0] });
  await userEvent.selectOptions(screen.getByLabelText('考试周期'), other.id);
  await screen.findByRole('heading', { name: names[0] });
  expect(within(card(names[0])).getByRole('link', { name: '进入课程' })).toHaveAttribute(
    'href',
    `/zikao/course/00023/catalog?cycle=${cycleKey(other)}`,
  );
  expect(router.state.location.search).toBe(`?cycle=${cycleKey(other)}`);
});
it('科目加载失败可重试，空周期有清晰说明', async () => {
  let fail = true;
  server.use(
    http.get('/api/v1/courses', () =>
      fail
        ? HttpResponse.json({ code: 50001, message: '失败', data: null }, { status: 500 })
        : response({ items: [], page: 1, size: 100, total: 0 }),
    ),
  );
  mount();
  await screen.findByText('科目加载失败，请重新加载。');
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
  await screen.findByText('当前周期暂无科目，可切换其他考试周期。');
});

it('保存中重复提交不会重复写入，Escape 不关闭正在保存的弹窗', async () => {
  let finish!: () => void;
  const waiting = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let calls = 0;
  server.use(
    http.put('/api/v1/admin/exams/cycles/:id', async ({ request }) => {
      calls++;
      const body = (await request.json()) as CycleWrite;
      await waiting;
      cycle = { ...cycle, ...body };
      return response(cycle);
    }),
  );
  mount();
  await edit();
  await userEvent.click(screen.getByRole('button', { name: '保存考试时间' }));
  await waitFor(() => expect(calls).toBe(1));
  expect(screen.getByRole('button', { name: '保存考试时间' })).toBeDisabled();
  fireEvent.submit(screen.getByLabelText('考试日期').closest('form')!);
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  finish();
  await screen.findByText(`${names[0]}考试时间已保存。`);
  expect(calls).toBe(1);
});
