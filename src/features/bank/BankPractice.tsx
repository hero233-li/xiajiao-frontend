import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bankRequest,
  type BankOverview,
  type BankQuestion,
  type BankSession,
  type Level,
} from '../../api/bank';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MathText } from '../../components/MathText';
import { createUuid } from '../../utils/uuid';
import { Link, useNavigate, useSearchParams } from '../cycle/navigation';
import './bank.css';
import { PointPracticeBatch } from './PointPracticeBatch';
const levelNames = {
  simple: 'simple · 基础练习',
  middle: 'middle · 考试水平练习',
  hard: 'hard · 提高练习（选做）',
};
export function AnswerInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: BankQuestion;
  value: { selectedOption?: number; text?: string };
  onChange: (v: { selectedOption?: number; text?: string }) => void;
  disabled?: boolean;
}) {
  return question.type === 'CHOICE' ? (
    <fieldset disabled={disabled} className="bank-options">
      <legend>选择一个答案</legend>
      {question.options.map((option, index) => (
        <label key={index}>
          <input
            type="radio"
            name={`answer-${question.id}`}
            checked={value.selectedOption === index}
            onChange={() => onChange({ selectedOption: index })}
          />
          <MathText text={option} />
        </label>
      ))}
    </fieldset>
  ) : (
    <label className="bank-answer">
      {question.type === 'CODE'
        ? '代码及运行结果'
        : question.type === 'OPERATION'
          ? '操作步骤、脚本及结果'
          : '你的作答'}
      <textarea
        aria-label="作答文本"
        disabled={disabled}
        rows={question.type === 'FILL' ? 2 : question.type === 'CODE' ? 9 : 6}
        value={value.text ?? ''}
        onChange={(e) => onChange({ text: e.target.value })}
      />
      {!['CHOICE', 'FILL'].includes(question.type) && (
        <small>需要逐点评分及核对，评分完成前不会判定通过。</small>
      )}
    </label>
  );
}
export function BankPractice({
  courseId,
  code,
  cycleId,
  initialChapter,
}: {
  courseId: string;
  code: string;
  cycleId: string;
  initialChapter?: string;
}) {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const overview = useQuery({
    queryKey: ['bank-overview', courseId, cycleId],
    queryFn: () =>
      bankRequest<BankOverview>(
        `/bank/courses/${courseId}/overview${cycleId ? `?cycleId=${cycleId}` : ''}`,
      ),
  });
  const history = useQuery({
    queryKey: ['bank-session-history', courseId],
    queryFn: () =>
      bankRequest<{ id: string; title: string; status: string; passed: boolean }[]>(
        `/bank/courses/${courseId}/sessions`,
      ),
  });
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const startKey = useRef<{ paper: string; key: string }>();
  if (overview.isPending) return <p role="status">正在读取考点进度与解锁条件…</p>;
  if (overview.isError)
    return (
      <p role="alert">
        {overview.error.message}
        <Button onClick={() => void overview.refetch()}>重新加载</Button>
      </p>
    );
  const data = overview.data;
  const selectedChapter =
    data.chapters.find((c) => c.chapter_id === (search.get('chapter') || initialChapter)) ??
    data.chapters.find(
      (c) => c.points.some((p) => p.levels.simple.available === 10) && !c.passed,
    ) ??
    data.chapters.find((c) => c.points.length && !c.passed) ??
    data.chapters.find((c) => c.points.length);
  const requested = search.get('level');
  const level: Level =
    requested === 'hard' || requested === 'middle'
      ? requested
      : selectedChapter?.middleUnlocked
        ? 'middle'
        : 'simple';
  const point =
    selectedChapter?.points.find((p) => p.point_key === search.get('point')) ??
    selectedChapter?.points.find(
      (p) => p.levels[level].available === 10 && !p.levels[level].passed,
    ) ??
    selectedChapter?.points[0];
  function choose(chapter: string, pointKey?: string, nextLevel?: Level) {
    const next = new URLSearchParams(search);
    next.set('chapter', chapter);
    if (pointKey) next.set('point', pointKey);
    else next.delete('point');
    if (nextLevel) next.set('level', nextLevel);
    else next.delete('level');
    setSearch(next);
  }
  const locked =
    !data.published ||
    point?.levels[level].available !== 10 ||
    (level !== 'simple' && !selectedChapter?.middleUnlocked);
  async function start(paper: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    if (startKey.current?.paper !== paper) startKey.current = { paper, key: createUuid() };
    try {
      const s = await bankRequest<BankSession>(
        `/bank/courses/${courseId}/papers/${paper}/sessions`,
        'POST',
        { cycleId, closedBook: closed },
        startKey.current.key,
      );
      navigate(`/study/course/${code}/tests/rebuilt/${s.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '申请失败');
    } finally {
      setBusy(false);
    }
  }
  const practiceParams = new URLSearchParams(search);
  if (selectedChapter) practiceParams.set('chapter', selectedChapter.chapter_id);
  if (point) practiceParams.set('point', point.point_key);
  practiceParams.set('level', level);
  const selectionTarget = `/study/course/${code}/practice?${practiceParams}`;
  const focusTarget = `/study/course/${code}/practice/${encodeURIComponent(selectedChapter?.chapter_id ?? '')}?${practiceParams}`;
  if (initialChapter)
    return (
      <div className="bank-focus">
        <header className="bank-focus-heading">
          <Link className="button button-secondary" to={selectionTarget}>
            ← 返回考点与进度
          </Link>
          <span>
            {selectedChapter?.title} · {levelNames[level]}
          </span>
        </header>
        {selectedChapter && point && !locked ? (
          <PointPracticeBatch
            key={`${selectedChapter.chapter_id}-${point.point_key}-${level}`}
            courseId={courseId}
            chapter={selectedChapter}
            point={point}
            level={level}
          />
        ) : (
          <Card>
            <h2>当前练习尚未开放</h2>
            <p>请返回考点目录查看发布状态与解锁条件。</p>
          </Card>
        )}
      </div>
    );
  return (
    <div className="bank-layout">
      <header>
        <h2>按考点练习与检测</h2>
        <p>
          simple：理解与基本方法。middle：考试水平。hard：选做提高，完成 simple 后开放，不影响主线。
        </p>
        <p>
          每考点每等级必须完成全部 10
          道不同题；纯选择题正确率至少90%，含其他题型时得分率至少90%，待评分不算完成。已取得资格保留，后续练习失败不自动撤销。
        </p>
      </header>
      {data.published && data.completePublished === false && (
        <Card>
          <h3>练习题分批开放中</h3>
          <p>
            已有 {data.practicePublishedCount ?? 0}{' '}
            道合格练习题发布。未发布的考点与等级继续复核；章节检测和模拟卷尚未开放。
          </p>
        </Card>
      )}
      {!data.published && (
        <Card>
          <h3>新版题库正在复核</h3>
          <p>
            考点口径已经确认。题目重新求解、来源及独立试卷复核完成后才会发布；待核实内容不会进入练习。
          </p>
          <Button
            variant="secondary"
            onClick={() => void client.invalidateQueries({ queryKey: ['bank-overview', courseId] })}
          >
            刷新发布状态
          </Button>
        </Card>
      )}
      <label>
        章节
        <select
          aria-label="练习章节"
          value={selectedChapter?.chapter_id ?? ''}
          onChange={(e) => choose(e.target.value)}
        >
          {data.chapters
            .filter((c) => c.points.length)
            .map((c) => (
              <option key={c.chapter_id} value={c.chapter_id}>
                {c.title}
                {c.required ? '' : '（选做补充）'}
              </option>
            ))}
        </select>
      </label>
      {selectedChapter && (
        <>
          <h3>{selectedChapter.title}</h3>
          <div className="bank-levels" role="group" aria-label="练习等级">
            {(['simple', 'middle', 'hard'] as const).map((l) => (
              <Button
                key={l}
                variant={level === l ? 'primary' : 'secondary'}
                disabled={!data.published || (l !== 'simple' && !selectedChapter.middleUnlocked)}
                disabledReason={
                  !data.published
                    ? '题库未完成审核发布'
                    : l !== 'simple' && !selectedChapter.middleUnlocked
                      ? `本章还有 ${selectedChapter.simpleMissing} 个考点的 simple 未达标`
                      : undefined
                }
                onClick={() => choose(selectedChapter.chapter_id, undefined, l)}
              >
                {levelNames[l]}
              </Button>
            ))}
          </div>
          {!selectedChapter.middleUnlocked && data.published && (
            <p>
              本章还有 {selectedChapter.simpleMissing} 个考点的 simple
              未达标。点击对应考点即可继续。
            </p>
          )}
          <div className="bank-point-grid">
            {selectedChapter.points.map((p) => (
              <button
                className="bank-point"
                key={p.point_key}
                aria-pressed={p.point_key === point?.point_key}
                onClick={() => choose(selectedChapter.chapter_id, p.point_key, level)}
              >
                <strong>{p.title}</strong>
                <span>
                  题量 {p.levels[level].available}/10 · 已完成 {p.levels[level].completed}/10
                </span>
                <span>
                  {p.levels[level].rateLabel === '得分率'
                    ? `最新得分 ${p.levels[level].earned}/${p.levels[level].maximum} · 得分率 ${p.levels[level].currentRate}%`
                    : `最新结果答对 ${p.levels[level].correct}/10 · 正确率 ${p.levels[level].currentRate}%`}{' '}
                  · {p.levels[level].passed ? '已达标' : '未达标'}
                </span>
              </button>
            ))}
          </div>
          {point && data.published && point.levels[level].available !== 10 && (
            <p role="status">
              此考点的 {level} 尚未凑齐10道合格发布题，正在复核补齐。请先完成其他已开放考点。
            </p>
          )}
          {point && !locked && (
            <Card className="bank-start">
              <div>
                <h3>
                  {point.title} · {levelNames[level]}
                </h3>
                <p>进入专注作答，恢复已有答案。完成整组后申请批改。</p>
              </div>
              <Link className="button button-primary" to={focusTarget}>
                继续此考点练习
              </Link>
            </Card>
          )}
          <Card>
            <h3>本章独立检测</h3>
            <p>
              {selectedChapter.passed
                ? '已取得本章通过资格。'
                : selectedChapter.blockReasons.join('；') || '已满足练习门槛。'}
            </p>
            {data.papers
              .filter((p) => p.kind === 'CHAPTER' && p.chapter_id === selectedChapter.chapter_id)
              .map((p) => (
                <Button
                  key={p.id}
                  disabled={
                    !selectedChapter.chapterAssessmentUnlocked || !closed || !cycleId || busy
                  }
                  disabledReason={
                    !closed
                      ? '请确认下方闭卷声明'
                      : !selectedChapter.chapterAssessmentUnlocked
                        ? selectedChapter.blockReasons.join('；')
                        : !cycleId
                          ? '请选择考试周期'
                          : undefined
                  }
                  onClick={() => void start(p.id)}
                >
                  开始 {p.title} · {p.limit_minutes} 分钟
                </Button>
              ))}
          </Card>
        </>
      )}
      <Card>
        <h3>A / B / C 固定模拟卷</h3>
        <p>所有必考章节检测通过后开放。任一套完整模拟卷达到90%即可满足真题能力门槛。</p>
        {data.mockBlockReasons.filter(Boolean).map((r) => (
          <p key={r}>{r}</p>
        ))}
        <label>
          <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
          我确认闭卷作答，不提前查看答案；开始后按服务器时限完整交卷。
        </label>
        <p className="secondary">声明和开始时间由系统记录，答卷图片不作为闭卷或限时证据。</p>
        {data.papers
          .filter((p) => p.kind === 'MOCK')
          .map((p) => (
            <Button
              key={p.id}
              disabled={!data.canApplyMock || !closed || !cycleId || busy}
              disabledReason={
                !closed
                  ? '请先确认闭卷声明'
                  : !data.canApplyMock
                    ? data.mockBlockReasons.filter(Boolean).join('；')
                    : !cycleId
                      ? '请选择考试周期'
                      : undefined
              }
              onClick={() => void start(p.id)}
            >
              模拟卷 {p.variant} · {p.limit_minutes} 分钟
            </Button>
          ))}
        {error && <p role="alert">{error}</p>}
      </Card>
      <details>
        <summary>检测与模拟卷记录</summary>
        {history.isPending ? (
          <p>读取中…</p>
        ) : history.isError ? (
          <Button onClick={() => void history.refetch()}>重试读取</Button>
        ) : history.data.length ? (
          history.data.map((s) => (
            <p key={s.id}>
              <Link to={`/study/course/${code}/tests/rebuilt/${s.id}`}>
                {s.title} ·{' '}
                {s.status === 'IN_PROGRESS'
                  ? '继续作答'
                  : s.passed
                    ? '已通过'
                    : '查看结果与评分状态'}
              </Link>
            </p>
          ))
        ) : (
          <p>暂无记录。</p>
        )}
      </details>
      <details>
        <summary>已取得资格与历史来源</summary>
        {[...data.qualifications, ...data.legacyQualifications].map((q) => (
          <p key={String(q.id)}>
            {String(q.kind)} · 来源 {String(q.source)}
            {q.invalidated_at ? '（管理员已作废）' : '（有效）'}
          </p>
        ))}
      </details>
    </div>
  );
}
