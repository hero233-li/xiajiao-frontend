import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
export function AppHeader() {
  const auth = useAuth(); const [busy,setBusy] = useState(false);
  return <header className="app-header"><div className="app-header-inner"><Link to="/" className="brand"><BookOpen aria-hidden="true" size={24} />学习知途</Link><nav className="header-nav" aria-label="主导航"><NavLink to="/health">健康检查</NavLink><NavLink to="/components">公共组件</NavLink><NavLink to="/zikao">备考总览</NavLink>{auth.user?.role === 'ADMIN' && <NavLink to="/admin">管理入口</NavLink>}</nav><div className="account"><Button variant="ghost" loading={busy} loadingLabel="正在退出" onClick={() => { setBusy(true); void auth.signOut().catch(() => undefined).finally(() => setBusy(false)); }}><LogOut aria-hidden="true" size={20} />退出</Button></div></div></header>;
}
