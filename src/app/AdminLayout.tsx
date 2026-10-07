import { Link, Outlet, useSearchParams } from 'react-router-dom';
import { adminNavigation } from './navigation';
/** Independent management frame; never mounts study cycle or course providers. */
export function AdminLayout() {
  const [params] = useSearchParams();
  return (
    <div className="management-frame">
      <aside className="management-navigation">
        <p>管理工作台</p>
        <nav aria-label="管理工作台导航">
          {adminNavigation.map(([key, label]) => {
            const q = new URLSearchParams(params);
            q.set('view', key);
            return (
              <Link
                key={key}
                to={`/admin?${q}`}
                aria-current={(params.get('view') ?? 'content') === key ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main id="main-content" className="desk-main admin-workspace" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
