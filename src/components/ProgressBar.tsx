import { progressStyle } from '../utils/progress';
import { useId } from 'react';
export function ProgressBar({
  value,
  label,
  max = 100,
  percentage = false,
}: {
  value: number;
  label: string;
  max?: number;
  percentage?: boolean;
}) {
  const id = useId();
  // 限制视觉溢出；业务进度始终由调用方传入的后端字段决定。
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  return (
    <div>
      <div className="progress-label">
        <span id={id}>{label}</span>
        <span>
          {percentage ? `${Math.round((safeValue / safeMax) * 100)}%` : `${safeValue} / ${safeMax}`}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <div className="progress-fill" style={progressStyle((safeValue / safeMax) * 100)} />
      </div>
    </div>
  );
}
