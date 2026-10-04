import { useParams } from 'react-router-dom';
import { Link, useSearchParams } from '../features/cycle/navigation';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useCatalogCourse } from '../api/catalog';
import { Button } from '../components/Button';
import { CatalogPanel } from '../features/catalog/CatalogPanel';

export function CatalogPage() {
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const cycleId = params.get('cycleId') ?? '';
  const course = useCatalogCourse(code, cycleId);
  if (!cycleId)
    return (
      <section className="state">
        <h1>课程目录</h1>
        <p>请先从备考总览选择考试周期和课程。</p>
        <Link className="button button-primary" to="/study">
          前往备考总览
        </Link>
      </section>
    );
  if (course.isPending)
    return (
      <section className="state" role="status">
        <LoaderCircle className="spin" aria-hidden="true" /> 正在加载课程
      </section>
    );
  if (course.isError && !course.data)
    return (
      <section className="state" role="alert">
        <AlertCircle aria-hidden="true" />
        <p>课程加载失败，请重试。</p>
        <Button onClick={() => void course.refetch()}>重新加载课程</Button>
      </section>
    );
  return (
    <>
      {course.isError && (
        <section className="card" data-state="error" role="alert">
          <p>课程信息刷新失败，正在显示上次加载的内容。</p>
          <Button loading={course.isFetching} onClick={() => void course.refetch()}>
            重试刷新课程
          </Button>
        </section>
      )}
      <h2 className="reader-section-title">学习目录</h2>
      <CatalogPanel key={course.data!.id} courseId={course.data!.id} />
    </>
  );
}
export const Component = CatalogPage;
