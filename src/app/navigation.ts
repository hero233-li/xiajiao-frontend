export const adminNavigation = [
  ['content', '草稿与发布'],
  ['courses', '课程维护'],
  ['cycles', '考试周期'],
  ['files', '文件资料'],
  ['papers', '试卷维护'],
  ['rubrics', '评分标准'],
  ['alerts', '检测告警'],
  ['reviews', '通过审核'],
  ['credits', '作答审核'],
  ['audit', '审计记录'],
];
export function routeTitle(path: string, search: string) {
  if (path.startsWith('/admin'))
    return (
      adminNavigation.find(
        ([key]) => key === (new URLSearchParams(search).get('view') ?? 'content'),
      )?.[1] ?? '管理工作台'
    );
  if (path === '/fitness/first-week') return '第一周模板编辑';
  if (path.startsWith('/fitness/template-edit/')) return '个人模板编辑';
  if (path.startsWith('/fitness/edit/')) return '编辑健身记录';
  if (path.startsWith('/study/course/')) {
    if (path.includes('/tests/')) return path.endsWith('/result') ? '检测结果' : '检测作答';
    if (/\/practice\/[^/]+/.test(path)) return '章节练习';
    return (
      (
        {
          catalog: '阅读与进度',
          knowledge: '知识索引',
          manual: '实践手册',
          practice: '练习与检测',
          notes: '课程笔记',
          exams: '真题与成绩',
        } as Record<string, string>
      )[path.split('/').at(-1) ?? ''] ?? '课程'
    );
  }
  return (
    (
      {
        '/': '个人首页',
        '/settings': '账号设置',
        '/study': '今日学习',
        '/study/courses': '我的科目',
        '/study/schedule': '学习计划',
        '/study/training': '练习与检测',
        '/study/notes': '学习笔记',
        '/fitness': '健身今天',
        '/fitness/training': '训练',
        '/fitness/meals': '食谱与饮食',
        '/fitness/weight': '体重',
        '/fitness/goals': '目标',
        '/fitness/history': '历史',
        '/fitness/templates': '模板库',
      } as Record<string, string>
    )[path] ?? '知途'
  );
}
export function spaceNavigation(space: string) {
  if (space === 'admin')
    return adminNavigation.map(([key, title]) => [`/admin?view=${key}`, title]);
  if (space === 'study')
    return [
      ['/study', '今日'],
      ['/study/courses', '课程'],
      ['/study/schedule', '计划'],
      ['/study/training', '练习与检测'],
      ['/study/notes', '笔记'],
    ];
  if (space === 'fitness')
    return [
      ['/fitness', '今天'],
      ['/fitness/training', '训练'],
      ['/fitness/meals', '饮食'],
      ['/fitness/weight', '体重'],
      ['/fitness/history', '历史'],
      ['/fitness/goals', '目标'],
      ['/fitness/templates', '模板库'],
    ];
  return [
    ['/', '今日行动'],
    ['/settings', '账号设置'],
  ];
}
