import { Navigate, useLocation, type RouteObject } from 'react-router-dom';

import { RequireAuth } from '../features/auth/RequireAuth';
import { AppLayout } from './AppLayout';
import { AdminLayout } from './AdminLayout';
import { spaceRoutes } from '../spaces/registry';
import { PlatformLayout } from './PlatformLayout';
function LegacyStudy() {
  const location = useLocation();
  return (
    <Navigate
      to={location.pathname.replace('/zikao', '/study') + location.search + location.hash}
      replace
    />
  );
}
const children: RouteObject[] = [
  { path: '/login', lazy: () => import('../pages/LoginPage') },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <PlatformLayout />,
        children: [
          { path: '/', lazy: () => import('../pages/PersonalPage') },
          { path: '/settings', lazy: () => import('../pages/SettingsPage') },
          { path: '/spaces', lazy: () => import('../pages/SpacesPage') },
          { path: '/today', lazy: () => import('../pages/TodayPage') },
          { path: '/zikao/*', element: <LegacyStudy /> },
          ...spaceRoutes,
          ...(import.meta.env.DEV
            ? [
                { path: '/health', lazy: () => import('../pages/HealthPage') },
                { path: '/components', lazy: () => import('../pages/ComponentsPage') },
                {
                  element: <AppLayout />,
                  children: [
                    {
                      path: '/study/notes/quick-note-preview',
                      lazy: () => import('../pages/QuickNotePreviewPage'),
                    },
                  ],
                },
              ]
            : []),
          {
            element: <RequireAuth admin />,
            children: [
              {
                element: <AdminLayout />,
                children: [{ path: '/admin/*', lazy: () => import('../pages/AdminPage') }],
              },
            ],
          },
        ],
      },
    ],
  },
  // 404 不受登录守卫遮挡；未知地址在任何登录状态下都能显示。
  { path: '*', lazy: () => import('../pages/NotFoundPage') },
];

export const routes: RouteObject[] = [{ lazy: () => import('./RouteRoot'), children }];
