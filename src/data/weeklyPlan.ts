import type { WeeklyCategory } from '../lib/studyTracker';

export interface WeeklyTask {
  id: string;
  category: WeeklyCategory;
  title: string;
  acceptance: string;
  route?: string;
}

export interface WeekPlan {
  id: string;
  code: string;
  stage: string;
  title: string;
  start: string;
  end: string;
  budget: string;
  focus: string;
  tasks: WeeklyTask[];
}

export const CATEGORY_META: Record<WeeklyCategory, { label: string; badge: string }> = {
  zikao: { label: '自考', badge: 'bg-brand-soft text-brand-ink' },
  english: { label: '英语', badge: 'bg-success-soft text-success-ink' },
  tech: { label: '技术', badge: 'bg-warn-soft text-warn' },
  admin: { label: '行政', badge: 'bg-surface-2 text-secondary' },
};

export const WEEKLY_PLANS: WeekPlan[] = [
  {
    id: 'w1',
    code: 'W1',
    stage: 'S0 冷启动',
    title: '切轨道与摸底周',
    start: '2026-11-23',
    end: '2026-11-29',
    budget: '轻负荷 ~12h',
    focus: '不硬冲，把环境、基线分和复旦口径一次扫清',
    tasks: [
      {
        id: 'w1-cpp-env',
        category: 'zikao',
        title: '配通本机 C++ 编译环境并跑通 1 个带类的程序',
        acceptance: '终端可正常编译运行，过完 C++ 教材大纲 + ch1',
        route: '/zikao/plan',
      },
      {
        id: 'w1-java-diag',
        category: 'zikao',
        title: '13215 Java 限时盲做 1 套近年真题摸底',
        acceptance: '算出基线分，确认是否稳 ≥75 并标出薄弱点',
        route: '/zikao/plan',
      },
      {
        id: 'w1-pets-diag',
        category: 'english',
        title: 'PETS-3 限时做 1 套完整真题（含听力）',
        acceptance: '分数录入英语页，选定高频词表并启动每日 30min 词+听',
        route: '/english/schedule',
      },
      {
        id: 'w1-py-env',
        category: 'tech',
        title: '搭好 Python 工程环境并跑通带类型注解的脚本',
        acceptance: 'uv / venv + ruff + pytest 跑绿',
        route: '/code/ai',
      },
      {
        id: 'w1-fudan-call',
        category: 'admin',
        title: '致电/发邮件确认复旦 8 门成绩单与 305 学院口径',
        acceptance: '021-65642673，并设 12 月下旬 PETS-3 报名与三级查分提醒',
        route: '/kaoyan/subjects',
      },
    ],
  },
  {
    id: 'w2',
    code: 'W2',
    stage: 'S1 地基建立',
    title: 'Java 推进 + C++/数构起步',
    start: '2026-11-30',
    end: '2026-12-06',
    budget: '18–20h',
    focus: '建立在职工作日 2h + 周末 4.5h 的稳定节律',
    tasks: [
      {
        id: 'w2-java-23',
        category: 'zikao',
        title: 'Java 刷完第 2–3 套真题并记错题',
        acceptance: '只查错题点，重点记集合框架接口与 IO 类名',
        route: '/zikao/plan',
      },
      {
        id: 'w2-cpp-ch2',
        category: 'zikao',
        title: 'C++ 读完 ch2（面向对象基本概念）并敲通例题',
        acceptance: '课后题 + 对应真题正确率 ≥75%',
        route: '/zikao/plan',
      },
      {
        id: 'w2-ds-ch1',
        category: 'zikao',
        title: '数据结构过完 ch1（绪论与时空复杂度分析）',
        acceptance: '能手算常见循环与递归的时间复杂度',
        route: '/zikao/plan',
      },
      {
        id: 'w2-en-r1',
        category: 'english',
        title: '每日 30min 词+听；周末 1 篇精读 + 1 套听力精听',
        acceptance: '听力错题逐句复听直到听清连读/弱读',
        route: '/english/schedule',
      },
      {
        id: 'w2-py-core',
        category: 'tech',
        title: 'Python 进阶：生成器、装饰器、pydantic 校验与单测',
        acceptance: '写出带数据模型校验与 pytest 单测的小模块',
        route: '/code/ai',
      },
    ],
  },
  {
    id: 'w3',
    code: 'W3',
    stage: 'S1 地基建立',
    title: 'Java 结项封存 + C++ ch3 上半',
    start: '2026-12-07',
    end: '2026-12-13',
    budget: '18–20h',
    focus: '本周先彻底清掉一门自考（Java），拿到第一个确定胜利',
    tasks: [
      {
        id: 'w3-java-done',
        category: 'zikao',
        title: 'Java 完成第 4–5 套真题并整理 1 页错题纸（结项！）',
        acceptance: '连续稳定 ≥75 分，封存至 3 月底考前再回看',
        route: '/zikao/plan',
      },
      {
        id: 'w3-cpp-ch3a',
        category: 'zikao',
        title: 'C++ ch3 上半：构造 / 析构 / 拷贝构造 / 深浅拷贝',
        acceptance: '全部例题跑通，说清必须写拷贝构造的三种场景',
        route: '/zikao/plan',
      },
      {
        id: 'w3-ds-ch2a',
        category: 'zikao',
        title: '数据结构 ch2：顺序表与单链表操作',
        acceptance: '跑通顺序表按位增删与链表插入删除代码',
        route: '/zikao/plan',
      },
      {
        id: 'w3-en-writing1',
        category: 'english',
        title: '每日词+听；阅读专项 + 写 1 篇 PETS-3 应用文（小作文）',
        acceptance: '整理出 1 套书信/通知类高分模板句式',
        route: '/english/schedule',
      },
      {
        id: 'w3-py-async',
        category: 'tech',
        title: 'Python 异步编程：asyncio + httpx 并发请求实战',
        acceptance: '跑通带超时与限流控制的异步外部 API 调用',
        route: '/code/ai',
      },
    ],
  },
  {
    id: 'w4',
    code: 'W4',
    stage: 'S1 地基建立',
    title: '抢报 PETS-3 + 攻克 C++ ch3 难点',
    start: '2026-12-14',
    end: '2026-12-20',
    budget: '18–20h',
    focus: '盯紧上海 PETS-3 报名，同时拿下 C++ ch3 大纲自标难点',
    tasks: [
      {
        id: 'w4-pets-reg',
        category: 'admin',
        title: '盯紧上海 PETS-3（2027-03 场）网上报名并抢位缴费',
        acceptance: 'pets.neea.edu.cn 报名成功截屏存档（名额有限）',
        route: '/english/schedule',
      },
      {
        id: 'w4-cpp-ch3b',
        category: 'zikao',
        title: 'C++ ch3 下半：常成员/常引用/this/静态/友元/封闭类',
        acceptance: '例题跑通 + 课后题全部对答案',
        route: '/zikao/plan',
      },
      {
        id: 'w4-ds-ch2b',
        category: 'zikao',
        title: '数据结构 ch2 闭卷手写验收',
        acceptance: '不看书写出：顺序表增删 + 单链表头插建表 + 就地逆置',
        route: '/zikao/plan',
      },
      {
        id: 'w4-pets-mock2',
        category: 'english',
        title: '限时做第 2 套 PETS-3 整卷模考并记录成绩',
        acceptance: '分数明显高于 W1 摸底，向 75+ 靠拢',
        route: '/english/schedule',
      },
      {
        id: 'w4-py-llm',
        category: 'tech',
        title: '封装 1 个 Python LLM API 客户端模块',
        acceptance: '含重试、超时、结构化 Pydantic 输出与 pytest mock 测试',
        route: '/code/ai',
      },
    ],
  },
  {
    id: 'w5',
    code: 'W5',
    stage: 'S1 地基建立',
    title: 'ch1–3 真题拆刷 + 查三级成绩',
    start: '2026-12-21',
    end: '2026-12-27',
    budget: '18–20h',
    focus: '用真题检验前 4 周吸收率，避免“看过但不会做”',
    tasks: [
      {
        id: 'w5-cpp-past13',
        category: 'zikao',
        title: 'C++ 拆刷近 6 年真题里 ch1–3 题目 + 做实验 1–3',
        acceptance: '拆题正确率 ≥75%，顺手留存实验源码与运行截图',
        route: '/zikao/plan',
      },
      {
        id: 'w5-ds-ch3',
        category: 'zikao',
        title: '数据结构 ch3（栈、队列、括号匹配、递归）+ ch1–3 拆题',
        acceptance: '理解循环队列判空/判满条件，真题过关',
        route: '/zikao/plan',
      },
      {
        id: 'w5-en-essay',
        category: 'english',
        title: '每日词+听；写 1 篇 PETS-3 大作文（议论文）并精修',
        acceptance: '定下 3 段式高分论证结构，复核 PETS-3 报名状态',
        route: '/english/schedule',
      },
      {
        id: 'w5-py-cli',
        category: 'tech',
        title: '把 LLM 客户端包成可运行 CLI / 脚本并补齐 README',
        acceptance: '留好接口边界，1 月直接接入 FastAPI',
        route: '/code/ai',
      },
      {
        id: 'w5-ai-score',
        category: 'admin',
        title: '查人工智能训练师（三级）成绩并记账',
        acceptance: '过了记入 13011 转换待办；未过记录为 4 月后补考，不扰乱本周',
        route: '/other/ai-trainer',
      },
    ],
  },
  {
    id: 'w6',
    code: 'W6',
    stage: 'S1 结项验收',
    title: 'Stage 1 硬验收与元旦缓冲',
    start: '2026-12-28',
    end: '2027-01-03',
    budget: '~16h',
    focus: '只认闭卷输出，把欠账清零再切入 1–2 月核心攻坚期',
    tasks: [
      {
        id: 'w6-cpp-gate',
        category: 'zikao',
        title: 'C++ 闭卷验收：默写完整类 + ch1–3 错题二刷清零',
        acceptance: '能独立默写构造/析构/拷贝构造/常成员类，ch1–3 稳 ≥75%',
        route: '/zikao/plan',
      },
      {
        id: 'w6-ds-gate',
        category: 'zikao',
        title: '数据结构闭卷验收：表 / 链 / 栈 / 队核心手写',
        acceptance: '8 大算法已拿下前 2 个并记牢对应时空复杂度',
        route: '/zikao/plan',
      },
      {
        id: 'w6-en-gate',
        category: 'english',
        title: '英语 S1 复盘：高频词过半 + 前 2 套真题错题清零',
        acceptance: '确认 PETS-3 已报上名，整理 1 月听力/阅读提分计划',
        route: '/english/schedule',
      },
      {
        id: 'w6-py-gate',
        category: 'tech',
        title: 'Python 小项目收尾：一键运行且 pytest 全绿',
        acceptance: '代码结构干净，准备好 1 月切入 FastAPI + AI MVP',
        route: '/code/ai',
      },
      {
        id: 'w6-s2-plan',
        category: 'admin',
        title: '复盘 S1 实际周耗时并排好 S2（1–2 月）8 周目标',
        acceptance: '提前标出 2027-02-06 春节缓冲周，不透支节奏',
        route: '/zikao/plan',
      },
    ],
  },
];

/** 按今天日期自动定位当前所在周（早于 W1 返回 W1，晚于最后一周返回最后一周）。 */
export function findCurrentWeekIndex(todayIso: string): number {
  for (let i = 0; i < WEEKLY_PLANS.length; i++) {
    const w = WEEKLY_PLANS[i];
    if (todayIso >= w.start && todayIso <= w.end) return i;
  }
  if (todayIso < WEEKLY_PLANS[0].start) return 0;
  return WEEKLY_PLANS.length - 1;
}
