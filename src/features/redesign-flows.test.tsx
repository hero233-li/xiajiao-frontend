import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { CreatePlan } from './schedule/CreatePlan';
import { AssessmentGate } from './practice/AssessmentGate';
import { EnrollmentControls } from './courses/EnrollmentControls';
import type { EnrollmentWrite, PlanCreate } from '../api/generated/models';
vi.mock('./cycle/CycleContext', async (original) => ({
  ...(await original<object>()),
  useCycle: () => ({
    cycleId: 'cycle',
    defaultId: 'cycle',
    selected: { id: 'cycle', startDate: '2026-10-03', endDate: '2026-10-04' },
  }),
}));
const ok = (data: unknown) => HttpResponse.json({ code: 0, message: '成功', data });
const course = { id: 'course', code: '00023', name: '高等数学', courseType: 'THEORY' };
const theoryCourses = [
  course,
  ...[2, 3, 4].map((i) => ({
    id: `course${i}`,
    code: `0002${i}`,
    name: `理论课${i}`,
    courseType: 'THEORY',
  })),
];
function Location() {
  const l = useLocation();
  return (
    <output>
      {l.pathname}
      {l.search}
    </output>
  );
}
function mount(element: React.ReactNode) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter initialEntries={['/study/schedule']}>
        {element}
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function courses() {
  server.use(
    http.get('/api/v1/courses', () => ok({ items: theoryCourses, size: 100, page: 1, total: 4 })),
  );
}
function gate(allowed: boolean) {
  server.use(
    http.get('/api/v1/exams/courses/course/unlock', () =>
      ok({ canApplyMock: allowed, missingChapterIds: allowed ? [] : ['a', 'b'] }),
    ),
    http.get('/api/v1/practice/courses/course/assessments', () =>
      ok({ items: [], page: 1, size: 10, total: 0 }),
    ),
  );
}
describe('新增的完整业务入口', () => {
  it('创建计划使用周期、科目、逐日容量并定位真实新计划', async () => {
    courses();
    let body: PlanCreate | undefined;
    server.use(
      http.post('/api/v1/schedule/plans', async ({ request }) => {
        body = (await request.json()) as PlanCreate;
        return ok({ id: 'created' });
      }),
    );
    mount(<CreatePlan />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '新建计划' }));
    await user.clear(screen.getByLabelText('批量设置分钟'));
    await user.type(screen.getByLabelText('批量设置分钟'), '60');
    await user.click(screen.getByRole('button', { name: '应用到所有日期' }));
    await user.click(screen.getByRole('button', { name: '确认配置并创建' }));
    await waitFor(() =>
      expect(screen.getByText('/study/schedule?planId=created')).toBeInTheDocument(),
    );
    expect(body?.config).toMatchObject({
      name: '五周备考计划',
      strategy: 'WEEKLY_35',
      cycleId: 'cycle',
      startDate: '2026-10-03',
      endDate: '2026-11-06',
      coursePriority: ['course', 'course2', 'course3', 'course4'],
      courseScope: ['course', 'course2', 'course3', 'course4'],
    });
    expect(body?.config.dayCapacities).toHaveLength(35);
    expect(body?.config.dayCapacities.every((d) => d.capacityMinutes === 60)).toBe(true);
    expect(body?.config.dayCapacities.at(-1)?.day).toBe('2026-11-06');
    expect(body?.acceptUnscheduled).toBe(false);
  });
  it('容量缺口保留配置，只有明确勾选才接受未排入任务', async () => {
    courses();
    const writes: PlanCreate[] = [];
    server.use(
      http.post('/api/v1/schedule/plans', async ({ request }) => {
        writes.push((await request.json()) as PlanCreate);
        return HttpResponse.json({ code: 42201, message: '可用时间不足' }, { status: 422 });
      }),
    );
    mount(<CreatePlan />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '新建计划' }));
    await user.click(screen.getByRole('button', { name: '确认配置并创建' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('可用时间不足');
    expect(screen.getByLabelText('批量设置分钟')).toHaveValue(180);
    await user.click(screen.getByLabelText('接受容量不足的任务保持“未排入”'));
    await user.click(screen.getByRole('button', { name: '确认配置并创建' }));
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1].acceptUnscheduled).toBe(true);
  });
  it('模拟资格不足时显示缺失章节且不允许进入计时流程', async () => {
    gate(false);
    mount(<AssessmentGate courseId="course" code="00023" cycleId="cycle" />);
    expect(await screen.findByRole('button', { name: '查看规则并开始' })).toBeDisabled();
    expect(screen.getByText('尚有 2 个章节未通过')).toBeInTheDocument();
  });
  it('模拟确认才发送带幂等键的真实申请并定位会话', async () => {
    gate(true);
    let body: unknown;
    let key: string | null = null;
    let cycle: string | null = null;
    server.use(
      http.post('/api/v1/practice/courses/course/assessments', async ({ request }) => {
        body = await request.json();
        key = request.headers.get('Idempotency-Key');
        cycle = new URL(request.url).searchParams.get('cycleId');
        return ok({ id: 'session-real' });
      }),
    );
    mount(<AssessmentGate courseId="course" code="00023" cycleId="cycle" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '查看规则并开始' }));
    expect(body).toBeUndefined();
    await user.click(screen.getByRole('button', { name: '确认开始计时' }));
    await waitFor(() =>
      expect(screen.getByText('/study/course/00023/tests/session-real')).toBeInTheDocument(),
    );
    expect(body).toEqual({ kind: 'MOCK', chapterId: null });
    expect(cycle).toBe('cycle');
    expect(key).toMatch(/^[\da-f-]{36}$/i);
  });
  it('报考保存携带修订号，未知成绩保持空值而非伪造分数', async () => {
    const enrollment = {
      paid: false,
      fee: null,
      officialScore: null,
      officialPassed: null,
      passedMonth: null,
      note: '原始备注',
      revision: 7,
    };
    let body: EnrollmentWrite | undefined;
    server.use(
      http.get('/api/v1/courses/course/enrollments/cycle', () => ok(enrollment)),
      http.put('/api/v1/courses/course/enrollments/cycle', async ({ request }) => {
        body = (await request.json()) as EnrollmentWrite;
        return ok({ ...enrollment, revision: 8 });
      }),
    );
    mount(<EnrollmentControls courseId="course" cycleId="cycle" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '报考记录' }));
    await user.click(screen.getByLabelText('已缴纳报考费'));
    await user.click(screen.getByRole('button', { name: '保存报考记录' }));
    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      paid: true,
      expectedRevision: 7,
      officialScore: null,
      officialPassed: null,
      note: '原始备注',
    });
  });
  it('报考冲突保留草稿且不给出虚假保存成功', async () => {
    server.use(
      http.get('/api/v1/courses/course/enrollments/cycle', () => ok(null)),
      http.put('/api/v1/courses/course/enrollments/cycle', () =>
        HttpResponse.json({ code: 40901, message: '记录已更新' }, { status: 409 }),
      ),
    );
    mount(<EnrollmentControls courseId="course" cycleId="cycle" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '报考记录' }));
    await user.type(screen.getByLabelText('正式考试成绩（可留空）'), '78');
    await user.click(screen.getByRole('button', { name: '保存报考记录' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('草稿已保留');
    expect(screen.getByLabelText('正式考试成绩（可留空）')).toHaveValue(78);
  });
});
