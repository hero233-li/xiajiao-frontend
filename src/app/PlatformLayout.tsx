import { Link, Outlet, useLocation, useMatches } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  BookOpen,
  Menu,
  House,
  Layers,
  CalendarCheck,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFitnessList } from '../api/fitness';
import { routeTitle, adminNavigation } from './navigation';
import { useSpaces, recordVisit } from '../spaces/api';
import { moduleFor, personalSpaces, switchTarget } from '../spaces/registry';
import { SpaceSwitcher } from '../features/platform/SpaceSwitcher';
import '../styles/platform.css';
import '../styles/growth.css';
export function PlatformLayout() {
  const auth = useAuth();
  const location = useLocation();
  const { pathname, search, hash } = location;
  const client = useQueryClient();
  const directory = useSpaces();
  const profile = useFitnessList('profile').data?.[0]?.data;
  const current = directory.data?.spaces.find(
    (s) => s.entry && (pathname === s.entry || pathname.startsWith(s.entry + '/')),
  );
  const currentName = current?.name;
  const currentId = current?.id;
  const currentStatus = current?.status;
  const admin = pathname.startsWith('/admin');
  const module = current ? moduleFor(current.id) : undefined;
  const matches = useMatches();
  const handled = [...matches]
    .reverse()
    .find((match) => typeof (match.handle as { title?: unknown } | undefined)?.title === 'string');
  const knownTitle = routeTitle(pathname, search);
  const title =
    (handled?.handle as { title?: string } | undefined)?.title ??
    (knownTitle === '知途'
      ? (module?.navigation.find(([to]) => to === pathname)?.[1] ?? currentName ?? knownTitle)
      : knownTitle);
  const links = admin
    ? adminNavigation.map(([key, label]) => [`/admin?view=${key}`, label])
    : (module?.navigation ?? []);
  const [switching, setSwitching] = useState(false);
  const [more, setMore] = useState(false);
  const [account, setAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const favorite = directory.data
    ? personalSpaces(directory.data)
        .filter((x) => x.preference.favorite)
        .slice(0, 2)
    : [];
  useEffect(() => {
    document.documentElement.dataset.space = current?.id ?? (admin ? 'admin' : 'platform');
    document.documentElement.dataset.compact = String(profile?.compact ?? false);
  }, [current?.id, admin, profile?.compact]);
  useEffect(() => {
    document.title = `${title}${currentName ? ` · ${currentName}` : ''} · 知途`;
    setMore(false);
    setAccount(false);
    setSwitching(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const frame = requestAnimationFrame(() =>
      document.getElementById('main-content')?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [pathname, title, currentName]);
  useEffect(() => {
    if (!currentId || currentStatus !== 'AVAILABLE' || /\/(edit|template-edit)\//.test(pathname))
      return;
    const timer = setTimeout(() => {
      void recordVisit(currentId, pathname + search + hash)
        .then(() => client.invalidateQueries({ queryKey: ['space-directory'] }))
        .catch(() => undefined);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentId, currentStatus, pathname, search, hash, client]);
  useEffect(() => {
    if (!account) return;
    const close = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !event.target.closest('.account-menu,.account-trigger')
      )
        setAccount(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [account]);
  const active = (to: string) =>
    admin
      ? new URLSearchParams(to.split('?')[1]).get('view') ===
        (new URLSearchParams(search).get('view') ?? 'content')
      : pathname === to || (to !== current?.entry && pathname.startsWith(to + '/'));
  const item = ([to, label]: string[]) => (
    <Link key={to} to={to} aria-current={active(to) ? 'page' : undefined}>
      {label}
    </Link>
  );
  return (
    <div
      className={`platform-shell ${/\/practice\/[^/]+|\/tests\//.test(pathname) && !pathname.endsWith('/result') ? 'task-focus' : ''}`}
    >
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="global-bar">
        <Link to="/" className="brand-mark">
          <BookOpen size={26} strokeWidth={1.8} />
          <strong>
            知途<span className="brand-descriptor">个人成长</span>
          </strong>
        </Link>
        <nav className="global-spaces" aria-label="平台导航">
          <Link to="/" aria-current={pathname === '/' ? 'page' : undefined}>
            <House size={18} />
            首页
          </Link>
          <Link to="/today" aria-current={pathname === '/today' ? 'page' : undefined}>
            <CalendarCheck size={18} />
            今日任务
          </Link>
          <Link to="/spaces" aria-current={pathname === '/spaces' ? 'page' : undefined}>
            <Layers size={18} />
            空间目录
          </Link>
        </nav>
        <button
          className="space-switch-trigger"
          aria-haspopup="dialog"
          aria-expanded={switching}
          onClick={() => setSwitching(true)}
        >
          <Layers size={18} />
          <span>{current?.name ?? (admin ? '管理工作台' : '切换空间')}</span>
          <ChevronDown size={16} />
        </button>
        <div className="favorite-shortcuts">
          {favorite.map(({ space, preference }) => (
            <Link key={space.id} to={switchTarget(space, preference)}>
              {space.name}
            </Link>
          ))}
        </div>
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
          <div
            className="account-menu"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAccount(false);
                document.querySelector<HTMLElement>('.account-trigger')?.focus();
              }
            }}
          >
            <Link to="/settings">
              <Settings size={18} />
              账号设置
            </Link>
            {auth.user?.role === 'ADMIN' && (
              <Link to="/admin">
                <ShieldCheck size={18} />
                管理工作台
              </Link>
            )}
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
      {(current || admin) && (
        <div className="space-bar">
          <div className="space-location">
            <Link to="/spaces">空间</Link>
            <span>{current?.name ?? '管理工作台'}</span>
            <strong>{title}</strong>
          </div>
          {!admin && (
            <nav aria-label={admin ? '管理导航' : '空间内部导航'} className="space-navigation">
              {links.map(item)}
            </nav>
          )}
        </div>
      )}
      <nav className="phone-navigation" aria-label="手机主导航">
        <Link to="/" aria-current={pathname === '/' ? 'page' : undefined}>
          <House size={20} />
          首页
        </Link>
        <Link to="/today" aria-current={pathname === '/today' ? 'page' : undefined}>
          <CalendarCheck size={20} />
          今日
        </Link>
        <button aria-haspopup="dialog" onClick={() => setSwitching(true)}>
          <Layers size={20} />
          空间
        </button>
        <button aria-expanded={more} onClick={() => setMore(!more)}>
          <Menu size={20} />
          更多
        </button>
      </nav>
      {more && (
        <nav className="phone-more" aria-label="更多入口">
          {links.map(item)}
          <Link to="/spaces">空间目录</Link>
          <Link to="/settings">账号设置</Link>
          {auth.user?.role === 'ADMIN' && <Link to="/admin">管理工作台</Link>}
        </nav>
      )}
      {switching && directory.data && (
        <SpaceSwitcher directory={directory.data} close={() => setSwitching(false)} />
      )}{' '}
      {switching && !directory.data && (
        <div className="platform-notice" role="status">
          {directory.isError ? '空间读取失败，请进入空间目录重试。' : '正在读取空间…'}
          <Link to="/spaces" onClick={() => setSwitching(false)}>
            空间目录
          </Link>
          <button onClick={() => setSwitching(false)}>关闭</button>
        </div>
      )}
      <div className="platform-workspace">
        <Outlet />
      </div>
      <footer className="platform-foot">
        <span>知途 · 个人成长平台</span>
        <Link to="/spaces">整理我的空间</Link>
      </footer>
    </div>
  );
}
