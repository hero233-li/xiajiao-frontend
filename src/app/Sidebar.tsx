import { useEffect, useState } from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { navGroups } from './nav';

export function Sidebar() {
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  // 移动端选完菜单就收起，别挡内容
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <aside className="glass h-max p-2">
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-expanded={mobileOpen}
        className="text-secondary hover:text-ink flex w-full items-center justify-between rounded-[14px] px-3 py-2 text-[13px] font-medium lg:hidden"
      >
        <span className="flex items-center gap-2">
          <Menu size={16} strokeWidth={1.8} />
          菜单
        </span>
        <ChevronDown
          size={15}
          strokeWidth={1.8}
          className={`transition-transform duration-[var(--duration)] ease-[var(--ease-out)] ${mobileOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <nav
        aria-label="首页菜单"
        className={`${mobileOpen ? 'flex' : 'hidden'} mt-1 flex-col gap-0.5 lg:mt-0 lg:flex`}
      >
        {navGroups.map((group) => (
          <div key={group.title} className="contents">
            {group.items.map(({ to, label, icon: Icon, children }) => {
              const childActive = (children ?? []).some((child) => pathname === child.to);
              const active = childActive || (!children && (pathname === to || pathname.startsWith(`${to}/`)));
              const open = openGroups[to] ?? childActive;

              return (
                <div key={to}>
                  <div
                    className={`flex items-center rounded-[14px] text-[13px] transition-colors duration-[var(--duration)] ease-[var(--ease-out)] ${
                      active
                        ? 'bg-brand-soft text-brand-ink font-medium'
                        : 'text-secondary hover:bg-surface-2/60 hover:text-ink'
                    }`}
                  >
                    <Link to={to} className="flex flex-1 items-center gap-2.5 px-3 py-2">
                      <Icon size={16} strokeWidth={active ? 2 : 1.75} className="shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                    {children && (
                      <button
                        type="button"
                        onClick={() => setOpenGroups((prev) => ({ ...prev, [to]: !open }))}
                        aria-label={open ? `收起${label}` : `展开${label}`}
                        aria-expanded={open}
                        className="grid size-7 place-items-center rounded-full pr-1 text-current opacity-70 hover:opacity-100"
                      >
                        <ChevronDown
                          size={14}
                          strokeWidth={1.8}
                          className={`transition-transform duration-[var(--duration)] ease-[var(--ease-out)] ${open ? '' : '-rotate-90'}`}
                        />
                      </button>
                    )}
                  </div>

                  {children && open && (
                    <div className="hairline-l mt-1 ml-[23px] flex flex-col gap-0.5 pl-2.5">
                      {children.map((child) => {
                        const isActive = pathname === child.to;
                        return (
                          <Link
                            key={child.to}
                            to={child.to}
                            aria-current={isActive ? 'page' : undefined}
                            className={`rounded-[10px] px-2.5 py-1.5 text-[13px] transition-colors duration-[var(--duration)] ease-[var(--ease-out)] ${
                              isActive
                                ? 'bg-brand-soft/80 text-brand-ink font-medium'
                                : 'text-secondary hover:bg-surface-2/60 hover:text-ink'
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
