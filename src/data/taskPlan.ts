import type { WeeklyCategory } from '../lib/studyTracker';

export interface MonthlyGoal {
  id: string;
  monthId: string;
  category: WeeklyCategory;
  title: string;
  target: string;
  /** 关联的周任务 ID：有值时由这些周任务的完成情况自动汇总进度 */
  linkedWeeklyIds: string[];
}

export interface MonthPlan {
  id: string;
  label: string;
  range: string;
  stage: string;
  goals: MonthlyGoal[];
}

export interface WeeklyTask {
  id: string;
  monthGoalId: string;
  category: WeeklyCategory;
  title: string;
  acceptance: string;
  /** 本周建议推进天数（用于日→周联动展示） */
  targetDays: number;
  route?: string;
}

export interface WeekPlan {
  id: string;
  monthId: string;
  code: string;
  stage: string;
  title: string;
  start: string;
  end: string;
  budget: string;
  tasks: WeeklyTask[];
}

export interface DailySlot {
  slotId: string;
  time: string;
  category: WeeklyCategory;
  title: string;
  hint: string;
  /** 联动的周任务 ID（实时推动周任务打卡天数） */
  weeklyTaskId?: string;
  /** 联动的月目标 ID */
  monthGoalId?: string;
}

export const CATEGORY_META: Record<WeeklyCategory, { label: string; badge: string }> = {
  zikao: { label: '自考', badge: 'bg-brand-soft text-brand-ink' },
  english: { label: '英语', badge: 'bg-success-soft text-success-ink' },
  tech: { label: 'Agent/求职', badge: 'bg-warn-soft text-warn' },
  admin: { label: '行政', badge: 'bg-surface-2 text-secondary' },
};

export const WEEKLY_PLANS: WeekPlan[] = [
  {
    id: 'w1',
    monthId: '2026-12',
    code: 'W1',
    stage: 'S0 冷启动',
    title: '切早起节律与基线摸底',
    start: '2026-11-23',
    end: '2026-11-29',
    budget: '~24h',
    tasks: [
      {
        id: 'w1-cpp-env',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: '配通 C++ 环境 + 过完教材大纲与 ch1',
        acceptance: '终端跑通 1 个带类的程序',
        targetDays: 3,
        route: '/zikao/plan',
      },
      {
        id: 'w1-java-diag',
        monthGoalId: 'm-202612-java',
        category: 'zikao',
        title: 'Java（13215）限时盲做 1 套真题摸底',
        acceptance: '算出基线分，标出集合/IO 盲区',
        targetDays: 2,
        route: '/zikao/plan',
      },
      {
        id: 'w1-pets-diag',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: 'PETS-3 限时摸底 1 套 + 跑通每天 20 词三碰法',
        acceptance: '基线分录入英语页；早 06:00 新词 + 午/睡前复刷不断档',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w1-py-env',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '搭好 Python 工程环境（uv/venv + ruff + pytest）',
        acceptance: '跑通带类型注解和单测的脚手架',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w1-resume-base',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '盘点 5 年 Java 项目与现有 Agent 素材，列简历框架',
        acceptance: '确定 2 个核心 Java 项目 + 线上 Agent 亮点',
        targetDays: 1,
        route: '/code/backend',
      },
      {
        id: 'w1-fudan-call',
        monthGoalId: 'm-202612-en',
        category: 'admin',
        title: '致电确认复旦 8 门成绩单与 305 学院口径',
        acceptance: '021-65642673 问清结论，设 12 月下旬 PETS-3 抢报提醒',
        targetDays: 1,
        route: '/kaoyan/subjects',
      },
    ],
  },
  {
    id: 'w2',
    monthId: '2026-12',
    code: 'W2',
    stage: 'S1 地基建立',
    title: 'Java 推进 + C++/数构起步 + 英语补基',
    start: '2026-11-30',
    end: '2026-12-06',
    budget: '36–38h',
    tasks: [
      {
        id: 'w2-java-23',
        monthGoalId: 'm-202612-java',
        category: 'zikao',
        title: 'Java 刷完第 2–3 套真题并记错题',
        acceptance: '重点补集合框架接口与 IO 流类名',
        targetDays: 2,
        route: '/zikao/plan',
      },
      {
        id: 'w2-cpp-ch2',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ ch2（面向对象概念）例题跑通 + 拆题',
        acceptance: '对应真题正确率 ≥75%',
        targetDays: 3,
        route: '/zikao/plan',
      },
      {
        id: 'w2-ds-ch1',
        monthGoalId: 'm-202612-ds',
        category: 'zikao',
        title: '数据结构 ch1（绪论与时空复杂度）过关',
        acceptance: '能手算常见循环与递归复杂度',
        targetDays: 2,
        route: '/zikao/plan',
      },
      {
        id: 'w2-en-r1',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '每天 20 词三碰法 + 1 套真题听力逐句精听',
        acceptance: '听写跟读至盲听全懂，不积压复习队列',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w2-py-core',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'Python 进阶（装饰器/pydantic 强校验/单测）',
        acceptance: '完成带入参校验的工具模块',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w2-java-bagu1',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'Java 集合与并发/JUC 复盘 + 10 道高频算法',
        acceptance: '脱稿讲清线程池/锁升级，10 题手敲 AC',
        targetDays: 2,
        route: '/code/backend',
      },
    ],
  },
  {
    id: 'w3',
    monthId: '2026-12',
    code: 'W3',
    stage: 'S1 地基建立',
    title: 'Java 结项封存 + FastAPI 流式骨架',
    start: '2026-12-07',
    end: '2026-12-13',
    budget: '36–38h',
    tasks: [
      {
        id: 'w3-java-done',
        monthGoalId: 'm-202612-java',
        category: 'zikao',
        title: 'Java 完成第 4–5 套真题（≥75 封存！）',
        acceptance: '整理 1 页错题纸，之后封存到 3 月底',
        targetDays: 2,
        route: '/zikao/plan',
      },
      {
        id: 'w3-cpp-ch3a',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ ch3 上：构造 / 析构 / 拷贝构造 / 深浅拷贝',
        acceptance: '例题跑通，说清必须写拷贝构造的 3 种场景',
        targetDays: 3,
        route: '/zikao/plan',
      },
      {
        id: 'w3-ds-ch2a',
        monthGoalId: 'm-202612-ds',
        category: 'zikao',
        title: '数据结构 ch2：顺序表与单链表操作',
        acceptance: '增删改查代码跑通',
        targetDays: 2,
        route: '/zikao/plan',
      },
      {
        id: 'w3-en-writing1',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '每天 20 词三碰法 + 长难句拆解 + 1 篇应用文',
        acceptance: '定下 1 套书信/通知类高分模板',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w3-py-async',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'FastAPI 异步 + SSE 流式对话服务骨架',
        acceptance: '支持超时/重试/结构化错误与流式输出',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w3-java-bagu2',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'JVM 与 MySQL 索引/MVCC 复盘 + 10 道算法',
        acceptance: '高频算法累计 20 题',
        targetDays: 2,
        route: '/code/backend',
      },
    ],
  },
  {
    id: 'w4',
    monthId: '2026-12',
    code: 'W4',
    stage: 'S1 地基建立',
    title: '抢报 PETS-3 + LangGraph + C++ ch3 下',
    start: '2026-12-14',
    end: '2026-12-20',
    budget: '36–38h',
    tasks: [
      {
        id: 'w4-pets-reg',
        monthGoalId: 'm-202612-en',
        category: 'admin',
        title: '抢报上海 PETS-3（2027-03 场）并完成缴费',
        acceptance: 'pets.neea.edu.cn 报名成功截屏存档',
        targetDays: 1,
        route: '/english/schedule',
      },
      {
        id: 'w4-cpp-ch3b',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ ch3 下：常成员/常引用/this/友元/封闭类',
        acceptance: '例题跑通 + 课后题对答案',
        targetDays: 3,
        route: '/zikao/plan',
      },
      {
        id: 'w4-ds-ch2b',
        monthGoalId: 'm-202612-ds',
        category: 'zikao',
        title: '数据结构 ch2 闭卷手写：顺序表 + 链表逆置',
        acceptance: '不看书写出头插建表与就地逆置',
        targetDays: 2,
        route: '/zikao/plan',
      },
      {
        id: 'w4-pets-mock2',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '每天 20 词三碰法 + 限时第 2 套 PETS-3 整卷',
        acceptance: '分数录英语页，较 W1 明显抬升',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w4-py-llm',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'Tool Calling 校验重试 + LangGraph 状态机原型',
        acceptance: '跑通 Plan/Tool/Fallback 多步闭环',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w4-java-bagu3',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'Redis / 分布式锁 / MQ 复盘 + 2 个排障故事',
        acceptance: '能脱稿讲清 5 分钟真实线上 Bad Case',
        targetDays: 2,
        route: '/code/backend',
      },
    ],
  },
  {
    id: 'w5',
    monthId: '2026-12',
    code: 'W5',
    stage: 'S1 地基建立',
    title: 'ch1–3 拆题验收 + MCP + 简历 v1',
    start: '2026-12-21',
    end: '2026-12-27',
    budget: '36–38h',
    tasks: [
      {
        id: 'w5-cpp-past13',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ 近 6 年 ch1–3 拆题 + 实验 1–3',
        acceptance: '拆题正确率 ≥75%，保留实验运行截图',
        targetDays: 3,
        route: '/zikao/plan',
      },
      {
        id: 'w5-ds-ch3',
        monthGoalId: 'm-202612-ds',
        category: 'zikao',
        title: '数据结构 ch3（栈/队列/递归）+ ch1–3 拆题',
        acceptance: '循环队列判空满与真题过关',
        targetDays: 2,
        route: '/zikao/plan',
      },
      {
        id: 'w5-en-essay',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '每天 20 词三碰法 + 1 篇议论文精修',
        acceptance: '定下 3 段式大作文框架，复核 PETS-3 报名',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w5-py-cli',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '封装第 1 个 MCP Server + 会话记忆持久化',
        acceptance: '支持工具安全调用与中断续跑',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w5-resume-v1',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '完成上海 Agent / AI 后端「双栈简历 v1」',
        acceptance: '突出 Java 5 年 + Agent 工程治理能力',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w5-ai-score',
        monthGoalId: 'm-202612-en',
        category: 'admin',
        title: '查人工智能训练师（三级）成绩并记账',
        acceptance: '过了记 13011 转换，未过留待 4 月后补考',
        targetDays: 1,
        route: '/other/ai-trainer',
      },
    ],
  },
  {
    id: 'w6',
    monthId: '2026-12',
    code: 'W6',
    stage: 'S1 结项验收',
    title: 'Stage 1 闭卷硬验收与元旦收口',
    start: '2026-12-28',
    end: '2027-01-03',
    budget: '~32h',
    tasks: [
      {
        id: 'w6-cpp-gate',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ 闭卷默写完整类 + ch1–3 错题清零',
        acceptance: '独立默写构造/析构/拷贝/常成员，拆题 ≥75%',
        targetDays: 3,
        route: '/zikao/plan',
      },
      {
        id: 'w6-ds-gate',
        monthGoalId: 'm-202612-ds',
        category: 'zikao',
        title: '数据结构闭卷手写：表 / 链 / 栈 / 队',
        acceptance: '拿下 8 大算法前 2 个 + 复杂度表',
        targetDays: 2,
        route: '/zikao/plan',
      },
      {
        id: 'w6-en-gate',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '基础高频词过半 + 前 2 套真题错题清零',
        acceptance: 'PETS-3 已报上名，1 月转入高频刷卷',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w6-py-gate',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'Agent 骨架收尾跑通 + 10 道算法（累计 30 题）',
        acceptance: 'FastAPI + LangGraph + MCP 一键运行单测全绿',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w6-s2-plan',
        monthGoalId: 'm-202612-agent',
        category: 'admin',
        title: '复盘 S1 真实周工时，排定 1–2 月周目标',
        acceptance: '标好春节缓冲周与 2 月底自考报名前安全阀',
        targetDays: 1,
        route: '/zikao/plan',
      },
    ],
  },
];

export const MONTHLY_PLANS: MonthPlan[] = [
  {
    id: '2026-12',
    label: '2026 年 11–12 月',
    range: '11-23 ~ 01-03（W1–W6）',
    stage: 'S1 地基建立',
    goals: [
      {
        id: 'm-202612-java',
        monthId: '2026-12',
        category: 'zikao',
        title: 'Java（13215）一次性结项封存',
        target: '刷完 5 套真题稳 ≥75 分 + 1 页错题纸',
        linkedWeeklyIds: ['w1-java-diag', 'w2-java-23', 'w3-java-done'],
      },
      {
        id: 'm-202612-cpp',
        monthId: '2026-12',
        category: 'zikao',
        title: 'C++（04737）吃透 ch1–3',
        target: '闭卷默写完整类 + 近 6 年拆题 ≥75%',
        linkedWeeklyIds: ['w1-cpp-env', 'w2-cpp-ch2', 'w3-cpp-ch3a', 'w4-cpp-ch3b', 'w5-cpp-past13', 'w6-cpp-gate'],
      },
      {
        id: 'm-202612-ds',
        monthId: '2026-12',
        category: 'zikao',
        title: '数据结构（13003）过完 ch1–3',
        target: '闭卷手写顺序表增删、单链表逆置与栈队操作',
        linkedWeeklyIds: ['w2-ds-ch1', 'w3-ds-ch2a', 'w4-ds-ch2b', 'w5-ds-ch3', 'w6-ds-gate'],
      },
      {
        id: 'm-202612-en',
        monthId: '2026-12',
        category: 'english',
        title: '英语基础重建 + 抢报 PETS-3',
        target: '跑稳每天 20 词三碰法，高频词过半，报上 2027-03 场',
        linkedWeeklyIds: ['w1-pets-diag', 'w1-fudan-call', 'w2-en-r1', 'w3-en-writing1', 'w4-pets-reg', 'w4-pets-mock2', 'w5-en-essay', 'w5-ai-score', 'w6-en-gate'],
      },
      {
        id: 'm-202612-agent',
        monthId: '2026-12',
        category: 'tech',
        title: 'Agent 工程骨架 + 双栈简历 v1 + Java 托底',
        target: 'FastAPI + LangGraph + MCP 跑通、简历 v1、算法 30 题',
        linkedWeeklyIds: ['w1-py-env', 'w1-resume-base', 'w2-py-core', 'w2-java-bagu1', 'w3-py-async', 'w3-java-bagu2', 'w4-py-llm', 'w4-java-bagu3', 'w5-py-cli', 'w5-resume-v1', 'w6-py-gate', 'w6-s2-plan'],
      },
    ],
  },
  {
    id: '2027-01-02',
    label: '2027 年 1–2 月',
    range: '01-04 ~ 02-28（含春节缓冲）',
    stage: 'S2 核心攻坚',
    goals: [
      {
        id: 'm-202701-agent',
        monthId: '2027-01-02',
        category: 'tech',
        title: '工业级 Agent 线上 Demo 完工 + 算法 60 题',
        target: '混合 RAG + 自动评测 + Java 网关部署可体验，3 月直接投递',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202701-cpp',
        monthId: '2027-01-02',
        category: 'zikao',
        title: 'C++（04737）啃下 ch4–6 最重章节',
        target: '闭卷写运算符重载、继承与虚函数多态，拆题 ≥75%',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202701-ds',
        monthId: '2027-01-02',
        category: 'zikao',
        title: '数据结构（13003）攻克 ch4–6（树与图）',
        target: '闭卷手写二叉树遍历、BST 与 DFS/BFS',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202701-en',
        monthId: '2027-01-02',
        category: 'english',
        title: 'PETS-3 模考拉上 75+ + 报上 4 月自考',
        target: '词汇转二轮，累计 ≥5 套整卷模考；2 月底核查安全阀并报自考',
        linkedWeeklyIds: [],
      },
    ],
  },
  {
    id: '2027-03-04',
    label: '2027 年 3–4 月',
    range: '03-01 ~ 04-17',
    stage: 'S3 双考 + 面试兑现',
    goals: [
      {
        id: 'm-202703-pets',
        monthId: '2027-03-04',
        category: 'english',
        title: '3/20 拿下 PETS-3 高分（75–80+）',
        target: '心里彻底踏实，同时拿稳自考 13000 免考资格',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202703-offer',
        monthId: '2027-03-04',
        category: 'tech',
        title: '金三银四拿下上海 AI Agent / AI 后端 Offer',
        target: '直聊技术主管发线上 Demo 链接，顺利离开消耗的现岗位',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202703-se',
        monthId: '2027-03-04',
        category: 'zikao',
        title: '软件工程（13005）3 月突击过线',
        target: '背熟 30 核心术语 + 耦合内聚/测试用例大题 + 5 套整卷 ≥70',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202704-zikao',
        monthId: '2027-03-04',
        category: 'zikao',
        title: '4/10 自考四科全过 + 考后报实践/免考',
        target: '3/21 起四科 150 分钟整卷稳定 ≥70，考完跟进 4 门实践与转换',
        linkedWeeklyIds: [],
      },
    ],
  },
];

const WEEKLY_TASK_MAP = new Map<string, WeeklyTask>();
for (const w of WEEKLY_PLANS) {
  for (const t of w.tasks) WEEKLY_TASK_MAP.set(t.id, t);
}

export function getWeeklyTaskById(id: string): WeeklyTask | undefined {
  return WEEKLY_TASK_MAP.get(id);
}

export function findCurrentWeekIndex(todayIso: string): number {
  for (let i = 0; i < WEEKLY_PLANS.length; i++) {
    const w = WEEKLY_PLANS[i];
    if (todayIso >= w.start && todayIso <= w.end) return i;
  }
  if (todayIso < WEEKLY_PLANS[0].start) return 0;
  return WEEKLY_PLANS.length - 1;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysIso(iso: string, delta: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + delta);
  return formatIsoDate(d);
}

/** 获取某一周 7 天的 ISO 日期列表 */
export function weekDateList(week: WeekPlan): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(addDaysIso(week.start, i));
  return days;
}

/**
 * 按日期自动生成极简 5 条「今日任务」，每条明确绑定到当周周任务与当月月目标。
 * 英语专门内置「当天 3 次轻碰抗遗忘法」：早新学 15-20 词 + 语境精听 + 午休/睡前双复刷。
 */
export function buildDailySlots(dateIso: string): { week: WeekPlan; weekday: number; slots: DailySlot[] } {
  const weekIdx = findCurrentWeekIndex(dateIso);
  const week = WEEKLY_PLANS[weekIdx];
  const weekday = parseIsoDate(dateIso).getDay(); // 0=周日, 1..6=周一..周六

  const byCat = (cat: WeeklyCategory) => week.tasks.filter((t) => t.category === cat);
  const enTask = byCat('english')[0];
  const zikaoTasks = byCat('zikao');
  const techTasks = byCat('tech');
  const cppTask = zikaoTasks.find((t) => t.title.includes('C++')) ?? zikaoTasks[0];
  const javaOrDsTask =
    zikaoTasks.find((t) => t.title.includes('Java') || t.title.includes('数据结构')) ?? zikaoTasks[1] ?? cppTask;
  const dsTask = zikaoTasks.find((t) => t.title.includes('数据结构')) ?? javaOrDsTask;
  const agentTask = techTasks[0];
  const backendTask = techTasks[1] ?? techTasks[0];

  const isWeekend = weekday === 0 || weekday === 6;

  const englishSlots: DailySlot[] = [
    {
      slotId: 'en-new',
      time: isWeekend ? '08:00' : '06:00',
      category: 'english',
      title: '英语新词 15–20 个（只记读音 + 1 个核心义）',
      hint: '先清复习队列，新词跟读 2 遍、15 秒过，不抄拼写、不怕忘',
      weeklyTaskId: enTask?.id,
      monthGoalId: enTask?.monthGoalId,
    },
    {
      slotId: 'en-context',
      time: isWeekend ? '08:40' : '06:30',
      category: 'english',
      title: isWeekend ? '英语精读 + 真题听力/整卷练习' : '英语语境精听：1 段真题音频跟读 2 遍',
      hint: '把单词放进句子和声音里，边听边认比干背词表快 3 倍',
      weeklyTaskId: enTask?.id,
      monthGoalId: enTask?.monthGoalId,
    },
    {
      slotId: 'en-anti-forget',
      time: '午休 + 22:15',
      category: 'english',
      title: '抗遗忘双复刷：午休 5min + 睡前 5min 过今早 20 词',
      hint: '抢在 12 小时遗忘断崖前轻碰 2 次，睡前看一眼巩固率翻倍',
      weeklyTaskId: enTask?.id,
      monthGoalId: enTask?.monthGoalId,
    },
  ];

  // 周一三五：C++ 主攻；周二四：Java/数据结构 + Agent；周六：Agent 实战；周日：Java 托底 + 本周复盘
  if (weekday === 1 || weekday === 3 || weekday === 5) {
    return {
      week,
      weekday,
      slots: [
        englishSlots[0],
        englishSlots[1],
        {
          slotId: 'am-hard',
          time: '07:00',
          category: 'zikao',
          title: `清醒 1h 攻概念：${cppTask?.title ?? 'C++ 核心章节'}`,
          hint: '先看考核要求和真题长什么样，再翻书啃难点',
          weeklyTaskId: cppTask?.id,
          monthGoalId: cppTask?.monthGoalId,
        },
        englishSlots[2],
        {
          slotId: 'pm-main',
          time: '19:30',
          category: 'zikao',
          title: `晚间主块 2.5h：${cppTask?.title ?? 'C++ 敲例题与拆题'}`,
          hint: '3 个 45 分钟专注块，例题亲手敲通；22:00 闭眼复述 2 分钟',
          weeklyTaskId: cppTask?.id,
          monthGoalId: cppTask?.monthGoalId,
        },
      ],
    };
  }

  if (weekday === 2 || weekday === 4) {
    const eveningTarget = weekday === 2 ? javaOrDsTask : dsTask;
    return {
      week,
      weekday,
      slots: [
        englishSlots[0],
        englishSlots[1],
        {
          slotId: 'am-hard',
          time: '07:00',
          category: 'tech',
          title: `清醒 1h 推主线：${agentTask?.title ?? 'Python / Agent 实战'}`,
          hint: '推进 1 个可运行小步，写完立刻跑测试验证',
          weeklyTaskId: agentTask?.id,
          monthGoalId: agentTask?.monthGoalId,
        },
        englishSlots[2],
        {
          slotId: 'pm-main',
          time: '19:30',
          category: 'zikao',
          title: `晚间主块 2.5h：${eveningTarget?.title ?? 'Java 真题 / 数据结构手写'}`,
          hint: '以限时真题或闭卷手写代码为输出，22:00 复述收尾',
          weeklyTaskId: eveningTarget?.id,
          monthGoalId: eveningTarget?.monthGoalId,
        },
      ],
    };
  }

  if (weekday === 6) {
    return {
      week,
      weekday,
      slots: [
        englishSlots[0],
        englishSlots[1],
        {
          slotId: 'sat-agent',
          time: '13:30',
          category: 'tech',
          title: `周六整块 3.5h：${agentTask?.title ?? 'Agent 工业级项目写代码'}`,
          hint: '整块写代码效率最高，提交可运行的增量里程碑',
          weeklyTaskId: agentTask?.id,
          monthGoalId: agentTask?.monthGoalId,
        },
        {
          slotId: 'sat-review',
          time: '19:00',
          category: 'zikao',
          title: `周六晚验收：${cppTask?.title ?? '本周自考错题/拆题验收'}`,
          hint: '只认闭卷输出，20:30 强制停机放松',
          weeklyTaskId: cppTask?.id,
          monthGoalId: cppTask?.monthGoalId,
        },
        englishSlots[2],
      ],
    };
  }

  // 周日
  return {
    week,
    weekday,
    slots: [
      englishSlots[0],
      englishSlots[1],
      {
        slotId: 'sun-backend',
        time: '13:30',
        category: 'tech',
        title: `周日整块 3.5h：${backendTask?.title ?? 'Java 后端托底八股 + 算法'}`,
        hint: '脱稿讲核心题 + 手敲高频算法，20:30 前收工保周一状态',
        weeklyTaskId: backendTask?.id,
        monthGoalId: backendTask?.monthGoalId,
      },
      {
        slotId: 'sun-weekly-check',
        time: '19:00',
        category: 'zikao',
        title: `本周总复盘与补漏（切到「周任务」逐条核验打勾）`,
        hint: '核对本周每条周任务是否达标，联动刷新本月进度',
        weeklyTaskId: dsTask?.id,
        monthGoalId: dsTask?.monthGoalId,
      },
      englishSlots[2],
    ],
  };
}

/** 计算某条周任务在本周 7 天内已通过「每日任务」推进了几天 */
export function countDailyDaysForWeeklyTask(
  week: WeekPlan,
  weeklyTaskId: string,
  checked: Record<string, boolean>,
): number {
  let daysHit = 0;
  for (const iso of weekDateList(week)) {
    const { slots } = buildDailySlots(iso);
    const matched = slots.some(
      (s) => s.weeklyTaskId === weeklyTaskId && Boolean(checked[`day:${iso}:${s.slotId}`]),
    );
    if (matched) daysHit++;
  }
  return daysHit;
}
