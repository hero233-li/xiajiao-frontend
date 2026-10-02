import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const next = query.data?.chapters
    .flatMap((chapter) => chapter.items.map((item) => ({ chapter, item })))
    .find(({ item }) => !item.completed);

  useEffect(() => () => clearTimeout(savedTimer.current), []);
  useEffect(() => {
    if (!query.data || (initialized.current && processedHash.current === location.hash)) return;
    processedHash.current = location.hash;
    const requested = hashId(location.hash);
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
  }, [location.hash, query.data]);
  useEffect(() => {
    if (!target) return;
    const element = document.getElementById(target);
    element?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
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
    processedHash.current = hash;
    navigate({ pathname: location.pathname, search: location.search, hash }, { replace: true });
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
    <div className="catalog-layout">
      <nav className="catalog-nav" aria-label="章节锚点导航">
        <h2>章节</h2>
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
          章节
          <select value={current} onChange={(event) => go(event.target.value)}>
            {catalog.chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        </label>
        <section className="card catalog-continue" aria-labelledby="continue-heading">
          <div>
            <h2 id="continue-heading">继续学习</h2>
            {next ? (
              <>
                <p>
                  <MathText text={next.chapter.title} /> · <MathText text={next.item.title} />
                </p>
                <span className="catalog-meta">
                  <Clock size={16} aria-hidden="true" />
                  预计 {next.item.estimatedMinutes} 分钟
                </span>
              </>
            ) : (
              <p>
                {progress.totalItems > 0 && progress.completedItems === progress.totalItems
                  ? '本课程目录已全部完成'
                  : '暂无可继续学习的条目'}
              </p>
            )}
          </div>
          {next && (
            <Button onClick={() => go(next.chapter.id, next.item.id)}>
              继续学习
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          )}
        </section>
        <section className="card" aria-labelledby="catalog-progress-heading">
          <div className="catalog-progress-label">
            <h2 id="catalog-progress-heading">课程总进度</h2>
            <strong>{progress.percent}%</strong>
          </div>
          <p>
            已完成 {progress.completedItems} / {progress.totalItems} 项
          </p>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="课程总进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-valuetext={`已完成 ${progress.completedItems} / ${progress.totalItems} 项`}
          >
            <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
        </section>
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
              className="card catalog-chapter"
              data-state={error ? 'error' : 'ready'}
              aria-busy={pendingChapter === chapter.id || undefined}
              aria-labelledby={`heading-${chapter.id}`}
            >
              <div className="catalog-chapter-heading">
                <h2 id={`heading-${chapter.id}`}>
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
                </h2>
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
                      const url = resourceUrl(item);
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
                              aria-label={`${item.title}完成状态`}
                              disabled={mutation.isPending}
                              aria-describedby={mutation.isPending ? 'catalog-saving' : undefined}
                              onChange={(event) =>
                                void save(chapter.id, [item], event.target.checked)
                              }
                            />
                          </label>
                          <div className="catalog-item-content">
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${item.title}（新标签页打开）`}
                              >
                                <MathText text={item.title} />
                                <ExternalLink size={18} aria-hidden="true" />
                              </a>
                            ) : (
                              <MathText text={item.title} />
                            )}
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
                              · 预计 {item.estimatedMinutes} 分钟
                            </span>
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
          查看 35 天安排
        </Link>
      </div>
    </div>
  );
}
