import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  parseExamTarget,
  countdownParts,
  parseExamSchedule,
  personalExamSessions,
  confirmedExamSessions,
} from './countdown';
import { DashboardPage } from '../../pages/DashboardPage';
import { SchedulePage } from '../../pages/SchedulePage';
import { spaceModules } from '../../spaces/registry';
import officialHtml from './fixtures/official-home.html?raw';
const myCodes = ['00023', '02324', '13015', '13175', '13171', '13216'];
vi.mock('../cycle/CycleContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../cycle/CycleContext')>()),
  useCycle: () => ({
    cycleId: 'current',
    pending: false,
    error: false,
    selected: { name: '2026年10月自考' },
  }),
}));
vi.mock('../../api/generated/courses/courses', () => ({
  listCourses: vi.fn(async () => ({
    data: {
      items: ['00023', '02324', '13015', '13175', '13171', '13216'].map((code) => ({
        code,
        id: code,
        name: code,
      })),
      total: 6,
    },
  })),
}));
const html = '<script>const targetDate = new Date("October 24, 2026 09:00:00").getTime();</script>';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retryDelay: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}
describe('official exam countdown', () => {
  it('reads the official time in Shanghai regardless of device timezone', () => {
    expect(new Date(parseExamTarget(html)).toISOString()).toBe('2026-10-24T01:00:00.000Z');
    expect(parseExamTarget(html.replace('October 24, 2026', 'April 17, 2027'))).toBe(
      Date.parse('2027-04-17T09:00:00+08:00'),
    );
  });
  it('rejects changed markup and invalid dates instead of inventing a target', () => {
    for (const source of [
      '',
      html.replace('October', 'Unknown'),
      html.replace('October 24', 'February 30'),
      html.replace('09:00', '29:00'),
    ])
      expect(() => parseExamTarget(source)).toThrow();
  });
  it('matches the official day/hour/minute rounding and clamps expired exams', () => {
    const target = parseExamTarget(html);
    expect(countdownParts(target, target - (2 * 86400 + 3 * 3600 + 4 * 60 + 59) * 1000)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
    });
    expect(countdownParts(target, target + 1000)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
  it('shows only the official countdown and never requests study plans', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(html));
    vi.stubGlobal('fetch', fetcher);
    mount();
    await screen.findByRole('timer');
    expect(screen.getByText(/2026年10月24日/)).toBeTruthy();
    expect(screen.queryByText('今日清单')).toBeNull();
    expect(screen.queryByText('建立学习计划')).toBeNull();
    expect(fetcher.mock.calls.every(([url]) => url === '/exam-countdown-source')).toBe(true);
    expect(
      spaceModules
        .find((m) => m.id === 'study')
        ?.navigation.some(([url]) => url === '/study/schedule'),
    ).toBe(false);
  });
  it('shows sync failure and can retry with a newer official date', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('failed', { status: 502 }));
    vi.stubGlobal('fetch', fetcher);
    mount();
    await screen.findByRole('alert');
    expect(screen.queryByRole('timer')).toBeNull();
    fetcher.mockResolvedValue(new Response(html.replace('October 24, 2026', 'April 17, 2027')));
    fireEvent.click(screen.getByRole('button', { name: '重新同步' }));
    await waitFor(() => expect(screen.getByText(/2027年4月17日/)).toBeTruthy());
  });
  it('reads all official course sessions and the tentative practical exam notice', () => {
    const schedule = parseExamSchedule(officialHtml);
    expect(schedule.sessions).toHaveLength(4);
    expect(schedule.sessions.flatMap((s) => s.courses)).toHaveLength(19);
    expect(schedule.sessions[0].courses.find((c) => c.code === '02324')?.name).toBe('离散数学');
    expect(schedule.sessions[1].time).toBe('14:30-17:00');
    expect(schedule.sessions[2].courses.find((c) => c.code === '13175')?.name).toBe(
      '线性代数（工）',
    );
    expect(schedule.sessions[3].courses.find((c) => c.code === '13015')?.name).toBe(
      '计算机系统原理',
    );
    expect(schedule.practice).toContain('暂定10.31-11.1日');
    expect(() => parseExamSchedule('<p>changed</p>')).toThrow();
  });
  it('renders the official schedule below the countdown without executing source scripts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(officialHtml)));
    mount();
    await screen.findByRole('table');
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText('离散数学')).toBeTruthy();
    expect(screen.getByText('具体时段待通知')).toBeTruthy();
    expect(screen.queryByText('C++程序设计')).toBeNull();
    expect(screen.queryByText('软件工程')).toBeNull();
    expect(
      screen.getByRole('timer').compareDocumentPosition(screen.getByRole('table')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
  it('filters the official timetable to the current cycle courses, including only the two selected practical exams', () => {
    const schedule = parseExamSchedule(officialHtml);
    const personal = personalExamSessions(schedule, myCodes);
    expect(
      personal.flatMap((session) => session.courses.map((course) => course.code)).sort(),
    ).toEqual([...myCodes].sort());
    expect(personal.at(-1)?.courses.map((course) => course.code)).toEqual(['13171', '13216']);
    expect(personal.at(-1)?.date).toContain('10.31-11.1');
    expect(personalExamSessions(schedule, [])).toEqual([]);
    expect(
      personalExamSessions(schedule, ['00023']).flatMap((session) =>
        session.courses.map((course) => course.code),
      ),
    ).toEqual(['00023']);
  });
  it('old schedule links redirect to today', () => {
    render(
      <MemoryRouter initialEntries={['/study/schedule']}>
        <SchedulePage />
      </MemoryRouter>,
    );
    expect(screen.queryByText('学习计划')).toBeNull();
  });
});

it('uses confirmed admission times over tentative website practical dates', () => {
  const official = [{ date: '10月30日（暂定）', time: '具体时段待通知', courses: [{ code: '13171', name: '数据库及其应用（实践）', national: false }, { code: '13216', name: 'Java语言程序设计（实践）', national: false }] }];
  const courses = [{ id: 'db', code: '13171', name: '数据库及其应用（实践）' }, { id: 'java', code: '13216', name: 'Java语言程序设计（实践）' }];
  const sessions = confirmedExamSessions(official, courses, [
    { courseId: 'db', examDate: '2026-11-01', startsAt: '10:30:00', endsAt: null },
    { courseId: 'java', examDate: '2026-11-01', startsAt: '14:30:00', endsAt: null },
  ]);
  expect(sessions.map(s => [s.date, s.time, s.courses[0].code])).toEqual([
    ['2026-11-01', '10:30（开考）', '13171'], ['2026-11-01', '14:30（开考）', '13216'],
  ]);
  expect(confirmedExamSessions(official, courses, [])).toEqual(official);
});
