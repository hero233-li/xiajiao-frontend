import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const profile = useFitnessList('profile').data?.[0]?.data;
  const space = pathname.startsWith('/fitness')
    ? 'fitness'
    : pathname.startsWith('/admin')
      ? 'admin'
      : pathname.startsWith('/study')
      ? 'study'
      : 'home';
  const links =
    space === 'fitness'
      ? [
          ['/fitness', '今天'],
          ['/fitness/training', '训练'],
          ['/fitness/meals', '食谱与饮食'],
          ['/fitness/weight', '体重'],
          ['/fitness/goals', '目标'],
          ['/fitness/templates', '模板库'],
          ['/fitness/history', '历史'],
        ]
      : space === 'admin'
        ? [['/admin?view=content', '草稿与发布'], ['/admin?view=courses', '课程维护'], ['/admin?view=rubrics', '评分标准'], ['/admin?view=files', '文件资料'], ['/admin?view=reviews', '审核'], ['/admin?view=audit', '审计记录']]
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
    const currentLabel = space === 'admin'
    ? (links.find(([to]) => new URLSearchParams(to.split('?')[1]).get('view') === new URLSearchParams(search).get('view'))?.[1] ?? '草稿与发布')
    : (links.filter(([to]) => pathname === to || pathname.startsWith(to + '/')).at(-1)?.[1] ?? (pathname === '/settings' ? '账号设置' : pathname.includes('/fitness/edit/') ? '编辑记录' : '学习任务'));
  const spaceLabel = {home:'个人中心', study:'自学空间', fitness:'健身空间', admin:'管理工作台'}[space];
  useEffect(() => {
    document.title = `${currentLabel} · 知途个人管理平台`;
    setMore(false);
    window.scrollTo({top:0, behavior:'instant'});
    requestAnimationFrame(() => document.getElementById('main-content')?.focus({preventScroll:true}));
  }, [pathname, search, currentLabel]);
  const item = (to: string, label: string) => space === 'admin'
    ? <Link key={to} to={to} className={label === currentLabel ? 'active' : ''} aria-current={label === currentLabel ? 'page' : undefined}>{label}</Link>
    : <NavLink key={to} to={to} end={to === '/' || to === '/study' || to === '/fitness'}>{label}</NavLink>;
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
            <p className="nav-caption">{spaceLabel}</p>
            <nav aria-label="空间导航">
              {links.map(([to, label]) => item(to, label))}
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
                navigate(e.target.value === 'home' ? '/' : `/${e.target.value}`);
              }}
            >
              <option value="home">个人首页</option>
              <option value="study">自学空间</option>
              <option value="fitness">健身空间</option>
              {auth.user?.role === 'ADMIN' && <option value="admin">管理工作台</option>}
            </select>
          </div>
          <span className="platform-context">{spaceLabel} <span aria-hidden="true"> / </span> <strong>{currentLabel}</strong></span>
          <Link to="/settings" className="platform-user">
            <span>{(profile?.displayName || auth.user?.username || '途').slice(0, 1)}</span>
            {profile?.displayName || auth.user?.username}
          </Link>
        </header>
        <nav className="mobile-tabs" aria-label="手机主导航">
          {links.slice(0, 3).map(([to, label]) => item(to, label))}
          <button aria-expanded={more} onClick={() => setMore(!more)}>更多</button>
        </nav>
        {more && <nav className="mobile-more" aria-label="更多入口">
          {links.slice(3).map(([to, label]) => item(to, label))}
          <Link to="/settings">账号设置</Link>
          {auth.user?.role === 'ADMIN' && space !== 'admin' && <Link to="/admin">管理工作台</Link>}
        </nav>}
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <Outlet />
        <footer className="platform-foot">
          知途个人管理平台 <Link to="/">返回个人首页</Link>
        </footer>
      </div>
    </div>
  );
}
