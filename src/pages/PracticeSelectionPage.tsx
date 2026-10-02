import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle2, ChevronLeft, RotateCcw } from 'lucide-react';
import {
  useApplyChapterAssessment,
  useAssessmentCycles,
  usePracticeCourse,
  usePracticeOverview,
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
      <p className="selection-status status-warning">
        <AlertCircle size={16} aria-hidden="true" />
        {chapter.stats.blockReasons.join('；')}
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
      {chapter.stats.canApplyChapterAssessment === false ? '检测未开放' : '检测开放状态暂未提供'}
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
  const navigate = useNavigate();
  async function submit() {
    if (!cycleId || submitting.current) return;
    submitting.current = true;
    // 相同申请重试保留幂等键，防止网络失败后重复创建检测。
    if (key.current?.cycleId !== cycleId) key.current = { cycleId, value: crypto.randomUUID() };
    try {
      const session = await mutation.mutateAsync({
        body: { kind: 'CHAPTER', chapterId: chapter.chapterId },
        params: { cycleId },
        key: key.current!.value,
      });
      navigate(
        `/zikao/course/${encodeURIComponent(code)}/tests/${encodeURIComponent(session.id)}?cycleId=${encodeURIComponent(cycleId)}`,
      );
    } catch {
      /* Button 展示后端错误，可用同一幂等键重试。 */
    } finally {
      submitting.current = false;
    }
  }
  return (
    <Modal open title={`申请检测：${chapter.title}`} onClose={onClose}>
      <div className="selection-modal-body">
        <p>请选择考试周期，检测资格与组卷结果由系统确认。</p>
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
      <h2 id="wrong-title">错题重做 · 共 {questions.data.total} 题</h2>
      <ul className="selection-questions">
        {questions.data.items.map((question) => (
          <li key={question.id}>
            <Card className="selection-question">
              <p className="question-text">
                <MathText text={question.stem} />
              </p>
              <Link
                className="button button-secondary"
                to={`/zikao/course/${encodeURIComponent(code)}/practice/${encodeURIComponent(question.chapterId)}?filter=WRONG&questionId=${encodeURIComponent(question.id)}&cycleId=${encodeURIComponent(search.get('cycleId') || '')}`}
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
function Selection({ overview, code }: { overview: PracticeOverview; code: string }) {
  const [search, setSearch] = useSearchParams();
  const mode = search.get('mode') === 'VARIANT' ? 'VARIANT' : 'CHAPTER';
  const wrong = search.get('filter') === 'WRONG';
  const [assessmentChapter, setAssessmentChapter] = useState<PracticeChapter | null>(null);
  const navigate = useNavigate();
  const base = `/zikao/course/${encodeURIComponent(code)}/practice`;
  const cycleQuery = search.get('cycleId')
    ? `?cycleId=${encodeURIComponent(search.get('cycleId')!)}`
    : '';
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
            <dt>检测进度</dt>
            <dd>
              {overview.stats.answeredOriginalCount}{' '}
              <small>/ {overview.stats.availableOriginalCount}</small>
            </dd>
          </div>
          <div>
            <dt>正确率</dt>
            <dd>{overview.stats.practiceAccuracy}%</dd>
          </div>
          <div>
            <dt>错题数</dt>
            <dd>{overview.stats.latestWrongCount}</dd>
          </div>
        </dl>
        <Button
          variant="secondary"
          disabled={overview.stats.latestWrongCount === 0}
          disabledReason="暂无错题"
          onClick={() => chooseMode('CHAPTER', 'WRONG')}
        >
          <RotateCcw size={20} aria-hidden="true" />
          错题重做
        </Button>
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
            <h2>真题变种</h2>
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
          <h2 id="chapters-title">选择章节</h2>
          <ol className="selection-chapters">
            {overview.chapters.map((chapter, index) => (
              <li key={chapter.chapterId}>
                <Card>
                  <div className="selection-chapter-main">
                    <span className="selection-number" aria-label={`第 ${index + 1} 章`}>
                      {index + 1}
                    </span>
                    <div className="selection-chapter-content">
                      <h3>{chapter.title}</h3>
                      {chapter.stats.availableOriginalCount > 0 && (
                        <progress
                          className="selection-progress"
                          aria-label={`${chapter.title}题目进度`}
                          max={chapter.stats.availableOriginalCount}
                          value={chapter.stats.answeredOriginalCount}
                          aria-valuemin={0}
                          aria-valuemax={chapter.stats.availableOriginalCount}
                          aria-valuenow={chapter.stats.answeredOriginalCount}
                          aria-valuetext={`已答 ${chapter.stats.answeredOriginalCount} / ${chapter.stats.availableOriginalCount} 题`}
                        />
                      )}
                      <p className="selection-count secondary">
                        已答原创题 {chapter.stats.answeredOriginalCount} /{' '}
                        {chapter.stats.availableOriginalCount} 题
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(`${base}/${encodeURIComponent(chapter.chapterId)}${cycleQuery}`)
                      }
                    >
                      开始
                    </Button>
                  </div>
                  <div className="selection-chapter-footer">
                    <DetectionStatus
                      chapter={chapter}
                      onApply={() => setAssessmentChapter(chapter)}
                    />
                  </div>
                </Card>
              </li>
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
          <h1>
            <BookOpen size={28} aria-hidden="true" /> 章节刷题
          </h1>
          {course.data && <p className="secondary">{course.data.name}</p>}
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
