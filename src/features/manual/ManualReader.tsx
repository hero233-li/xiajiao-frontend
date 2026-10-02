import { createUuid } from '../../utils/uuid';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigate } from '../cycle/navigation';
import { AlertCircle, BookOpen, Check, LoaderCircle, Search } from 'lucide-react';
import { useManual, useManualCompletion } from '../../api/manual';
import type { CatalogItem } from '../../api/generated/models';
import { Button } from '../../components/Button';
import { ManualMarkdown } from './ManualMarkdown';
import { indexManual } from './markdown-index';
import './manual.css';
const readingPositions = new Map<string, number>();
function decodeHash(hash: string) {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return '';
  }
}
export default function ManualReader({ courseId }: { courseId: string }) {
  const query = useManual(courseId);
  const mutation = useManualCompletion(courseId);
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [pendingItem, setPendingItem] = useState('');
  const [saved, setSaved] = useState('');
  const [failure, setFailure] = useState<{ itemId: string; message: string } | null>(null);
  const locked = useRef(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();
  const index = useMemo(
    () => (query.data ? indexManual(query.data) : { headings: [], blocks: [] }),
    [query.data],
  );
  const needle = search.trim().toLocaleLowerCase();
  const results = useMemo(
    () =>
      needle ? index.blocks.filter((block) => block.text.toLocaleLowerCase().includes(needle)) : [],
    [index, needle],
  );
  const ready = !!query.data;
  useEffect(() => () => clearTimeout(savedTimer.current), []);
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    const requested = decodeHash(location.hash);
    const heading = index.headings.find(
      (heading) =>
        heading.id === requested ||
        heading.text === requested ||
        heading.text.toLocaleLowerCase().replace(/\s+/g, '-') === requested,
    );
    const target =
      heading?.id ?? (document.getElementById(requested) ? requested : `manual-${requested}`);
    const element = requested ? document.getElementById(target) : null;
    const previousPosition = readingPositions.get(`${courseId}:${location.key}`);
    if (navigationType === 'POP' && previousPosition !== undefined)
      window.scrollTo({ top: previousPosition, behavior: 'instant' });
    else if (element) {
      element.scrollIntoView?.({ block: 'start', behavior: 'instant' });
      element.focus({ preventScroll: true });
      setActive(heading?.id ?? target);
    }
    if (element) element.setAttribute('data-reading-target', 'true');
    return () => {
      element?.removeAttribute('data-reading-target');
      readingPositions.set(`${courseId}:${location.key}`, window.scrollY);
      if (readingPositions.size > 100)
        readingPositions.delete(readingPositions.keys().next().value!);
    };
    // 标题映射在正文首次就绪时已生成，状态刷新或搜索不会重置阅读位置。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, location.key, location.hash, navigationType, ready]);
  useEffect(() => {
    if (!ready || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-8% 0px -65% 0px' },
    );
    index.headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [ready, index]);
  function go(requested: string) {
    const heading = index.headings.find(
      (heading) =>
        heading.id === requested ||
        heading.text === requested ||
        heading.text.toLocaleLowerCase().replace(/\s+/g, '-') === requested,
    );
    const id =
      heading?.id ?? (document.getElementById(requested) ? requested : `manual-${requested}`);
    const hash = `#${encodeURIComponent(id)}`;
    if (location.hash === hash) {
      const element = document.getElementById(id);
      element?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
      element?.focus({ preventScroll: true });
      return;
    }
    navigate({ pathname: location.pathname, search: location.search, hash });
  }
  async function toggle(item: CatalogItem, completed: boolean) {
    if (locked.current) return;
    locked.current = true;
    setPendingItem(item.id);
    setFailure(null);
    setSaved('');
    clearTimeout(savedTimer.current);
    try {
      await mutation.mutateAsync({
        itemId: item.id,
        write: {
          completed,
          expectedRevision: item.revision,
          clientMutationId: createUuid(),
        },
      });
      setSaved(item.id);
      savedTimer.current = setTimeout(() => setSaved(''), 3000);
    } catch (error) {
      setFailure({
        itemId: item.id,
        message: `保存失败，已恢复原状态。${error instanceof Error ? error.message : '请稍后重试。'}`,
      });
    } finally {
      locked.current = false;
      setPendingItem('');
    }
  }
  if (query.isPending)
    return (
      <section className="card state" role="status" aria-busy="true">
        <LoaderCircle className="spin" aria-hidden="true" />
        <p>正在加载实践手册</p>
      </section>
    );
  if (query.isError && !query.data)
    return (
      <section className="card state" role="alert" data-state="error">
        <AlertCircle aria-hidden="true" />
        <p>实践手册加载失败，请重试。</p>
        <Button loading={query.isFetching} onClick={() => void query.refetch()}>
          重新加载手册
        </Button>
      </section>
    );
  const manual = query.data!;
  if (
    !manual.sections.length ||
    manual.sections.every((section) => !section.markdown.trim() && !section.exercises.length)
  )
    return (
      <section className="card state">
        <BookOpen aria-hidden="true" />
        <p>本课程暂未发布实践手册。</p>
        <Button loading={query.isFetching} onClick={() => void query.refetch()}>
          刷新手册
        </Button>
      </section>
    );
  return (
    <div className="manual-layout">
      <nav className="manual-toc" aria-label="手册目录">
        <h2>手册目录</h2>
        {index.headings.map((heading) => (
          <a
            href={`#${encodeURIComponent(heading.id)}`}
            key={heading.id}
            title={heading.text}
            aria-current={active === heading.id ? 'location' : undefined}
            style={{ paddingInlineStart: `${8 + Math.min((heading.depth ?? 1) - 1, 3) * 8}px` }}
            onClick={(event) => {
              event.preventDefault();
              go(heading.id);
            }}
          >
            {heading.text}
          </a>
        ))}
      </nav>
      <div className="manual-main">
        <label className="manual-mobile-toc">
          手册目录
          <select
            value={index.headings.some((heading) => heading.id === active) ? active : ''}
            onChange={(event) => go(event.target.value)}
          >
            <option value="" disabled>
              选择阅读章节
            </option>
            {index.headings.map((heading) => (
              <option key={heading.id} value={heading.id}>
                {heading.text}
              </option>
            ))}
          </select>
        </label>
        <section className="card manual-search" aria-label="手册内搜索">
          <label htmlFor="manual-search">
            <Search size={18} aria-hidden="true" />
            搜索手册
          </label>
          <input
            id="manual-search"
            type="search"
            placeholder="输入关键词"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {needle && (
            <>
              <p role="status">找到 {results.length} 处匹配内容</p>
              {results.length ? (
                <ul>
                  {results.map((result) => (
                    <li key={result.id}>
                      <button
                        className="manual-result"
                        title={result.text}
                        onClick={() => go(result.id)}
                      >
                        {result.text}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p>没有找到匹配内容，请尝试其他关键词。</p>
                  <Button variant="secondary" onClick={() => setSearch('')}>
                    清空搜索
                  </Button>
                </>
              )}
            </>
          )}
        </section>
        {query.isError && (
          <section className="card" role="alert" data-state="error">
            <p>手册刷新失败，正在显示上次加载的内容。</p>
            <Button loading={query.isFetching} onClick={() => void query.refetch()}>
              重试刷新手册
            </Button>
          </section>
        )}
        <div className="manual-body">
          {manual.sections.map((section) => (
            <section
              className="card manual-section"
              key={section.chapterId}
              id={`manual-${section.chapterId}`}
              tabIndex={-1}
              aria-label={section.title}
            >
              {!section.markdown.trim() ? (
                <div className="state">
                  <p>本章正文暂未发布。</p>
                  <Button loading={query.isFetching} onClick={() => void query.refetch()}>
                    刷新手册
                  </Button>
                </div>
              ) : (
                <ManualMarkdown
                  chapterId={section.chapterId}
                  markdown={section.markdown}
                  search={search}
                  onAnchor={go}
                />
              )}
              {section.exercises.length > 0 && (
                <section className="manual-exercises" aria-label={`${section.title}章节练习`}>
                  <h2>章节练习</h2>
                  <ul>
                    {section.exercises.map(({ item }) => (
                      <li
                        id={`manual-exercise-${section.chapterId}-${item.id}`}
                        tabIndex={-1}
                        key={item.id}
                        data-state={failure?.itemId === item.id ? 'error' : 'ready'}
                      >
                        <label className="manual-exercise-label">
                          <span className="manual-checkbox">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              disabled={mutation.isPending}
                              aria-label={`${item.title}完成状态`}
                              aria-describedby={mutation.isPending ? 'manual-saving' : undefined}
                              title={mutation.isPending ? '正在保存，请稍候' : undefined}
                              onChange={(event) => void toggle(item, event.target.checked)}
                            />
                          </span>
                          <span>
                            {item.title}
                            <span
                              className={item.completed ? 'manual-completed' : 'manual-pending'}
                            >
                              {item.completed ? (
                                <Check size={16} aria-hidden="true" />
                              ) : (
                                <BookOpen size={16} aria-hidden="true" />
                              )}
                              {item.completed ? '已完成' : '待完成'}
                            </span>
                          </span>
                        </label>
                        {pendingItem === item.id && (
                          <p id="manual-saving" role="status">
                            <LoaderCircle size={18} className="spin" aria-hidden="true" />
                            正在保存，请稍候
                          </p>
                        )}
                        {saved === item.id && (
                          <span className="manual-completed" role="status">
                            <Check size={16} aria-hidden="true" />
                            已保存
                          </span>
                        )}
                        {failure?.itemId === item.id && (
                          <p className="manual-error" role="alert">
                            <AlertCircle size={18} aria-hidden="true" />
                            {failure.message}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
