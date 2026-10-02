import { useId, type ButtonHTMLAttributes } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  loadingLabel?: string;
  disabledReason?: string;
  error?: string;
};
export function Button({ children, variant = 'primary', loading = false, loadingLabel = '处理中', disabled, disabledReason, error, className = '', 'aria-describedby': describedBy, ...props }: ButtonProps) {
  const id = useId();
  const reason = loading ? loadingLabel : disabled ? disabledReason || '此操作暂不可用' : undefined;
  const descriptions = [describedBy, reason ? `${id}-reason` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return <span><button {...props} disabled={disabled || loading} aria-busy={loading || undefined} aria-describedby={descriptions} data-error={!!error} className={`button button-${variant} ${className}`}>
    {loading && <LoaderCircle size={20} className="spin" aria-hidden="true" />}{children}
  </button>{reason && <span className="button-reason" id={`${id}-reason`}>{reason}</span>}{error && <span className="button-error" role="alert" id={`${id}-error`}><AlertCircle size={16} aria-hidden="true" /> {error}</span>}</span>;
}
