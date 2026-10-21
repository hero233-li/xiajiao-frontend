import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ExternalLink } from 'lucide-react';
import {
  EXAM_SOURCE,
  countdownParts,
  parseExamTarget,
  parseExamSchedule,
  personalExamSessions,
  confirmedExamSessions,
} from './countdown';
import { listCourses } from '../../api/generated/courses/courses';
import { useCycle } from '../cycle/CycleContext';
import './exam-countdown.css';
export function ExamCountdown() {
  const cycle = useCycle();
  const courses = useQuery({
    queryKey: ['my-courses', cycle?.cycleId],
    enabled: !!cycle?.cycleId,
    queryFn: async ({ signal }) =>
      (await listCourses({ cycleId: cycle!.cycleId, size: 100 }, { signal, silent: true })).data,
  });
  const [now, setNow] = useState(Date.now);
  const query = useQuery({
    queryKey: ['official-exam-countdown'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/exam-countdown-source', { signal, credentials: 'omit' });
      if (!response.ok) throw new Error('暂时无法同步官网倒计时，请稍后重试。');
      const html = await response.text();
      const target = parseExamTarget(html);
      let schedule: ReturnType<typeof parseExamSchedule> | undefined;
      let scheduleError: string | undefined;
      try {
        schedule = parseExamSchedule(html);
      } catch (error) {
        scheduleError = error instanceof Error ? error.message : '官网考试日程暂不可用。';
      }
      return { target, schedule, scheduleError, syncedAt: Date.now() };
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const parts = query.data && countdownParts(query.data.target, now);
  const personalCourses = courses.data?.items ?? [];
  const officialSessions = query.data?.schedule
    ? personalExamSessions(
        query.data.schedule,
        personalCourses.map((course) => course.code),
      )
    : [];
  const confirmedExams = cycle?.selected?.courses ?? [];
  const sessions = confirmedExamSessions(officialSessions, personalCourses, confirmedExams);
  const hasConfirmedExams = confirmedExams.some((exam) => exam.examDate && exam.startsAt && personalCourses.some((course) => course.id === exam.courseId));
  const matchedCodes = new Set(
    sessions.flatMap((session) => session.courses.map((course) => course.code)),
  );
  const missingCourses = personalCourses.filter((course) => !matchedCodes.has(course.code));
  return (
    <>
      <section className="exam-countdown" aria-labelledby="exam-countdown-title">
        <div className="exam-countdown-heading">
          <CalendarDays size={22} />
          <h2 id="exam-countdown-title">距离当次开考时间</h2>
        </div>
        {parts && query.data ? (
          <>
            <div
              className="exam-countdown-clock"
              role="timer"
              aria-label={`${parts.days}天${parts.hours}小时${parts.minutes}分`}
            >
              {(
                [
                  ['days', '天'],
                  ['hours', '小时'],
                  ['minutes', '分'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <strong>{String(parts[key]).padStart(key === 'days' ? 3 : 2, '0')}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p className="exam-countdown-date">
              开考时间：
              {new Intl.DateTimeFormat('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(query.data.target)}
              （北京时间）
            </p>
            {now >= query.data.target && (
              <p role="status">本次考试已开考，等待官网更新下一次考试时间。</p>
            )}
          </>
        ) : query.isPending ? (
          <p role="status">正在同步官网倒计时…</p>
        ) : null}
        {query.isError && (
          <div role="alert">
            <p>{query.data ? '同步暂时失败，当前显示上次同步的考试时间。' : query.error.message}</p>
            <button
              className="button button-secondary"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              重新同步
            </button>
          </div>
        )}
        <footer className="exam-countdown-footer">
          <a href={EXAM_SOURCE} target="_blank" rel="noreferrer">
            上海交通大学终身教育学院 <ExternalLink size={14} />
          </a>
          {query.data && (
            <span>
              同步于{' '}
              {new Intl.DateTimeFormat('zh-CN', {
                timeZone: 'Asia/Shanghai',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(query.data.syncedAt)}{' '}
              · 每 30 分钟自动同步
            </span>
          )}
        </footer>
      </section>
      {(query.data?.schedule || hasConfirmedExams) && (
        <section className="exam-schedule" aria-labelledby="exam-schedule-title">
          <header>
            <h2 id="exam-schedule-title">本次报考课程考试时间</h2>
            <p className="secondary">
              {cycle?.selected?.name ?? query.data?.schedule?.title} · {personalCourses.length} 门课程
            </p>
          </header>
          {cycle?.pending || (!!cycle?.cycleId && courses.isPending) ? (
            <p role="status">正在读取本次课程…</p>
          ) : cycle?.error || courses.isError ? (
            <div role="alert">
              <p>本次课程读取失败，请重试。</p>
              <button
                className="button button-secondary"
                onClick={() => {
                  cycle?.retry();
                  void courses.refetch();
                }}
              >
                重新读取课程
              </button>
            </div>
          ) : !cycle?.cycleId || !personalCourses.length ? (
            <p>本次考试周期暂无课程。</p>
          ) : (
            <>
              <div
                className="exam-schedule-scroll"
                role="region"
                aria-label="课程考试时间表"
                tabIndex={0}
              >
                <table className="exam-schedule-table">
                  <caption className="sr-only">课程考试时间表，时间均为北京时间</caption>
                  <thead>
                    <tr>
                      <th scope="col">考试日期</th>
                      <th scope="col">考试时间</th>
                      <th scope="col">课程代码与名称</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.date + session.time}>
                        <th scope="row">{session.date}</th>
                        <td>{session.time}</td>
                        <td>
                          <ul>
                            {session.courses.map((course) => (
                              <li key={course.code}>
                                <span className="exam-course-code">
                                  {course.national ? '*' : ''}({course.code})
                                </span>{' '}
                                {course.name}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {missingCourses.length > 0 && (
                <p role="status" className="exam-schedule-note">
                  {missingCourses.map((course) => `${course.code} ${course.name}`).join('、')}
                  ：官网暂未公布对应考试时间。
                </p>
              )}
              {sessions.some((session) => session.time === '具体时段待通知') && (
                <p className="exam-schedule-note">
                  实践课考试日期为官网暂定安排，具体时段待官网通知。
                </p>
              )}
            </>
          )}
          <p className="exam-schedule-note">
            {hasConfirmedExams ? '已确认的课程时间优先显示，未确认课程参考' : '以上日程同步自'}
            <a href={EXAM_SOURCE} target="_blank" rel="noreferrer">
              上海交通大学终身教育学院官网
            </a>
            ，具体考试安排以准考证及最新通知为准。
          </p>
        </section>
      )}
      {query.data?.scheduleError && !hasConfirmedExams && (
        <section className="exam-schedule" role="alert">
          <h2>课程考试时间表</h2>
          <p>{query.data.scheduleError}</p>
          <a href={EXAM_SOURCE} target="_blank" rel="noreferrer">
            查看官网考试日程
          </a>
        </section>
      )}
    </>
  );
}
