import {
  Award,
  BookOpen,
  CalendarCheck,
  Code2,
  GraduationCap,
  Languages,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';

export interface NavLeaf {
  to: string;
  label: string;
}

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  children?: NavLeaf[];
}

/** 左侧菜单：一级入口 + 自考二级菜单。 */
export const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: '学习',
    items: [
      { to: '/today', label: '备考计划', icon: CalendarCheck },
      { to: '/daily', label: '日报', icon: NotebookPen },
      {
        to: '/zikao/courses',
        label: '自考',
        icon: BookOpen,
        children: [
          { to: '/zikao/courses', label: '自考我的科目' },
          { to: '/zikao/schedule', label: '考试日程' },
          { to: '/zikao/exams', label: '历年试卷' },
          { to: '/zikao/plan', label: '学习计划' },
          { to: '/zikao/lab', label: '实践演练' },
        ],
      },
      {
        to: '/kaoyan/subjects',
        label: '考研',
        icon: GraduationCap,
        children: [{ to: '/kaoyan/subjects', label: '我的科目' }],
      },
      {
        to: '/english/schedule',
        label: '英语',
        icon: Languages,
        children: [{ to: '/english/schedule', label: '英语考试日程' }],
      },
      {
        to: '/code/roadmap',
        label: '编程提升',
        icon: Code2,
        children: [
          { to: '/code/roadmap', label: '学习路线' },
          { to: '/code/frontend', label: '前端' },
          { to: '/code/backend', label: '后端' },
          { to: '/code/ai', label: 'AI' },
        ],
      },
      {
        to: '/other/ai-trainer',
        label: '其他考试',
        icon: Award,
        children: [{ to: '/other/ai-trainer', label: '人工智能训练师' }],
      },
    ],
  },
];

/** 所有可达路由（用于判断一级项是否高亮）。 */
export const leafRoutes = navGroups.flatMap((group) =>
  group.items.flatMap((item) => [item.to, ...(item.children ?? []).map((child) => child.to)]),
);
