import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import qGirl from '../assets/q-girl.svg';
import { ApiError, authApi, setPersist } from '../lib/api';
import { useSession } from '../lib/useSession';
import { SiteFooter } from '../app/SiteFooter';

/** 测试环境自带账号：默认填好，自动记住密码 + 自动登录。 */
const DEFAULT_IDENTIFIER = 'integration';
const DEFAULT_PASSWORD = '1d548e9c1b08f87ffd18d57f';
const PASSWORD_KEY = 'xj.pwd';

function readRememberedPassword(): string {
  try {
    return localStorage.getItem(PASSWORD_KEY) ?? DEFAULT_PASSWORD;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

function Check({
  checked,
  onChange,
  children,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`text-secondary flex cursor-pointer items-center gap-2 text-[13px] ${className ?? ''}`}>
      <input
        type="checkbox"
        className="check"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {children}
    </label>
  );
}

export function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState(DEFAULT_IDENTIFIER);
  const [password, setPassword] = useState(readRememberedPassword);
  const [autoLogin, setAutoLogin] = useState(true);
  const [remember, setRemember] = useState(true);
  const [agreed, setAgreed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/today';

  useEffect(() => {
    document.title = '登录 · 菲比啾比卷卷卷';
  }, []);

  useEffect(() => {
    if (session) navigate(from, { replace: true });
  }, [session, from, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !agreed) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    // 自动登录 = 令牌常驻本机；记住密码 = 密码留在本机
    setPersist(autoLogin);
    try {
      if (remember) localStorage.setItem(PASSWORD_KEY, password);
      else localStorage.removeItem(PASSWORD_KEY);
    } catch {
      /* 隐私模式忽略 */
    }
    try {
      await authApi.signIn(identifier.trim(), password);
      navigate(from, { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '登录失败，请稍后再试');
    } finally {
      setBusy(false);
    }
  }

  function comingSoon(label: string) {
    setError(null);
    setNotice(`${label}暂未开放`);
  }

  return (
    <main className="relative flex min-h-full flex-col items-center justify-center gap-2 px-4 py-8">
      {/* 登录页自己的背景：淡蓝 → 淡紫 → 淡粉 */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(150deg, var(--blue-3) 0%, var(--iris-3) 45%, var(--red-3) 100%)',
        }}
      />

      <div className="glass glass--sheen min-h-[516px] w-full max-w-[420px] px-7 pt-4 pb-8">
        <div className="mt-5 flex justify-center">
          <span
            className="float-soft grid size-[112px] place-items-center overflow-hidden rounded-full shadow-[0_0_0_3px_#fff,0_14px_30px_rgba(15,23,42,0.12)]"
            style={{ background: 'linear-gradient(160deg, var(--blue-2) 0%, var(--iris-3) 100%)' }}
          >
            <img src={qGirl} alt="" className="size-full object-cover" draggable={false} />
          </span>
        </div>

        <form onSubmit={submit} className="mt-7">
          <input
            aria-label="用户名或邮箱"
            id="identifier"
            name="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="用户名或邮箱"
            className="field-solid"
          />

          <input
            aria-label="密码"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            className="field-solid mt-3"
          />

          <div className="mt-4 flex items-center justify-between">
            <Check checked={autoLogin} onChange={setAutoLogin}>
              自动登录
            </Check>
            <Check checked={remember} onChange={setRemember}>
              记住密码
            </Check>
          </div>

          {(error || notice) && (
            <p
              role={error ? 'alert' : 'status'}
              className={`mt-4 rounded-[10px] px-3 py-2 text-[13px] ${
                error ? 'bg-danger-soft text-danger' : 'text-secondary bg-[var(--slate-3)]'
              }`}
            >
              {error ?? notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !identifier.trim() || !password || !agreed}
            className="bg-brand mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] leading-none font-medium text-white shadow-[0_8px_20px_rgba(91,91,214,0.24)] transition-[background-color,opacity] duration-[var(--duration)] ease-[var(--ease-out)] hover:bg-[var(--iris-10)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? '登录中…' : '登录'}
          </button>

          <Check checked={agreed} onChange={setAgreed} className="mt-4">
            <span>
              已阅读并同意
              <button
                type="button"
                onClick={() => comingSoon('服务协议')}
                className="text-brand-ink mx-1 hover:underline"
              >
                服务协议
              </button>
              和
              <button
                type="button"
                onClick={() => comingSoon('隐私政策')}
                className="text-brand-ink mx-1 hover:underline"
              >
                隐私政策
              </button>
            </span>
          </Check>

          <div className="text-secondary mt-9 flex items-center justify-center gap-3 text-[13px]">
            <button type="button" onClick={() => comingSoon('扫码登录')} className="hover:text-ink">
              扫码登录
            </button>
            <span className="bg-line h-3 w-px" aria-hidden />
            <button type="button" onClick={() => comingSoon('注册账号')} className="hover:text-ink">
              注册账号
            </button>
          </div>
        </form>
      </div>

      <SiteFooter />
    </main>
  );
}
