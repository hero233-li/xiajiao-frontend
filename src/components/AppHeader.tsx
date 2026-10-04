import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Link } from '../features/cycle/navigation';
import { BookOpen, CalendarCheck, PenLine, ScanLine, LogOut, Library } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
const destinations = [
  ['/study', '今日', BookOpen],
  ['/study/courses', '学习', Library],
  ['/study/training', '练习与检测', ScanLine],
  ['/study/schedule', '计划', CalendarCheck],
  ['/study/notes', '笔记', PenLine],
] as const;
export function AppHeader() {
  const location = useLocation();
  const active = (to: string) =>
    to === '/study/courses'
      ? location.pathname === to ||
        /\/course\/[^/]+\/(catalog|knowledge|manual)/.test(location.pathname)
      : to === '/study/training'
        ? location.pathname === to ||
          /\/course\/[^/]+\/(practice|tests|exams)/.test(location.pathname)
        : to === '/study/notes'
          ? location.pathname.endsWith('/notes')
          : location.pathname === to;
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <header
      className={
        location.pathname.startsWith('/admin') ? 'desk-header desk-admin-header' : 'desk-header'
      }
    >
      <div className="desk-header-inner">
        <Link to="/study" className="desk-brand">
          <span className="brand-symbol">途</span>
          <span>
            学习知途<small>把每一步，学扎实</small>
          </span>
        </Link>
        <nav className="desk-nav" aria-label="主导航">
          {destinations.map(([to, label, Icon]) => (
            <Link key={to} to={to} aria-current={active(to) ? 'page' : undefined}>
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <details className="desk-account">
          <summary>
            <span className="account-avatar">{auth.user?.username?.slice(0, 1).toUpperCase()}</span>
            <span>{auth.user?.username}</span>
          </summary>
          <div>
            <p className="secondary">当前账户</p>
            {auth.user?.role === 'ADMIN' && <Link to="/admin">管理员工作台</Link>}
            <Button
              variant="ghost"
              loading={busy}
              onClick={() => {
                setBusy(true);
                void auth
                  .signOut()
                  .catch(() => undefined)
                  .finally(() => setBusy(false));
              }}
            >
              <LogOut size={16} aria-hidden="true" />
              退出登录
            </Button>
          </div>
        </details>
      </div>
    </header>
  );
}
