import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useExamCourse } from '../api/exams';
import { useCycle } from '../features/cycle/CycleContext';
import { Link } from '../features/cycle/navigation';
import { Workbench } from '../features/exams/workbench/Workbench';

export function Component() {
  const { code = '', paperId = '' } = useParams();
  const cycle = useCycle();
  const cycleId = cycle?.cycleId ?? '';
  const course = useExamCourse(code, cycleId);

  useEffect(() => {
    document.title = '考卷工作台 · 知途个人成长平台';
  }, []);

  if (!cycleId)
    return (
      <section className="wb-page wb-state">
        <h1>还没有可用的考试周期</h1>
        <p>先在「我的科目」里选择考试周期，再回到这里。</p>
        <Link className="button button-secondary" to="/study/courses">
          去我的科目
        </Link>
      </section>
    );
  if (course.isPending)
    return (
      <p className="wb-page" role="status">
        正在加载课程…
      </p>
    );
  if (course.isError || !course.data)
    return (
      <section className="wb-page wb-state">
        <h1>课程加载失败</h1>
        <p>课程可能已下线，或当前周期没有开放。</p>
        <Link className="button button-secondary" to="/study/courses">
          去我的科目
        </Link>
      </section>
    );

  return (
    <Workbench
      courseId={course.data.id}
      cycleId={cycleId}
      code={code}
      paperId={paperId}
    />
  );
}
