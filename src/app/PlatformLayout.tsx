import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Activity,
  Settings,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFitnessList } from '../api/fitness';
import { useEffect, useState } from 'react';
import '../styles/platform.css';
export function PlatformLayout() {
  const auth = useAuth();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  const profile = useFitnessList('profile').data?.[0]?.data;
  const space = pathname.startsWith('/fitness')
    ? 'fitness'
    : pathname.startsWith('/study') || pathname.startsWith('/admin')
      ? 'study'
      : 'home';
  const links =
    space === 'fitness'
      ? [
          ['/fitness', '今天'],
          ['/fitness/goals', '目标'],
          ['/fitness/training', '训练计划'],
          ['/fitness/meals', '食谱与饮食'],
          ['/fitness/weight', '体重'],
          ['/fitness/history', '打卡与历史'],
        ]
      : space === 'study'
        ? [
            ['/study', '今日学习'],
            ['/study/courses', '我的科目'],
            ['/study/training', '练习与检测'],
            ['/study/schedule', '学习计划'],
            ['/study/notes', '学习笔记'],
          ]
        : [
            ['/', '个人首页'],
            ['/settings', '账号设置'],
          ];
  useEffect(() => {
    document.documentElement.dataset.space = space;
    document.documentElement.dataset.compact = String(profile?.compact ?? false);
    return () => {
      delete document.documentElement.dataset.space;
    };
  }, [space, profile?.compact]);
  return (
    <div className="platform-shell">
      <aside className="platform-rail">
        <Link to="/" className="platform-logo">
          <span>途</span>
          <strong>
            知途<small>个人管理平台</small>
          </strong>
        </Link>
        <NavLink to="/" end className="home-link">
          <Home size={18} />
          个人首页
        </NavLink>
        <p className="nav-caption">我的空间</p>
        <div className="space-switch">
          <NavLink to="/study">
            <BookOpen size={18} />
            自学空间
            <ArrowUpRight size={14} />
          </NavLink>
          <NavLink to="/fitness">
            <Activity size={18} />
            健身空间
            <ArrowUpRight size={14} />
          </NavLink>
        </div>
        {space !== 'home' && (
          <>
            <p className="nav-caption">{space === 'fitness' ? '健身管理' : '自学管理'}</p>
            <nav aria-label="空间导航">
              {links.map(([to, label]) => (
                <NavLink key={to} to={to} end={to === '/fitness' || to === '/study'}>
                  {label}
                </NavLink>
              ))}
            </nav>
          </>
        )}
        <div className="rail-bottom">
          {auth.user?.role === 'ADMIN' && (
            <NavLink to="/admin">
              <ShieldCheck size={18} />
              管理员工作台
            </NavLink>
          )}
          <NavLink to="/settings">
            <Settings size={18} />
            账号设置
          </NavLink>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void auth
                .signOut()
                .catch(() => undefined)
                .finally(() => setBusy(false));
            }}
          >
            <LogOut size={18} />
            {busy ? '退出中…' : '退出登录'}
          </button>
        </div>
      </aside>
      <div className="platform-workspace">
        <header className="platform-top">
          <div className="mobile-brand">
            <Link to="/">知途</Link>
            <select
              aria-label="切换空间"
              value={space}
              onChange={(e) => {
                window.location.assign(e.target.value === 'home' ? '/' : `/${e.target.value}`);
              }}
            >
              <option value="home">个人首页</option>
              <option value="study">自学空间</option>
              <option value="fitness">健身空间</option>
            </select>
          </div>
          <span className="platform-context">
            {space === 'fitness'
              ? '健身空间 / 日常记录'
              : space === 'study'
                ? '自学空间 / 持续积累'
                : '个人首页 / 有序生活'}
          </span>
          <Link to="/settings" className="platform-user">
            <span>{(profile?.displayName || auth.user?.username || '途').slice(0, 1)}</span>
            {profile?.displayName || auth.user?.username}
          </Link>
        </header>
        <nav className="mobile-tabs" aria-label="手机导航">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/' || to === '/fitness' || to === '/study'}>
              {label}
            </NavLink>
          ))}
          {auth.user?.role === 'ADMIN' && <NavLink to="/admin">管理</NavLink>}
        </nav>
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <Outlet />
        <footer className="platform-foot">
          知途 · 记录每一步，留给自己看 <Link to="/">返回个人首页</Link>
        </footer>
      </div>
    </div>
  );
}
