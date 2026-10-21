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
import { ChapterPracticeExport } from './ChapterPracticeExport';
import { AssessmentPanel } from './AssessmentPanel';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const startKey = useRef<{ paper: string; key: string }>();
  if (overview.isPending) return <p role="status">正在读取章节成绩与检测条件…</p>;
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
    data.chapters.find((c) => c.points.length) ??
    data.chapters.find((c) => !c.passed) ??
    data.chapters[0];
  const requested = search.get('level');
  const level: Level =
    requested === 'simple' || requested === 'hard' || requested === 'middle'
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
        { cycleId, closedBook: true, sheetPhotos: true },
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
  const pointIndex =
    selectedChapter?.points.findIndex((p) => p.point_key === point?.point_key) ?? -1;
  const nextPoint = pointIndex >= 0 ? selectedChapter?.points[pointIndex + 1] : undefined;
  if (initialChapter && data.practiceEnabled !== false)
    return (
      <div className="bank-focus">
        <header className="bank-focus-heading">
          <Link className="button button-secondary" to={selectionTarget}>
            ← 返回考点与进度
          </Link>
          <div className="bank-focus-position">
            <span>
              {pointIndex >= 0
                ? `考点 ${pointIndex + 1} / ${selectedChapter?.points.length ?? 0}`
                : ''}
              {!nextPoint && ' · 本章最后一个考点'}
            </span>
            <Button
              variant="secondary"
              disabled={!nextPoint}
              onClick={() =>
                nextPoint &&
                selectedChapter &&
                choose(selectedChapter.chapter_id, nextPoint.point_key, level)
              }
            >
              下一考点 →
            </Button>
          </div>
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
        <h2>
          {selectedChapter?.practiceRequired === false ? '章节检测与模拟卷' : '按考点练习与检测'}
        </h2>
        {selectedChapter?.practiceRequired === false ? (
          <p>选择章节，完成 A / B / C 三套检测，查看成绩与评分进度。</p>
        ) : (
          <>
            <p>
              simple：理解与基本方法。middle：考试水平。hard：选做提高，完成 simple
              后开放，不影响主线。
            </p>
            <p>
              每考点每等级必须完成全部 10
              道不同题；纯选择题正确率至少90%，含其他题型时得分率至少90%，待评分不算完成。已取得资格保留，后续练习失败不自动撤销。
            </p>
          </>
        )}
      </header>
      {selectedChapter?.practiceRequired !== false &&
        data.published &&
        data.completePublished === false && (
          <Card>
            <h3>练习题发布情况</h3>
            <p>
              已有 {data.practicePublishedCount ?? 0}{' '}
              道合格练习题发布。章节检测与模拟卷的发布情况和进入条件见下方。
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
      {error && (
        <p className="assessment-error" role="alert">
          {error}
        </p>
      )}
      <label className="assessment-chapter-select">
        选择章节
        <select
          aria-label={data.practiceEnabled === false ? '检测章节' : '练习章节'}
          value={selectedChapter?.chapter_id ?? ''}
          onChange={(e) => choose(e.target.value)}
        >
          {data.chapters
            .filter((c) => data.practiceEnabled === false || c.points.length)
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
          {selectedChapter.practiceRequired !== false && <h3>{selectedChapter.title}</h3>}
          {selectedChapter.practiceRequired !== false && (
            <>
              <div className="bank-levels" role="group" aria-label="练习等级">
                {(['simple', 'middle', 'hard'] as const).map((l) => (
                  <Button
                    key={l}
                    variant={level === l ? 'primary' : 'secondary'}
                    disabled={
                      !data.published || (l !== 'simple' && !selectedChapter.middleUnlocked)
                    }
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
              <ChapterPracticeExport
                key={`${selectedChapter.chapter_id}-${level}`}
                courseId={courseId}
                chapter={selectedChapter}
                level={level}
                enabled={data.published && (level === 'simple' || selectedChapter.middleUnlocked)}
              />
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
            </>
          )}
          <AssessmentPanel
            title={selectedChapter.title}
            kind="CHAPTER"
            description="下载 PDF 试卷，在答题纸上作答，上传整卷照片；三套评分后按平均成绩判定章节通过。"
            papers={data.papers.filter(
              (p) => p.kind === 'CHAPTER' && p.chapter_id === selectedChapter.chapter_id,
            )}
            progress={selectedChapter.assessmentProgress}
            passed={selectedChapter.passed}
            blockedReason={
              !selectedChapter.chapterAssessmentUnlocked
                ? selectedChapter.blockReasons.filter(Boolean).join('；') || '本章检测尚未开放'
                : !cycleId
                  ? '请先选择考试周期'
                  : ''
            }
            busy={busy}
            onStart={(id) => void start(id)}
          />
        </>
      )}
      <AssessmentPanel
        title="A / B / C 模拟卷"
        kind="MOCK"
        description="所有必考章节检测通过后开放；下载 PDF 并上传整卷照片，任一套达到 90% 即可满足真题能力门槛。"
        papers={data.papers.filter((p) => p.kind === 'MOCK')}
        blockedReason={
          !data.canApplyMock
            ? data.mockBlockReasons.filter(Boolean).join('；') || '模拟卷尚未开放'
            : !cycleId
              ? '请先选择考试周期'
              : ''
        }
        busy={busy}
        onStart={(id) => void start(id)}
      />
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
