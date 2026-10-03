import { Navigate, type RouteObject } from 'react-router-dom';

import { RequireAuth } from '../features/auth/RequireAuth';
import { AppLayout } from './AppLayout';
const placeholder = () => import('../pages/PlaceholderPage');
const stub = (path: string, title: string): RouteObject => ({
  path,
  handle: { title },
  lazy: placeholder,
});
const children: RouteObject[] = [
  { path: '/login', lazy: () => import('../pages/LoginPage') },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          ...(import.meta.env.DEV
            ? [
                { path: '/health', lazy: () => import('../pages/HealthPage') },
                { path: '/components', lazy: () => import('../pages/ComponentsPage') },
                {
                  path: '/zikao/notes/quick-note-preview',
                  lazy: () => import('../pages/QuickNotePreviewPage'),
                },
              ]
            : []),
          { path: '/', element: <Navigate to="/zikao" replace /> },
          { path: '/zikao', lazy: () => import('../pages/DashboardPage') },
          { path: '/zikao/training', lazy: () => import('../pages/TrainingPage') },
          {
            path: '/zikao/courses',
            handle: { title: '我的科目' },
            lazy: () => import('../pages/CoursesPage'),
          },
          {
            path: '/zikao/schedule',
            handle: { title: '学习安排' },
            lazy: () => import('../pages/SchedulePage'),
          },
          {
            path: '/zikao/notes',
            handle: { title: '学习备注' },
            lazy: () => import('../pages/NotesPage'),
          },
          {
            path: '/zikao/course/:code/notes',
            handle: { title: '课程备注' },
            lazy: () => import('../pages/NotesPage'),
          },
          {
            path: '/zikao/course/:code/catalog',
            handle: { title: '课程目录' },
            lazy: () => import('../pages/CatalogPage'),
          },
          {
            path: '/zikao/course/:code/manual',
            handle: { title: '实践手册' },
            lazy: () => import('../pages/ManualPage'),
          },
          {
            path: '/zikao/course/:code/exams',
            handle: { title: '历年试卷与成绩' },
            lazy: () => import('../pages/ExamsPage'),
          },
          {
            path: '/zikao/course/:code/knowledge',
            handle: { title: '知识合集' },
            lazy: () => import('../pages/KnowledgePage'),
          },
          {
            path: '/zikao/course/:code/practice',
            handle: { title: '刷题' },
            lazy: () => import('../pages/PracticeSelectionPage'),
          },
          {
            path: '/zikao/course/:code/practice/:chapterId',
            handle: { title: '章节练习' },
            lazy: () => import('../pages/PracticePage'),
          },
          {
            path: '/zikao/course/:code/tests/:testId',
            handle: { title: '能力检测' },
            lazy: () => import('../pages/AssessmentPage'),
          },
          {
            path: '/zikao/course/:code/tests/:testId/result',
            handle: { title: '检测结果' },
            lazy: () => import('../pages/AssessmentPage'),
          },
          { element: <RequireAuth admin />, children: [stub('/admin/*', '管理入口')] },
        ],
      },
    ],
  },
  // 404 不受登录守卫遮挡；未知地址在任何登录状态下都能显示。
  { path: '*', lazy: () => import('../pages/NotFoundPage') },
];

export const routes: RouteObject[] = [{ lazy: () => import('./RouteRoot'), children }];
