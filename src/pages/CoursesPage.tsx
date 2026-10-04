import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Pencil } from 'lucide-react';
import { CyclePicker, useCycle } from '../features/cycle/CycleContext';
import { Link } from '../features/cycle/navigation';
import { listCourses } from '../api/generated/courses/courses';
import { RegionState } from '../components/dashboard/RegionState';
import { ExamScheduleEditor } from '../features/courses/ExamScheduleEditor';
import { useAuth } from '../hooks/useAuth';
import type { Course, ExamCycle } from '../api/generated/models';
import { dateLabel } from '../features/dashboard/navigation';
import { EnrollmentControls } from '../features/courses/EnrollmentControls';
export function Component() {
  const cycle = useCycle();
  const auth = useAuth();
  const [editing, setEditing] = useState<{ course: Course; cycle: ExamCycle } | null>(null);
  const [notice, setNotice] = useState('');
  const courses = useQuery({
    queryKey: ['my-courses', cycle?.cycleId],
    enabled: !!cycle?.cycleId,
    queryFn: async ({ signal }) =>
      (await listCourses({ cycleId: cycle!.cycleId!, size: 100 }, { signal, silent: true })).data,
  });
  useEffect(() => {
    document.title = '我的科目 · 知途个人管理平台';
  }, []);
  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">学习书架</p>
          <h1>我的课程</h1>
          <p className="secondary">选一门课程，阅读内容、练习巩固，或回到你的笔记。</p>
        </div>
        <CyclePicker />
      </header>
      {cycle?.pending || (!!cycle?.cycleId && courses.isPending) ? (
        <RegionState kind="loading" message="正在整理课程…" />
      ) : cycle?.error ? (
        <RegionState kind="error" message="考试周期加载失败" retry={cycle.retry} />
      ) : !cycle?.cycleId ? (
        <RegionState kind="empty" message="暂无可用考试周期。" />
      ) : courses.isError ? (
        <RegionState kind="error" message="课程加载失败。" retry={() => void courses.refetch()} />
      ) : !courses.data?.items.length ? (
        <RegionState kind="empty" message="本周期暂未开放课程。" />
      ) : (
        <div className="course-roster">
          {courses.data.items.map((course, i) => {
            const exam = cycle.selected?.courses.find((e) => e.courseId === course.id);
            const base = `/study/course/${course.code}`;
            const panes = [
              ['catalog', '阅读与进度'],
              ['knowledge', '知识索引'],
              ['manual', '实践手册'],
              ['practice', '练习与检测'],
              ['exams', '真题与成绩'],
            ] as const;
            const available = panes.filter(([pane]) => course.capabilities[pane]);
            return (
              <article
                key={course.id}
                className="course-roster-row"
                aria-labelledby={`course-${course.id}`}
              >
                <span className="course-roster-number">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="eyebrow">
                    {course.code} / {course.courseType === 'THEORY' ? '理论课程' : '实践课程'}
                  </p>
                  <h2 id={`course-${course.id}`}>{course.name}</h2>
                  <p className="course-exam-date">
                    {exam?.examDate
                      ? `${dateLabel(exam.examDate)} ${exam.startsAt?.slice(0, 5) ?? '时间待确认'}${exam.endsAt ? `–${exam.endsAt.slice(0, 5)}` : ''}`
                      : '考试日期待确认'}{' '}
                    {auth.user?.role === 'ADMIN' && cycle.selected && exam && (
                      <button
                        className="button button-ghost"
                        aria-label="修改考试时间"
                        onClick={() => setEditing({ course, cycle: cycle.selected! })}
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </p>
                  <details className="course-resources">
                    <summary>学习入口与资料</summary>
                    <nav className="course-resource-links" aria-label={`${course.name}学习入口`}>
                      {available.map(([pane, label]) => (
                        <Link key={pane} to={`${base}/${pane}`}>
                          {label}
                        </Link>
                      ))}
                      <Link to={`${base}/notes`}>课程笔记</Link>
                    </nav>
                  </details>
                  <EnrollmentControls courseId={course.id} cycleId={cycle.cycleId!} />
                </div>
                <div className="course-roster-progress">
                  <strong>目录完成 {course.progress.percent}%</strong>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${course.progress.percent}%` }}
                    />
                  </div>
                  <p>
                    {course.progress.completedItems} / {course.progress.totalItems} 项
                  </p>
                  {available.length ? (
                    <Link
                      className="button button-primary"
                      to={`${base}/${course.capabilities.manual ? 'manual' : available[0][0]}`}
                    >
                      开始学习 <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <p>内容尚未开放</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {notice && (
        <p role="status" className="status-success">
          {notice}
        </p>
      )}
      {editing && (
        <ExamScheduleEditor
          course={editing.course}
          cycle={editing.cycle}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice(`${editing.course.name}考试时间已保存。`);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
