import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { authApi } from '../lib/api';
import { applyTheme, initialTheme } from '../lib/theme';
import qGirl from '../assets/q-girl.svg';
import { Sidebar } from './Sidebar';
import { SiteFooter } from './SiteFooter';
import { useUser } from '../lib/useSession';

export function AppShell() {
  const user = useUser();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dark, setDark] = useState(() => initialTheme());
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sheetOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSheetOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    applyTheme(next);
  }

  async function signOut() {
    await authApi.signOut();
    navigate('/login', { replace: true });
  }

  const initial = (user?.username ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-[1380px] items-center justify-between px-4 pt-5 pb-4 sm:px-6 lg:px-8">
        <Link to="/today" className="text-ink flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
          <span
            className="grid size-9 place-items-center overflow-hidden rounded-full shadow-[0_0_0_2px_#fff,0_6px_16px_rgba(15,23,42,0.12)]"
            style={{ background: 'linear-gradient(160deg, var(--blue-2) 0%, var(--iris-3) 100%)' }}
          >
            <img src={qGirl} alt="" className="size-full object-cover" draggable={false} />
          </span>
          菲比啾比卷卷卷
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
            title={dark ? '浅色模式' : '深色模式'}
            className="pill size-9 justify-center p-0 text-secondary hover:text-ink"
          >
            {dark ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />}
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setSheetOpen((v) => !v)}
              aria-expanded={sheetOpen}
              className="pill h-9 gap-2 px-2 text-[13px]"
            >
              <span className="bg-brand-soft text-brand-ink grid size-6 place-items-center rounded-full text-[12px] font-semibold">
                {initial}
              </span>
              <span className="text-ink hidden max-w-[7rem] truncate pr-1 sm:inline">
                {user?.username ?? '未登录'}
              </span>
            </button>

            {sheetOpen && (
              <div className="glass-panel absolute top-11 right-0 z-30 w-48 p-1.5">
                <p className="text-muted truncate px-3 pt-1.5 pb-2 text-[12px]">
                  {user?.role === 'ADMIN' ? '管理员' : '学员'}
                </p>
                <div className="hairline-t pt-1">
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="text-secondary hover:bg-surface-2/70 hover:text-ink flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-[13px] transition-colors"
                  >
                    <LogOut size={15} strokeWidth={1.8} /> 退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1380px] px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid items-start gap-4 lg:grid-cols-[216px_minmax(0,1fr)] lg:gap-5">
          <div className="lg:sticky lg:top-5">
            <Sidebar />
          </div>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>

      <div className="mt-auto">
        <SiteFooter />
      </div>
    </div>
  );
}
