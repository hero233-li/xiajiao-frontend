import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useNavigate, useSearchParams } from '../cycle/navigation';
import { useAuth } from '../../hooks/useAuth';
import { safeReturnPath } from '../../utils/navigation';
import { errorMessage } from '../../api/errors';
import { isMockMode } from '../../utils/environment';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';
export function LoginForm() {
  const auth = useAuth(); const [params] = useSearchParams(); const navigate = useNavigate();
  const [identifier,setIdentifier] = useState(''); const [password,setPassword] = useState(''); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const target = safeReturnPath(params.get('redirect'));
  const submit = async (user: string, secret: string) => { if (busy) return; setBusy(true); setError(''); try { await auth.signIn({ identifier: user, password: secret }); navigate(target,{ replace: true }); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } };
  if (auth.status === 'checking') return <Skeleton label="正在确认登录状态" />;
  if (auth.status === 'authenticated') return <Navigate to={target} replace />;
  return <><form className="stack" onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(identifier,password); }}><label htmlFor="identifier">用户名或邮箱<input id="identifier" name="identifier" required autoComplete="username" maxLength={254} value={identifier} disabled={busy} onChange={event => setIdentifier(event.target.value)} /></label><label htmlFor="password">密码<input id="password" name="password" required autoComplete="current-password" type="password" value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /></label><Button type="submit" loading={busy} loadingLabel="正在登录，请稍候" error={error}>登录</Button></form>{isMockMode && <div className="stack"><p className="secondary">本地演示账号：demo，密码：Demo12345。此入口只在开发 Mock 模式显示。</p><Button variant="secondary" loading={busy} loadingLabel="正在登录，请稍候" onClick={() => { void submit('demo','Demo12345'); }}>使用演示账号</Button></div>}</>;
}
