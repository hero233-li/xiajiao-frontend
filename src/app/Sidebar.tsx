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
        className="text-secondary hover:text-ink flex w-full items-center justify-between rounded-[10px] px-2 py-1.5 text-[13px] lg:hidden"
      >
        <span className="flex items-center gap-2">
          <Menu size={16} strokeWidth={1.8} />
          菜单
        </span>
        <ChevronDown
          size={15}
          strokeWidth={1.8}
          className={`transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}
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
                    className={`flex items-center rounded-[12px] text-[14px] transition-colors ${
                      active ? 'bg-brand-soft text-brand-ink font-medium' : 'text-secondary hover:text-ink'
                    }`}
                  >
                    <Link to={to} className="flex flex-1 items-center gap-2.5 px-3 py-2">
                      <Icon size={17} strokeWidth={1.8} />
                      {label}
                    </Link>
                    {children && (
                      <button
                        type="button"
                        onClick={() => setOpenGroups((prev) => ({ ...prev, [to]: !open }))}
                        aria-label={open ? `收起${label}` : `展开${label}`}
                        aria-expanded={open}
                        className="pr-2 pl-1"
                      >
                        <ChevronDown
                          size={15}
                          strokeWidth={1.8}
                          className={`transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
                        />
                      </button>
                    )}
                  </div>

                  {children && open && (
                    <div className="mt-0.5 ml-[26px] flex flex-col gap-0.5 border-l border-line pl-2">
                      {children.map((child) => {
                        const isActive = pathname === child.to;
                        return (
                          <Link
                            key={child.to}
                            to={child.to}
                            aria-current={isActive ? 'page' : undefined}
                            className={`rounded-[9px] px-2.5 py-1.5 text-[13px] transition-colors ${
                              isActive
                                ? 'text-brand-ink bg-brand-soft/70 font-medium'
                                : 'text-secondary hover:text-ink'
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
