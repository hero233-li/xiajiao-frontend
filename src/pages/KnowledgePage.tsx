import { useEffect, useId, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link, useNavigate, useSearchParams } from '../features/cycle/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  LoaderCircle,
  Search,
  Star,
} from 'lucide-react';
import {
  useKnowledgeCourse,
  useKnowledgeCycles,
  useKnowledgeDetail,
  useKnowledgeDownload,
  useKnowledgeList,
  useKnowledgeSolution,
} from '../api/knowledge';
import type {
  KnowledgeExample,
  KnowledgeModule,
  ListKnowledgeParams,
  Resource,
} from '../api/generated/models';
import { errorMessage } from '../api/errors';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MathText } from '../components/MathText';
import { useKnowledgeDraft } from '../features/knowledge/useKnowledgeDraft';
import { KnowledgeMarkdown } from '../features/knowledge/KnowledgeMarkdown';
import '../features/knowledge/knowledge.css';

const difficultyNames = ['入门', '基础', '进阶', '较难', '挑战'];
const masteryNames = ['陌生', '了解', '熟悉', '掌握', '精通'];
function Stars({ value }: { value: number }) {
  return (
    <span className="kh-stars">
      <span aria-hidden="true">
        {Array.from({ length: value }, (_, index) => (
          <Star key={index} size={16} />
        ))}
      </span>
      <span>
        {value} 星 · {difficultyNames[value - 1]}
      </span>
    </span>
  );
}
function Region({
  loading,
  error,
  empty,
  retry,
  retrying = false,
  action = '重新加载',
  onAction,
}: {
  loading?: string;
  error?: unknown;
  empty?: string;
  retry?: () => void;
  retrying?: boolean;
  action?: string;
  onAction?: () => void;
}) {
  if (loading) return <Card state="loading" message={loading} className="kh-region" />;
  return (
    <Card
      className="kh-region"
      state={error ? 'error' : 'default'}
      message={error ? errorMessage(error) : undefined}
    >
      {!error && <p>{empty}</p>}
      {(retry || onAction) && (
        <Button
          variant="secondary"
          onClick={retry || onAction}
          loading={retrying}
          loadingLabel="正在重新加载"
        >
          {action}
        </Button>
      )}
    </Card>
  );
}
function Pagination({
  page,
  size,
  total,
  onChange,
}: {
  page: number;
  size: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="kh-pagination">
      <Button
        variant="secondary"
        disabled={page === 1}
        disabledReason="已是第一页"
        onClick={() => onChange(page - 1)}
      >
        上一页
      </Button>
      <span>第 {page} 页</span>
      <Button
        variant="secondary"
        disabled={page * size >= total}
        disabledReason="已是最后一页"
        onClick={() => onChange(page + 1)}
      >
        下一页
      </Button>
    </div>
  );
}
function CyclePicker({ onChoose }: { onChoose: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const cycles = useKnowledgeCycles(page, true);
  if (cycles.isPending) return <Region loading="正在加载考试周期" />;
  if (cycles.isError)
    return (
      <Region
        error={cycles.error}
        retry={() => void cycles.refetch()}
        retrying={cycles.isFetching}
      />
    );
  if (!cycles.data.items.length)
    return <Region empty="暂无可选考试周期。" onAction={() => void cycles.refetch()} />;
  return (
    <Card className="kh-cycle">
      <p>请选择考试周期以加载课程。</p>
      <label htmlFor="kh-cycle">考试周期</label>
      <select
        id="kh-cycle"
        value=""
        onChange={(event) => {
          if (event.target.value) onChoose(event.target.value);
        }}
      >
        <option value="">请选择考试周期</option>
        {cycles.data.items.map((cycle) => (
          <option key={cycle.id} value={cycle.id}>
            {cycle.name}
          </option>
        ))}
      </select>
      <Pagination {...cycles.data} onChange={setPage} />
    </Card>
  );
}
function Solution({ courseId, exampleId }: { courseId: string; exampleId: string }) {
  const query = useKnowledgeSolution(courseId, exampleId);
  if (query.isPending) return <Region loading="正在加载答案与解法" />;
  if (query.isError)
    return (
      <Region error={query.error} retry={() => void query.refetch()} retrying={query.isFetching} />
    );
  if (!query.data.answer && !query.data.solution)
    return <Region empty="本例题答案与解法准备中。" onAction={() => void query.refetch()} />;
  return (
    <div className="kh-solution">
      <h5>答案</h5>
      <MathText text={query.data.answer} />
      <h5>解法</h5>
      <MathText text={query.data.solution} />
    </div>
  );
}
function Example({ courseId, example }: { courseId: string; example: KnowledgeExample }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <Card className="kh-example">
      <p className="kh-question">
        <MathText text={example.question} />
      </p>
      <Stars value={example.stars} />
      <Button
        variant="secondary"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '收起答案与解法' : '查看答案与解法'}
      </Button>
      <div id={id} hidden={!expanded}>
        {expanded && <Solution courseId={courseId} exampleId={example.id} />}
      </div>
    </Card>
  );
}
function safeResourceUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}
function DownloadResource({ courseId, resource }: { courseId: string; resource: Resource }) {
  const request = useKnowledgeDownload(courseId, resource.fileId || '');
  const [downloadError, setDownloadError] = useState('');
  async function download() {
    setDownloadError('');
    try {
      const data = await request.mutateAsync();
      const content = Uint8Array.from(atob(data.contentBase64), (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([content], { type: data.file.mimeType }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = data.file.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setDownloadError(errorMessage(cause));
    }
  }
  return (
    <Button
      variant="secondary"
      loading={request.isPending}
      loadingLabel="正在下载资源"
      error={downloadError}
      disabled={!resource.fileId}
      disabledReason="资源尚未关联文件"
      className="kh-download"
      onClick={() => void download()}
    >
      <Download size={20} aria-hidden="true" />
      <span className="kh-resource-label" title={resource.label}>
        {resource.label}
      </span>
      {downloadError ? ' · 重试下载' : ''}
    </Button>
  );
}
function UserNote({ courseId, module }: { courseId: string; module: KnowledgeModule }) {
  const { draft, status, error, edit, selectMastery, retry } = useKnowledgeDraft(courseId, module);
  const id = useId();
  const [tooLong, setTooLong] = useState(false);
  const labels = { saved: '已保存', waiting: '等待自动保存', saving: '保存中', error: '保存失败' };
  return (
    <section className="kh-user-note" aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`}>我的掌握程度与笔记</h4>
      <fieldset>
        <legend>掌握程度</legend>
        <div className="kh-mastery">
          {masteryNames.map((label, level) => (
            <label key={level} className="kh-mastery-option">
              <input
                type="radio"
                name={`${id}-mastery`}
                value={level}
                checked={draft.mastery === level}
                onChange={() => selectMastery(level)}
              />
              <span>
                {level} · {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${id}-note`}>知识笔记</label>
      <textarea
        id={`${id}-note`}
        value={draft.note}
        aria-describedby={`${id}-count ${id}-status`}
        aria-invalid={tooLong || undefined}
        onChange={(event) => {
          const over = Array.from(event.target.value).length > 10000;
          setTooLong(over);
          if (!over) edit(event.target.value);
        }}
        placeholder="记录你的理解、易错点和复习提示"
        rows={8}
      />
      <div className="kh-note-footer">
        <span id={`${id}-count`}>{Array.from(draft.note).length} / 10000 字</span>
        <span
          id={`${id}-status`}
          role="status"
          aria-live="polite"
          className={`kh-save kh-save-${status}`}
        >
          {status === 'saved' ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : status === 'saving' ? (
            <LoaderCircle size={16} className="spin" aria-hidden="true" />
          ) : status === 'error' ? (
            <AlertCircle size={16} aria-hidden="true" />
          ) : null}
          {labels[status]}
        </span>
      </div>
      {tooLong && (
        <p className="status-error" role="alert">
          笔记最多 10000 字，超出的输入未加入草稿。
        </p>
      )}
      {status === 'error' && (
        <div className="kh-save-error" role="alert">
          <p>{error}；草稿已保留。重试将保存当前草稿。</p>
          <Button variant="secondary" onClick={() => void retry()}>
            重试保存
          </Button>
        </div>
      )}
    </section>
  );
}
function DetailContent({
  courseId,
  module,
  onBack,
}: {
  courseId: string;
  module: KnowledgeModule;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  return (
    <article className="kh-detail-card">
      <h3>
        <MathText text={module.title} />
      </h3>
      <Stars value={module.difficulty} />
      <section className="kh-prose" aria-label="模块正文">
        {module.content ? (
          <KnowledgeMarkdown text={module.content} />
        ) : (
          <Region empty="本模块内容准备中。" action="查看其他模块" onAction={onBack} />
        )}
      </section>
      <section className="kh-section" aria-label="公式列表">
        <h4>公式</h4>
        {module.formulas.length ? (
          module.formulas.map((formula, index) => (
            <Card className="kh-formula" key={index}>
              <h5>
                <MathText text={formula.label} />
              </h5>
              <div
                className="kh-formula-scroll"
                tabIndex={0}
                role="region"
                aria-label={`${formula.label}公式，可横向滚动`}
              >
                <MathText text={`$$${formula.tex}$$`} />
              </div>
              <p>
                适用条件：
                <MathText text={formula.condition} />
              </p>
            </Card>
          ))
        ) : (
          <Region empty="本模块暂无独立公式。" action="查看其他模块" onAction={onBack} />
        )}
      </section>
      <section className="kh-section" aria-label="例题列表">
        <h4>例题</h4>
        {module.examples.length ? (
          module.examples.map((example) => (
            <Example key={example.id} courseId={courseId} example={example} />
          ))
        ) : (
          <Region empty="本模块暂无例题。" action="查看其他模块" onAction={onBack} />
        )}
      </section>
      <section className="kh-section" aria-label="资源链接">
        <h4>资源链接</h4>
        {module.resources.length ? (
          <ul className="kh-resources">
            {module.resources.map((resource, index) => (
              <li key={index}>
                {resource.kind === 'FILE' ? (
                  <DownloadResource courseId={courseId} resource={resource} />
                ) : safeResourceUrl(resource.url) ? (
                  <a
                    className="button button-secondary kh-resource-link"
                    href={safeResourceUrl(resource.url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={20} aria-hidden="true" />
                    <MathText text={resource.label} />
                    <span className="kh-resource-caption">新窗口打开</span>
                  </a>
                ) : (
                  <Button variant="secondary" disabled disabledReason="资源链接暂不可用">
                    {resource.label}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Region
            empty="本模块暂无资源链接。"
            action="查看我的科目"
            onAction={() => navigate('/study/courses')}
          />
        )}
      </section>
      <UserNote key={module.id} courseId={courseId} module={module} />
    </article>
  );
}
function ModuleDetail({
  courseId,
  moduleId,
  onBack,
}: {
  courseId: string;
  moduleId: string;
  onBack: () => void;
}) {
  const detail = useKnowledgeDetail(courseId, moduleId);
  const title = useRef<HTMLElement>(null);
  const focused = useRef('');
  useEffect(() => {
    if (!moduleId) {
      focused.current = '';
      return;
    }
    if (detail.isPending || focused.current === moduleId) return;
    focused.current = moduleId;
    title.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    title.current?.focus({ preventScroll: true });
  }, [moduleId, detail.isPending]);
  return (
    <section className="kh-detail" ref={title} tabIndex={-1} aria-label="模块详情">
      {moduleId && (
        <Button id="kh-back-list" variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          返回模块列表
        </Button>
      )}
      {!moduleId ? (
        <p className="kh-placeholder">选择左侧模块，查看知识说明、公式、例题和学习笔记。</p>
      ) : detail.isPending ? (
        <Region loading="正在加载模块详情" />
      ) : detail.isError ? (
        <Region
          error={detail.error}
          retry={() => void detail.refetch()}
          retrying={detail.isFetching}
        />
      ) : (
        <DetailContent key={moduleId} courseId={courseId} module={detail.data} onBack={onBack} />
      )}
    </section>
  );
}
function KnowledgeWorkspace({ courseId }: { courseId: string }) {
  const [search, setSearch] = useSearchParams();
  const q = search.get('q') || '';
  const [input, setInput] = useState(q);
  const difficultyValue = Number(search.get('difficulty'));
  const difficulty =
    Number.isInteger(difficultyValue) && difficultyValue >= 1 && difficultyValue <= 5
      ? difficultyValue
      : undefined;
  const pageValue = Number(search.get('page'));
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const moduleId = search.get('moduleId') || '';
  const latestSearch = useRef(search);
  const listScroll = useRef<number | null>(null);
  const previousModule = useRef(moduleId);
  useEffect(() => {
    if (previousModule.current && !moduleId) {
      const heading = document.getElementById('kh-list-title');
      heading?.focus({ preventScroll: true });
      if (listScroll.current !== null)
        window.scrollTo?.({ top: listScroll.current, behavior: 'auto' });
      else heading?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    }
    previousModule.current = moduleId;
  }, [moduleId]);
  useEffect(() => {
    latestSearch.current = search;
  }, [search]);
  useEffect(() => {
    setInput(q);
  }, [q]);
  useEffect(() => {
    if (input === q) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(latestSearch.current);
      if (input.trim()) params.set('q', input.trim());
      else params.delete('q');
      params.delete('page');
      setSearch(params, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [input, q, setSearch]);
  const params: ListKnowledgeParams = { q: q || undefined, difficulty, page, size: 20 };
  const modules = useKnowledgeList(courseId, params);
  function patch(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(search);
    Object.entries(updates).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setSearch(next);
  }
  function back() {
    patch({ moduleId: undefined });
  }
  function clearFilters() {
    setInput('');
    patch({ q: undefined, difficulty: undefined, page: undefined });
  }
  return (
    <>
      {!moduleId && (
        <section className="kh-filters" aria-label="知识检索">
          <div>
            <label htmlFor="kh-search">
              <Search size={20} aria-hidden="true" />
              搜索知识模块
            </label>
            <div className="kh-search-control">
              <input
                id="kh-search"
                type="search"
                value={input}
                maxLength={200}
                onChange={(event) => setInput(event.target.value)}
                placeholder="输入模块名称或关键词"
              />
              {input && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setInput('');
                    patch({ q: undefined, page: undefined });
                  }}
                >
                  清空搜索
                </Button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="kh-difficulty">难度筛选</label>
            <select
              id="kh-difficulty"
              value={difficulty || ''}
              onChange={(event) =>
                patch({ difficulty: event.target.value || undefined, page: undefined })
              }
            >
              <option value="">全部难度</option>
              {difficultyNames.map((label, index) => (
                <option key={index} value={index + 1}>
                  {index + 1} 星 · {label}
                </option>
              ))}
            </select>
          </div>
          {(q || difficulty) && (
            <div className="kh-filter-reset">
              <Button variant="secondary" onClick={clearFilters}>
                清除筛选
              </Button>
            </div>
          )}
        </section>
      )}
      <div className="kh-workspace" data-detail={!!moduleId}>
        {!moduleId && (
          <section className="kh-list" aria-labelledby="kh-list-title">
            <h3 id="kh-list-title" tabIndex={-1}>
              知识模块
            </h3>
            {modules.isPending ? (
              <Region loading="正在加载知识模块" />
            ) : modules.isError ? (
              <Region
                error={modules.error}
                retry={() => void modules.refetch()}
                retrying={modules.isFetching}
              />
            ) : !modules.data.items.length ? (
              <Region
                empty="没有符合条件的知识模块。"
                action={q || difficulty ? '清除筛选' : '刷新模块'}
                onAction={q || difficulty ? clearFilters : () => void modules.refetch()}
              />
            ) : (
              <>
                <ul className="kh-module-list">
                  {modules.data.items.map((module) => (
                    <li key={module.id}>
                      <button
                        className="kh-module"
                        aria-current={module.id === moduleId ? 'true' : undefined}
                        onClick={() => {
                          listScroll.current = window.scrollY;
                          patch({ moduleId: module.id });
                        }}
                      >
                        <span className="kh-module-title">
                          <MathText text={module.title} />
                        </span>
                        <Stars value={module.difficulty} />
                        {module.id === moduleId && (
                          <span className="kh-selected">
                            <CheckCircle2 size={16} aria-hidden="true" />
                            当前模块
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <Pagination {...modules.data} onChange={(next) => patch({ page: String(next) })} />
              </>
            )}
          </section>
        )}
        {moduleId && <ModuleDetail courseId={courseId} moduleId={moduleId} onBack={back} />}
      </div>
    </>
  );
}
export function KnowledgePage() {
  const { code = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const cycleId = search.get('cycleId') || '';
  const course = useKnowledgeCourse(code, cycleId);
  useEffect(() => {
    const previous = document.title;
    document.title = `知识索引${course.data?.name ? ` · ${course.data.name}` : ''} · 学习知途`;
    return () => {
      document.title = previous;
    };
  }, [course.data?.name]);
  return (
    <div className="kh-page">
      <header className="kh-heading">
        <div>
          <h2>知识索引</h2>
        </div>
        <Link className="button button-ghost" to="/study/courses">
          我的科目
        </Link>
      </header>
      {!cycleId ? (
        <CyclePicker
          onChoose={(id) => {
            const params = new URLSearchParams(search);
            params.set('cycleId', id);
            setSearch(params);
          }}
        />
      ) : course.isPending ? (
        <Region loading="正在加载课程" />
      ) : course.isError ? (
        <Region
          error={course.error}
          retry={() => void course.refetch()}
          retrying={course.isFetching}
        />
      ) : (
        <KnowledgeWorkspace key={course.data.id} courseId={course.data.id} />
      )}
    </div>
  );
}
export const Component = KnowledgePage;
