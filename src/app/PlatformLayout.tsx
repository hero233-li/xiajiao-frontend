import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ChevronDown,
  BookOpen,
  Activity,
  House,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFitnessList } from '../api/fitness';
import { routeTitle, spaceNavigation } from './navigation';
import '../styles/platform.css';
export function PlatformLayout() {
  const auth = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const profile = useFitnessList('profile').data?.[0]?.data;
  const space = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/study')
      ? 'study'
      : pathname.startsWith('/fitness')
        ? 'fitness'
        : 'home';
  const title = routeTitle(pathname, search);
  const links = spaceNavigation(space);
  const [more, setMore] = useState(false);
  const [account, setAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const focus = /\/practice\/[^/]+|\/tests\//.test(pathname) && !pathname.endsWith('/result');
  useEffect(() => {
    document.documentElement.dataset.space = space;
    document.documentElement.dataset.compact = String(profile?.compact ?? false);
  }, [space, profile?.compact]);
  useEffect(() => {
    document.title = `${title} · 知途个人管理平台`;
    setMore(false);
    setAccount(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const frame = requestAnimationFrame(() =>
      document.getElementById('main-content')?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [pathname, title]);
  const active = (to: string) =>
    space === 'admin'
      ? new URLSearchParams(to.split('?')[1]).get('view') ===
        (new URLSearchParams(search).get('view') ?? 'content')
      : pathname === to ||
        (to !== '/' && to !== '/study' && to !== '/fitness' && pathname.startsWith(to + '/'));
  const item = ([to, label]: string[]) => (
    <Link key={to} to={to} aria-current={active(to) ? 'page' : undefined}>
      {label}
    </Link>
  );
  return (
    <div className={`platform-shell ${focus ? 'task-focus' : ''}`}>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="global-bar">
        <Link to="/" className="brand-mark">
          <span>途</span>
          <strong>知途</strong>
        </Link>
        <nav className="global-spaces" aria-label="全局空间">
          <Link to="/" aria-current={space === 'home' ? 'page' : undefined}>
            <House size={18} />
            个人
          </Link>
          <Link to="/study" aria-current={space === 'study' ? 'page' : undefined}>
            <BookOpen size={18} />
            自学
          </Link>
          <Link to="/fitness" aria-current={space === 'fitness' ? 'page' : undefined}>
            <Activity size={18} />
            健身
          </Link>
          {auth.user?.role === 'ADMIN' && (
            <Link to="/admin" aria-current={space === 'admin' ? 'page' : undefined}>
              <ShieldCheck size={18} />
              管理
            </Link>
          )}
        </nav>
        <label className="mobile-space-switch">
          <span className="sr-only">切换空间</span>
          <select
            aria-label="切换空间"
            value={space}
            onChange={(e) => navigate(e.target.value === 'home' ? '/' : `/${e.target.value}`)}
          >
            <option value="home">个人首页</option>
            <option value="study">自学空间</option>
            <option value="fitness">健身空间</option>
            {auth.user?.role === 'ADMIN' && <option value="admin">管理工作台</option>}
          </select>
        </label>
        <button
          className="account-trigger"
          aria-label={`账号菜单，${profile?.displayName || auth.user?.username}`}
          aria-expanded={account}
          onClick={() => setAccount(!account)}
        >
          <span className="avatar">
            {(profile?.displayName || auth.user?.username || '途').slice(0, 1)}
          </span>
          <span>{profile?.displayName || auth.user?.username}</span>
          <ChevronDown size={16} />
        </button>
        {account && (
          <div className="account-menu">
            <Link to="/settings">
              <Settings size={18} />
              账号设置
            </Link>
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void auth
                  .signOut()
                  .finally(() => setBusy(false))
                  .catch(() => undefined);
              }}
            >
              <LogOut size={18} />
              {busy ? '退出中…' : '退出登录'}
            </button>
          </div>
        )}
      </header>
      <div className="space-bar">
        <div className="space-location">
          <span>
            {
              { home: '个人中心', study: '自学空间', fitness: '健身空间', admin: '管理工作台' }[
                space
              ]
            }
          </span>
          <strong>{title}</strong>
        </div>
        <nav aria-label="空间导航" className="space-navigation">
          {links.map(item)}
        </nav>
      </div>
      <nav className="phone-navigation" aria-label="手机主导航">
        {links.slice(0, 3).map(item)}
        <button aria-expanded={more} onClick={() => setMore(!more)}>
          更多
        </button>
      </nav>
      {more && (
        <nav className="phone-more" aria-label="更多入口">
          {links.slice(3).map(item)}
          <Link to="/settings">账号设置</Link>
        </nav>
      )}
      <div className="platform-workspace">
        <Outlet />
      </div>
      <footer className="platform-foot">
        <span>知途个人管理平台</span>
        <Link to="/">今日行动</Link>
      </footer>
    </div>
  );
}
