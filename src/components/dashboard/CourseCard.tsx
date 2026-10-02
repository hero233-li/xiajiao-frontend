import type { ReactNode } from 'react';
import { useCapability } from '../../features/capabilities/useCapability';
import { BookOpen, CalendarDays, NotebookPen, Settings2, FileText, ArrowRight } from 'lucide-react';
import { Link } from '../../features/cycle/navigation';
import type { Course, CycleCourse, LearningPosition } from '../../api/generated/models';
import { dateLabel, learningTargetPath } from '../../features/dashboard/navigation';
import { ProgressBar } from './ProgressBar';

/** Shared course summary uses published catalog counts and real recent positions. */
export function CourseCard({
  course,
  exam,
  position,
  cycleId,
  mode = 'overview',
  examSlot,
}: {
  course: Course;
  exam?: CycleCourse;
  position?: LearningPosition | null;
  cycleId: string;
  mode?: 'overview' | 'subjects';
  examSlot?: ReactNode;
}) {
  const Heading = mode === 'subjects' ? 'h2' : 'h3';
  const base = `/zikao/course/${course.code}`;
  const ready = useCapability('course.next', { course, position });
  const target = ready && position?.target.courseCode === course.code ? position.target : undefined;
  const modules = [
    ['catalog', '学习目录'],
    ['knowledge', '知识合集'],
    ['practice', '章节练习'],
    ['exams', '历年试卷'],
    ['manual', '实践手册'],
  ] as const;
  const available = modules.filter(([pane]) => course.capabilities[pane]);
  const mainPane = available[0]?.[0];
  return (
    <article className="ov-course ov-card" aria-labelledby={`course-${course.id}`}>
      <div className="ov-course-top">
        <BookOpen aria-hidden="true" />
        <span className={`ov-badge ov-${course.courseType.toLowerCase()}`}>
          {course.courseType === 'THEORY' ? '理论课' : '实践课'}
        </span>
      </div>
      <Heading id={`course-${course.id}`}>{course.name}</Heading>
      <p className="ov-small">课程代码 {course.code}</p>
      {mode === 'subjects' && examSlot ? (
        examSlot
      ) : (
        <p className="ov-exam">
          <CalendarDays aria-hidden="true" />
          {exam?.examDate ? (
            <span>
              {dateLabel(exam.examDate)} {exam.startsAt?.slice(0, 5) ?? '时间待确认'}
              {exam.endsAt ? `–${exam.endsAt.slice(0, 5)}` : ''}
            </span>
          ) : (
            <span>考试日期待确认</span>
          )}
        </p>
      )}
      <div className="ov-course-progress">
        <div className="ov-row">
          <span>目录完成度</span>
          <strong>{course.progress.percent}%</strong>
        </div>
        <p className="ov-small ov-course-count">
          {course.progress.completedItems} / {course.progress.totalItems} 项已完成
        </p>
        {course.progress.totalItems > 0 ? (
          <ProgressBar progress={course.progress} label={`${course.name}目录完成度`} />
        ) : (
          <p className="ov-small">暂无已发布目录条目</p>
        )}
      </div>
      {mode === 'subjects' ? (
        <>
          <div className="subjects-course-actions">
            {mainPane ? (
              <Link className="ov-button ov-primary" to={`${base}/${mainPane}`}>
                进入课程
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <p className="ov-small">课程学习内容尚未开放</p>
            )}
            <Link className="ov-button ov-secondary" to={`${base}/notes`}>
              <NotebookPen aria-hidden="true" />
              备注
            </Link>
          </div>
          <nav className="subjects-modules" aria-label={`${course.name}学习入口`}>
            {available
              .filter(([pane]) => pane !== mainPane)
              .map(([pane, label]) => (
                <Link key={pane} to={`${base}/${pane}`}>
                  {label}
                </Link>
              ))}
          </nav>
        </>
      ) : (
        <>
          {target ? (
            <Link className="ov-button ov-primary" to={learningTargetPath(target, cycleId)}>
              继续学习
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <Link className="ov-button ov-primary" to={`${base}/catalog`}>
              进入课程
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
          {target && <p className="ov-small">上次学习：{position?.title}</p>}
          <div className="ov-paper-slot">
            {course.capabilities.exams && (
              <Link className="ov-text-link" to={`${base}/exams`}>
                <FileText aria-hidden="true" />
                历年试卷
              </Link>
            )}
          </div>
          <footer className="ov-course-footer">
            <Link className="ov-button ov-secondary" to={`${base}/notes`}>
              <NotebookPen aria-hidden="true" />
              备注
            </Link>
            <Link className="ov-button ov-secondary" to={`/zikao/courses`}>
              <Settings2 aria-hidden="true" />
              管理
            </Link>
          </footer>
        </>
      )}
    </article>
  );
}
