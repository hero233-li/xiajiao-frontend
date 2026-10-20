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
            上传答卷照片后点一次即可提交，批改程序会在后台领取。
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
          批改程序离线时任务会排队等待，程序上线后自动领取。
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
            void onApply(defaultPractice()).catch((reason: unknown) =>
              setError(reason instanceof Error ? reason.message : '提交批改失败'),
            );
          }}
        >
          <Play size={16} aria-hidden="true" />
          提交批改
        </Button>
      </div>
    </section>
  );
}
