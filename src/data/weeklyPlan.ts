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
  tech: { label: 'Agent/求职', badge: 'bg-warn-soft text-warn' },
  admin: { label: '行政', badge: 'bg-surface-2 text-secondary' },
};

export const WEEKLY_PLANS: WeekPlan[] = [
  {
    id: 'w1',
    code: 'W1',
    stage: 'S0 冷启动',
    title: '切 06:00 早起节律 + 摸底与盘点',
    start: '2026-11-23',
    end: '2026-11-29',
    budget: '冷启动 ~24h（32 块）',
    focus: '先跑顺早起 2h + 晚 2.5h 作息，拿齐三线基线数据',
    tasks: [
      {
        id: 'w1-cpp-env',
        category: 'zikao',
        title: '配通本机 C++ 编译环境并过完教材大纲 + ch1',
        acceptance: '终端跑通 1 个带类的程序，抄出 ch1–3 应用类考核条目',
        route: '/zikao/plan',
      },
      {
        id: 'w1-java-diag',
        category: 'zikao',
        title: '13215 Java 限时盲做 1 套近年真题摸底',
        acceptance: '批改出分，确认是否稳 ≥75 并标出集合/IO 盲区',
        route: '/zikao/plan',
      },
      {
        id: 'w1-pets-diag',
        category: 'english',
        title: 'PETS-3 限时做 1 套真题摸底 + 启动早 06:00 词听习惯',
        acceptance: '基线分录入英语页；选定基础高频词表，连续 5 天早起 1h 不间断',
        route: '/english/schedule',
      },
      {
        id: 'w1-py-env',
        category: 'tech',
        title: '搭好 Python 工程环境（uv/venv + ruff + pytest）',
        acceptance: '跑通带类型注解和单测的最小工程脚手架',
        route: '/code/ai',
      },
      {
        id: 'w1-resume-base',
        category: 'tech',
        title: '盘点 5 年 Java 经历与现有 Agent 折腾素材，列简历框架',
        acceptance: '列出 2 个最硬 Java 业务项目 + 线上 Agent/评测踩坑点，明确 3 月双栈简历定位',
        route: '/code/backend',
      },
      {
        id: 'w1-fudan-call',
        category: 'admin',
        title: '致电确认复旦 8 门成绩单与 305 学院同等学力口径',
        acceptance: '021-65642673 问清结论并记录；日历设 12 月下旬 PETS-3 抢报与三级查分提醒',
        route: '/kaoyan/subjects',
      },
    ],
  },
  {
    id: 'w2',
    code: 'W2',
    stage: 'S1 地基建立',
    title: '38h 满负荷开跑：Java 推进 + 英语补基 + Agent 起步',
    start: '2026-11-30',
    end: '2026-12-06',
    budget: '36–38h（50 块）',
    focus: '验证 06:00–08:00 + 19:30–22:00 + 周末 8h 满载运转',
    tasks: [
      {
        id: 'w2-java-23',
        category: 'zikao',
        title: 'Java 刷完第 2–3 套真题并整理错题',
        acceptance: '只查错题点，重点背熟集合框架层次与 IO 类名',
        route: '/zikao/plan',
      },
      {
        id: 'w2-cpp-ch2',
        category: 'zikao',
        title: 'C++ 读完 ch2（面向对象基本概念）并敲通全部例题',
        acceptance: '课后题 + 近 6 年 ch2 真题拆刷正确率 ≥75%',
        route: '/zikao/plan',
      },
      {
        id: 'w2-ds-ch1',
        category: 'zikao',
        title: '数据结构 ch1（绪论 + 时空复杂度）过关',
        acceptance: '能独立推导常见循环与递归的时间复杂度',
        route: '/zikao/plan',
      },
      {
        id: 'w2-en-r1',
        category: 'english',
        title: '英语基础重建：每天早 1h 词+基础语法+逐句精听；周末精读精听',
        acceptance: '完成 1 套听力逐句听写/跟读到盲听全懂，累计背词达本周计划',
        route: '/english/schedule',
      },
      {
        id: 'w2-py-core',
        category: 'tech',
        title: 'Python 进阶：生成器、装饰器、pydantic 强校验与 pytest 单测',
        acceptance: '写出带严格入参校验与完整单测的工具模块',
        route: '/code/ai',
      },
      {
        id: 'w2-java-bagu1',
        category: 'tech',
        title: 'Java 后端托底一轮（集合 + 并发/JUC）+ 10 道高频算法题',
        acceptance: '能脱稿讲清 HashMap/ConcurrentHashMap/线程池/锁升级；10 题手敲 AC',
        route: '/code/backend',
      },
    ],
  },
  {
    id: 'w3',
    code: 'W3',
    stage: 'S1 地基建立',
    title: 'Java 结项封存 + FastAPI 流式骨架 + C++ ch3 上',
    start: '2026-12-07',
    end: '2026-12-13',
    budget: '36–38h（50 块）',
    focus: '先彻底清掉一门自考（Java），同时把 FastAPI 异步骨架立起来',
    tasks: [
      {
        id: 'w3-java-done',
        category: 'zikao',
        title: 'Java 完成第 4–5 套真题 + 1 页错题纸（正式结项封存！）',
        acceptance: '连续稳定 ≥75 分，封存至 3 月底考前再回看',
        route: '/zikao/plan',
      },
      {
        id: 'w3-cpp-ch3a',
        category: 'zikao',
        title: 'C++ ch3 上半：构造 / 析构 / 拷贝构造 / 深浅拷贝',
        acceptance: '例题全部敲通运行，脱稿说清必须写拷贝构造的 3 种场景',
        route: '/zikao/plan',
      },
      {
        id: 'w3-ds-ch2a',
        category: 'zikao',
        title: '数据结构 ch2：顺序表与单链表操作代码敲通',
        acceptance: '理解指针修改顺序，跑通增删改查',
        route: '/zikao/plan',
      },
      {
        id: 'w3-en-writing1',
        category: 'english',
        title: '每天早 1h 词+精听；周末阅读长难句拆解 + 1 篇 PETS-3 小作文',
        acceptance: '整理出 1 套应用文（书信/通知）高分框架句型',
        route: '/english/schedule',
      },
      {
        id: 'w3-py-async',
        category: 'tech',
        title: 'Python asyncio + FastAPI 异步服务骨架（含 SSE 流式输出）',
        acceptance: '接口支持超时/重试/日志/结构化错误响应并本地跑通流式对话',
        route: '/code/ai',
      },
      {
        id: 'w3-java-bagu2',
        category: 'tech',
        title: 'Java 后端托底（JVM 内存/GC + MySQL 索引与事务）+ 10 道算法',
        acceptance: '讲清 MVCC/B+树/死锁排查；累计高频算法 20 题',
        route: '/code/backend',
      },
    ],
  },
  {
    id: 'w4',
    code: 'W4',
    stage: 'S1 地基建立',
    title: '抢报 PETS-3 + LangGraph 状态机 + C++ ch3 难点',
    start: '2026-12-14',
    end: '2026-12-20',
    budget: '36–38h（50 块）',
    focus: '死盯上海 PETS-3 报名，同时攻下 C++ 最难章节与 Agent 状态流',
    tasks: [
      {
        id: 'w4-pets-reg',
        category: 'admin',
        title: '盯紧上海 PETS-3（2027-03 场）网报开放第一时间抢位缴费',
        acceptance: 'pets.neea.edu.cn 报名成功截屏存档（名额紧张）',
        route: '/english/schedule',
      },
      {
        id: 'w4-cpp-ch3b',
        category: 'zikao',
        title: 'C++ ch3 下半：常成员/常引用/this/静态/友元/封闭类',
        acceptance: '全部例题敲通 + 课后题对完答案',
        route: '/zikao/plan',
      },
      {
        id: 'w4-ds-ch2b',
        category: 'zikao',
        title: '数据结构 ch2 闭卷手写硬验收',
        acceptance: '不看书写出：顺序表按位增删 + 单链表头插建表 + 就地逆置',
        route: '/zikao/plan',
      },
      {
        id: 'w4-pets-mock2',
        category: 'english',
        title: '限时做第 2 套 PETS-3 整卷模考并录分复盘',
        acceptance: '分数较 W1 明显抬升，逐题拆出听力与阅读失分原因',
        route: '/english/schedule',
      },
      {
        id: 'w4-py-llm',
        category: 'tech',
        title: 'Agent 核心：Tool Calling 参数校验/重试 + LangGraph 状态机原型',
        acceptance: '能跑通多步骤 Plan/Tool/Fallback 闭环，防止模型幻觉参数崩掉流程',
        route: '/code/ai',
      },
      {
        id: 'w4-java-bagu3',
        category: 'tech',
        title: 'Java 后端托底（Redis 缓存/分布式锁/消息队列）+ 2 个 Bad Case 故事',
        acceptance: '整理出面试能讲 5 分钟的真实线上排障与高并发案例',
        route: '/code/backend',
      },
    ],
  },
  {
    id: 'w5',
    code: 'W5',
    stage: 'S1 地基建立',
    title: 'ch1–3 拆题验收 + MCP 接入 + 简历 v1 + 查三级分',
    start: '2026-12-21',
    end: '2026-12-27',
    budget: '36–38h（50 块）',
    focus: '用真题验前 4 周自考成色，同时把 Agent 简历 v1 写出来',
    tasks: [
      {
        id: 'w5-cpp-past13',
        category: 'zikao',
        title: 'C++ 拆刷近 6 年 ch1–3 真题 + 顺手做实验 1–3',
        acceptance: '拆题正确率 ≥75%，实验源码与运行结果截图留档',
        route: '/zikao/plan',
      },
      {
        id: 'w5-ds-ch3',
        category: 'zikao',
        title: '数据结构 ch3（栈/队列/括号匹配/递归）+ ch1–3 拆题',
        acceptance: '手算循环队列判空/判满，真题拆刷过关',
        route: '/zikao/plan',
      },
      {
        id: 'w5-en-essay',
        category: 'english',
        title: '每天早 1h 词+精听；写 1 篇 PETS-3 议论文并精修句式',
        acceptance: '定下 3 段式高分模板；复核 PETS-3 报名状态无误',
        route: '/english/schedule',
      },
      {
        id: 'w5-py-cli',
        category: 'tech',
        title: '封装第 1 个 MCP Server + Redis/SQLite 会话记忆持久化',
        acceptance: 'Agent 可通过标准 MCP 协议安全调用外部工具并支持中断恢复',
        route: '/code/ai',
      },
      {
        id: 'w5-resume-v1',
        category: 'tech',
        title: '输出面向上海 Agent / AI 后端岗的「双栈简历 v1」',
        acceptance: '突出 5 年 Java 后端 + Agent 工程治理（校验/记忆/MCP/评测），去水留干',
        route: '/code/ai',
      },
      {
        id: 'w5-ai-score',
        category: 'admin',
        title: '查人工智能训练师（三级）成绩并记账',
        acceptance: '过了记入 13011 转换待办；未过排明年 4 月后补考，不扰乱本周',
        route: '/other/ai-trainer',
      },
    ],
  },
  {
    id: 'w6',
    code: 'W6',
    stage: 'S1 结项验收',
    title: 'Stage 1 硬验收 + 元旦收口',
    start: '2026-12-28',
    end: '2027-01-03',
    budget: '~32h（42 块）',
    focus: '只认闭卷输出和可运行代码，清零欠账再切入 1–2 月攻坚期',
    tasks: [
      {
        id: 'w6-cpp-gate',
        category: 'zikao',
        title: 'C++ 闭卷验收：默写完整类 + ch1–3 错题清零',
        acceptance: '闭卷写出构造/析构/拷贝构造/常成员类，ch1–3 真题稳 ≥75%',
        route: '/zikao/plan',
      },
      {
        id: 'w6-ds-gate',
        category: 'zikao',
        title: '数据结构闭卷验收：表 / 链 / 栈 / 队核心手写',
        acceptance: '8 大算法拿下前 2 个并默写出对应时空复杂度',
        route: '/zikao/plan',
      },
      {
        id: 'w6-en-gate',
        category: 'english',
        title: '英语 S1 复盘：基础高频词过半 + 前 2 套真题错题清零',
        acceptance: '确认 PETS-3 已报上名，整理 1 月听力/阅读专项提分清单',
        route: '/english/schedule',
      },
      {
        id: 'w6-py-gate',
        category: 'tech',
        title: 'Agent 骨架收尾（FastAPI + LangGraph + MCP）+ 10 道算法',
        acceptance: '一键跑通 + pytest 全绿；高频算法累计 30 题，1 月切入 RAG/评测与线上部署',
        route: '/code/ai',
      },
      {
        id: 'w6-s2-plan',
        category: 'admin',
        title: '复盘 S1 实际周均专注块数，排定 S2（1–2 月）8 周目标',
        acceptance: '提前标出春节缓冲周与 2 月底自考报名前安全阀验收点',
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
