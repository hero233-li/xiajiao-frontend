/**
 * 每日计划清单（2026-11 → 2027-04）
 * 来源：用户 2026-11-04 定的五阶段计划。改内容只改这个文件。
 * 勾选规则：只勾真正做完的；没做完留空并在复盘里写原因。
 */

export interface CheckGroup {
  title?: string;
  hint?: string;
  items: string[];
}

export interface PlanPhase {
  id: string;
  /** 阶段名，如「阶段 A：三级冲刺」 */
  label: string;
  /** 一句话说明这段时间在干什么 */
  note?: string;
  from: string;
  to: string;
  daily: CheckGroup[];
  once: string[];
  check: string[];
}

export const PHASES: PlanPhase[] = [
  {
    id: 'A',
    label: '阶段 A：三级冲刺',
    note: '工作日 2h / 周末 3h，这个阶段只做人工智能三级',
    from: '2026-11-04',
    to: '2026-11-22',
    daily: [
      {
        items: [
          '理论：官方模拟卷（190 题）一组，限时 25 分钟',
          '理论：逐题回看今天错的题，标出「真不会」和「看错题干」',
          '实操：跑一个单元（业务分析 / 智能训练 / 智能系统设计 / 培训与指导 轮转）',
          '记录：今天的正确率',
        ],
      },
    ],
    once: [
      '装好虚拟机镜像，能跑通第一个实操环境',
      '下载实操素材（网盘），确认素材能打开',
      '过一遍指导手册第 2 部分「认定要素细目表」，知道考什么',
      '11 月 5 日前：学信网学历备案表 PDF 下载 + 打印',
      '11 月 5 日前：请假（11/6 下午）',
      '11 月 5 日前：毕业证复印、身份证备好、500 元准备好',
      '11 月 6 日 13:30 前到长宁校区主楼 216 室报名',
      '11 月中：下载准考证',
    ],
    check: ['理论知识整卷 ≥80 分', '实操 6 个单元全部跑过至少一遍'],
  },
  {
    id: 'B',
    label: '阶段 B：铺长期',
    note: '工作日 1.5h / 周末 5h，把 C++ 和数据结构铺开',
    from: '2026-11-23',
    to: '2026-12-31',
    daily: [
      {
        title: '英语（30 分钟，雷打不动）',
        items: ['不背单词：新词 10 个 + 全部复习', '阅读 1 篇（BBC Learning English / 分级读物），先猜后查', '复述：用英文说 3 句今天读了什么，录音'],
      },
      {
        title: 'C++（每周 2h，≥3 天各 20 分钟）',
        items: ['读教材当周章节', '书上例题亲手敲一遍并跑通', '课后习题做完对答案', '明天开始前：口头复述本章「识记/领会」条目'],
      },
      {
        title: '数据结构（每周 2h）',
        items: ['读当周章节', '手写一个数据结构定义 + 基本操作', '标出每个操作的复杂度'],
      },
    ],
    once: ['Java 真题 5 套一次做完（查漏用，6h）', 'Python 官方教程 ch3-9 过完（3h/周）', '修好 C++ 编译环境（sudo xcodebuild -license accept）'],
    check: ['C++ 第 1–3 章读完，例题全部跑通', '数据结构第 1–3 章过完，能手写顺序表和单链表', 'Java 真题做完，错题已回查'],
  },
  {
    id: 'C',
    label: '阶段 C：推进期',
    note: 'C++ 4–6 章 + 数据结构树图 + FastAPI',
    from: '2027-01-01',
    to: '2027-02-28',
    daily: [
      {
        title: '英语（45 分钟）',
        items: ['单词复习', '阅读 1 篇', '听力精听 15 分钟（6 Minute English，0.8 倍速影子跟读）'],
      },
      {
        title: 'C++（每周 3h）',
        items: ['当周章节读完', '例题跑通', '课后习题', '大纲自检'],
      },
      {
        title: '数据结构（每周 2h）',
        items: ['当周章节', '手写算法（按清单顺序推进）'],
      },
      {
        title: 'FastAPI（每周 4h）',
        items: ['官方教程一节', '把代码跑起来', '周末：往「用 FastAPI 重写 xiajiao 一个只读接口」推进一小步'],
      },
    ],
    once: [],
    check: [
      'C++ 第 4–6 章读完（重载、继承、多态）',
      '数据结构第 1–6 章过完，二叉排序树和 DFS/BFS 能默写',
      'FastAPI 能独立写一个带 Pydantic 模型和依赖的接口',
    ],
  },
  {
    id: 'D',
    label: '阶段 D：冲刺月',
    note: '工作日 2.5h / 周末 6h，四科 + 英语一起上',
    from: '2027-03-01',
    to: '2027-03-24',
    daily: [
      {
        items: [
          '英语：PETS-3 真题一套（3 月 20 日前每天一套听力 + 一篇阅读）',
          'C++：当周章节 or 真题一轮（按周计划）',
          '数据结构：当周章节 or 手写算法',
          '软件工程：当周章节（每天 1h）',
          '复盘：今天最不熟的一个点，一句话写下来',
        ],
      },
    ],
    once: ['3 月上旬：自考报名（4 月考期）', '3-20：PETS-3 笔试', '3 月中：AI 岗开始投简历'],
    check: ['四科第一轮全部结束', 'C++ 真题一轮（按章拆）完成', '软件工程 30 术语能默写'],
  },
  {
    id: 'E',
    label: '阶段 E：纯冲刺',
    note: '不再学新内容，只做整卷和错题',
    from: '2027-03-25',
    to: '2027-04-10',
    daily: [
      {
        items: [
          '一套整卷限时（四科轮转，150 分钟，按考试时间做）',
          '对答案，错的逐题标注原因（不会 / 记错 / 看错题）',
          '错题本过一遍前一天错的',
          '手写一个算法或一段程序（C++ 或数据结构）',
        ],
      },
      {
        title: '考前三天',
        hint: '04-07 起',
        items: ['只看错题本，不碰新题', '确认考试地点、时间、证件', '早睡'],
      },
    ],
    once: [],
    check: [],
  },
];

function toKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 某一天属于哪个阶段（按 yyyy-mm-dd 字符串比较，避免时区问题）。 */
export function phaseOf(dateKey: string): PlanPhase | null {
  return PHASES.find((phase) => dateKey >= phase.from && dateKey <= phase.to) ?? null;
}

export function phaseKeyOf(date = new Date()) {
  return toKey(date);
}

/** 阶段还剩多少天（含今天）。 */
export function daysLeftInPhase(phase: PlanPhase, dateKey: string) {
  const end = new Date(`${phase.to}T00:00:00`);
  const cur = new Date(`${dateKey}T00:00:00`);
  return Math.round((end.getTime() - cur.getTime()) / 86_400_000) + 1;
}

/** 稳定的条目 id：阶段 + 位置（内容改了顺序会变，改了就当新条目）。 */
export function dailyIds(phase: PlanPhase) {
  const ids: { id: string; text: string; group: number; title?: string; hint?: string }[] = [];
  phase.daily.forEach((group, gi) => {
    group.items.forEach((text, ii) => {
      ids.push({ id: `${phase.id}-d${gi}-${ii}`, text, group: gi, title: group.title, hint: group.hint });
    });
  });
  return ids;
}

export function onceIds(phase: PlanPhase) {
  return phase.once.map((text, i) => ({ id: `${phase.id}-o${i}`, text }));
}

export function checkIds(phase: PlanPhase) {
  return phase.check.map((text, i) => ({ id: `${phase.id}-c${i}`, text }));
}
