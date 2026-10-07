import { AppLayout } from '../app/AppLayout';
import { studyRoutes } from './modules/study-routes';
import type { SpaceModule, Directory, Space, Preference } from './types';
/** Business implementations register here. The platform consumes this interface, never space ID branches. */
export const spaceModules: SpaceModule[] = [
  {
    id: 'study',
    entry: '/study',
    navigation: [
      ['/study', '今日'],
      ['/study/courses', '课程'],
      ['/study/schedule', '计划'],
      ['/study/training', '练习与检测'],
      ['/study/notes', '笔记'],
    ],
    routes: [{ element: <AppLayout />, children: studyRoutes }],
    load: () => import('./modules/study'),
  },
  {
    id: 'fitness',
    entry: '/fitness',
    navigation: [
      ['/fitness', '今天'],
      ['/fitness/training', '训练'],
      ['/fitness/meals', '饮食'],
      ['/fitness/weight', '体重'],
      ['/fitness/history', '历史'],
      ['/fitness/goals', '目标'],
      ['/fitness/templates', '模板库'],
    ],
    routes: [{ path: '/fitness/*', lazy: () => import('../pages/FitnessPage') }],
    load: () => import('./modules/fitness'),
  },
];
export const spaceRoutes = spaceModules.flatMap((m) => m.routes);
export const moduleFor = (id: string) => spaceModules.find((m) => m.id === id);
export function personalSpaces(
  directory: Directory,
  includeHidden = false,
): { space: Space; preference: Preference }[] {
  return directory.spaces
    .flatMap((space) => {
      const preference = directory.preferences.find((p) => p.spaceId === space.id);
      return preference?.joined &&
        (includeHidden || !preference.hidden) &&
        space.visible &&
        space.status === 'AVAILABLE' &&
        moduleFor(space.id)
        ? [{ space, preference }]
        : [];
    })
    .sort(
      (a, b) =>
        a.preference.position - b.preference.position ||
        a.space.order - b.space.order ||
        a.space.id.localeCompare(b.space.id),
    );
}
export function switchTarget(space: Space, preference?: Preference) {
  const saved = preference?.lastPath;
  // Editing routes are deliberately not resumed as a fresh form. Saved records have their own links.
  return saved &&
    space.entry &&
    (saved === space.entry ||
      saved.startsWith(space.entry + '/') ||
      saved.startsWith(space.entry + '?')) &&
    !/\/(edit|template-edit)\//.test(saved)
    ? saved
    : (space.entry ?? '/spaces');
}
