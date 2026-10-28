import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { authApi } from '../lib/api';
import qGirl from '../assets/q-girl.svg';
import { Sidebar } from './Sidebar';
import { SiteFooter } from './SiteFooter';
import { useUser } from '../lib/useSession';

export function AppShell() {
  const user = useUser();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  async function signOut() {
    await authApi.signOut();
    navigate('/login', { replace: true });
  }

  const initial = (user?.username ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex w-full items-center justify-between px-4 pt-5 pb-4 sm:px-6 lg:px-8">
        <Link to="/today" className="text-ink flex items-center gap-2.5 text-[15px] font-semibold">
          <span
            className="float-soft grid size-9 place-items-center overflow-hidden rounded-full shadow-[0_0_0_2px_#fff,0_6px_16px_rgba(15,23,42,0.12)]"
            style={{ background: 'linear-gradient(160deg, var(--blue-2) 0%, var(--iris-3) 100%)' }}
          >
            <img src={qGirl} alt="" className="size-full object-cover" draggable={false} />
          </span>
          菲比啾比卷卷卷
        </Link>

        <div className="relative">
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
            <div className="glass absolute top-11 right-0 z-20 w-52 p-1.5">
              <p className="text-secondary truncate px-3 pt-1.5 pb-2 text-[13px]">
                {user?.role === 'ADMIN' ? '管理员' : '学员'}
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-secondary hover:text-ink flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px]"
              >
                <LogOut size={16} strokeWidth={1.8} /> 退出登录
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="w-full px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-5">
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
