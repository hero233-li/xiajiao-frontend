import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { bankRequest, type WeaknessPlan, type WeaknessQuestion } from '../../../api/bank';
import { Button } from '../../../components/Button';
import { MathText } from '../../../components/MathText';
import { SmartMathText } from '../../../components/SmartMathText';
import { QuestionStem } from '../QuestionStem';
import { answerText, referenceText, isWeaknessCorrect } from './answers';

const typeNames: Record<string, string> = {
  CHOICE: '选择题',
  FILL: '填空题',
  CALCULATION: '计算题',
  PROOF: '证明题',
  SHORT: '简答题',
  TERM: '名词解释题',
  ANALYSIS: '综合题',
  CODE: '代码题',
  OPERATION: '操作题',
};

export function QuestionCard({
  plan,
  phase,
  question,
  index,
  onUpdated,
  imageMode = false,
}: {
  plan: WeaknessPlan;
  phase: 'DRILL' | 'REDO';
  question: WeaknessQuestion;
  index: number;
  onUpdated: (plan: WeaknessPlan) => void;
  imageMode?: boolean;
}) {
  const saved = question.saved;
  const correct = isWeaknessCorrect(question);
  const graded = saved?.grading_state === 'GRADED';
  const correctOption = graded && typeof question.solution?.correctOption === 'number'
    ? question.solution.correctOption : undefined;
  const [selected, setSelected] = useState<number | undefined>(saved?.answer?.selectedOption);
  const [text, setText] = useState(saved?.answer?.text ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState<{
    solution: Record<string, unknown>;
    explanation: string;
  } | null>(null);
  useEffect(() => {
    setSelected(saved?.answer?.selectedOption);
    setText(saved?.answer?.text ?? '');
  }, [saved?.revision, saved?.answer]);
  const expectedRevision = saved?.revision ?? 0;
  const path = `/bank/weakness/plans/${plan.id}/questions/${question.id}`;
  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (question.type === 'CHOICE' && selected === undefined) {
      setError('请选择一个选项');
      return;
    }
    if (question.type !== 'CHOICE' && !text.trim()) {
      setError('请先填写作答');
      return;
    }
    await act(async () => {
      const updated = await bankRequest<WeaknessPlan>(`${path}?phase=${phase}`, 'PUT', {
        answer: question.type === 'CHOICE' ? { selectedOption: selected } : { text },
        expectedRevision,
      });
      onUpdated(updated);
    });
  }
  async function showReference() {
    await act(async () => {
      setReference(
        await bankRequest<{ solution: Record<string, unknown>; explanation: string }>(
          `${path}/reference?phase=${phase}`,
        ),
      );
    });
  }
  async function selfGrade(correctAnswer: boolean) {
    await act(async () => {
      const updated = await bankRequest<WeaknessPlan>(
        `${path}/self-grade?phase=${phase}`,
        'POST',
        { correct: correctAnswer, expectedRevision },
      );
      onUpdated(updated);
    });
  }
  return (
    <article id={`weakness-${phase.toLowerCase()}-${question.id}`}
      className={`weakness-question ${correct ? 'is-correct' : graded ? 'needs-practice' : ''}`}>
      <header className="weakness-question-head">
        <span className="weakness-question-number">{String(index).padStart(2, '0')}</span>
        <div>
          <strong>
            第 {question.originalNumber ?? index} 题 · {typeNames[question.type] ?? question.type}
          </strong>
          <small>
            {question.point_title || '本卷考点'} · {Number(question.maximum)} 分
          </small>
        </div>
        <span className={`weakness-question-state ${correct ? 'is-correct' : ''}`}>
          {imageMode
            ? correct
              ? '已答对'
              : saved?.grading_state === 'GRADED'
                ? `${saved.earned == null ? 0 : Number(saved.earned)}/${saved.maximum}`
                : saved?.grading_state === 'NEEDS_REVIEW'
                  ? '待核对'
                  : saved?.grading_state === 'FAILED'
                    ? '批改失败'
                    : saved?.grading_state === 'PENDING'
                      ? '待批改'
                      : '未提交'
            : correct
              ? '已答对'
              : !saved?.answer
                ? '未作答'
                : saved.grading_state === 'PENDING'
                  ? '待自评'
                  : '可重做'}
        </span>
      </header>
      {!imageMode && question.answer && (
        <p className="weakness-previous">
          上次作答：{answerText(question.answer, question.solution ?? {}, question.recognizedAnswer)} · 得分{' '}
          {question.earned == null ? 0 : Number(question.earned)}/{Number(question.maximum)}
        </p>
      )}
      <QuestionStem text={question.stem} />
      {imageMode ? (
        <>
          {!!question.options.length && (
            <ol className="weakness-options-read">
              {question.options.map((option, optionIndex) => (
                <li key={optionIndex} className={correctOption === optionIndex ? 'is-answer' : ''}>
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  <MathText text={option} />
                  {correctOption === optionIndex && <small><Check size={13} /> 正确答案</small>}
                </li>
              ))}
            </ol>
          )}
          {(graded || saved?.result_snapshot?.recognizedAnswer) && (
            <div className="weakness-result-strip">
              {saved?.result_snapshot?.recognizedAnswer && (
                <div><span>本次作答 · AI 识别</span><SmartMathText text={saved.result_snapshot.recognizedAnswer} /></div>
              )}
              {graded && <div className="weakness-result-score"><span>本题得分</span><strong>{Number(saved?.earned ?? 0)} <small>/ {Number(saved?.maximum ?? question.maximum)} 分</small></strong></div>}
            </div>
          )}
        </>
      ) : (
        <>
          {!!question.options.length && (
            <fieldset className="weakness-options" disabled={busy || correct}>
              <legend>选择一个答案</legend>
              {question.options.map((option, optionIndex) => (
                <label key={optionIndex}>
                  <input
                    type="radio"
                    name={`weakness-${phase}-${question.id}`}
                    checked={selected === optionIndex}
                    onChange={() => setSelected(optionIndex)}
                  />
                  <span>{String.fromCharCode(65 + optionIndex)}.</span>
                  <MathText text={option} />
                </label>
              ))}
            </fieldset>
          )}
          {!question.options.length && (
            <label className="weakness-answer">
              你的作答
              <textarea
                rows={question.type === 'FILL' ? 2 : 5}
                value={text}
                disabled={busy || correct}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
          )}
          {error && <p className="weakness-error" role="alert">{error}</p>}
          <div className="weakness-actions">
            {!correct && (
              <Button loading={busy} onClick={() => void submit()}>
                {saved?.answer ? '重新提交' : '提交答案'}
              </Button>
            )}
            {!correct && question.type !== 'CHOICE' && saved?.answer && (
              <Button variant="secondary" loading={busy} onClick={() => void showReference()}>
                查看参考答案
              </Button>
            )}
            {!correct && saved?.answer && question.type !== 'CHOICE' && saved.grading_state === 'PENDING' && (
              <>
                <Button variant="secondary" loading={busy} onClick={() => void selfGrade(true)}>
                  我做对了
                </Button>
                <Button variant="secondary" loading={busy} onClick={() => void selfGrade(false)}>
                  我做错了
                </Button>
              </>
            )}
            {correct && <span className="weakness-done"><Check size={16} /> 这题已掌握</span>}
          </div>
        </>
      )}
      {saved?.feedback && (!imageMode || !graded || !/^AI批改[:：]\s*[\d.]+\s*\/\s*[\d.]+[。.]?$/.test(saved.feedback.trim())) && (
        <div className="weakness-feedback"><SmartMathText text={saved.feedback} /></div>
      )}
      {reference && (
        <div className="weakness-reference">
          <h4>参考答案</h4>
          <MathText text={referenceText(reference.solution)} />
          {reference.explanation && <MathText text={reference.explanation} />}
        </div>
      )}
      {saved?.grading_state === 'GRADED' && question.solution && (
        <details className="weakness-reference-details">
          <summary>解题思路与易错提醒</summary>
          <div className="weakness-solution-body">
            <div><h4>参考答案</h4><SmartMathText text={referenceText(question.solution)} /></div>
            {question.explanation && <div><h4>解题思路</h4><DetailedDrillExplanation text={question.explanation} /></div>}
          </div>
        </details>
      )}
    </article>
  );
}

function DetailedDrillExplanation({ text }: { text: string }) {
  return <div className="weakness-tutoring">{text.trim().split(/\n\s*\n/).map((block, index) => {
    const newline = block.indexOf('\n');
    const firstLine = newline >= 0 ? block.slice(0, newline).trim() : '';
    const hasHeading = firstLine.length > 0 && firstLine.length <= 70 && !firstLine.includes('$');
    return <section className="weakness-tutoring-section" key={index}>
      {hasHeading && <h5>{firstLine}</h5>}
      <div className="weakness-tutoring-prose"><SmartMathText text={hasHeading ? block.slice(newline + 1) : block} /></div>
    </section>;
  })}</div>;
}

