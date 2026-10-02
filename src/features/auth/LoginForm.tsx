import { useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from '../cycle/navigation';
import { useAuth } from '../../hooks/useAuth';
import { safeReturnPath } from '../../utils/navigation';
import { errorMessage } from '../../api/errors';
import { isMockMode } from '../../utils/environment';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';

export function LoginForm() {
  const auth = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const identifierInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const target = safeReturnPath(params.get('redirect'));

  const submit = async (user: string, secret: string) => {
    if (pending.current) return;
    const errors = {
      identifier: user.trim() ? '' : '请输入用户名或邮箱。',
      password: secret ? '' : '请输入密码。',
    };
    setFieldErrors(errors);
    setError('');
    if (errors.identifier || errors.password) {
      (errors.identifier ? identifierInput : passwordInput).current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await auth.signIn({ identifier: user, password: secret });
      navigate(target, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  if (auth.status === 'checking') return <Skeleton label="正在确认登录状态" />;
  if (auth.status === 'authenticated') return <Navigate to={target} replace />;

  return (
    <>
      <form
        className="login-form"
        noValidate
        aria-busy={busy}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(identifier, password);
        }}
      >
        <div className="login-field">
          <label htmlFor="identifier">用户名或邮箱</label>
          <input
            ref={identifierInput}
            id="identifier"
            name="identifier"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            value={identifier}
            disabled={busy}
            aria-invalid={!!fieldErrors.identifier}
            aria-describedby="identifier-error"
            onChange={(event) => {
              setIdentifier(event.target.value);
              setFieldErrors((previous) => ({ ...previous, identifier: '' }));
              setError('');
            }}
          />
          <p className="login-field-error" id="identifier-error" aria-live="polite">
            {fieldErrors.identifier}
          </p>
        </div>
        <div className="login-field">
          <label htmlFor="password">密码</label>
          <input
            ref={passwordInput}
            id="password"
            name="password"
            required
            autoComplete="current-password"
            type="password"
            value={password}
            disabled={busy}
            aria-invalid={!!fieldErrors.password}
            aria-describedby="password-error"
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((previous) => ({ ...previous, password: '' }));
              setError('');
            }}
          />
          <p className="login-field-error" id="password-error" aria-live="polite">
            {fieldErrors.password}
          </p>
        </div>
        <div className="login-feedback">
          <p className="login-error" role="alert" id="login-error">
            {error && (
              <>
                <AlertCircle size={18} aria-hidden="true" />
                <span>{error}</span>
              </>
            )}
          </p>
          <p className="login-status secondary" role="status">
            {busy ? '正在登录，请稍候…' : ''}
          </p>
        </div>
        <Button
          className="login-submit"
          type="submit"
          disabled={busy}
          aria-busy={busy}
          disabledReason="正在登录，请稍候"
          aria-describedby={error ? 'login-error' : undefined}
        >
          {busy ? '正在登录…' : '登录'}
        </Button>
      </form>
      {isMockMode && (
        <div className="login-demo">
          <p className="secondary">Mock 演示环境，可使用演示账号体验。</p>
          <Button
            variant="secondary"
            disabled={busy}
            disabledReason="正在登录，请稍候"
            onClick={() => {
              void submit('demo', 'Demo12345');
            }}
          >
            使用演示账号
          </Button>
        </div>
      )}
    </>
  );
}
