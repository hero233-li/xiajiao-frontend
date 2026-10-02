import { lazy, Suspense, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link, useSearchParams } from '../features/cycle/navigation';
import { LoaderCircle } from 'lucide-react';
import { useCatalogCourse } from '../api/catalog';
import { Button } from '../components/Button';
import { ErrorBoundary } from '../components/ErrorBoundary';
const loadReader = () => import('../features/manual/ManualReader');
export function ManualPage() {
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const course = useCatalogCourse(code, params.get('cycleId') ?? '');
  const [attempt, setAttempt] = useState(0);
  const [Reader, setReader] = useState(() => lazy(loadReader));
  if (!params.get('cycleId'))
    return (
      <section className="state">
        <h1>实践手册</h1>
        <p>请从备考总览选择考试周期和课程。</p>
        <Link className="button button-primary" to="/zikao">
          前往备考总览
        </Link>
      </section>
    );
  if (course.isPending)
    return (
      <section className="state" role="status">
        <LoaderCircle className="spin" aria-hidden="true" />
        正在加载课程
      </section>
    );
  if (course.isError && !course.data)
    return (
      <section className="card state" data-state="error" role="alert">
        <p>课程加载失败，请重试。</p>
        <Button loading={course.isFetching} onClick={() => void course.refetch()}>
          重新加载课程
        </Button>
      </section>
    );
  return (
    <>
      <h2>实践手册</h2>
      {course.isError && (
        <section className="card" role="alert">
          <p>课程信息刷新失败，正在显示上次加载的内容。</p>
          <Button loading={course.isFetching} onClick={() => void course.refetch()}>
            重试刷新课程
          </Button>
        </section>
      )}
      <ErrorBoundary
        key={attempt}
        fallback={
          <section className="card state" data-state="error" role="alert">
            <p>手册阅读器加载失败，请重试。</p>
            <Button
              onClick={() => {
                setReader(() => lazy(loadReader));
                setAttempt((value) => value + 1);
              }}
            >
              重试加载阅读器
            </Button>
          </section>
        }
      >
        <Suspense
          fallback={
            <section className="card state" role="status" aria-busy="true">
              正在加载手册阅读器
            </section>
          }
        >
          <Reader courseId={course.data!.id} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
export const Component = ManualPage;
