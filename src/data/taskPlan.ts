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
  tech: { label: 'Agent/工作', badge: 'bg-warn-soft text-warn' },
  admin: { label: '考研/行政', badge: 'bg-surface-2 text-secondary' },
};

/**
 * 串行极简周计划（W1–W6，2026-11-23 ~ 2027-01-03）：
 * - 自考：单科串行，W1–W6 全力只攻 04737 C++（一章一清：教材+例题+课后题+笔记+真题）
 * - 英语：PETS-3 只报笔试，每天 15–20 词三碰法防遗忘
 * - 工作/Agent：2 年测试背景 → 双投「AI 测开/Agent 评测」+「Python/AI Agent 应用开发」，不碰 Java 八股
 * - 考研：W1 仅打复旦核实电话，2027-04 自考完再启动
 */
export const WEEKLY_PLANS: WeekPlan[] = [
  {
    id: 'w1',
    monthId: '2026-12',
    code: 'W1',
    stage: 'S0 起步周',
    title: 'C++ ch1–2 + 英语摸底 + Python 跑通 API',
    start: '2026-11-23',
    end: '2026-11-29',
    budget: '起步 ~24h',
    tasks: [
      {
        id: 'w1-cpp-ch12',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ 第 1–2 章一章一清（含配通编译器 + 下 IMA 真题库）',
        acceptance: '教材 p29–90 + 例题敲通 + 课后题 + 笔记 + 挑 ch1–2 真题做完',
        targetDays: 5,
        route: '/zikao/plan',
      },
      {
        id: 'w1-en-start',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '每天 15–20 词三碰法 + 周末摸底 1 套 PETS-3 笔试真题',
        acceptance: '早新学 + 午/睡前各翻 5min；周末算清听力/阅读/写作基线分录入英语页',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w1-py-api',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '周末搭好 Python 环境（uv/venv + pytest），调通 1 次大模型 API',
        acceptance: '20 行脚本跑通并打印模型返回',
        targetDays: 1,
        route: '/code/ai',
      },
      {
        id: 'w1-qa-materials',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '列出 2 年软件测试最硬经历 + 自己折腾的 Agent/自动评测素材',
        acceptance: '写成一页要点草稿，作为下周简历与作品选题原料',
        targetDays: 1,
        route: '/code/backend',
      },
      {
        id: 'w1-fudan-call',
        monthGoalId: 'm-202612-en',
        category: 'admin',
        title: '白天致电复旦研招办（021-65642673）确认 8 门与 305 学院口径',
        acceptance: '问清自考成绩单怎么认 8 门；设 12 月下旬 PETS-3 抢报与三级查分提醒',
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
    title: 'C++ ch3 上 + Python/Pytest 进阶 + 英语精听',
    start: '2026-11-30',
    end: '2026-12-06',
    budget: '36–38h',
    tasks: [
      {
        id: 'w2-cpp-ch3a',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ 第 3 章上半：构造 / 析构 / 拷贝构造 / 深浅拷贝',
        acceptance: '例题全敲通 + 本章前半习题与笔记；脱稿说清必须写拷贝构造的 3 种场景',
        targetDays: 5,
        route: '/zikao/plan',
      },
      {
        id: 'w2-en-r1',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '每天 15–20 词三碰法 + 1 套 PETS-3 听力逐句精听',
        acceptance: '跟读到盲听全懂，按 W1 摸底丢分最多的板块定向补基',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w2-py-core',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'Python 进阶（类型注解 / pydantic 校验 / pytest 自动化测试）',
        acceptance: '写出带 Tool Call 参数校验与 pytest 用例的模块',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w2-qa-algo',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '测试开发核心复盘（接口/自动化框架）+ 10 道 Python 高频算法',
        acceptance: '整理自动化/排障亮点，10 道题手敲 AC',
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
    title: 'C++ ch3 下 + ch1–3 真题拆刷 + FastAPI 流式骨架',
    start: '2026-12-07',
    end: '2026-12-13',
    budget: '36–38h',
    tasks: [
      {
        id: 'w3-cpp-ch3b',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ 第 3 章下半（常成员/this/友元/封闭类）+ ch1–3 真题拆刷',
        acceptance: '近 6 年 ch1–3 拆题正确率 ≥75%，能闭卷写出带拷贝构造与常成员的完整类',
        targetDays: 5,
        route: '/zikao/plan',
      },
      {
        id: 'w3-en-writing1',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '每天 15–20 词三碰法 + 阅读长难句 + 1 篇 PETS-3 应用文',
        acceptance: '定下 1 套书信/通知类高分模板句型',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w3-fastapi-sse',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'FastAPI 异步 + SSE 流式对话服务骨架',
        acceptance: '支持超时、重试、限流、结构化错误与本地流式调用',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w3-eval-base',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '搭建 Agent 自动化回归评测脚手架（pytest + 评测指标）+ 10 题算法',
        acceptance: '能对 Prompt/工具调用跑自动断言，累计算法 20 题',
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
    title: '抢报 PETS-3 + C++ ch4 + LangGraph 状态机',
    start: '2026-12-14',
    end: '2026-12-20',
    budget: '36–38h',
    tasks: [
      {
        id: 'w4-pets-reg',
        monthGoalId: 'm-202612-en',
        category: 'admin',
        title: '盯紧上海 PETS-3（只报笔试）网报开放第一时间抢位缴费',
        acceptance: 'pets.neea.edu.cn 报名成功截屏存档',
        targetDays: 1,
        route: '/english/schedule',
      },
      {
        id: 'w4-cpp-ch4',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ 第 4 章（运算符重载）一章一清 + 真题拆刷',
        acceptance: '能闭卷重载 + 与 << 并区分成员/非成员重载，拆题 ≥75%',
        targetDays: 5,
        route: '/zikao/plan',
      },
      {
        id: 'w4-pets-mock2',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '每天 15–20 词三碰法 + 限时第 2 套 PETS-3 笔试整卷',
        acceptance: '分数录入英语页，较 W1 明显抬升并逐题复盘错因',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w4-langgraph',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'LangGraph 有状态工作流 + Tool Calling 幻觉校验与断点恢复',
        acceptance: '跑通 Plan / Tool / Fallback 闭环 + 写 1 组 Bad Case 回归测试',
        targetDays: 3,
        route: '/code/ai',
      },
    ],
  },
  {
    id: 'w5',
    monthId: '2026-12',
    code: 'W5',
    stage: 'S1 地基建立',
    title: 'C++ ch5 继承 + MCP 封装 + 简历 v1 + 查三级分',
    start: '2026-12-21',
    end: '2026-12-27',
    budget: '36–38h',
    tasks: [
      {
        id: 'w5-cpp-ch5',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ 第 5 章（类的继承与派生）一章一清 + 真题拆刷',
        acceptance: '吃透构造/析构顺序与继承方式差异，能基于基类设计派生类',
        targetDays: 5,
        route: '/zikao/plan',
      },
      {
        id: 'w5-en-essay',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '每天 15–20 词三碰法 + 写 1 篇议论文并精修句式',
        acceptance: '定下 3 段式大作文框架；复核 PETS-3 笔试报名无误',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w5-mcp-mem',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '封装第 1 个 MCP Server + 会话记忆持久化',
        acceptance: 'Agent 通过标准 MCP 协议安全调工具并支持中断续跑',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w5-resume-v1',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: '输出「AI 测开评测 & Agent 应用开发」简历 v1',
        acceptance: '融合 2 年测试 + 自动化回归评测 + Agent 工程治理，去水留干',
        targetDays: 2,
        route: '/code/backend',
      },
      {
        id: 'w5-ai-score',
        monthGoalId: 'm-202612-en',
        category: 'admin',
        title: '查人工智能训练师（三级）成绩并记账',
        acceptance: '过了记 13011 转换待办；未过排明年 4 月后补考',
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
    title: 'C++ ch6 多态验收 + S1 收口',
    start: '2026-12-28',
    end: '2027-01-03',
    budget: '~32h',
    tasks: [
      {
        id: 'w6-cpp-ch6',
        monthGoalId: 'm-202612-cpp',
        category: 'zikao',
        title: 'C++ 第 6 章（多态与虚函数）+ ch1–6 阶段验收',
        acceptance: '闭卷写虚函数多态并说清三条件与虚析构；ch4–6 拆题 ≥75%',
        targetDays: 5,
        route: '/zikao/plan',
      },
      {
        id: 'w6-en-gate',
        monthGoalId: 'm-202612-en',
        category: 'english',
        title: '英语 S1 复盘：基础高频词过半 + 前 2 套真题错题清零',
        acceptance: 'PETS-3 笔试已报上名，1 月转入高频刷整卷',
        targetDays: 6,
        route: '/english/schedule',
      },
      {
        id: 'w6-agent-gate',
        monthGoalId: 'm-202612-agent',
        category: 'tech',
        title: 'Agent + 评测骨架一键跑通单测全绿 + 10 题算法（累计 30 题）',
        acceptance: 'FastAPI + LangGraph + MCP + pytest 回归评测跑通，1 月接 RAG 与线上 Demo',
        targetDays: 2,
        route: '/code/ai',
      },
      {
        id: 'w6-s2-plan',
        monthGoalId: 'm-202612-agent',
        category: 'admin',
        title: '复盘 S1 实际周耗时，排定 1–2 月串行周目标',
        acceptance: '1 月初收完 C++ ch7–9 后切数据结构；标出春节缓冲周',
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
        id: 'm-202612-cpp',
        monthId: '2026-12',
        category: 'zikao',
        title: '自考单科串行：C++（04737）吃透 ch1–6 核心章',
        target: '一章一清（教材+例题+课后题+笔记+真题），闭卷拿下类/重载/继承/多态',
        linkedWeeklyIds: ['w1-cpp-ch12', 'w2-cpp-ch3a', 'w3-cpp-ch3b', 'w4-cpp-ch4', 'w5-cpp-ch5', 'w6-cpp-ch6'],
      },
      {
        id: 'm-202612-en',
        monthId: '2026-12',
        category: 'english',
        title: '英语基础重建 + 抢报 PETS-3 笔试',
        target: '跑稳每天 15–20 词三碰法，高频词过半，完成 2 套笔试模考并报上名',
        linkedWeeklyIds: ['w1-en-start', 'w1-fudan-call', 'w2-en-r1', 'w3-en-writing1', 'w4-pets-reg', 'w4-pets-mock2', 'w5-en-essay', 'w5-ai-score', 'w6-en-gate'],
      },
      {
        id: 'm-202612-agent',
        monthId: '2026-12',
        category: 'tech',
        title: 'Agent + 评测骨架跑通 & 双投简历 v1',
        target: 'FastAPI + LangGraph + MCP + pytest 回归评测跑通，输出测开评测/Agent 简历 v1，算法 30 题',
        linkedWeeklyIds: ['w1-py-api', 'w1-qa-materials', 'w2-py-core', 'w2-qa-algo', 'w3-fastapi-sse', 'w3-eval-base', 'w4-langgraph', 'w5-mcp-mem', 'w5-resume-v1', 'w6-agent-gate', 'w6-s2-plan'],
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
        title: '工业级 Agent + 自动评测线上 Demo 完工 + 算法 60 题',
        target: '混合 RAG + LLM-as-a-Judge 评测面板 + Docker 部署可体验，3 月直接投递',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202701-cpp-end',
        monthId: '2027-01-02',
        category: 'zikao',
        title: '1 月上旬收尾 C++ ch7–9 并刷 6 套整卷',
        target: 'C++ 全书通关，整卷模考拉到 ≥70 分',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202701-ds',
        monthId: '2027-01-02',
        category: 'zikao',
        title: '1 月中–2 月底串行吃透数据结构（13003）',
        target: '一章一清 ch1–8，闭卷手写 8 大核心算法 + 复杂度表',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202701-en',
        monthId: '2027-01-02',
        category: 'english',
        title: 'PETS-3 笔试模考拉上 75+ + 报上 4 月自考',
        target: '词汇转二轮，累计 ≥5 套整卷；2 月底视进度定 4 月报考科目数（保 3 争 4）',
        linkedWeeklyIds: [],
      },
    ],
  },
  {
    id: '2027-03-04',
    label: '2027 年 3–4 月',
    range: '03-01 ~ 04-17',
    stage: 'S3 双考 + 换工作兑现',
    goals: [
      {
        id: 'm-202703-pets',
        monthId: '2027-03-04',
        category: 'english',
        title: '3/20 拿下 PETS-3 笔试高分（75–80+）',
        target: '心里彻底踏实，同时拿稳自考 13000 免考资格',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202703-offer',
        monthId: '2027-03-04',
        category: 'tech',
        title: '金三银四拿下上海 AI 测开评测 / Agent 开发 Offer',
        target: '直聊技术主管发线上 Demo 链接，顺利离开消耗的现岗位',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202703-se',
        monthId: '2027-03-04',
        category: 'zikao',
        title: '软件工程（13005，测试主场）3 月串行突击',
        target: '背 30 核心术语 + 耦合内聚/测试用例大题 + 5–8 套整卷 ≥75',
        linkedWeeklyIds: [],
      },
      {
        id: 'm-202704-zikao',
        monthId: '2027-03-04',
        category: 'zikao',
        title: '4/10 自考所报科目全过 + 考后启动考研/雅思',
        target: '3/21 起每科狂刷 6–10 套整卷稳 ≥70，考完报实践并启动复旦 085400',
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

export function weekDateList(week: WeekPlan): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(addDaysIso(week.start, i));
  return days;
}

/**
 * 按日期自动生成极简 5 条「今日任务」，每条明确绑定当周周任务与当月月目标。
 * 自考走单科串行（W1–W6 全力只攻 C++），英语内置「当天 3 次轻碰抗遗忘法」。
 */
export function buildDailySlots(dateIso: string): { week: WeekPlan; weekday: number; slots: DailySlot[] } {
  const weekIdx = findCurrentWeekIndex(dateIso);
  const week = WEEKLY_PLANS[weekIdx];
  const weekday = parseIsoDate(dateIso).getDay(); // 0=周日, 1..6=周一..周六

  const byCat = (cat: WeeklyCategory) => week.tasks.filter((t) => t.category === cat);
  const enTask = byCat('english')[0];
  const zikaoTask = byCat('zikao')[0];
  const techTasks = byCat('tech');
  const agentTask = techTasks[0];
  const evalTask = techTasks[1] ?? techTasks[0];

  const isWeekend = weekday === 0 || weekday === 6;

  const englishSlots: DailySlot[] = [
    {
      slotId: 'en-new',
      time: isWeekend ? '08:00' : '06:00',
      category: 'english',
      title: '英语新词 15–20 个（听读音跟念 2 遍 + 1 个核心义）',
      hint: '先清复习队列，15 秒过一个，不抄拼写、不怕忘',
      weeklyTaskId: enTask?.id,
      monthGoalId: enTask?.monthGoalId,
    },
    {
      slotId: 'en-context',
      time: isWeekend ? '08:40' : '06:30',
      category: 'english',
      title: isWeekend ? 'PETS-3 笔试真题练习 / 听力精听' : '英语语境精听：1 段真题音频跟读 2 遍',
      hint: '把单词绑进声音和句子里，比干背词表快 3 倍',
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

  // 工作日一/三/五：全心推 C++（串行不切科）
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
          title: `清醒 1h 啃教材：${zikaoTask?.title ?? 'C++ 本周章节'}`,
          hint: '先扫 5 分钟大纲考核要求，再读正文，一章一清',
          weeklyTaskId: zikaoTask?.id,
          monthGoalId: zikaoTask?.monthGoalId,
        },
        englishSlots[2],
        {
          slotId: 'pm-main',
          time: '19:30',
          category: 'zikao',
          title: `晚间 2.5h 敲例题+习题：${zikaoTask?.title ?? 'C++ 本周章节'}`,
          hint: '例题亲手敲通 + 做课后题记笔记，22:00 闭眼复述 2 分钟',
          weeklyTaskId: zikaoTask?.id,
          monthGoalId: zikaoTask?.monthGoalId,
        },
      ],
    };
  }

  // 工作日二/四：早上推 Agent/Python，晚上补 C++ 或做测试/评测实战
  if (weekday === 2 || weekday === 4) {
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
          title: `清醒 1h 推 Agent：${agentTask?.title ?? 'Python / Agent 实战'}`,
          hint: '推进 1 个可运行小步，写完立刻跑 pytest 验证',
          weeklyTaskId: agentTask?.id,
          monthGoalId: agentTask?.monthGoalId,
        },
        englishSlots[2],
        {
          slotId: 'pm-main',
          time: '19:30',
          category: 'zikao',
          title: `晚间 2.5h 巩固：${zikaoTask?.title ?? 'C++ 习题与真题拆刷'}`,
          hint: '趁热做完本章课后题并抽 2019–2025 真题验收',
          weeklyTaskId: zikaoTask?.id,
          monthGoalId: zikaoTask?.monthGoalId,
        },
      ],
    };
  }

  // 周六：上午英语整卷/摸底，下午整块 Agent 写代码，晚上 C++ 拆题验收
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
          hint: '整块写代码效率最高，提交可运行增量成果',
          weeklyTaskId: agentTask?.id,
          monthGoalId: agentTask?.monthGoalId,
        },
        {
          slotId: 'sat-review',
          time: '19:00',
          category: 'zikao',
          title: `周六晚验收：${zikaoTask?.title ?? 'C++ 本周真题拆刷'}`,
          hint: '只认闭卷做题结果，20:30 强制停机放松',
          weeklyTaskId: zikaoTask?.id,
          monthGoalId: zikaoTask?.monthGoalId,
        },
        englishSlots[2],
      ],
    };
  }

  // 周日：下午整块 AI 测开评测/算法/简历，晚上周复盘打勾
  return {
    week,
    weekday,
    slots: [
      englishSlots[0],
      englishSlots[1],
      {
        slotId: 'sun-eval',
        time: '13:30',
        category: 'tech',
        title: `周日整块 3.5h：${evalTask?.title ?? 'AI 测开评测 / 算法 / 简历'}`,
        hint: '结合 2 年测试优势打磨自动化评测与简历亮点',
        weeklyTaskId: evalTask?.id,
        monthGoalId: evalTask?.monthGoalId,
      },
      {
        slotId: 'sun-weekly-check',
        time: '19:00',
        category: 'zikao',
        title: '本周总复盘（切到「周任务」逐条验收打勾）',
        hint: '核查本周 C++ / 英语 / Agent 交付物，20:30 收工保周一早起',
        weeklyTaskId: zikaoTask?.id,
        monthGoalId: zikaoTask?.monthGoalId,
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
