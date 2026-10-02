import { useMutation, useQuery } from '@tanstack/react-query';
import { getLearningPosition } from '../../api/generated/courses/courses';
import { progressStyle } from '../../utils/progress';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link, useNavigate } from '../cycle/navigation';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  LoaderCircle,
} from 'lucide-react';
import { completionUpdates, useCatalog, useCatalogCompletion } from '../../api/catalog';
import type { CatalogChapter, CatalogItem } from '../../api/generated/models';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { MathText } from '../../components/MathText';
import './catalog.css';
import { useCourse } from '../course/CourseContext';
import { durationLabel } from '../schedule/display';
import { downloadCourseResource } from '../../api/generated/catalog/catalog';
import { saveExamFile } from '../../api/exams';

function hashId(hash: string) {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return '';
  }
}
function resourceUrl(item: CatalogItem) {
  if (item.resource?.kind !== 'LINK' || !item.resource.url) return undefined;
  try {
    const url = new URL(item.resource.url, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function CatalogPanel({ courseId }: { courseId: string }) {
  const query = useCatalog(courseId);
  const course = useCourse();
  const practice = course?.courseType === 'PRACTICE';
  const position = useQuery({
    queryKey: ['learning-position', courseId],
    queryFn: async ({ signal }) =>
      (await getLearningPosition(courseId, { signal, silent: true })).data,
    retry: false,
  });
  const mutation = useCatalogCompletion(courseId);
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState('');
  const [target, setTarget] = useState('');
  const [confirm, setConfirm] = useState<CatalogChapter | null>(null);
  const [saved, setSaved] = useState('');
  const [failure, setFailure] = useState<{ chapterId: string; message: string } | null>(null);
  const [pendingChapter, setPendingChapter] = useState('');
  const initialized = useRef(false);
  const processedHash = useRef<string>();
  const locked = useRef(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();
  const candidates = query.data?.chapters.flatMap((chapter) =>
    chapter.items.map((item) => ({ chapter, item })),
  );
  const titleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    query.data?.chapters.forEach((chapter) =>
      chapter.items.forEach((item) => counts.set(item.title, (counts.get(item.title) ?? 0) + 1)),
    );
    return counts;
  }, [query.data]);
  const previous =
    position.data?.target.pane === 'CATALOG'
      ? candidates?.find(({ item }) => item.id === position.data?.target.itemId)
      : undefined;
  const allDone = !!candidates?.length && candidates.every(({ item }) => item.completed);
  const next = allDone ? undefined : (previous ?? candidates?.find(({ item }) => !item.completed));

  useEffect(() => () => clearTimeout(savedTimer.current), []);
  useEffect(() => {
    if (
      !query.data ||
      (initialized.current && processedHash.current === `${location.hash}|${location.search}`)
    )
      return;
    processedHash.current = `${location.hash}|${location.search}`;
    const requestedItem = new URLSearchParams(location.search).get('itemId');
    const requested = query.data.chapters.some((chapter) =>
      chapter.items.some((item) => item.id === requestedItem),
    )
      ? requestedItem!
      : hashId(location.hash);
    const chapter = query.data.chapters.find(
      (chapter) => chapter.id === requested || chapter.items.some((item) => item.id === requested),
    );
    if (chapter) {
      setExpanded((previous) => new Set(previous).add(chapter.id));
      setCurrent(chapter.id);
      setTarget(requested);
      initialized.current = true;
    } else if (!initialized.current) {
      const first =
        query.data.chapters.find((chapter) => chapter.items.some((item) => !item.completed)) ??
        query.data.chapters[0];
      if (first) {
        setExpanded(new Set([first.id]));
        setCurrent(first.id);
      }
      initialized.current = true;
    }
  }, [location.hash, location.search, query.data]);
  useEffect(() => {
    if (!target) return;
    const element = document.getElementById(target);
    element?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
    element?.focus({ preventScroll: true });
    setTarget('');
  }, [target, expanded]);
  useEffect(() => {
    if (!query.data || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: '-8% 0px -65% 0px' },
    );
    query.data.chapters.forEach((chapter) => {
      const element = document.getElementById(chapter.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [query.data]);

  function go(chapterId: string, itemId?: string) {
    setExpanded((previous) => new Set(previous).add(chapterId));
    setCurrent(chapterId);
    setTarget(itemId ?? chapterId);
    // 章节 hash 是位置，标签页始终由 pathname 决定。
    const hash = `#${encodeURIComponent(chapterId)}`;
    const params = new URLSearchParams(location.search);
    params.delete('itemId');
    if (itemId) params.set('itemId', itemId);
    const search = params.size ? `?${params}` : '';
    processedHash.current = `${hash}|${search}`;
    navigate({ pathname: location.pathname, search, hash });
  }
  async function save(chapterId: string, items: CatalogItem[], completed: boolean) {
    if (locked.current || items.length === 0) return;
    locked.current = true;
    setPendingChapter(chapterId);
    setFailure(null);
    setSaved('');
    clearTimeout(savedTimer.current);
    try {
      await mutation.mutateAsync(completionUpdates(items, completed));
      setSaved(chapterId);
      savedTimer.current = setTimeout(() => setSaved(''), 3000);
    } catch (error) {
      setFailure({
        chapterId,
        message: `保存失败，已恢复原状态。${error instanceof Error ? error.message : '请稍后重试。'}`,
      });
    } finally {
      locked.current = false;
      setPendingChapter('');
    }
  }
  if (query.isPending)
    return (
      <section className="card state" aria-busy="true" role="status">
        <LoaderCircle className="spin" aria-hidden="true" />
        <p>正在加载课程目录</p>
      </section>
    );
  if (query.isError && !query.data)
    return (
      <section className="card state" data-state="error" role="alert">
        <AlertCircle aria-hidden="true" />
        <p>目录加载失败，请检查网络后重试。</p>
        <Button loading={query.isFetching} onClick={() => void query.refetch()}>
          重新加载目录
        </Button>
      </section>
    );
  const catalog = query.data!;
  if (!catalog.chapters.length)
    return (
      <section className="card state">
        <BookOpen aria-hidden="true" />
        <p>本课程暂未发布目录，请稍后查看。</p>
        <Button loading={query.isFetching} onClick={() => void query.refetch()}>
          刷新目录
        </Button>
      </section>
    );
  const progress = catalog.courseProgress;
  const incomplete = confirm?.items.filter((item) => !item.completed) ?? [];
  return (
    <div className="catalog-page">
      <section className="catalog-toolbar" aria-label="学习进度与继续学习">
        <div className="catalog-progress">
          <div className="catalog-progress-label">
            <h3>课程总进度</h3>
            <strong>{progress.totalItems ? `${progress.percent}%` : '暂无可统计项目'}</strong>
          </div>
          <p>
            已完成 {progress.completedItems} / {progress.totalItems} 项
          </p>
          {progress.totalItems > 0 && (
            <div
              className="progress-track"
              role="progressbar"
              aria-label="课程总进度"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              aria-valuetext={`已完成 ${progress.completedItems} / ${progress.totalItems} 项`}
            >
              <div className="progress-fill" style={progressStyle(progress.percent)} />
            </div>
          )}
        </div>
        <div className="catalog-continue">
          <div>
            {next ? (
              <>
                <p className="catalog-caption">{previous ? '上次学习记录' : '下一个未完成条目'}</p>
                <p>
                  <MathText text={next.chapter.title} /> · <MathText text={next.item.title} />
                </p>
                <span className="catalog-meta">
                  预计 {durationLabel(next.item.estimatedMinutes)}
                </span>
              </>
            ) : (
              <p>{allDone ? '本课程目录已全部完成，可展开章节复习。' : '暂无可继续学习的条目'}</p>
            )}
          </div>
          {next && (
            <Button onClick={() => go(next.chapter.id, next.item.id)}>
              继续学习
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          )}
        </div>
      </section>
      <div className="catalog-layout">
        <nav className="catalog-nav" aria-label="章节锚点导航">
          <h3>{practice ? '学习阶段' : '章节'}</h3>
          {catalog.chapters.map((chapter) => (
            <a
              key={chapter.id}
              href={`#${encodeURIComponent(chapter.id)}`}
              title={chapter.title}
              aria-current={current === chapter.id ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                go(chapter.id);
              }}
            >
              <BookOpen size={18} aria-hidden="true" />
              <span>{chapter.title}</span>
            </a>
          ))}
        </nav>
        <div className="catalog-main">
          {query.isError && (
            <div className="card" data-state="error" role="alert">
              <p>目录刷新失败，正在显示上次加载的内容。</p>
              <Button loading={query.isFetching} onClick={() => void query.refetch()}>
                重试刷新目录
              </Button>
            </div>
          )}
          <label className="catalog-select">
            {practice ? '学习阶段' : '章节'}
            <select value={current} onChange={(event) => go(event.target.value)}>
              {catalog.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </label>
          <p className="catalog-selected-chapter">
            当前{practice ? '阶段' : '章节'}：
            {catalog.chapters.find((chapter) => chapter.id === current)?.title}
          </p>
          {catalog.chapters.map((chapter) => {
            const open = expanded.has(chapter.id);
            const unfinished = chapter.items.filter((item) => !item.completed);
            const error = failure?.chapterId === chapter.id;
            const disabledReason = mutation.isPending
              ? '正在保存，请稍候'
              : !unfinished.length
                ? '没有需要标记的未完成条目'
                : unfinished.length > 200
                  ? '本章超过接口单次 200 项限制，请逐项勾选'
                  : undefined;
            return (
              <section
                key={chapter.id}
                id={chapter.id}
                tabIndex={-1}
                className="catalog-chapter"
                data-state={error ? 'error' : 'ready'}
                aria-busy={pendingChapter === chapter.id || undefined}
                aria-labelledby={`heading-${chapter.id}`}
              >
                <div className="catalog-chapter-heading">
                  <h3 id={`heading-${chapter.id}`}>
                    <button
                      className="catalog-toggle"
                      title={chapter.title}
                      aria-expanded={open}
                      aria-controls={`items-${chapter.id}`}
                      onClick={() =>
                        setExpanded((previous) => {
                          const result = new Set(previous);
                          if (result.has(chapter.id)) result.delete(chapter.id);
                          else result.add(chapter.id);
                          return result;
                        })
                      }
                    >
                      {open ? (
                        <ChevronDown aria-hidden="true" />
                      ) : (
                        <ChevronRight aria-hidden="true" />
                      )}
                      <span className="catalog-chapter-title">
                        <MathText text={chapter.title} />
                      </span>
                      <span className="catalog-meta">共 {chapter.items.length} 项</span>
                    </button>
                  </h3>
                  {saved === chapter.id && (
                    <span className="catalog-saved" role="status">
                      <Check size={16} aria-hidden="true" />
                      已保存
                    </span>
                  )}
                </div>
                {error && (
                  <p className="catalog-error" role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    {failure.message}
                  </p>
                )}
                <div id={`items-${chapter.id}`} hidden={!open}>
                  {chapter.items.length === 0 ? (
                    <div className="state">
                      <p>本章暂未发布条目。</p>
                      <Button loading={query.isFetching} onClick={() => void query.refetch()}>
                        刷新目录
                      </Button>
                    </div>
                  ) : (
                    <ul className="catalog-items">
                      {chapter.items.map((item) => {
                        return (
                          <li
                            key={item.id}
                            id={item.id}
                            tabIndex={-1}
                            className={`catalog-item ${item.completed ? 'catalog-item-complete' : ''}`}
                          >
                            <label
                              className="catalog-check"
                              title={mutation.isPending ? '正在保存，请稍候' : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={item.completed}
                                aria-label={`${item.title}${(titleCounts.get(item.title) ?? 0) > 1 ? `（${chapter.title}）` : ''}完成状态`}
                                disabled={mutation.isPending}
                                aria-describedby={mutation.isPending ? 'catalog-saving' : undefined}
                                onChange={(event) =>
                                  void save(chapter.id, [item], event.target.checked)
                                }
                              />
                              <span className="catalog-check-caption">标记完成</span>
                            </label>
                            <div className="catalog-item-content">
                              <h4>
                                <MathText text={item.title} />
                              </h4>
                              {(titleCounts.get(item.title) ?? 0) > 1 && (
                                <p className="catalog-caption">
                                  所属{practice ? '阶段' : '章节'}：{chapter.title}
                                </p>
                              )}
                              <p className="catalog-resource-type">
                                {item.resource?.label || (practice ? '实践任务' : '学习条目')}
                              </p>
                              <span className="catalog-meta">
                                {item.completed ? (
                                  <>
                                    <Check size={16} aria-hidden="true" />
                                    已完成
                                  </>
                                ) : (
                                  <>
                                    <Clock size={16} aria-hidden="true" />
                                    待学习
                                  </>
                                )}{' '}
                                · 预计 {durationLabel(item.estimatedMinutes)}
                              </span>
                              <CatalogResource
                                item={item}
                                courseId={courseId}
                                chapterTitle={chapter.title}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="catalog-bulk">
                    <Button
                      variant="secondary"
                      disabled={!!disabledReason}
                      disabledReason={disabledReason}
                      loading={pendingChapter === chapter.id}
                      loadingLabel="正在保存，请稍候"
                      onClick={() => setConfirm(chapter)}
                    >
                      全部标记完成
                    </Button>
                  </div>
                </div>
              </section>
            );
          })}
          {mutation.isPending && (
            <p id="catalog-saving" role="status">
              <LoaderCircle size={18} className="spin" aria-hidden="true" />
              正在保存，请稍候
            </p>
          )}
          <Modal open={!!confirm} title="全部标记完成" onClose={() => setConfirm(null)}>
            <p>
              将「{confirm?.title}」中的 {incomplete.length}{' '}
              个未完成条目标记为完成，同时影响关联学习安排。之后可逐项取消勾选。
            </p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  if (confirm) {
                    setConfirm(null);
                    void save(confirm.id, incomplete, true);
                  }
                }}
              >
                确认标记 {incomplete.length} 项
              </Button>
            </div>
          </Modal>
          <Link className="button button-secondary" to={`/zikao/schedule${location.search}`}>
            查看学习安排
          </Link>
        </div>
      </div>
    </div>
  );
}

function CatalogResource({
  item,
  courseId,
  chapterTitle,
}: {
  item: CatalogItem;
  courseId: string;
  chapterTitle: string;
}) {
  const url = resourceUrl(item);
  const download = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async () => {
      const result = (
        await downloadCourseResource(courseId, item.resource!.fileId!, { silent: true })
      ).data;
      saveExamFile(result);
    },
  });
  if (!item.resource) return null;
  if (url)
    return (
      <a
        className="catalog-resource-action"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`打开${item.title}（${chapterTitle}，新窗口打开）`}
      >
        打开{item.resource.label || '学习资源'}
        <ExternalLink size={16} aria-hidden="true" />
        <span className="catalog-caption">新窗口打开</span>
      </a>
    );
  if (item.resource.kind === 'FILE' && item.resource.fileId)
    return (
      <div className="catalog-resource-download">
        <Button
          variant="secondary"
          loading={download.isPending}
          loadingLabel="正在下载"
          onClick={() => download.mutate()}
          aria-label={`下载${item.title}（${chapterTitle}）`}
        >
          下载{item.resource.label || '资料'}
        </Button>
        {download.isError && <p role="alert">资料下载失败，请重试。{download.error.message}</p>}
      </div>
    );
  return <p className="catalog-caption">资源暂不可用，请稍后查看。</p>;
}
