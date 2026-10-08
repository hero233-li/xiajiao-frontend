import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, ExternalLink, BookOpen, ListTree, ChevronLeft } from 'lucide-react';
import { Link, useSearchParams } from '../cycle/navigation';
import { getLearningPosition, saveLearningPosition } from '../../api/generated/courses/courses';
import { downloadCourseResource } from '../../api/generated/catalog/catalog';
import { completionUpdates, useCatalog, useCatalogCompletion } from '../../api/catalog';
import { saveExamFile } from '../../api/exams';
import { useCourse } from '../course/CourseContext';
import { MathText } from '../../components/MathText';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { RegionState } from '../../components/dashboard/RegionState';
import type { CatalogItem, CatalogChapter } from '../../api/generated/models';
function Resource({ item, courseId }: { item: CatalogItem; courseId: string }) {
  const download = useMutation({
    mutationFn: async () =>
      saveExamFile(
        (await downloadCourseResource(courseId, item.resource!.fileId!, { silent: true })).data,
      ),
  });
  let url: string | undefined;
  try {
    const candidate = new URL(item.resource?.url ?? '');
    if (['http:', 'https:'].includes(candidate.protocol)) url = candidate.href;
  } catch {
    /* 无有效外链 */
  }
  return (
    <div className="reader-resource">
      {item.resource?.kind === 'LINK' && url ? (
        <>
          <p>学习资料在独立窗口中打开。阅读结束后回到这里记录完成状态。</p>
          <a
            className="button button-secondary"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            打开{item.resource.label || '学习资料'} <ExternalLink size={16} />
          </a>
        </>
      ) : item.resource?.kind === 'FILE' && item.resource.fileId ? (
        <>
          <p>下载资料并阅读，完成后回到当前任务继续。</p>
          <Button
            variant="secondary"
            loading={download.isPending}
            onClick={() => download.mutate()}
          >
            下载{item.resource.label || '学习资料'}
          </Button>
          {download.isError && (
            <p role="alert" className="status-error">
              {download.error.message}
            </p>
          )}
        </>
      ) : (
        <>
          <BookOpen size={28} />
          <p>此目录项暂未关联可打开的资料。</p>
          <p className="secondary">
            可按条目标题学习教材，或查看本课知识索引与手册；完成后记录进度。
          </p>
        </>
      )}
    </div>
  );
}
export function CatalogPanel({ courseId }: { courseId: string }) {
  const query = useCatalog(courseId);
  const course = useCourse();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const completion = useCatalogCompletion(courseId);
  const position = useQuery({
    queryKey: ['learning-position', courseId],
    queryFn: async () => (await getLearningPosition(courseId, { silent: true })).data,
  });
  const [mobileList, setMobileList] = useState(false);
  const [bulk, setBulk] = useState<CatalogChapter | null>(null);
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const items =
    query.data?.chapters.flatMap((chapter) => chapter.items.map((item) => ({ item, chapter }))) ??
    [];
  const requested = params.get('itemId');
  const hash = (() => {
    try {
      return decodeURIComponent(location.hash.slice(1));
    } catch {
      return '';
    }
  })();
  const active =
    items.find((x) => x.item.id === requested) ??
    items.find((x) => x.item.id === hash) ??
    items.find((x) => x.chapter.id === (params.get('chapterId') || hash)) ??
    items.find((x) => x.item.id === position.data?.target.itemId) ??
    items.find((x) => !x.item.completed) ??
    items[0];
  const index = items.findIndex((x) => x.item.id === active?.item.id);
  const savePosition = useMutation({
    mutationFn: async (item: CatalogItem) => {
      if (!course) return;
      return saveLearningPosition(
        courseId,
        {
          target: {
            pane: 'CATALOG',
            courseCode: course.code,
            itemId: item.id,
            chapterId: active?.chapter.id ?? null,
            questionId: null,
          },
        },
        { silent: true },
      );
    },
  });
  const lastPosition = useRef('');
  const recordPosition = savePosition.mutate;
  useEffect(() => {
    if (!active || !course) return;
    const key = `${courseId}:${active.item.id}`;
    if (lastPosition.current === key) return;
    lastPosition.current = key;
    recordPosition(active.item);
  }, [active, course, courseId, recordPosition]);
  function select(id: string) {
    const next = new URLSearchParams(params);
    next.set('itemId', id);
    next.delete('chapterId');
    setParams(next);
    setMobileList(false);
    setNotice('');
  }
  async function mark(list: CatalogItem[], done: boolean, goNext = false) {
    if (lock.current) return false;
    lock.current = true;
    try {
      await completion.mutateAsync(completionUpdates(list, done));
      setNotice(done ? '学习进度已保存。' : '已取消完成标记。');
      if (goNext) {
        const next = items.slice(index + 1).find((x) => !x.item.completed);
        if (next) select(next.item.id);
        else setNotice('当前之后的条目都已完成。可以继续练习或回到今日任务。');
      }
      return true;
    } catch {
      return false;
    } finally {
      lock.current = false;
    }
  }
  if (query.isPending) return <RegionState kind="loading" message="正在加载学习目录…" />;
  if (query.isError && !query.data)
    return (
      <RegionState kind="error" message="学习目录加载失败。" retry={() => void query.refetch()} />
    );
  if (!active) return <RegionState kind="empty" message="此课程暂未发布学习条目。" />;
  return (
    <section className="reading-workspace" data-outline-open={mobileList}>
      <header className="reading-command">
        <div>
          <span className="eyebrow">
            阅读任务 {index + 1} / {items.length}
          </span>
          <span className="secondary">目录完成 {query.data!.courseProgress.percent}%</span>
        </div>
        <Button
          className="reading-outline-toggle"
          variant="secondary"
          aria-controls="reading-outline"
          aria-expanded={mobileList}
          onClick={() => setMobileList(!mobileList)}
        >
          <ListTree size={18} />
          {mobileList ? '返回阅读内容' : '选择章节与条目'}
        </Button>
      </header>
      <div className="reading-layout">
        <nav id="reading-outline" className="reading-outline" aria-label="课程目录">
          <header>
            <h2>
              <ListTree size={18} />
              课程目录
            </h2>
            <p>
              {query.data!.courseProgress.percent}% 已完成 · {items.length} 个条目
            </p>
          </header>
          {query.data!.chapters.map((chapter, n) => (
            <details key={chapter.id} open={chapter.id === active.chapter.id || undefined}>
              <summary>
                <span className="outline-number">{String(n + 1).padStart(2, '0')}</span>
                <span className="outline-title">
                  <MathText text={chapter.title} />
                </span>
                <small>
                  {chapter.items.filter((i) => i.completed).length}/{chapter.items.length}
                </small>
              </summary>
              <ol>
                {chapter.items.map((item) => (
                  <li key={item.id}>
                    <button
                      aria-current={item.id === active.item.id ? 'true' : undefined}
                      onClick={() => select(item.id)}
                    >
                      <span>{item.completed ? '✓' : '○'}</span>
                      <MathText text={item.title} />
                    </button>
                  </li>
                ))}
              </ol>
              <Button
                variant="ghost"
                disabled={completion.isPending || chapter.items.every((i) => i.completed)}
                onClick={() => setBulk(chapter)}
              >
                本章全部标记完成
              </Button>
            </details>
          ))}
        </nav>
        <article className="reading-stage">
          <header>
            <p className="secondary">
              <MathText text={active.chapter.title} />
            </p>
            <h1>
              <MathText text={active.item.title} />
            </h1>
            <div className="reading-metadata">
              <span>预计 {active.item.estimatedMinutes} 分钟</span>
              <strong>{active.item.completed ? '已完成' : '待学习'}</strong>
            </div>
          </header>
          <Resource key={active.item.id} item={active.item} courseId={courseId} />
          {notice && (
            <p role="status" className="platform-notice">
              {notice}
            </p>
          )}
          {completion.error && (
            <p role="alert">{completion.error.message}。原进度已保留，请重试保存。</p>
          )}
          {query.error && (
            <p role="alert">
              最新目录读取失败。<Button onClick={() => query.refetch()}>重试目录</Button>
            </p>
          )}
          {savePosition.error && (
            <p role="alert">
              学习位置未保存，进度仍可记录。
              <Button onClick={() => savePosition.mutate(active.item)}>重试保存位置</Button>
            </p>
          )}
          <footer className="reading-next">
            <div>
              <Button
                loading={completion.isPending}
                onClick={() => void mark([active.item], true, true)}
              >
                完成并继续 <ArrowRight size={18} />
              </Button>
              {active.item.completed && (
                <Button
                  variant="ghost"
                  disabled={completion.isPending}
                  onClick={() => void mark([active.item], false)}
                >
                  取消完成
                </Button>
              )}
              {index + 1 < items.length && (
                <Button variant="secondary" onClick={() => select(items[index + 1].item.id)}>
                  下一项 <ArrowRight size={16} />
                </Button>
              )}
            </div>
            <Link to="/study">
              <ChevronLeft size={16} />
              回到今日任务
            </Link>
          </footer>
          <nav className="reading-related" aria-label="关联学习内容">
            {course?.capabilities.knowledge && (
              <Link to={`/study/course/${course.code}/knowledge`}>查看知识索引 →</Link>
            )}
            {course?.capabilities.practice && (
              <Link to={`/study/course/${course.code}/practice`}>进入练习与检测 →</Link>
            )}
            {course?.capabilities.manual && (
              <Link to={`/study/course/${course.code}/manual`}>阅读实践手册 →</Link>
            )}
            <Link to={`/study/course/${course?.code}/notes`}>记录课程笔记 →</Link>
          </nav>
        </article>
      </div>
      <Modal open={!!bulk} title="确认完成本章" onClose={() => setBulk(null)}>
        <p>
          将「{bulk?.title}」中 {bulk?.items.filter((i) => !i.completed).length}{' '}
          项标记完成，关联计划会同步，可逐项取消。
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setBulk(null)}>
            取消
          </Button>
          <Button
            loading={completion.isPending}
            onClick={() => {
              if (bulk)
                void mark(
                  bulk.items.filter((i) => !i.completed),
                  true,
                ).then((saved) => {
                  if (saved) setBulk(null);
                });
            }}
          >
            确认完成
          </Button>
        </div>
      </Modal>
    </section>
  );
}
