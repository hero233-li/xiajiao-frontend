import { createUuid } from '../utils/uuid';
import { useRef, useState } from 'react';
import { useParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { cycleKey, useCycle } from '../features/cycle/CycleContext';
import { Link, useNavigate, useSearchParams } from '../features/cycle/navigation';
import { AlertCircle, BookOpen, CheckCircle2, ChevronLeft, RotateCcw } from 'lucide-react';
import {
  useApplyChapterAssessment,
  useAssessmentCycles,
  usePracticeCourse,
  usePracticeOverview,
  usePracticeCounts,
  useWrongQuestions,
} from '../api/practice-selection';
import type { PracticeChapter, PracticeOverview } from '../api/generated/models';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MathText } from '../components/MathText';
import { Modal } from '../components/Modal';
import '../features/practice/selection.css';

function Loading({ label }: { label: string }) {
  return (
    <Card state="loading" message={label}>
      <div style={{ minHeight: 96 }} />
    </Card>
  );
}
function State({
  message,
  action,
  onAction,
  error = false,
  loading = false,
}: {
  message: string;
  action: string;
  onAction: () => void;
  error?: boolean;
  loading?: boolean;
}) {
  return (
    <Card
      className="selection-state"
      state={error ? 'error' : 'default'}
      message={error ? message : undefined}
    >
      {!error && <p>{message}</p>}
      <Button variant="secondary" onClick={onAction} loading={loading} loadingLabel="正在重新加载">
        {action}
      </Button>
    </Card>
  );
}
function ChooseCycle({ onChoose }: { onChoose: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const cycles = useAssessmentCycles(page);
  if (cycles.isPending) return <Loading label="正在加载考试周期" />;
  if (cycles.isError)
    return (
      <State
        error
        message="考试周期加载失败，请重试。"
        action="重新加载"
        onAction={() => void cycles.refetch()}
        loading={cycles.isFetching}
      />
    );
  if (!cycles.data.items.length)
    return (
      <State
        message="暂无可选考试周期。"
        action="重新加载"
        onAction={() => void cycles.refetch()}
        loading={cycles.isFetching}
      />
    );
  return (
    <Card className="selection-cycle-picker">
      <p>请选择考试周期以加载课程。</p>
      <label htmlFor="selection-cycle">考试周期</label>
      <select id="selection-cycle" value="" onChange={(event) => onChoose(event.target.value)}>
        <option value="">请选择考试周期</option>
        {cycles.data.items.map((cycle) => (
          <option key={cycle.id} value={cycle.id}>
            {cycle.name}
          </option>
        ))}
      </select>
      <div className="selection-pagination">
        <Button
          variant="secondary"
          disabled={page === 1}
          disabledReason="已是第一页"
          onClick={() => setPage(page - 1)}
        >
          上一页
        </Button>
        <span>第 {cycles.data.page} 页</span>
        <Button
          variant="secondary"
          disabled={cycles.data.page * cycles.data.size >= cycles.data.total}
          disabledReason="已是最后一页"
          onClick={() => setPage(page + 1)}
        >
          下一页
        </Button>
      </div>
    </Card>
  );
}
function DetectionStatus({ chapter, onApply }: { chapter: PracticeChapter; onApply: () => void }) {
  // 门槛、阻塞原因和通过状态均由后端决定，绝不由题数推断资格。
  if (chapter.passed)
    return (
      <p className="selection-status status-success">
        <CheckCircle2 size={16} aria-hidden="true" />
        已通过
      </p>
    );
  if (chapter.stats.blockReasons.length)
    return (
      <p className="selection-status secondary">
        <AlertCircle size={16} aria-hidden="true" />
        {chapter.stats.blockReasons.some((reason) => reason.includes('不参与检测'))
          ? '不参与检测'
          : chapter.stats.blockReasons.length === 1
            ? chapter.stats.blockReasons[0]
            : '暂不可申请检测 · 展开查看条件'}
      </p>
    );
  if (chapter.stats.canApplyChapterAssessment === true)
    return (
      <Button variant="secondary" onClick={onApply}>
        可申请检测
      </Button>
    );
  return (
    <p className="selection-status status-warning">
      {chapter.stats.canApplyChapterAssessment === false ? '检测未开放' : '该功能准备中'}
    </p>
  );
}
function AssessmentDialog({
  chapter,
  courseId,
  code,
  onClose,
}: {
  chapter: PracticeChapter;
  courseId: string;
  code: string;
  onClose: () => void;
}) {
  const [search] = useSearchParams();
  const [page, setPage] = useState(1);
  const [cycleId, setCycleId] = useState(search.get('cycleId') || '');
  const cycles = useAssessmentCycles(page);
  const mutation = useApplyChapterAssessment(courseId);
  const key = useRef<{ cycleId: string; value: string }>();
  const submitting = useRef(false);
  const navigate = useRouterNavigate();
  const cycleContext = useCycle();
  async function submit() {
    if (!cycleId || submitting.current) return;
    submitting.current = true;
    // 相同申请重试保留幂等键，防止网络失败后重复创建检测。
    if (key.current?.cycleId !== cycleId) key.current = { cycleId, value: createUuid() };
    try {
      const session = await mutation.mutateAsync({
        body: { kind: 'CHAPTER', chapterId: chapter.chapterId },
        params: { cycleId },
        key: key.current!.value,
      });
      const selectedCycle =
        cycles.data?.items.find((item) => item.id === cycleId) ??
        cycleContext?.cycles.find((item) => item.id === cycleId);
      const cycleSearch =
        selectedCycle && cycleId !== cycleContext?.defaultId
          ? `?cycle=${cycleKey(selectedCycle)}`
          : '';
      navigate(
        `/zikao/course/${encodeURIComponent(code)}/tests/${encodeURIComponent(session.id)}${cycleSearch}`,
      );
    } catch {
      /* Button 展示后端错误，可用同一幂等键重试。 */
    } finally {
      submitting.current = false;
    }
  }
  return (
    <Modal
      open
      title={`申请检测：${chapter.title}`}
      onClose={() => {
        if (!submitting.current && !mutation.isPending) onClose();
      }}
    >
      <div className="selection-modal-body">
        <p>
          课程：{code} · 章节：{chapter.title}
        </p>
        <p>请选择考试周期。系统会重新核对该周期的检测资格，审核与作答门槛均以系统结果为准。</p>
        <p className="secondary">
          {chapter.stats.gateThreshold == null
            ? '检测门槛由系统确认。'
            : `当前章节门槛：已答有效原创题至少 ${chapter.stats.gateThreshold} 道。`}{' '}
          题数、时限及通过标准将在检测中显示。
        </p>
        {mutation.isPending && <p role="status">正在创建检测，请稍候。</p>}
        {cycles.isPending ? (
          <Loading label="正在加载考试周期" />
        ) : cycles.isError ? (
          <State
            error
            message="考试周期加载失败，请重试。"
            action="重新加载"
            onAction={() => void cycles.refetch()}
            loading={cycles.isFetching}
          />
        ) : cycles.data.items.length === 0 ? (
          <State
            message="暂无可选考试周期。"
            action="重新加载"
            onAction={() => void cycles.refetch()}
            loading={cycles.isFetching}
          />
        ) : (
          <>
            <label htmlFor="practice-cycle">考试周期</label>
            <select
              id="practice-cycle"
              value={cycleId}
              disabled={mutation.isPending}
              onChange={(event) => {
                setCycleId(event.target.value);
                mutation.reset();
              }}
            >
              <option value="">请选择考试周期</option>
              {cycleId && !cycles.data.items.some((cycle) => cycle.id === cycleId) && (
                <option value={cycleId}>已选择的考试周期</option>
              )}
              {cycles.data.items.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          </>
        )}
        {cycles.data && (
          <div className="selection-pagination">
            <Button
              variant="ghost"
              disabled={page === 1 || mutation.isPending}
              disabledReason={mutation.isPending ? '正在申请检测' : '已是第一页'}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <span>第 {cycles.data.page} 页</span>
            <Button
              variant="ghost"
              disabled={
                cycles.data.page * cycles.data.size >= cycles.data.total || mutation.isPending
              }
              disabledReason={mutation.isPending ? '正在申请检测' : '已是最后一页'}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        )}
        <Button
          variant="secondary"
          onClick={() => void submit()}
          disabled={!cycleId || !cycles.data?.items.length || cycles.isError}
          disabledReason="请选择可用的考试周期"
          loading={mutation.isPending}
          loadingLabel="正在申请检测"
          error={mutation.error instanceof Error ? mutation.error.message : undefined}
        >
          申请检测
        </Button>
      </div>
    </Modal>
  );
}
function WrongSelection({
  courseId,
  code,
  onBack,
}: {
  courseId: string;
  code: string;
  onBack: () => void;
}) {
  const [search, setSearch] = useSearchParams();
  const rawPage = Number(search.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const questions = useWrongQuestions(courseId, page);
  function changePage(next: number) {
    const params = new URLSearchParams(search);
    params.set('page', String(next));
    setSearch(params);
  }
  if (questions.isPending) return <Loading label="正在加载错题" />;
  if (questions.isError)
    return (
      <State
        error
        message="错题加载失败，请重试。"
        action="重新加载"
        onAction={() => void questions.refetch()}
        loading={questions.isFetching}
      />
    );
  if (questions.data.items.length === 0)
    return <State message="当前没有可重做的错题。" action="返回章节刷题" onAction={onBack} />;
  return (
    <section className="stack" aria-labelledby="wrong-title">
      <h3 id="wrong-title">错题重做 · 共 {questions.data.total} 题</h3>
      <ul className="selection-questions">
        {questions.data.items.map((question) => (
          <li key={question.id}>
            <Card className="selection-question">
              <p className="question-text">
                <MathText text={question.stem} />
              </p>
              <Link
                className="button button-secondary"
                to={`/zikao/course/${encodeURIComponent(code)}/practice/${encodeURIComponent(question.chapterId)}?filter=WRONG&questionId=${encodeURIComponent(question.id)}`}
              >
                重做此题
              </Link>
            </Card>
          </li>
        ))}
      </ul>
      <div className="selection-pagination">
        <Button
          variant="secondary"
          disabled={page === 1}
          disabledReason="已是第一页"
          onClick={() => changePage(page - 1)}
        >
          上一页
        </Button>
        <span>第 {questions.data.page} 页</span>
        <Button
          variant="secondary"
          disabled={questions.data.page * questions.data.size >= questions.data.total}
          disabledReason="已是最后一页"
          onClick={() => changePage(page + 1)}
        >
          下一页
        </Button>
      </div>
    </section>
  );
}
function PracticeCounts({
  courseId,
  chapterId,
  title,
}: {
  courseId: string;
  chapterId?: string;
  title?: string;
}) {
  const counts = usePracticeCounts(courseId, chapterId);
  if (counts.isPending)
    return (
      <p className="selection-count secondary" role="status">
        正在读取可练习题数…
      </p>
    );
  if (counts.isError)
    return (
      <div className="selection-count-error">
        <p className="secondary">可练习题数暂时无法读取。</p>
        <Button variant="ghost" loading={counts.isFetching} onClick={() => void counts.refetch()}>
          重试题数
        </Button>
      </div>
    );
  return (
    <div className="selection-counts">
      <p className="selection-count">
        可练习 {counts.data.total} 题 · 已答 {counts.data.answered} 题
      </p>
      {title && counts.data.total > 0 && (
        <progress
          className="selection-progress"
          aria-label={`${title}练习进度`}
          max={counts.data.total}
          value={counts.data.answered}
          aria-valuenow={counts.data.answered}
          aria-valuetext={`已答 ${counts.data.answered} / ${counts.data.total} 题`}
        />
      )}
    </div>
  );
}
function ChapterRow({
  chapter,
  index,
  courseId,
  onStart,
  onApply,
}: {
  chapter: PracticeChapter;
  index: number;
  courseId: string;
  onStart: () => void;
  onApply: () => void;
}) {
  const nonparticipant = chapter.stats.blockReasons.some((reason) => reason.includes('不参与检测'));
  const counts = usePracticeCounts(courseId, chapter.chapterId);
  return (
    <li className="selection-chapter" id={`practice-chapter-${chapter.chapterId}`}>
      <div className="selection-chapter-main">
        <span className="selection-number" aria-label={`第 ${index + 1} 章`}>
          {index + 1}
        </span>
        <div className="selection-chapter-content">
          <h4>{chapter.title}</h4>
          <PracticeCounts courseId={courseId} chapterId={chapter.chapterId} title={chapter.title} />
        </div>
        <Button
          variant="primary"
          disabled={counts.data?.total === 0}
          disabledReason="当前章节暂无可练习题目"
          onClick={onStart}
        >
          开始练习
        </Button>
      </div>
      <div className="selection-chapter-footer">
        <div className="selection-detection">
          <span className="secondary">章节检测</span>
          <DetectionStatus chapter={chapter} onApply={onApply} />
        </div>
        <details className="selection-rules">
          <summary>查看检测条件</summary>
          {!nonparticipant && (
            <p>
              有效原创题 {chapter.stats.availableOriginalCount} 道 · 已答{' '}
              {chapter.stats.answeredOriginalCount} 道
              {chapter.stats.gateThreshold == null
                ? ''
                : ` · 作答门槛 ${chapter.stats.gateThreshold} 道`}
            </p>
          )}
          {chapter.stats.blockReasons.length > 0 ? (
            <ul>
              {chapter.stats.blockReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p>申请时将再次核对所选周期的资格和组卷条件。</p>
          )}
          <p className="secondary">可练习题数包含不计入检测的题目，题数多不代表已满足检测条件。</p>
        </details>
      </div>
    </li>
  );
}
function Selection({ overview, code }: { overview: PracticeOverview; code: string }) {
  const [search, setSearch] = useSearchParams();
  const mode = search.get('mode') === 'VARIANT' ? 'VARIANT' : 'CHAPTER';
  const wrong = search.get('filter') === 'WRONG';
  const [assessmentChapter, setAssessmentChapter] = useState<PracticeChapter | null>(null);
  const navigate = useNavigate();
  const base = `/zikao/course/${encodeURIComponent(code)}/practice`;
  const cycleQuery = '';
  function chooseMode(next: 'CHAPTER' | 'VARIANT', filter?: 'WRONG') {
    const params = new URLSearchParams(search);
    params.set('mode', next);
    params.delete('page');
    if (filter) params.set('filter', filter);
    else params.delete('filter');
    setSearch(params);
  }
  return (
    <>
      <Card className="selection-summary">
        <dl className="selection-stats" aria-label="刷题统计">
          <div>
            <dt>章节题库</dt>
            <dd>
              <PracticeCounts courseId={overview.courseId} />
            </dd>
          </div>
          <div>
            <dt>正式练习正确率</dt>
            <dd>
              {overview.stats.practiceAttemptCount === 0
                ? '暂无作答样本'
                : `${overview.stats.practiceAccuracy}%`}
              <p className="secondary selection-count">
                {overview.stats.practiceAttemptCount > 0
                  ? `答对 ${overview.stats.practiceCorrectCount} / ${overview.stats.practiceAttemptCount} 次提交`
                  : '完成正式练习后显示正确率'}
                <br />
                全部周期 · 含真题变种
              </p>
            </dd>
          </div>
          <div>
            <dt>当前错题</dt>
            <dd>
              {overview.stats.latestWrongCount} <small>题</small>
              <p className="secondary selection-count">按每题最新作答计算</p>
            </dd>
          </div>
        </dl>
        <details className="selection-rules selection-stat-rules">
          <summary>统计口径与检测规则</summary>
          <p>
            题数与已答进度按当前发布的章节题库计算，已答题目按跨周期的正式练习作答去重，不包含检测作答；真题变种单独显示。
          </p>
          <p>
            正确率按本课程所有周期的正式练习提交计算，包含章节题、真题变种及历史题库，每次提交计一次；不包含检测作答。当前错题按当前发布题库中每题最新的有效练习提交计算。
          </p>
          <p>
            检测仅计算当前发布且审核合格的有效原创题：全课程 {overview.stats.availableOriginalCount}{' '}
            道，已答 {overview.stats.answeredOriginalCount}{' '}
            道。已答原创题跨周期去重，包含正式练习、已结束检测与已确认的历史记录。
          </p>
          <p>
            检测资格以系统返回的条件为准，不参与检测的章节只提供练习。当前可申请{' '}
            {
              overview.chapters.filter(
                (chapter) =>
                  !chapter.passed &&
                  chapter.stats.canApplyChapterAssessment === true &&
                  chapter.stats.blockReasons.length === 0,
              ).length
            }{' '}
            章。
          </p>
        </details>
      </Card>
      <div className="selection-modes" role="group" aria-label="刷题模式">
        <Button
          variant="secondary"
          className="selection-mode"
          aria-pressed={mode === 'CHAPTER' && !wrong}
          onClick={() => chooseMode('CHAPTER')}
        >
          章节刷题
        </Button>
        <Button
          variant="secondary"
          className="selection-mode"
          aria-pressed={mode === 'VARIANT' && !wrong}
          onClick={() => chooseMode('VARIANT')}
        >
          真题变种
        </Button>
        <Button
          variant="secondary"
          className="selection-mode"
          aria-pressed={wrong}
          disabled={overview.stats.latestWrongCount === 0}
          disabledReason="暂无错题"
          onClick={() => chooseMode('CHAPTER', 'WRONG')}
        >
          <RotateCcw size={18} aria-hidden="true" />
          错题重做
        </Button>
      </div>
      {wrong ? (
        <WrongSelection
          courseId={overview.courseId}
          code={code}
          onBack={() => chooseMode('CHAPTER')}
        />
      ) : mode === 'VARIANT' ? (
        overview.variantQuestionCount === 0 ? (
          <State
            message="当前暂无真题变种。"
            action="返回章节刷题"
            onAction={() => chooseMode('CHAPTER')}
          />
        ) : (
          <Card className="selection-variant">
            <h3>真题变种</h3>
            <p>共 {overview.variantQuestionCount} 题，直接开始练习。</p>
            <Button variant="secondary" onClick={() => navigate(`${base}/variant${cycleQuery}`)}>
              开始真题变种
            </Button>
          </Card>
        )
      ) : overview.chapters.length === 0 ? (
        <State
          message="当前课程暂无已发布的刷题章节。"
          action="查看我的科目"
          onAction={() => navigate('/zikao/courses')}
        />
      ) : (
        <section className="stack" aria-labelledby="chapters-title">
          <h3 id="chapters-title">选择章节</h3>
          <ol className="selection-chapters">
            {overview.chapters.map((chapter, index) => (
              <ChapterRow
                key={chapter.chapterId}
                chapter={chapter}
                index={index}
                courseId={overview.courseId}
                onStart={() => navigate(`${base}/${encodeURIComponent(chapter.chapterId)}`)}
                onApply={() => setAssessmentChapter(chapter)}
              />
            ))}
          </ol>
        </section>
      )}
      {assessmentChapter && (
        <AssessmentDialog
          chapter={assessmentChapter}
          courseId={overview.courseId}
          code={code}
          onClose={() => setAssessmentChapter(null)}
        />
      )}
    </>
  );
}
export function PracticeSelectionPage() {
  const { code = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const cycleId = search.get('cycleId') || '';
  const course = usePracticeCourse(code, cycleId);
  const overview = usePracticeOverview(course.data?.id);
  return (
    <div className="selection-page">
      <header className="selection-heading">
        <div>
          <h2>
            <BookOpen size={28} aria-hidden="true" /> 章节刷题
          </h2>
        </div>
        <Link className="button button-ghost" to="/zikao/courses">
          <ChevronLeft size={20} aria-hidden="true" />
          我的科目
        </Link>
      </header>
      {!cycleId ? (
        <ChooseCycle
          onChoose={(id) => {
            if (id) {
              const params = new URLSearchParams(search);
              params.set('cycleId', id);
              setSearch(params);
            }
          }}
        />
      ) : course.isPending ? (
        <Loading label="正在加载课程" />
      ) : course.isError ? (
        <State
          error
          message="课程加载失败，请重试。"
          action="重新加载"
          onAction={() => void course.refetch()}
          loading={course.isFetching}
        />
      ) : overview.isPending ? (
        <Loading label="正在加载刷题统计与章节" />
      ) : overview.isError ? (
        <State
          error
          message="刷题统计与章节加载失败，请重试。"
          action="重新加载"
          onAction={() => void overview.refetch()}
          loading={overview.isFetching}
        />
      ) : (
        <Selection key={overview.data.courseId} overview={overview.data} code={code} />
      )}
    </div>
  );
}
export const Component = PracticeSelectionPage;
