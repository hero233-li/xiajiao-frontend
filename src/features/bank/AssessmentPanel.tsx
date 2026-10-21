import type { BankPaper, ChapterAssessmentProgress } from '../../api/bank';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Clock3, FileText, LockKeyhole, ArrowRight } from 'lucide-react';
import './assessment-panel.css';

const statusNames: Record<string, string> = {
  NOT_SUBMITTED: '未完整交卷',
  GRADED: '已评分',
  FAILED: '评分失败',
  NEEDS_REVIEW: '待核对',
};

export function AssessmentPanel({
  title,
  kind,
  description,
  papers,
  progress,
  passed,
  blockedReason,
  busy,
  onStart,
}: {
  title: string;
  kind: 'CHAPTER' | 'MOCK';
  description: string;
  papers: BankPaper[];
  progress?: ChapterAssessmentProgress;
  passed?: boolean;
  blockedReason: string;
  busy: boolean;
  onStart: (id: string) => void;
}) {
  return (
    <Card className="assessment-panel">
      <header className="assessment-panel-heading">
        <div>
          <p className="assessment-eyebrow">
            {kind === 'CHAPTER' ? '本章独立检测' : '全课程综合检测'}
          </p>
          <h3>{title}</h3>
          <p className="assessment-description">{description}</p>
        </div>
        <span
          className={`assessment-state ${passed ? 'is-passed' : blockedReason ? 'is-locked' : ''}`}
        >
          {passed ? '本章已通过' : blockedReason ? '尚未就绪' : '可以开始'}
        </span>
      </header>
      {progress && (
        <div className="assessment-metrics" aria-label="三套章节检测成绩">
          <div>
            <span>已交卷</span>
            <strong>
              {progress.submitted}
              <small> / 3 套</small>
            </strong>
          </div>
          <div>
            <span>已评分</span>
            <strong>
              {progress.graded}
              <small> / 3 套</small>
            </strong>
          </div>
          <div>
            <span>{progress.rateLabel}</span>
            <strong>{progress.meanRate == null ? '待评分' : `${progress.meanRate}%`}</strong>
          </div>
        </div>
      )}
      {blockedReason && (
        <p className="assessment-blocked">
          <LockKeyhole size={16} aria-hidden="true" />
          <span>{blockedReason}</span>
        </p>
      )}
      <div className="assessment-paper-grid">
        {papers.map((p) => {
          const result = progress?.papers.find((r) => r.variant === p.variant);
          const status = result
            ? (statusNames[result.status] ?? '待评分')
            : blockedReason
              ? '待开放'
              : '可开始';
          return (
            <article className="assessment-paper" key={p.id}>
              <header>
                <span className="assessment-variant">{p.variant} 卷</span>
                <span
                  className={`assessment-paper-status ${result?.status === 'GRADED' ? 'is-graded' : ''}`}
                >
                  {status}
                </span>
              </header>
              <div className="assessment-paper-details">
                <span>
                  <FileText size={16} aria-hidden="true" />
                  {kind === 'CHAPTER' ? '章节检测' : '完整模拟卷'}
                </span>
                <span>
                  <Clock3 size={16} aria-hidden="true" />
                  {p.limit_minutes} 分钟
                </span>
              </div>
              {result?.status === 'GRADED' && (
                <p className="assessment-paper-score">
                  {result.rateLabel}{' '}
                  <strong>{result.rate == null ? '—' : `${result.rate}%`}</strong>
                </p>
              )}
              <Button
                variant={kind === 'MOCK' || result?.status === 'GRADED' ? 'secondary' : 'primary'}
                disabled={!!blockedReason || busy}
                aria-label={
                  kind === 'CHAPTER'
                    ? `开始 ${p.title} · ${p.limit_minutes} 分钟`
                    : `模拟卷 ${p.variant} · ${p.limit_minutes} 分钟`
                }
                onClick={() => onStart(p.id)}
              >
                {kind === 'CHAPTER' ? '开始检测' : '开始模拟卷'}
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </article>
          );
        })}
      </div>
      {!papers.length && <p className="assessment-empty">试卷正在审核，发布后会显示在这里。</p>}
      {progress && (
        <p className="assessment-rule">
          三套全部交卷并完成评分后，等权平均成绩达到 90% 即通过。已取得的通过资格保留。
        </p>
      )}
    </Card>
  );
}
