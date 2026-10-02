import type { Progress } from '../../api/generated/models';
export function ProgressBar({ progress, label }: { progress: Progress; label: string }) {
  return (
    <div
      className="ov-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress.percent}
      aria-valuetext={`${progress.percent}%，${progress.completedItems} / ${progress.totalItems} 项已完成`}
    >
      <span style={{ width: `${progress.percent}%` }} />
    </div>
  );
}
