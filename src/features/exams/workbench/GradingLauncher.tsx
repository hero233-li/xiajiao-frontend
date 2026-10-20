import { useState } from 'react';
import { CircleAlert, Cpu, Play } from 'lucide-react';
import type { PracticeInfo, Submission } from '../../../api/grading';
import { Button } from '../../../components/Button';

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export type PracticeDraft = Omit<PracticeInfo, 'expectedRevision'>;

export function defaultPractice(): PracticeDraft {
  return {
    practicedOn: today(),
    minutes: 120,
    limitMinutes: 150,
    complete: true,
    closedBook: true,
    answersSeenBefore: false,
  };
}

export function GradingLauncher({
  submission,
  published,
  workerOnline,
  busy,
  canWrite,
  onApply,
}: {
  submission?: Submission;
  published: boolean;
  workerOnline: boolean;
  busy: boolean;
  canWrite: boolean;
  onApply: (practice: PracticeDraft) => Promise<void>;
}) {
  const [practice, setPractice] = useState<PracticeDraft>(defaultPractice);
  const [error, setError] = useState('');
  const blocked = !canWrite
    ? '当前周期的成绩写入尚未解锁。'
    : !submission
      ? '先新建一份答卷。'
      : submission.pages.length === 0
        ? '至少上传一张答题照片后才能批改。'
        : !published
          ? '该试卷还没有已发布的评分标准，需要管理员先核对发布。'
          : '';

  return (
    <section className="wb-card" aria-labelledby="wb-grading-title">
      <header className="wb-card-head">
        <div>
          <h2 id="wb-grading-title">发起批改</h2>
          <p className="secondary">
            上传答卷照片后点一次即可提交，Mac 程序会自动领取。提交后图片、页序和评分标准版本被固定。
          </p>
        </div>
        <span className={`wb-worker ${workerOnline ? 'is-online' : 'is-offline'}`}>
          <Cpu size={15} aria-hidden="true" />
          {workerOnline ? '批改程序在线' : '批改程序离线'}
        </span>
      </header>

      {blocked ? (
        <p className="wb-blocked" role="status">
          <CircleAlert size={16} aria-hidden="true" />
          {blocked}
        </p>
      ) : (
        <p className="wb-ready" role="status">
          条件已满足，可以直接提交批改。
        </p>
      )}
      {!workerOnline && (
        <p className="wb-muted">
          批改程序离线时任务会排队等待，程序上线后自动领取，可以先提交。
        </p>
      )}
      {error && (
        <p role="alert" className="wb-inline-error">
          {error}
        </p>
      )}

      <div className="wb-submit-row">
        <Button
          disabled={busy || !!blocked}
          loading={busy}
          onClick={() => {
            setError('');
            void onApply(practice).catch((reason: unknown) =>
              setError(reason instanceof Error ? reason.message : '提交批改失败'),
            );
          }}
        >
          <Play size={16} aria-hidden="true" />
          提交批改
        </Button>
        <span className="wb-muted">
          默认按「完整作答 · 闭卷 · 未看过答案」记录，如需修改展开下面的作答条件。
        </span>
      </div>

      <details className="wb-advanced">
        <summary>作答条件（可选，影响成绩预测）</summary>
        <div className="wb-form-grid">
          <label>
            练习日期
            <input
              aria-label="批改练习日期"
              type="date"
              value={practice.practicedOn}
              onChange={(event) => setPractice({ ...practice, practicedOn: event.target.value })}
            />
          </label>
          <label>
            实际用时（分钟）
            <input
              aria-label="实际用时"
              type="number"
              min={1}
              max={1440}
              value={practice.minutes}
              onChange={(event) => setPractice({ ...practice, minutes: Number(event.target.value) })}
            />
          </label>
          <label>
            试卷限时（分钟）
            <input
              aria-label="试卷限时"
              type="number"
              min={1}
              max={1440}
              value={practice.limitMinutes}
              onChange={(event) =>
                setPractice({ ...practice, limitMinutes: Number(event.target.value) })
              }
            />
          </label>
        </div>
        <div className="wb-checks" role="group" aria-label="作答条件">
          {(
            [
              ['complete', '完整作答'],
              ['closedBook', '闭卷作答'],
              ['answersSeenBefore', '作答前已看答案'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={practice[key]}
                onChange={(event) => setPractice({ ...practice, [key]: event.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </details>
    </section>
  );
}
