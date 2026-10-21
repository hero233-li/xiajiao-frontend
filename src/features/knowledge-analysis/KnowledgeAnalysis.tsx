import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CheckCheck, FileSearch, RefreshCw, Repeat2, Target } from 'lucide-react';
import {
  knowledgeAnalysisApi as api,
  type CardDetail,
  type CardSummary,
  type Evidence,
  type ReviewState,
  type TaskSummary,
} from '../../api/knowledge-analysis';
import { sessionStore } from '../../api/session';
import { bankRequest, type WeaknessSummary } from '../../api/bank';
import { errorMessage } from '../../api/errors';
import { Button } from '../../components/Button';
import { useCourse } from '../course/CourseContext';
import { Link } from '../cycle/navigation';
import { AnalysisMarkdown } from './AnalysisMarkdown';
import { safeAnalysisUrl } from './safeUrl';
import { useAnalysisReview } from './useAnalysisReview';
import './knowledge-analysis.css';

export const reviewNames: Record<ReviewState, string> = {
  PENDING: '待复习',
  REVIEWED: '已复习',
  VERIFYING: '待验证',
};
const stateNames = {
  QUEUED: '排队中',
  RUNNING: '分析中',
  COMPLETED: '已完成',
  FAILED: '分析失败',
  STALE: '结果已过期',
};
const issues = {
  ERROR: '答题错误',
  OMISSION: '要点遗漏',
  WEAKNESS: '薄弱环节',
  UNCERTAIN: '有待确认',
};
const categories = {
  CONCEPT: '概念理解',
  METHOD: '解题方法',
  CALCULATION: '计算失误',
  READING: '审题遗漏',
  EXPRESSION: '表达不完整',
  UNKNOWN: '待归类',
};
const sources = {
  GRADING: '答卷批改',
  BANK_ATTEMPT: '题库练习',
  BANK_SESSION: '章节检测 / 模拟卷',
};
const active = (task: TaskSummary) => task.state === 'QUEUED' || task.state === 'RUNNING';
function date(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '时间待确认' : d.toLocaleString('zh-CN', { hour12: false });
}
function Failure({ title, error, retry }: { title: string; error: unknown; retry: () => void }) {
  return (
    <div className="ka-state ka-error" role="alert">
      <strong>{title}</strong>
      <p>{errorMessage(error)}</p>
      <Button variant="secondary" onClick={retry}>
        重新加载
      </Button>
    </div>
  );
}
function AnalysisEvidence({ evidence }: { evidence: Evidence }) {
  const url = safeAnalysisUrl(evidence.sourceUrl);
  return (
    <article className="ka-evidence">
      <header>
        <strong>
          {sources[evidence.sourceType]} · 第 {evidence.questionNumber || '—'} 题
        </strong>
        <span>
          {evidence.earned} / {evidence.maximum} 分
        </span>
      </header>
      <p className="secondary">
        {date(evidence.occurredAt)}
        {evidence.pages.length > 0 && ` · 页码：${evidence.pages.join('、')}`}
      </p>
      <dl>
        <dt>原题</dt>
        <dd>
          <AnalysisMarkdown text={evidence.stem || '原题暂未提供'} />
        </dd>
        <dt>我的作答</dt>
        <dd>
          <AnalysisMarkdown text={evidence.answer || '未提供作答'} />
        </dd>
        <dt>参考答案</dt>
        <dd>
          <AnalysisMarkdown text={evidence.referenceAnswer || '参考答案暂未提供'} />
        </dd>
        <dt>评分依据</dt>
        <dd>
          {evidence.reasons.length ? (
            evidence.reasons.map((reason, index) => <AnalysisMarkdown key={index} text={reason} />)
          ) : (
            <p>暂无评分说明，请回看原始批改。</p>
          )}
        </dd>
      </dl>
      {evidence.pointTitle && <p className="secondary">关联知识点：{evidence.pointTitle}</p>}
      {url ? (
        <a
          href={url}
          target={url.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
        >
          查看原始记录 ↗
        </a>
      ) : (
        <p className="secondary">原始记录链接暂不可用</p>
      )}
    </article>
  );
}
function ReviewEditor({ card, userKey }: { card: CardDetail; userKey: string }) {
  const { draft, saving, edit, save } = useAnalysisReview(card, userKey);
  return (
    <section className="ka-review" aria-label="个人复习记录">
      <h3>我的复习与笔记</h3>
      <p className="secondary">
        分析是复习线索，不替代原始批改。确认理解后标记已复习，再用自测验证。
      </p>
      <label>
        复习状态
        <select
          aria-label="个人复习状态"
          value={draft.reviewState}
          onChange={(e) => edit({ reviewState: e.target.value as ReviewState })}
        >
          {Object.entries(reviewNames).map(([value, name]) => (
            <option value={value} key={value}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        个人笔记
        <textarea
          rows={5}
          value={draft.note}
          onChange={(e) => edit({ note: e.target.value })}
          placeholder="记下自己真正卡住的地方，以及下次如何避免…"
        />
      </label>
      {draft.error && (
        <div role="alert" className="ka-error">
          <p>{draft.error}</p>
          {draft.serverNote !== undefined && (
            <details>
              <summary>查看服务器最新笔记</summary>
              <p className="ka-note-compare">{draft.serverNote || '（空白笔记）'}</p>
            </details>
          )}
        </div>
      )}
      <div className="ka-toolbar">
        <Button onClick={() => void save()} disabled={!draft.dirty || saving}>
          {saving ? '正在保存…' : draft.error ? '保留本地内容并重试保存' : '保存复习记录'}
        </Button>
        <span role="status">
          {saving
            ? '本次保存中仍可继续编辑，将按版本顺序保存。'
            : draft.dirty
              ? '有未保存的修改 · 切换卡片后草稿仍保留'
              : '已保存'}
        </span>
      </div>
    </section>
  );
}
function CardContent({ card, userKey }: { card: CardDetail; userKey: string }) {
  return (
    <>
      <div className="ka-detail-heading">
        <p className="eyebrow">
          {card.courseName} · {card.chapterTitle || '章节待归类'}
        </p>
        <h2>{card.title || card.pointTitle}</h2>
        <div className="ka-tags">
          <span>{issues[card.issueType]}</span>
          <span>{categories[card.errorCategory]}</span>
          <span>{card.confidence === 'SUPPORTED' ? '有原始证据支持' : '分析推断 · 请核对'}</span>
          <span data-state={card.analysisState}>{stateNames[card.analysisState]}</span>
        </div>
        <AnalysisMarkdown text={card.summary} />
        <p className="secondary">
          相关失分记录 {card.occurrences} 条 · 累计失分 {card.lostPoints} · 更新于{' '}
          {date(card.updatedAt)}
        </p>
      </div>
      {card.analysisState !== 'COMPLETED' && (
        <p className="ka-notice">
          {card.analysisState === 'STALE'
            ? '来源已更新，当前分析仅供参考，请同步历史记录重新分析。'
            : card.analysisState === 'FAILED'
              ? '本次分析未成功，可在下方任务记录中重试。已有证据与个人笔记仍可查看。'
              : '分析尚未完成。完成后会自动更新，当前内容不代表最终结论。'}
        </p>
      )}
      <section className="ka-learning" aria-label="知识与复习方法">
        <details open>
          <summary>知识点讲解</summary>
          <AnalysisMarkdown text={card.knowledge || '知识讲解尚未生成。'} />
        </details>
        <details>
          <summary>解题方法</summary>
          {card.steps.length ? (
            <ol>
              {card.steps.map((step, i) => (
                <li key={i}>
                  <AnalysisMarkdown text={step} />
                </li>
              ))}
            </ol>
          ) : (
            <p>解题方法尚未生成。</p>
          )}
        </details>
        <details>
          <summary>易混与易错</summary>
          {card.pitfalls.length ? (
            <ul>
              {card.pitfalls.map((item, i) => (
                <li key={i}>
                  <AnalysisMarkdown text={item} />
                </li>
              ))}
            </ul>
          ) : (
            <p>暂无易混点说明。</p>
          )}
        </details>
        <details>
          <summary>答题检查表</summary>
          {card.checklist.length ? (
            <ul>
              {card.checklist.map((item, i) => (
                <li key={i}>
                  <AnalysisMarkdown text={item} />
                </li>
              ))}
            </ul>
          ) : (
            <p>检查表尚未生成。</p>
          )}
        </details>
        <details>
          <summary>自测练习</summary>
          <AnalysisMarkdown text={card.selfTest || '自测练习尚未生成。'} />
          <details>
            <summary>查看自测答案</summary>
            <AnalysisMarkdown text={card.selfTestAnswer || '自测答案尚未生成。'} />
          </details>
        </details>
      </section>
      <details className="ka-evidence-group">
        <summary>原始批改证据 · {card.evidence.length} 条</summary>
        {card.evidence.length ? (
          card.evidence.map((item) => <AnalysisEvidence key={item.id} evidence={item} />)
        ) : (
          <p className="ka-notice">暂未返回原始证据，不能据此认定没有错误。请回看来源记录。</p>
        )}
      </details>
      <ReviewEditor key={`${userKey}:${card.id}`} card={card} userKey={userKey} />
      {card.model && (
        <p className="ka-model secondary">分析模型：{card.model} · AI 生成内容请结合证据核对</p>
      )}
    </>
  );
}
function Detail({ id, userKey }: { id: string; userKey: string }) {
  const query = useQuery({
    queryKey: ['knowledge-analysis', userKey, 'card', id],
    queryFn: ({ signal }) => api.card(id, signal),
    retry: false,
    gcTime: 0,
  });
  return (
    <section className="ka-detail" aria-label="知识点详情">
      {query.isPending ? (
        <p role="status">正在读取知识点与原始证据…</p>
      ) : query.isError ? (
        <Failure
          title="知识点详情读取失败"
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        <CardContent card={query.data} userKey={userKey} />
      )}
    </section>
  );
}
function SummaryCard({
  card,
  selected,
  onClick,
}: {
  card: CardSummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`ka-card ${selected ? 'is-selected' : ''}`}
      aria-label={`查看知识点：${card.title || card.pointTitle}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <div className="ka-card-meta">
        <span>{card.courseName}</span>
        <span data-state={card.analysisState}>{stateNames[card.analysisState]}</span>
      </div>
      <h3>{card.title || card.pointTitle}</h3>
      <p>{card.summary}</p>
      <div className="ka-tags">
        <span>{categories[card.errorCategory]}</span>
        <span>{reviewNames[card.reviewState]}</span>
      </div>
      <footer>
        <span>{`相关失分记录 ${card.occurrences} 条`}</span>
        <span>失分 {card.lostPoints}</span>
      </footer>
    </button>
  );
}
export function KnowledgeAnalysis({ global = false }: { global?: boolean }) {
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);
  const userKey = `${session?.user.id ?? 'anonymous'}:${sessionStore.getEpoch()}`;
  return <Workspace key={`${userKey}:${global}`} userKey={userKey} global={global} />;
}
function WeaknessSummaryCard({ data, courseCode }: { data: WeaknessSummary; courseCode: string }) {
  const wrong = data.wrongDrills ?? [];
  return (
    <section className="ka-weakness-summary" aria-label="第一次弱项练习总结">
      <div className="ka-weakness-summary-head">
        <div>
          <p className="eyebrow">第一次弱项练习总结</p>
          <h2>{data.paperTitle || '章节检测卷'} · {data.sourceScore ?? 0}/{data.sourceMaximum ?? 100}</h2>
        </div>
        <span className="ka-weakness-status">{data.status === 'COMPLETED' ? '已完成' : data.status === 'REDO' ? '待重做' : '进行中'}</span>
      </div>
      <div className="ka-weakness-stats">
        <div><strong>{data.reviewed ?? 0}/{data.analysisTotal ?? 0}</strong><span>错题分析已复习</span></div>
        <div><strong>{data.drillCorrect ?? 0}/{data.drillTotal ?? 0}</strong><span>阶梯练习答对</span></div>
        <div><strong>已跳过</strong><span>原卷错题重做（按你的要求）</span></div>
      </div>
      <div className="ka-weakness-columns">
        <div>
          <h3>最需要补的知识点</h3>
          <ol>
            {(data.weakPoints ?? []).map((point) => (
              <li key={point.pointKey}>
                <strong>{point.pointTitle}</strong>
                <span>失分 {point.lost} · 错/空 {point.wrongCount} 题</span>
                {point.note && <p className="ka-weakness-note">{point.note}</p>}
                <Link to={`/study/course/${courseCode}/weakness`}>再练一次</Link>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3>还没有完全做对的阶梯题</h3>
          {wrong.length ? (
            <ul>
              {wrong.map((item) => (
                <li key={item.number}>
                  <strong>第 {item.number} 题 · {item.pointTitle}</strong>
                  <span>{item.earned}/{item.maximum} 分</span>
                  {item.recognizedAnswer && <p>当时的作答：{item.recognizedAnswer}</p>}
                  {item.reasons[0] && <p className="secondary">{item.reasons[0]}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p>10 道阶梯题已经全部答对。</p>
          )}
        </div>
      </div>
      <div className="ka-weakness-next">
        <strong>下一步</strong>
        <p>先把上面还没有做对的阶梯题改对；之后不再强制原卷错题重做，直接进入章节检测 B 卷。</p>
        <div>
          <Link to={`/study/course/${courseCode}/weakness`}>回到弱项练习</Link>
          <Link to={`/study/course/${courseCode}/practice`}>进入章节检测</Link>
        </div>
      </div>
    </section>
  );
}

function Workspace({ global, userKey }: { global: boolean; userKey: string }) {
  const course = useCourse();
  const [filterCourse, setFilterCourse] = useState('');
  const courseId = global ? filterCourse || undefined : course?.id;
  const enabled = global || !!courseId;
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [reviewState, setReviewState] = useState<ReviewState | ''>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionResult, setActionResult] = useState('');
  const client = useQueryClient();
  const prefix = ['knowledge-analysis', userKey];
  const overview = useQuery({
    queryKey: [...prefix, 'overview', courseId],
    queryFn: ({ signal }) => api.overview(courseId, signal),
    enabled,
    retry: false,
    refetchInterval: 15000,
  });
  const weaknessSummary = useQuery({
    queryKey: ['weakness-summary', courseId],
    queryFn: () => bankRequest<WeaknessSummary>(`/bank/courses/${courseId}/weakness/summary`),
    enabled: !global && !!courseId,
    retry: false,
    refetchInterval: 15000,
  });
  const cards = useQuery({
    queryKey: [...prefix, 'cards', { courseId, q: search, reviewState, page }],
    queryFn: ({ signal }) =>
      api.cards(
        { courseId, q: search || undefined, reviewState: reviewState || undefined, page, size: 20 },
        signal,
      ),
    enabled,
    retry: false,
  });
  const tasks = useQuery({
    queryKey: [...prefix, 'tasks', courseId],
    queryFn: ({ signal }) => api.tasks(courseId, signal),
    enabled,
    retry: false,
    refetchInterval: (query) => (query.state.data?.some(active) ? 4000 : 15000),
  });
  const previousTasks = useRef<Record<string, string> | null>(null);
  useEffect(() => {
    if (!tasks.data) return;
    const next = Object.fromEntries(
      tasks.data.map((task) => [task.id, `${task.state}:${task.updatedAt}`]),
    );
    const previous = previousTasks.current;
    if (previous && tasks.data.some((task) => previous[task.id] !== next[task.id])) {
      void client.invalidateQueries({ queryKey: [...prefix, 'cards'] });
      void client.invalidateQueries({ queryKey: [...prefix, 'overview'] });
      void client.invalidateQueries({ queryKey: [...prefix, 'card'] });
    }
    previousTasks.current = next;
  }, [tasks.data, client, userKey]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    setSelected('');
    setPage(1);
    previousTasks.current = null;
  }, [courseId]);
  async function action(run: () => Promise<string>) {
    setBusy(true);
    setActionError('');
    setActionResult('');
    try {
      setActionResult(await run());
      await client.invalidateQueries({ queryKey: prefix });
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const pendingTasks = tasks.data?.filter(active).length ?? 0;
  const metrics = overview.data?.stats;
  return (
    <section className="ka-workspace">
      <header className="ka-heading">
        <div>
          <p className="eyebrow">从做过的题，找到下一步</p>
          <h1>知识点梳理</h1>
          <p className="secondary">
            {global
              ? '汇总各课程的薄弱知识点，把每一次失分变成清晰的复习线索。'
              : `${course?.name ?? '本课程'}的错题、遗漏与薄弱点，连同原始证据一起回看。`}
          </p>
        </div>
        <div className="ka-heading-actions">
          {!global && course?.capabilities.knowledge && (
            <Link to={`/study/course/${course.code}/reference`}>
              参考知识 <BookOpen size={16} />
            </Link>
          )}
          <Button
            variant="secondary"
            disabled={busy || !enabled}
            onClick={() =>
              void action(async () => {
                const result = await api.sync(courseId ?? null);
                return `历史同步完成：新排队 ${result.queued} 项，未变化 ${result.unchanged} 项，跳过 ${result.skipped} 项。未变化或跳过不代表没有错误。`;
              })
            }
          >
            <RefreshCw size={16} />
            {busy ? '正在处理…' : '同步历史记录'}
          </Button>
        </div>
      </header>
      <p className="ka-worker" role="status">
        <span className={overview.data?.workerOnline ? 'is-online' : ''} />
        {overview.isPending
          ? '正在检查分析工作程序…'
          : overview.isError
            ? '分析工作程序状态未知'
            : overview.data?.workerOnline
              ? '分析工作程序在线'
              : '分析工作程序暂未在线'}
        {overview.data?.workerReason && ` · ${overview.data.workerReason}`}
        {pendingTasks > 0 && ` · ${pendingTasks} 项正在排队或分析`}
      </p>
      {actionError && (
        <p role="alert" className="ka-notice ka-error">
          操作未完成：{actionError}。已加载内容和草稿不受影响，可重试。
        </p>
      )}
      {actionResult && (
        <p role="status" className="ka-notice">
          {actionResult}
        </p>
      )}
      {overview.isError && (
        <Failure
          title="梳理概况读取失败"
          error={overview.error}
          retry={() => void overview.refetch()}
        />
      )}
      {!global && weaknessSummary.data?.available && (
        <WeaknessSummaryCard data={weaknessSummary.data} courseCode={course?.code ?? ''} />
      )}
      <div className="ka-metrics">
        {[
          [Target, '知识点', metrics?.total],
          [FileSearch, '待复习', metrics?.pending],
          [Repeat2, '反复出现', metrics?.repeated],
          [CheckCheck, '已复习', metrics?.reviewed],
        ].map(([Icon, name, value]) => {
          const Symbol = Icon as typeof Target;
          return (
            <article key={String(name)}>
              <Symbol size={19} />
              <span>{String(name)}</span>
              <strong>{value === undefined ? '—' : String(value)}</strong>
            </article>
          );
        })}
      </div>
      <div className="ka-filters">
        <label>
          搜索知识点
          <input
            aria-label="搜索知识点"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索知识点或错误线索"
          />
        </label>
        {global && (
          <label>
            课程
            <select
              aria-label="分析课程"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
            >
              <option value="">全部课程</option>
              {overview.data?.courses.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          复习状态
          <select
            aria-label="筛选复习状态"
            value={reviewState}
            onChange={(e) => {
              setReviewState(e.target.value as ReviewState | '');
              setPage(1);
            }}
          >
            <option value="">全部状态</option>
            {Object.entries(reviewNames).map(([value, name]) => (
              <option value={value} key={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!enabled ? (
        <p role="status">正在确认课程信息…</p>
      ) : cards.isPending ? (
        <div className="ka-state" role="status">
          正在整理知识点…
        </div>
      ) : cards.isError ? (
        <Failure
          title="知识点列表读取失败"
          error={cards.error}
          retry={() => void cards.refetch()}
        />
      ) : cards.data.items.length === 0 ? (
        <div className="ka-state">
          <FileSearch size={34} />
          <h2>
            {search || reviewState
              ? '没有符合筛选条件的知识点'
              : pendingTasks
                ? '知识点正在整理中'
                : '当前暂无可展示的知识点'}
          </h2>
          <p>
            {search || reviewState
              ? '试试其他关键词，或切换复习状态。'
              : pendingTasks
                ? '原始记录已进入分析流程，完成后会自动显示。'
                : '这不代表没有错误，也不代表没有批改记录。可同步历史记录，检查下方任务状态。'}
          </p>
        </div>
      ) : (
        <div className={`ka-columns ${selected ? 'has-detail' : ''}`}>
          <section className="ka-list" aria-label="知识点列表">
            <div className="ka-list-count">共 {cards.data.total} 个知识点</div>
            {cards.data.items.map((card) => (
              <SummaryCard
                key={card.id}
                card={card}
                selected={selected === card.id}
                onClick={() => setSelected(card.id)}
              />
            ))}
            <nav className="ka-pagination" aria-label="知识点分页">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                上一页
              </Button>
              <span>第 {page} 页</span>
              <Button
                variant="secondary"
                disabled={page * cards.data.size >= cards.data.total}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </nav>
          </section>
          {selected ? (
            <div>
              <Button variant="ghost" onClick={() => setSelected('')}>
                收起详情
              </Button>
              <Detail key={`${userKey}:${selected}`} id={selected} userKey={userKey} />
            </div>
          ) : (
            <div className="ka-detail-placeholder">
              <BookOpen size={30} />
              <h2>从一个知识点开始</h2>
              <p>选择左侧卡片，回看原始批改、整理方法，再留下自己的复习笔记。</p>
            </div>
          )}
        </div>
      )}
      {selected && (!cards.data?.items.length || cards.isError) && (
        <div>
          <Button variant="ghost" onClick={() => setSelected('')}>
            收起详情
          </Button>
          <Detail key={`${userKey}:${selected}`} id={selected} userKey={userKey} />
        </div>
      )}
      <section className="ka-tasks">
        <header className="ka-toolbar">
          <div>
            <h2>分析任务与历史</h2>
            <p className="secondary">最近 50 项 · 排队、失败或过期都不等于没有错误。</p>
          </div>
          <Button variant="ghost" onClick={() => void tasks.refetch()} disabled={tasks.isFetching}>
            刷新任务
          </Button>
        </header>
        {tasks.isPending ? (
          <p role="status">正在读取任务…</p>
        ) : tasks.isError ? (
          <Failure
            title="任务记录读取失败"
            error={tasks.error}
            retry={() => void tasks.refetch()}
          />
        ) : tasks.data.length === 0 ? (
          <p className="secondary">暂无分析任务。可同步历史记录，将已有批改纳入梳理。</p>
        ) : (
          <ul>
            {tasks.data.map((task) => (
              <li key={task.id}>
                <div>
                  <strong data-state={task.state}>{stateNames[task.state]}</strong>
                  <span className="secondary">
                    {overview.data?.courses.find((item) => item.id === task.courseId)?.name ??
                      '本课程'}{' '}
                    · {date(task.updatedAt)}
                  </span>
                  {task.error && <p className="ka-error">{task.error}</p>}
                </div>
                <div className="ka-task-actions">
                  {task.cardId && (
                    <Button variant="ghost" onClick={() => setSelected(task.cardId!)}>
                      查看知识点
                    </Button>
                  )}
                  {task.state === 'STALE' && (
                    <span className="secondary">来源已更新，请同步历史记录</span>
                  )}
                  {task.state === 'FAILED' && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          await api.retry(task.id);
                          return '任务已重新提交，请留意分析状态。';
                        })
                      }
                    >
                      重试分析
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
