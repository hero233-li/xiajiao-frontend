import { useCapability } from '../../features/capabilities/useCapability';
import { BookOpen, CalendarDays, NotebookPen, Settings2, FileText, ArrowRight } from 'lucide-react';
import { Link } from '../../features/cycle/navigation';
import type { Course, CycleCourse, LearningPosition } from '../../api/generated/models';
import { dateLabel, learningTargetPath } from '../../features/dashboard/navigation';
import { ProgressBar } from './ProgressBar';

/** 仅展示生成类型字段；可由我的科目页复用，无既有组件行为变更。 */
export function CourseCard({
  course,
  exam,
  position,
  cycleId,
}: {
  course: Course;
  exam?: CycleCourse;
  position?: LearningPosition | null;
  cycleId: string;
}) {
  const base = `/zikao/course/${course.code}`;
  const ready = useCapability('course.next', { course, position });
  const target = ready ? position?.target : undefined;
  const label =
    course.progress.percent > 0
      ? `继续学习 ${course.progress.completedItems}/${course.progress.totalItems}`
      : `从第 1 节开始 0/${course.progress.totalItems}`;
  return (
    <article className="ov-course ov-card" aria-labelledby={`course-${course.id}`}>
      <div className="ov-course-top">
        <BookOpen aria-hidden="true" />
        <span className={`ov-badge ov-${course.courseType.toLowerCase()}`}>
          {course.courseType === 'THEORY' ? '理论课' : '实践课'}
        </span>
      </div>
      <h3 id={`course-${course.id}`}>{course.name}</h3>
      <p className="ov-small">课程代码 {course.code}</p>
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
      <div className="ov-course-progress">
        {course.progress.percent > 0 && (
          <>
            <div className="ov-row">
              <span>目录完成度</span>
              <strong>{course.progress.percent}%</strong>
            </div>
            <ProgressBar progress={course.progress} label={`${course.name}目录完成度`} />
          </>
        )}
      </div>
      {target ? (
        <Link className="ov-button ov-primary" to={learningTargetPath(target, cycleId)}>
          {label}
          <ArrowRight aria-hidden="true" />
        </Link>
      ) : (
        <Link className="ov-button ov-primary" to={`${base}/catalog`}>
          进入课程<ArrowRight aria-hidden="true" />
        </Link>
      )}
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
    </article>
  );
}
