/** Explicit test fixtures only. Never imported by application entry points or production catalog. */
import type { Directory, SpaceModule } from './types';
export function testDirectory(count: 2 | 6 | 12): Directory {
  return {
    spaces: Array.from({ length: count }, (_, i) => ({
      id: i === 0 ? 'study' : i === 1 ? 'fitness' : `test-${i}`,
      name: i === 0 ? '自学' : i === 1 ? '健身' : `测试空间 ${i - 1}（仅验收）`,
      description: '明确标注的测试配置，不是已上线业务',
      icon: 'book',
      accent: '#4667ab',
      entry: i === 0 ? '/study' : i === 1 ? '/fitness' : `/test-${i}`,
      order: (i + 1) * 10,
      visible: true,
      status: 'AVAILABLE',
      permission: 'USER',
      defaultJoined: true,
    })),
    preferences: Array.from({ length: count }, (_, i) => ({
      spaceId: i === 0 ? 'study' : i === 1 ? 'fitness' : `test-${i}`,
      joined: true,
      favorite: i % 2 === 0,
      hidden: false,
      position: (i + 1) * 10,
      revision: -1,
      lastPath: null,
      visitedAt: null,
    })),
  };
}
export function testModule(id: string): SpaceModule {
  return {
    id,
    entry: `/${id}`,
    navigation: [[`/${id}`, '测试首页']],
    routes: [{ path: `/${id}`, lazy: () => import('./modules/test-only') }],
    load: () => import('./modules/test-only'),
  };
}
