import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Check, ExternalLink, BookOpen, ChevronLeft } from 'lucide-react';
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
import './catalog.css';
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
    if (lock.current) return;
    lock.current = true;
    try {
      await completion.mutateAsync(completionUpdates(list, done));
      setNotice(done ? '学习进度已保存。' : '已取消完成标记。');
      if (goNext) {
        const next = items.slice(index + 1).find((x) => !x.item.completed);
        if (next) select(next.item.id);
        else setNotice('当前之后的条目都已完成。可以继续练习或回到今日任务。');
      }
    } catch {
      /* 错误由 mutation 显示 */
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
    <div className="reading-workspace" data-show-list={mobileList}>
      <aside className="reading-index">
        <div className="section-title">
          <h3>课程目录</h3>
          <span>{query.data!.courseProgress.percent}%</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${query.data!.courseProgress.percent}%` }}
          />
        </div>
        <p className="reading-count">
          已完成 {query.data!.courseProgress.completedItems} / {items.length} 项
        </p>
        {query.data!.chapters.map((chapter, n) => (
          <details key={chapter.id} open={chapter.id === active.chapter.id || undefined}>
            <summary>
              <span>{String(n + 1).padStart(2, '0')}</span>
              <MathText text={chapter.title} />
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
                    <span className="reading-item-state">
                      {item.completed ? <Check size={13} /> : <span />}
                    </span>
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
      </aside>
      <article className="reading-sheet">
        <button
          className="mobile-directory button button-secondary"
          onClick={() => setMobileList(!mobileList)}
        >
          <ChevronLeft size={16} />
          {mobileList ? '返回当前任务' : '展开目录'}
        </button>
        <p className="eyebrow">
          READ / 第 {index + 1} 项，共 {items.length} 项
        </p>
        <p className="reading-chapter">
          <MathText text={active.chapter.title} />
        </p>
        <h2>
          <MathText text={active.item.title} />
        </h2>
        <p className="reading-meta">
          预计 {active.item.estimatedMinutes} 分钟 · {active.item.completed ? '已完成' : '待学习'}
        </p>
        <Resource key={active.item.id} item={active.item} courseId={courseId} />
        <nav className="reading-related" aria-label="关联学习内容">
          {course?.capabilities.knowledge && (
            <Link to={`/zikao/course/${course.code}/knowledge`}>
              查看知识索引 <ArrowRight size={14} />
            </Link>
          )}
          {course?.capabilities.manual && (
            <Link to={`/zikao/course/${course.code}/manual`}>
              阅读实践手册 <ArrowRight size={14} />
            </Link>
          )}
          <Link to={`/zikao/course/${course?.code}/notes`}>
            记录课程笔记 <ArrowRight size={14} />
          </Link>
        </nav>
        {savePosition.isError && (
          <p role="alert" className="status-error">
            学习位置保存失败，进度标记仍可使用。
            <Button variant="ghost" onClick={() => savePosition.mutate(active.item)}>
              重试保存位置
            </Button>
          </p>
        )}
        {query.isError && (
          <p role="alert">
            最新目录读取失败。
            <Button variant="ghost" onClick={() => void query.refetch()}>
              重试
            </Button>
          </p>
        )}
        {completion.isError && (
          <p role="alert" className="status-error">
            {completion.error.message}，原进度已保留。请刷新后重试。
          </p>
        )}
        {notice && (
          <p role="status" className="status-success">
            {notice}
          </p>
        )}
        <footer className="reading-footer">
          <Button
            loading={completion.isPending}
            onClick={() => void mark([active.item], true, true)}
          >
            完成并继续 <ArrowRight size={16} />
          </Button>
          <div>
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
              <Button variant="ghost" onClick={() => select(items[index + 1].item.id)}>
                下一项
              </Button>
            )}
            <Link className="text-action" to="/zikao">
              回到今日
            </Link>
          </div>
        </footer>
      </article>
      <Modal open={!!bulk} title="确认完成本章" onClose={() => setBulk(null)}>
        <p>
          将「{bulk?.title}」中 {bulk?.items.filter((i) => !i.completed).length}{' '}
          项标记完成。关联计划会同步，之后可逐项取消。
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setBulk(null)}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (bulk) {
                void mark(
                  bulk.items.filter((i) => !i.completed),
                  true,
                );
                setBulk(null);
              }
            }}
          >
            确认完成
          </Button>
        </div>
      </Modal>
    </div>
  );
}
