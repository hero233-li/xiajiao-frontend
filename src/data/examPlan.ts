/**
 * 考试计划（即将到来的考试按时间先后排列，已考场次沉底）。
 * confirmed=true 表示官方已发布；false 表示按往年规律预估，官方公布后改这里即可。
 */
export type PlanItem = {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** 日期旁的补充说明（场次/报名窗口/预估依据） */
  note?: string;
  confirmed: boolean;
};

export const EXAM_PLAN: PlanItem[] = [
  {
    id: 'pets-3',
    title: '公共英语三级（PETS-3 笔试）',
    date: '2027-03-20',
    note: '只报笔试不报口语；目标冲高分（75–80+），免考自考 13000；2026 年 12 月下旬盯紧上海抢报',
    confirmed: false,
  },
  {
    id: 'zikao-2027-04',
    title: '2027 年 4 月自考',
    date: '2027-04-10',
    note: '串行推进：C++ → 数据结构 → 软件工程（测试主场），2 月底网报前视进度决定是否加第 4 门',
    confirmed: false,
  },
  {
    id: 'ielts',
    title: '雅思（IELTS，高分冲刺）',
    date: '2027-06-05',
    note: '4 月自考后 7–8 周冲刺，兼顾工作、交大学位英语替代与考研英语（二）',
    confirmed: false,
  },
  {
    id: 'zikao-2027-10',
    title: '2027 年 10 月自考',
    date: '2027-10-16',
    note: '借考研数二 / 408 同步重考高数、线代、系统原理等；11 月底出分赶得上复旦复试 8 门审查',
    confirmed: false,
  },
  {
    id: 'kaoyan-2027-12',
    title: '2027 年 12 月考研（复旦 085400）',
    date: '2027-12-18',
    note: '2027-04 自考完再启动；305 学院 085400 电子信息（专硕）：101 + 204 英二 + 302 数二 + 408；8 门复试查',
    confirmed: false,
  },
  {
    id: 'ai-l3',
    title: '人工智能训练师（三级）',
    date: '2026-11-22',
    note: '已考完，约 12 月下旬出成绩；合格后办自考 13011 转换，未过则明年 4 月后再补考',
    confirmed: true,
  },
];
