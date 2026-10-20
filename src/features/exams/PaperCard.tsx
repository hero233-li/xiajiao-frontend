import { ArrowRight, Eye, FileText, LockKeyhole } from 'lucide-react';
import type { Paper, ScoreRecord } from '../../api/generated/models';
import { Link } from '../cycle/navigation';
import { Button } from '../../components/Button';
import { formatShanghaiDate } from '../../utils/date';

export function PaperCard({
  paper,
  code,
  courseId,
  unlocked,
  canWrite,
  score,
  onRecord,
}: {
  paper: Paper;
  code: string;
  courseId: string;
  unlocked: boolean;
  canWrite: boolean;
  score?: ScoreRecord;
  onRecord: (paper: Paper) => void;
}) {
  const answerLabel = paper.answerFile
    ? '独立答案'
    : paper.questionFile.containsAnswers
      ? '题目含答案'
      : '暂无答案';
  const preview = (part: 'QUESTION' | 'ANSWER') =>
    `/study/paper-preview/${paper.id}?courseId=${encodeURIComponent(courseId)}&part=${part}&month=${paper.paperMonth}&code=${encodeURIComponent(code)}`;

  return (
    <article className="exam-paper-card">
      <header className="exam-paper-card-head">
        <span className="exam-paper-month">{paper.paperMonth}</span>
        <span className={`exam-paper-badge ${answerLabel === '暂无答案' ? 'is-muted' : 'is-answer'}`}>
          {answerLabel}
        </span>
      </header>
      <p className="exam-paper-card-meta">
        <FileText size={15} aria-hidden="true" />
        {paper.questionPages === null ? '题目页数未提供' : `${paper.questionPages} 页题目`}
        {paper.answerFile && (
          <span>{paper.answerPages === null ? '答案页数未提供' : `答案 ${paper.answerPages} 页`}</span>
        )}
      </p>
      {paper.sourceCourseCode && paper.sourceCourseCode !== code && (
        <p className="exam-paper-card-note">补充资料 · 来源课程代码 {paper.sourceCourseCode}</p>
      )}
      <div className="exam-paper-card-score" data-has-score={!!score}>
        {score ? (
          <>
            <strong>{score.score}</strong>
            <span>分 · {formatShanghaiDate(score.practicedOn)}</span>
          </>
        ) : (
          <span className="secondary">尚未批改</span>
        )}
      </div>
      <div className="exam-paper-card-actions">
        {unlocked ? (
          <>
            <Link
              className="button button-secondary exam-preview-button"
              to={preview('QUESTION')}
              aria-label={`题目预览 ${paper.paperMonth}`}
            >
              <Eye size={16} aria-hidden="true" />
              题目预览
            </Link>
            {paper.answerFile && (
              <Link
                className="button button-ghost exam-preview-button"
                to={preview('ANSWER')}
                aria-label={`答案预览 ${paper.paperMonth}`}
              >
                答案预览
              </Link>
            )}
          </>
        ) : (
          <span className="exam-download-state">
            <LockKeyhole size={14} aria-hidden="true" />
            未开放预览
          </span>
        )}
      </div>
      <div className="exam-paper-card-grading">
        <Link
          className="button button-primary"
          to={`/study/course/${code}/exams/${paper.id}`}
          aria-label={`进入 ${paper.paperMonth} 考卷工作台`}
        >
          进入工作台
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        {canWrite && (
          <Button variant="ghost" onClick={() => onRecord(paper)}>
            记录成绩
          </Button>
        )}
      </div>
    </article>
  );
}
