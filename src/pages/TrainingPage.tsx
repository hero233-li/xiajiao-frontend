import { PencilLine, Files } from 'lucide-react';
import { CyclePicker, useCycle } from '../features/cycle/CycleContext';
import { Link } from '../features/cycle/navigation';
import { useMyCourses } from '../api/courses';
import { RegionState } from '../components/dashboard/RegionState';
export function Component() {
  const cycle = useCycle();
  const courses = useMyCourses(cycle?.cycleId);
  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">章节检测与模拟卷</p>
          <h1>章节检测与模拟卷</h1>
          <p className="secondary">直接选择章节检测，完成评分后查看成绩与解析。</p>
        </div>
        <CyclePicker />
      </header>
      {cycle?.pending || (!!cycle?.cycleId && courses.isPending) ? (
        <RegionState kind="loading" message="正在读取课程题库…" />
      ) : cycle?.error ? (
        <RegionState kind="error" message="考试周期加载失败" retry={cycle.retry} />
      ) : !cycle?.cycleId ? (
        <RegionState kind="empty" message="暂无考试周期" />
      ) : courses.isError ? (
        <RegionState kind="error" message="题库入口加载失败" retry={() => void courses.refetch()} />
      ) : (
        <div className="training-roster">
          <div className="training-roster-head">
            <span>课程</span>
            <span>选择本次任务</span>
          </div>
          {courses.data?.items
            .filter((c) => c.capabilities.practice || c.capabilities.exams)
            .map((c) => (
              <article key={c.id} className="training-course-row">
                <div>
                  <p className="eyebrow">{c.code}</p>
                  <h2>{c.name}</h2>
                  <p className="secondary">目录进度 {c.progress.percent}%</p>
                </div>
                <nav aria-label={`${c.name}训练入口`}>
                  {c.capabilities.practice && (
                    <>
                      <Link
                        className="button button-primary"
                        to={`/study/course/${c.code}/practice`}
                      >
                        <PencilLine size={18} />
                        章节检测
                      </Link>

                    </>
                  )}
                  {c.capabilities.exams && (
                    <Link className="button button-secondary" to={`/study/course/${c.code}/exams`}>
                      <Files size={18} />
                      真题与成绩
                    </Link>
                  )}
                </nav>
              </article>
            ))}
          {!courses.data?.items.some((c) => c.capabilities.practice || c.capabilities.exams) && (
            <p className="inline-empty">本周期暂无题库或试卷。</p>
          )}
        </div>
      )}
    </section>
  );
}
