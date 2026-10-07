import type { RouteObject } from 'react-router-dom';
export const studyRoutes: RouteObject[] = [
  { path: '/study', lazy: () => import('../../pages/DashboardPage') },
  { path: '/study/training', lazy: () => import('../../pages/TrainingPage') },
  {
    path: '/study/courses',
    handle: { title: '我的科目' },
    lazy: () => import('../../pages/CoursesPage'),
  },
  {
    path: '/study/schedule',
    handle: { title: '学习安排' },
    lazy: () => import('../../pages/SchedulePage'),
  },
  {
    path: '/study/notes',
    handle: { title: '学习备注' },
    lazy: () => import('../../pages/NotesPage'),
  },
  {
    path: '/study/course/:code/notes',
    handle: { title: '课程备注' },
    lazy: () => import('../../pages/NotesPage'),
  },
  {
    path: '/study/course/:code/catalog',
    handle: { title: '课程目录' },
    lazy: () => import('../../pages/CatalogPage'),
  },
  {
    path: '/study/course/:code/manual',
    handle: { title: '实践手册' },
    lazy: () => import('../../pages/ManualPage'),
  },
  {
    path: '/study/course/:code/exams',
    handle: { title: '历年试卷与成绩' },
    lazy: () => import('../../pages/ExamsPage'),
  },
  {
    path: '/study/course/:code/knowledge',
    handle: { title: '知识合集' },
    lazy: () => import('../../pages/KnowledgePage'),
  },
  {
    path: '/study/course/:code/practice',
    handle: { title: '刷题' },
    lazy: () => import('../../pages/BankPage'),
  },
  {
    path: '/study/course/:code/practice/:chapterId',
    handle: { title: '章节练习' },
    lazy: () => import('../../pages/BankPage'),
  },
  {
    path: '/study/course/:code/tests/rebuilt/:testId',
    handle: { title: '独立试卷与评分' },
    lazy: () => import('../../pages/BankAssessmentPage'),
  },
  {
    path: '/study/course/:code/tests/:testId',
    handle: { title: '能力检测' },
    lazy: () => import('../../pages/AssessmentPage'),
  },
  {
    path: '/study/course/:code/tests/:testId/result',
    handle: { title: '检测结果' },
    lazy: () => import('../../pages/AssessmentPage'),
  },
];
