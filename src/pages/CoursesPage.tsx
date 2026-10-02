import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Pencil } from 'lucide-react';
import { CyclePicker, useCycle } from '../features/cycle/CycleContext';
import { Link } from '../features/cycle/navigation';
import { listCourses } from '../api/generated/courses/courses';
import { CourseCard } from '../components/dashboard/CourseCard';
import { RegionState } from '../components/dashboard/RegionState';
import { ExamScheduleEditor } from '../features/courses/ExamScheduleEditor';
import { useAuth } from '../hooks/useAuth';
import type { Course, ExamCycle } from '../api/generated/models';
import { dateLabel } from '../features/dashboard/navigation';
import '../features/dashboard/dashboard.css';
import '../features/courses/courses.css';

export function Component() {
  const cycle = useCycle();
  const auth = useAuth();
  const [editing, setEditing] = useState<{ course: Course; cycle: ExamCycle } | null>(null);
  const [saved, setSaved] = useState<{ cycleId: string; message: string } | null>(null);
  const cycleId = cycle?.cycleId ?? '';
  const courses = useQuery({
    queryKey: ['my-courses', cycleId],
    enabled: !!cycleId && !cycle?.pending,
    queryFn: async ({ signal }) =>
      (await listCourses({ cycleId, size: 100 }, { signal, silent: true })).data,
  });
  useEffect(() => {
    const previous = document.title;
    document.title = '我的科目 · 学习知途';
    return () => {
      document.title = previous;
    };
  }, []);

  let state = null;
  if (cycle?.pending) state = <RegionState kind="loading" message="正在加载考试周期…" />;
  else if (cycle?.error)
    state = <RegionState kind="error" message="考试周期加载失败，请重试。" retry={cycle.retry} />;
  else if (!cycleId)
    state = (
      <RegionState
        kind="empty"
        message={
          cycle?.cycles.length
            ? '找不到这个考试周期，请选择其他周期。'
            : '暂无考试周期，科目与考试安排将在周期开放后显示。'
        }
        href="/zikao"
        action="返回备考总览"
      />
    );
  else if (courses.isError)
    state = (
      <RegionState
        kind="error"
        message="科目加载失败，请重新加载。"
        retry={() => void courses.refetch()}
      />
    );
  else if (courses.isPending) state = <RegionState kind="loading" message="正在加载科目…" />;
  else if (!courses.data.items.length)
    state = (
      <RegionState
        kind="empty"
        message="当前周期暂无科目，可切换其他考试周期。"
        href="/zikao"
        action="返回备考总览"
      />
    );

  return (
    <section className="ov-page subjects-page" aria-labelledby="subjects-title">
      <header className="ov-heading">
        <div>
          <p className="ov-kicker">学习知途</p>
          <h1 id="subjects-title">我的科目</h1>
          <p className="ov-small ov-current-cycle">
            {cycle?.selected?.name ?? '选择考试周期，查看科目与考试安排'}
          </p>
        </div>
        <div className="ov-heading-actions">
          <CyclePicker />
          <Link className="ov-text-link" to="/zikao">
            <ArrowLeft aria-hidden="true" />
            返回备考总览
          </Link>
        </div>
      </header>
      <p className="subjects-record-help ov-small">
        目录进度按各科当前已发布条目统计。考试日期待确认时不显示倒计时。
      </p>
      {saved?.cycleId === cycleId && (
        <p className="subjects-saved status-success" role="status">
          {saved.message}
        </p>
      )}
      {state ?? (
        <>
          <p className="ov-small subjects-count">本周期 {courses.data!.items.length} 门科目</p>
          <div className="ov-course-grid">
            {courses.data!.items.map((course) => (
              <CourseCard
                key={`${cycleId}:${course.id}`}
                course={course}
                cycleId={cycleId}
                exam={cycle?.selected?.courses.find((exam) => exam.courseId === course.id)}
                mode="subjects"
                examSlot={
                  <div className="subjects-exam-schedule">
                    <p className="ov-exam">
                      <CalendarDays aria-hidden="true" />
                      {(() => {
                        const exam = cycle?.selected?.courses.find(
                          (item) => item.courseId === course.id,
                        );
                        return exam?.examDate
                          ? `${dateLabel(exam.examDate)} ${exam.startsAt?.slice(0, 5) ?? '时间待确认'}${exam.endsAt ? `–${exam.endsAt.slice(0, 5)}` : ''}`
                          : '考试日期待确认';
                      })()}
                    </p>
                    {auth.user?.role === 'ADMIN' &&
                      cycle?.selected?.courses.some((item) => item.courseId === course.id) && (
                        <button
                          className="subjects-edit-exam ov-text-link"
                          type="button"
                          onClick={() => {
                            setSaved(null);
                            setEditing({ course, cycle: cycle.selected! });
                          }}
                        >
                          <Pencil aria-hidden="true" />
                          修改考试时间
                        </button>
                      )}
                  </div>
                }
              />
            ))}
          </div>
        </>
      )}
      {editing && editing.cycle.id === cycleId && (
        <ExamScheduleEditor
          key={`${editing.cycle.id}:${editing.course.id}`}
          course={editing.course}
          cycle={editing.cycle}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setSaved({
              cycleId: editing.cycle.id,
              message: `${editing.course.name}考试时间已保存。`,
            });
            setEditing((current) => (current === editing ? null : current));
          }}
        />
      )}
    </section>
  );
}
