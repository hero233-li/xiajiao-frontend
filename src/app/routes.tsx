import { Navigate, useLocation, type RouteObject } from 'react-router-dom';

import { RequireAuth } from '../features/auth/RequireAuth';
import { AppLayout } from './AppLayout';
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
          { path: '/fitness/*', lazy: () => import('../pages/FitnessPage') },
          { path: '/zikao/*', element: <LegacyStudy /> },
          {
            element: <AppLayout />,
            children: [
              ...(import.meta.env.DEV
                ? [
                    { path: '/health', lazy: () => import('../pages/HealthPage') },
                    { path: '/components', lazy: () => import('../pages/ComponentsPage') },
                    {
                      path: '/study/notes/quick-note-preview',
                      lazy: () => import('../pages/QuickNotePreviewPage'),
                    },
                  ]
                : []),

              { path: '/study', lazy: () => import('../pages/DashboardPage') },
              { path: '/study/training', lazy: () => import('../pages/TrainingPage') },
              {
                path: '/study/courses',
                handle: { title: '我的科目' },
                lazy: () => import('../pages/CoursesPage'),
              },
              {
                path: '/study/schedule',
                handle: { title: '学习安排' },
                lazy: () => import('../pages/SchedulePage'),
              },
              {
                path: '/study/notes',
                handle: { title: '学习备注' },
                lazy: () => import('../pages/NotesPage'),
              },
              {
                path: '/study/course/:code/notes',
                handle: { title: '课程备注' },
                lazy: () => import('../pages/NotesPage'),
              },
              {
                path: '/study/course/:code/catalog',
                handle: { title: '课程目录' },
                lazy: () => import('../pages/CatalogPage'),
              },
              {
                path: '/study/course/:code/manual',
                handle: { title: '实践手册' },
                lazy: () => import('../pages/ManualPage'),
              },
              {
                path: '/study/course/:code/exams',
                handle: { title: '历年试卷与成绩' },
                lazy: () => import('../pages/ExamsPage'),
              },
              {
                path: '/study/course/:code/knowledge',
                handle: { title: '知识合集' },
                lazy: () => import('../pages/KnowledgePage'),
              },
              {
                path: '/study/course/:code/practice',
                handle: { title: '刷题' },
                lazy: () => import('../pages/PracticeSelectionPage'),
              },
              {
                path: '/study/course/:code/practice/:chapterId',
                handle: { title: '章节练习' },
                lazy: () => import('../pages/PracticePage'),
              },
              {
                path: '/study/course/:code/tests/:testId',
                handle: { title: '能力检测' },
                lazy: () => import('../pages/AssessmentPage'),
              },
              {
                path: '/study/course/:code/tests/:testId/result',
                handle: { title: '检测结果' },
                lazy: () => import('../pages/AssessmentPage'),
              },
              {
                element: <RequireAuth admin />,
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
