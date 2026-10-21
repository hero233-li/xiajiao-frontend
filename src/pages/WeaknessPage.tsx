import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  bankRequest,
  type WeaknessPlan,
  type WeaknessQuestion,
} from '../api/bank';
import { useCourse } from '../features/course/CourseContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MathText } from '../components/MathText';
import { SmartMathText } from '../components/SmartMathText';
import { QuestionStem } from '../features/bank/QuestionStem';
import { Link } from '../features/cycle/navigation';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  RefreshCw,
  Trash2,
  Upload,
  Target,
  Sparkles,
} from 'lucide-react';
import { QuestionCard } from '../features/bank/weakness/QuestionCard';
import { answerText, referenceText, isWeaknessCorrect } from '../features/bank/weakness/answers';
import { WorkedAnswer, methodSteps, StrongLevel, isVectorCrossExample } from '../features/bank/weakness/presentation';
import '../features/bank/weakness.css';
import { GenerationProgress, GradingProgress } from '../features/bank/GenerationProgress';

const levels = [
  { key: 'simple', label: '基础', hint: '先把概念和公式用对' },
  { key: 'middle', label: '进阶', hint: '把方法串成完整步骤' },
  { key: 'hard', label: '提高', hint: '综合条件与边界' },
] as const;

export function Component() {
  const { code = '' } = useParams();
  const [search] = useSearchParams();
  const course = useCourse();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [drillFilter, setDrillFilter] = useState<'all' | 'remaining' | 'correct'>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [detectionNotice, setDetectionNotice] = useState('');
  const [expandAll, setExpandAll] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(true);
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [generationBusy, setGenerationBusy] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [sheetNotice, setSheetNotice] = useState('');
  const [sheetPreview, setSheetPreview] = useState('');
  const [reviewBusy, setReviewBusy] = useState<string | null>(null);
  const sessionId = search.get('sessionId') ?? '';
  const query = useQuery({
    queryKey: ['weakness-plan', course?.id, sessionId],
    enabled: !!course?.id,
    retry: false,
    queryFn: () =>
      bankRequest<WeaknessPlan>(`/bank/courses/${course!.id}/weakness/plans`, 'POST', {
        ...(sessionId ? { sessionId } : {}),
      }),
  });
  const update = useCallback((plan: WeaknessPlan) => {
    client.setQueryData(['weakness-plan', course?.id, sessionId], plan);
  }, [client, course?.id, sessionId]);
  async function toggleReviewed(question: WeaknessQuestion) {
    setReviewBusy(question.id);
    setError('');
    try {
      update(
        await bankRequest<WeaknessPlan>(
          `/bank/weakness/plans/${query.data?.id}/analysis/${question.id}/reviewed`,
          'PUT',
          { reviewed: !question.reviewed },
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '复习进度保存失败');
    } finally {
      setReviewBusy(null);
    }
  }
  useEffect(() => {
    const plan = query.data;
    if (!plan || (!['QUEUED', 'GRADING'].includes(plan.taskState ?? '') && !['QUEUED', 'GRADING'].includes(plan.generationState ?? ''))) return;
    const timer = window.setInterval(async () => {
      try {
        update(await bankRequest<WeaknessPlan>(`/bank/weakness/plans/${plan.id}`));
      } catch {
        /* Keep the last known state; the next poll retries. */
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [query.data, update]);
  async function generateDrill() {
    setGenerationBusy(true);
    setSheetError('');
    setSheetNotice('');
    try {
      update(await bankRequest<WeaknessPlan>(`/bank/weakness/plans/${plan.id}/drill-generation`, 'POST', { expectedRevision: plan.revision }));
      setSheetPreview('');
      setDrillFilter('all');
    } catch (e) {
      setSheetError(e instanceof Error ? e.message : '阶梯题申请失败');
    } finally {
      setGenerationBusy(false);
    }
  }
  async function uploadDrill(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const invalid = selected.find(
      (file) => !['image/jpeg', 'image/png'].includes(file.type) || file.size > 8 * 1024 * 1024,
    );
    if (invalid) {
      setSheetError(`${invalid.name}：请选择不超过 8MB 的 JPG 或 PNG 图片`);
      return;
    }
    setSheetBusy(true);
    setSheetError('');
    setSheetNotice('');
    try {
      let current = plan;
      for (const file of selected) {
        const form = new FormData();
        form.append('file', file);
        form.append('expectedRevision', String(current.revision));
        current = await bankRequest<WeaknessPlan>(
          `/bank/weakness/plans/${plan.id}/sheet-pages`,
          'POST',
          form,
        );
        update(current);
      }
      setSheetNotice(`已上传 ${current.sheetFiles?.length ?? 0} 张照片；确认题号清楚后提交 AI 批改。`);
    } catch (e) {
      setSheetError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setSheetBusy(false);
    }
  }
  async function removeDrillPhoto(file: { id: string; name: string }) {
    if (!(await confirm(`确认移除 ${file.name}？其他已上传照片保留。`))) return;
    setSheetBusy(true);
    setSheetError('');
    try {
      update(
        await bankRequest<WeaknessPlan>(
          `/bank/weakness/plans/${plan.id}/sheet-pages/${file.id}?expectedRevision=${plan.revision}`,
          'DELETE',
        ),
      );
      setSheetPreview('');
    } catch (e) {
      setSheetError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setSheetBusy(false);
    }
  }
  async function showDrillPhoto(file: { id: string }) {
    try {
      const image = await bankRequest<{ mimeType: string; contentBase64: string }>(
        `/bank/weakness/plans/${plan.id}/sheet-pages/${file.id}`,
      );
      setSheetPreview(`data:${image.mimeType};base64,${image.contentBase64}`);
    } catch (e) {
      setSheetError(e instanceof Error ? e.message : '图片读取失败');
    }
  }
  async function applyDrill() {
    if (!canSubmitSheet) {
      setSheetError('请上传新的作答照片后再申请批改');
      return;
    }
    if (
      !(await confirm(
        '确认 10 道题的作答都已写在照片上，并标清 1–10 题号？提交后照片不可修改，AI 会逐题评分。',
      ))
    )
      return;
    setSheetBusy(true);
    setSheetError('');
    setSheetNotice('');
    try {
      update(
        await bankRequest<WeaknessPlan>(`/bank/weakness/plans/${plan.id}/grading`, 'POST', {
          expectedRevision: plan.revision,
        }),
      );
      setSheetNotice('');
    } catch (e) {
      setSheetError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setSheetBusy(false);
    }
  }
  async function startRedo(plan: WeaknessPlan) {
    setBusy(true);
    setError('');
    try {
      update(await bankRequest<WeaknessPlan>(`/bank/weakness/plans/${plan.id}/redo`, 'POST'));
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  }
  async function startDetection(plan: WeaknessPlan) {
    setBusy(true);
    setError('');
    setDetectionNotice('');
    try {
      const result = await bankRequest<{ sessionId?: string; needsNewPaper?: boolean; message?: string }>(
        `/bank/weakness/plans/${plan.id}/detection`,
        'POST',
      );
      if (result.sessionId) {
        navigate(`/study/course/${code}/tests/rebuilt/${result.sessionId}`);
        return;
      }
      setDetectionNotice(result.message || '本章三套已全部交卷，申请新卷功能待接入 DSH 生成服务。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  }
  if (!course) return <p role="status">正在读取课程…</p>;
  if (query.isPending) return <p role="status">正在根据已评分试卷生成弱项练习…</p>;
  if (query.isError) {
    const message = query.error instanceof Error ? query.error.message : '弱项练习生成失败';
    const noPaper = message.includes('还没有已评分');
    return (
      <section className="weakness-empty">
        <Card>
          <Target size={34} />
          <h1>{noPaper ? '还没有可分析的已评分试卷' : '弱项练习暂时无法生成'}</h1>
          <p>
            {noPaper
              ? '先完成一套章节检测或模拟卷，等评分完成后再回来；系统会根据失分题自动提取弱项。'
              : message}
          </p>
          <Link className="button button-primary" to={`/study/course/${code}/practice`}>
            去章节检测与模拟卷
            <ArrowRight size={16} />
          </Link>
        </Card>
      </section>
    );
  }
  const plan = query.data;
  const generationActive = generationBusy || ['QUEUED', 'GRADING'].includes(plan.generationState ?? '');
  const gradingActive = ['QUEUED', 'GRADING'].includes(plan.taskState ?? '');
  const gradedSheet = ['COMPLETED', 'REVIEW'].includes(plan.taskState ?? '');
  const canSubmitSheet = !generationActive && !gradingActive && (plan.canSubmitSheet ?? (!!plan.sheetFiles?.length && !gradedSheet));
  const drillRate = plan.drillTotal ? Math.round((plan.drillCorrect / plan.drillTotal) * 100) : 0;
  const redoRate = plan.redoTotal ? Math.round((plan.redoCorrect / plan.redoTotal) * 100) : 0;
  return (
    <section className="weakness-page">
      <header className="weakness-hero">
        <div>
          <p className="weakness-eyebrow">基于已评分试卷 · 弱项练习</p>
          <h1>先把失分点补上，再重做原卷</h1>
          <p className="weakness-context">
            从「{plan.paperTitle}」中提取失分题，先看一个同类例子，再完成 10
            道由易到难的阶梯题；全部答对后，重做这次做错或留空的题。
          </p>
          <div className="weakness-facts">
            <span>
              原卷得分 <strong>{plan.sourceScore == null ? '—' : Number(plan.sourceScore)}</strong> /{' '}
              {Number(plan.sourceMaximum)}
            </span>
            <span>
              阶梯练习 <strong>{plan.drillCorrect}</strong> / {plan.drillTotal}
            </span>
            <span>
              错题重做 <strong>{plan.redoCorrect}</strong> / {plan.redoTotal}
            </span>
          </div>
        </div>
        <span className={`weakness-status weakness-status-${plan.status.toLowerCase()}`}>
          {plan.status === 'COMPLETED' ? '已完成' : plan.status === 'REDO' ? '可重做原卷错题' : '阶梯练习中'}
        </span>
      </header>
      {error && (
        <div className="weakness-alert" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      <div className="weakness-grid">
        <main className="weakness-main">
          <Card className="weakness-example" id="weakness-example">
            <div
              className="weakness-section-head weakness-collapse-head"
              role="button"
              tabIndex={0}
              aria-expanded={exampleOpen}
              onClick={() => setExampleOpen((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setExampleOpen((value) => !value);
                }
              }}
            >
              <div>
                <p className="weakness-eyebrow">第一步 · 看一个同类例子</p>
                <h2>这道题当时为什么失分</h2>
              </div>
              <div className="weakness-collapse-meta">
                <span>
                  {plan.example.pointTitle} · {plan.example.earned == null ? 0 : Number(plan.example.earned)}/
                  {Number(plan.example.maximum)} 分
                </span>
                {exampleOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </div>
            </div>
            {exampleOpen && (
              <>
            <div className="weakness-example-question">
              <QuestionStem text={plan.example.stem} />
              {!!plan.example.options.length && (
                <ol className="weakness-options-read">
                  {plan.example.options.map((option, index) => (
                    <li key={index}>
                      <span>{String.fromCharCode(65 + index)}.</span>
                      <MathText text={option} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="weakness-example-columns">
              <div>
                <h3>你当时的作答</h3>
                <p>{answerText(plan.example.answer, plan.example.solution, plan.example.recognizedAnswer)}</p>
                <small>
                  {plan.example.unanswered ? '这道题当时留空' : '对照正确解法，找出断在哪一步'}
                </small>
              </div>
              <div>
                <h3>正确解法</h3>
                <SmartMathText text={referenceText(plan.example.solution)} />
              </div>
            </div>
            {plan.example.explanation && (
              <div className="weakness-method">
                <div className="weakness-method-head">
                  <span className="weakness-method-icon">
                    <BookOpen size={18} />
                  </span>
                  <div>
                    <p className="weakness-eyebrow">方法提醒 · 公式展开</p>
                    <h3>把这道题拆成可以照着做的步骤</h3>
                  </div>
                </div>
                <ol className="weakness-step-list">
                  {methodSteps(plan.example).map((step, index) => (
                    <li key={`${step.title}-${index}`}>
                      <span className="weakness-step-no">{index + 1}</span>
                      <div>
                        <strong>{step.title}</strong>
                        {step.body && (
                          <p>
                            <MathText text={step.body} />
                          </p>
                        )}
                        {step.formula && (
                          <div className="weakness-formula">
                            <MathText text={step.formula} />
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {isVectorCrossExample(plan.example) && (
                  <div className="weakness-error-note">
                    <AlertCircle size={17} />
                    <div>
                      <strong>你当时的断点</strong>
                      <p>
                        你写的是
                        <MathText text="$\mathbf a\times\mathbf b=|\mathbf a||\mathbf b|=\sqrt{30}$" />
                        。叉积结果是一个向量，而
                        <MathText text="$|\mathbf a||\mathbf b|$" />
                        是一个数量，两者不能直接相等；面积应等于叉积的模。
                        正确关系是
                        <MathText text="$|\mathbf a\times\mathbf b|=|\mathbf a||\mathbf b|\sin\theta$" />
                        。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </Card>
          {!!plan.analysis?.length && (
            <Card className="weakness-analyses" id="weakness-analysis">
              <div
                className="weakness-section-head weakness-collapse-head"
                role="button"
                tabIndex={0}
                aria-expanded={analysisOpen}
                onClick={() => setAnalysisOpen((value) => !value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setAnalysisOpen((value) => !value);
                  }
                }}
              >
                <div>
                  <p className="weakness-eyebrow">第二步 · 逐题错因分析</p>
                  <h2>每一个错题、空题为什么失分</h2>
                </div>
                <div className="weakness-analysis-tools">
                  <span>{plan.analysis.length} 道</span>
                  <button
                    type="button"
                    className="weakness-expand-all"
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandAll((value) => !value);
                    }}
                  >
                    {expandAll ? '收起全部' : '展开全部'}
                  </button>
                  {analysisOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </div>
              </div>
              {analysisOpen && (
                <>
              <p className="weakness-muted">
                每道题都按“先说思路 → 你当时错在哪 → 解题步骤 → 正确答案 → 易错点 → 下次遇到同类题”展开。可以逐题点击，也可以展开全部。
              </p>
              <div className="weakness-review-progress">
                <span>复习进度</span>
                <progress
                  max={plan.analysisTotal ?? plan.analysis.length}
                  value={plan.analysisReviewed ?? 0}
                  aria-label="错题复习进度"
                />
                <strong>{plan.analysisReviewed ?? 0} / {plan.analysisTotal ?? plan.analysis.length}</strong>
              </div>
              <div className="weakness-analysis-list">
                {plan.analysis.map((question, index) => {
                  const earned = question.earned == null ? 0 : Number(question.earned);
                  const maximum = Number(question.maximum);
                  const reasons = question.result_snapshot?.points ?? [];
                  return (
                    <details className="weakness-analysis" key={question.id} open={expandAll || index === 0}>
                      <summary>
                        <span className="weakness-question-number">
                          {String(question.originalNumber ?? index + 1).padStart(2, '0')}
                        </span>
                        <label
                          className="weakness-review-check"
                          title={question.reviewed ? '取消已复习' : '标记为已复习'}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={!!question.reviewed}
                            disabled={reviewBusy === question.id}
                            aria-label={`标记第 ${question.originalNumber ?? index + 1} 题已复习`}
                            onChange={() => void toggleReviewed(question)}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </label>
                        <strong>第 {question.originalNumber ?? index + 1} 题 · {question.point_title || '本卷考点'}</strong>
                        <span className={`weakness-analysis-flag ${question.unanswered ? 'is-blank' : ''}`}>
                          {question.unanswered ? '留空' : '答错'}
                        </span>
                        <span className="weakness-answer-score">
                          {earned}
                          <small> / {maximum}</small>
                        </span>
                      </summary>
                      <div className="weakness-analysis-body">
                        <QuestionStem text={question.stem} />
                        {!!question.options.length && (
                          <ol className="weakness-options-read">
                            {question.options.map((option, optionIndex) => (
                              <li key={optionIndex}>
                                <span>{String.fromCharCode(65 + optionIndex)}.</span>
                                <MathText text={option} />
                              </li>
                            ))}
                          </ol>
                        )}
                        <div className={`weakness-analysis-grid ${question.worked ? 'is-single' : ''}`}>
                          <div>
                            <h4>你的作答</h4>
                            <p>{answerText(question.answer, question.solution ?? {}, question.recognizedAnswer)}</p>
                          </div>
                          {!question.worked && (
                            <div>
                              <h4>正确答案</h4>
                              <SmartMathText text={referenceText(question.solution ?? {})} />
                            </div>
                          )}
                        </div>
                        {question.worked ? (
                          <div className="weakness-worked">
                            <div className="weakness-worked-pair">
                              <div className="weakness-worked-block is-idea">
                                <h4>先说思路</h4>
                                <p><SmartMathText text={question.worked.idea} /></p>
                              </div>
                              <div className="weakness-worked-block is-diagnosis">
                                <h4>你当时错在哪</h4>
                                <p><SmartMathText text={question.worked.diagnosis} /></p>
                              </div>
                            </div>
                            <div className="weakness-worked-steps">
                              <h4>解题步骤</h4>
                              <ol>
                                {question.worked.steps.map((step, stepIndex) => (
                                  <li key={`${step.title}-${stepIndex}`}>
                                    <span className="weakness-step-no">{stepIndex + 1}</span>
                                    <div>
                                      <strong>{step.title}</strong>
                                      {step.detail && <p><SmartMathText text={step.detail} /></p>}
                                      {step.formula && (
                                        <div className="weakness-formula">
                                          <MathText text={`$$${String(step.formula).replace(/^\${1,2}|\${1,2}$/g, '')}$$`} />
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ol>
                            </div>
                            <div className="weakness-worked-pair">
                              <div className="weakness-worked-block">
                                <h4>正确答案</h4>
                                <WorkedAnswer text={question.worked.answer} />
                              </div>
                              <div className="weakness-worked-block is-pitfall">
                                <h4>易错点</h4>
                                <p><SmartMathText text={question.worked.pitfall} /></p>
                              </div>
                            </div>
                            <div className="weakness-worked-next">
                              <h4>下次遇到同类题</h4>
                              <p><SmartMathText text={question.worked.nextTime} /></p>
                            </div>
                            {!!reasons.length && (
                              <details className="weakness-analysis-extra">
                                <summary>查看 AI 原始评分依据</summary>
                                <div className="weakness-analysis-reasons">
                                  {reasons.map((point) => (
                                    <p key={point.pointId}>
                                      <strong>{point.score} 分</strong>
                                      <span><SmartMathText text={point.reason || '该评分点通过'} /></span>
                                    </p>
                                  ))}
                                </div>
                              </details>
                            )}
                            {question.explanation && (
                              <details className="weakness-analysis-extra">
                                <summary>查看知识点原文</summary>
                                <div className="weakness-analysis-explain">
                                  <MathText text={question.explanation} />
                                </div>
                              </details>
                            )}
                          </div>
                        ) : (
                          <>
                            {!!reasons.length && (
                              <div className="weakness-analysis-reasons">
                                <h4>AI 评分依据</h4>
                                {reasons.map((point) => (
                                  <p key={point.pointId}>
                                    <strong>{point.score} 分</strong>
                                    <span><SmartMathText text={point.reason || '该评分点通过'} /></span>
                                  </p>
                                ))}
                              </div>
                            )}
                            {question.explanation && (
                              <div className="weakness-analysis-explain">
                                <h4>知识点讲解</h4>
                                <MathText text={question.explanation} />
                              </div>
                            )}
                          </>
                        )}
                        <p className="weakness-analysis-weak">
                          弱项：{question.point_title} · 本题失分 {maximum - earned} 分
                        </p>
                      </div>
                    </details>
                  );
                })}
              </div>
                </>
              )}
            </Card>
          )}
          <Card className="weakness-drill" id="weakness-drill">
            <div className="weakness-section-head">
              <div>
                <p className="weakness-eyebrow">第三步 · 阶梯练习</p>
                <h2>由易到难，全部答对再重做原卷</h2>
              </div>
              <span>{plan.drillCorrect} / {plan.drillTotal} 已答对</span>
            </div>
            <div className="weakness-progress">
              <progress max={plan.drillTotal} value={plan.drillCorrect} aria-label="阶梯练习进度" />
              <strong>{drillRate}%</strong>
            </div>
            <p className="weakness-muted">
              共 {plan.drillTotal} 道，覆盖本次失分最多的知识点。把 10 道题写在纸上、标清题号后拍照上传，AI 会逐题批改；全部答对后解锁原卷错题。
            </p>
            <div className="weakness-generation">
              <div>
                <strong>再练一组新的阶梯题</strong>
                <p>AI 围绕本次弱项生成基础 3 道、进阶 4 道、提高 3 道。生成成功后切换新一组，上一组的题目与批改记录保留。</p>
              </div>
              <Button variant="secondary" loading={generationBusy} disabled={generationActive || gradingActive || sheetBusy}
                onClick={() => void generateDrill()}>
                <Sparkles size={16} />{generationActive ? '正在生成阶梯题…' : '申请新的 10 道阶梯题'}
              </Button>
            </div>
            <GenerationProgress plan={plan} />
            {(plan.drillRound ?? 1) > 1 && <p className="weakness-muted">当前为第 {plan.drillRound} 组 · AI 生成阶梯题</p>}
            {plan.status === 'DRILL' && (
              <div className={`weakness-sheet ${gradedSheet && !canSubmitSheet ? 'is-graded' : ''}`}>
                <div className="weakness-sheet-head">
                  <div>
                    <strong>{gradedSheet && !canSubmitSheet ? '本组批改已完成' : gradingActive ? 'AI 批改中' : '上传阶梯题的作答照片'}</strong>
                    <p>{gradedSheet && !canSubmitSheet ? '已批改照片仅供查看。请先订正错题，再上传新作答，系统会替换本组照片后开放再次批改。' : '照片里请标清 1–10 题号；支持 JPG/PNG，单张不超过 8MB，最多 20 张。'}</p>
                  </div>
                  <label className={`weakness-upload ${sheetBusy || gradingActive || generationActive ? 'is-disabled' : ''}`}>
                    <Upload size={16} /> {gradedSheet ? '重新作答并上传' : '选择照片'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      disabled={sheetBusy || gradingActive || generationActive}
                      onChange={(event) => {
                        void uploadDrill(event.target.files);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {!!plan.sheetFiles?.length && (
                  <div className="weakness-sheet-files">
                    {plan.sheetFiles.map((file, fileIndex) => (
                      <div className="weakness-sheet-file" key={file.id}>
                        <span>{fileIndex + 1}</span>
                        <button type="button" onClick={() => void showDrillPhoto(file)}>
                          {file.name}
                        </button>
                        {!plan.submittedSheetFileIds?.includes(file.id) && <button
                          type="button"
                          className="weakness-sheet-remove"
                          disabled={sheetBusy || gradingActive || generationActive}
                          onClick={() => void removeDrillPhoto(file)}
                          aria-label={`移除 ${file.name}`}
                        >
                          <Trash2 size={14} />
                        </button>}
                      </div>
                    ))}
                  </div>
                )}
                {sheetPreview && (
                  <div className="weakness-sheet-preview">
                    <img src={sheetPreview} alt="作答照片预览" />
                    <button type="button" onClick={() => setSheetPreview('')}>关闭预览</button>
                  </div>
                )}
                {(!gradedSheet || canSubmitSheet) && <div className="weakness-sheet-actions">
                  <Button
                    loading={sheetBusy}
                    disabled={
                      !canSubmitSheet
                    }
                    onClick={() => void applyDrill()}
                  >
                    {gradingActive ? '正在批改…' : gradedSheet ? '提交新作答批改' : '提交 AI 批改'}
                  </Button>
                  {plan.sheetFiles?.length ? <span>{plan.sheetFiles.length} 张照片</span> : null}
                </div>}
                {sheetNotice && <p className="weakness-sheet-notice">{sheetNotice}</p>}
                {sheetError && <p className="weakness-error" role="alert">{sheetError}</p>}
              </div>
            )}
            {(gradingActive || plan.taskState === 'FAILED' || !canSubmitSheet) && <GradingProgress plan={plan} />}
            {plan.status !== 'DRILL' && sheetError && <p className="weakness-error" role="alert">{sheetError}</p>}
            <div className="weakness-drill-toolbar">
              <div className="weakness-filters" role="group" aria-label="筛选阶梯练习">
                {([
                  ['all', '全部题目', plan.drill.length],
                  ['remaining', '待巩固', plan.drill.filter((q) => !isWeaknessCorrect(q)).length],
                  ['correct', '已答对', plan.drill.filter(isWeaknessCorrect).length],
                ] as const).map(([value, label, count]) => (
                  <button type="button" key={value} aria-pressed={drillFilter === value}
                    onClick={() => setDrillFilter(value)}>
                    {label}<span>{count}</span>
                  </button>
                ))}
              </div>
              <span>纸上作答 · 拍照批改</span>
            </div>
            {!plan.drill.some((q) => drillFilter === 'all' ||
              (drillFilter === 'correct' ? isWeaknessCorrect(q) : !isWeaknessCorrect(q))) && (
              <p className="weakness-filter-empty" role="status">
                {drillFilter === 'remaining' ? '阶梯题已全部答对，可以继续重做原卷错题。' : '还没有已答对的题目，完成作答并提交批改后会显示在这里。'}
              </p>
            )}
            {levels.map((level) => {
              const items = plan.drill.filter((question) => question.level === level.key &&
                (drillFilter === 'all' || (drillFilter === 'correct' ? isWeaknessCorrect(question) : !isWeaknessCorrect(question))));
              if (!items.length) return null;
              return (
                <section className="weakness-level" key={level.key}>
                  <header>
                    <StrongLevel label={level.label} />
                    <span>{level.hint}</span>
                    <small>{items.filter(isWeaknessCorrect).length} / {items.length} 已答对</small>
                  </header>
                  <div className="weakness-question-list">
                    {items.map((question) => (
                      <QuestionCard
                        key={question.id}
                        plan={plan}
                        phase="DRILL"
                        question={question}
                        index={plan.drill.findIndex((item) => item.id === question.id) + 1}
                        onUpdated={update}
                        imageMode
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </Card>
          <Card id="weakness-redo" className={`weakness-redo ${plan.redoUnlocked ? '' : 'is-locked'}`}>
            <div className="weakness-section-head">
              <div>
                <p className="weakness-eyebrow">第四步 · 重做原卷错题</p>
                <h2>{plan.redoUnlocked ? '把这次做错和留空的题再做一遍' : '先完成 10 道阶梯练习'}</h2>
              </div>
              <span>{plan.redoCorrect} / {plan.redoTotal} 已答对</span>
            </div>
            {!plan.redoUnlocked ? (
              <div className="weakness-locked">
                <Target size={30} />
                <strong>还差 {Math.max(0, plan.drillTotal - plan.drillCorrect)} 道阶梯题</strong>
                <p>全部答对后自动解锁；错题重做不会覆盖原卷成绩，也不直接授予章节通过资格。</p>
              </div>
            ) : (
              <>
                <div className="weakness-progress">
                  <progress max={plan.redoTotal} value={plan.redoCorrect} aria-label="原卷错题重做进度" />
                  <strong>{redoRate}%</strong>
                </div>
                {plan.status === 'DRILL' ? (
                  <Button loading={busy} onClick={() => void startRedo(plan)}>
                    开始重做 {plan.redoTotal} 道错题
                    <ArrowRight size={16} />
                  </Button>
                ) : (
                  <>
                    {plan.status === 'COMPLETED' && (
                      <div className="weakness-complete">
                        <GraduationCap size={34} />
                        <strong>这次弱项已经补完</strong>
                        <p>
                          点击弱项检测，系统会优先选择本章还没交卷的 A/B/C 套；三套都做完后会提示申请新卷。
                        </p>
                        <div className="weakness-complete-actions">
                          <Button loading={busy} onClick={() => void startDetection(plan)}>
                            弱项检测：开始下一套章节卷
                            <ArrowRight size={16} />
                          </Button>
                          <Link className="button button-secondary" to={`/study/course/${code}/practice`}>
                            返回章节检测
                          </Link>
                        </div>
                        {detectionNotice && (
                          <p className="weakness-detection-notice" role="status">
                            {detectionNotice}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="weakness-question-list">
                      {plan.redo.map((question, index) => (
                        <QuestionCard
                          key={question.id}
                          plan={plan}
                          phase="REDO"
                          question={question}
                          index={index + 1}
                          onUpdated={update}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </Card>
        </main>
        <aside className="weakness-aside">
          <Card className="weakness-side-card weakness-navigation">
            <p className="weakness-eyebrow">本次复习</p>
            <nav aria-label="弱项练习导航" className="weakness-section-nav">
              <a href="#weakness-example"><span>01</span> 同类例子 <ArrowRight size={14} /></a>
              {!!plan.analysis?.length && <a href="#weakness-analysis"><span>02</span> 错因分析 <ArrowRight size={14} /></a>}
              <a href="#weakness-drill"><span>03</span> 阶梯练习 <strong>{plan.drillCorrect}/{plan.drillTotal}</strong></a>
              <a href="#weakness-redo"><span>04</span> 原卷重做 <strong>{plan.redoUnlocked ? `${plan.redoCorrect}/${plan.redoTotal}` : '待解锁'}</strong></a>
            </nav>
            <div className="weakness-question-nav" role="group" aria-label="阶梯练习题号">
              {plan.drill.map((question, index) => (
                <button type="button" key={question.id}
                  className={isWeaknessCorrect(question) ? 'is-correct' : question.saved ? 'is-attempted' : ''}
                  aria-label={`定位阶梯练习第 ${index + 1} 题${isWeaknessCorrect(question) ? '，已答对' : '，待巩固'}`}
                  onClick={() => {
                    setDrillFilter('all');
                    window.requestAnimationFrame(() => document.getElementById(`weakness-drill-${question.id}`)?.scrollIntoView({ block: 'start' }));
                  }}>
                  {String(index + 1).padStart(2, '0')}
                </button>
              ))}
            </div>
            <p className="weakness-nav-legend"><i /> 已答对 <i /> 待巩固 · 点击题号定位</p>
          </Card>
          <Card className="weakness-side-card">
            <p className="weakness-eyebrow">这次失分分布</p>
            <h2>优先巩固这些知识点</h2>
            <div className="weakness-points">
              {plan.weakPoints.map((point, index) => (
                <div className="weakness-point" key={point.pointKey}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{point.pointTitle}</strong>
                    <small>
                      失分 {Number(point.lost)} 分 · 错/空 {point.wrongCount} 题
                      {point.unanswered ? ` · 其中留空 ${point.unanswered}` : ''}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            <RefreshCw size={15} />
            重新读取弱项
          </Button>
        </aside>
      </div>
    </section>
  );
}

