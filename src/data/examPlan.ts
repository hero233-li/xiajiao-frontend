/**
 * 考试计划（按用户给定的顺序排列，日期是各自最近一场）。
 * confirmed=true 表示官方已发布；false 表示按往年规律预估，官方公布后改这里即可。
 * 倒计时固定指向第一条（人工智能训练师三级）。
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
    id: 'ai-l3',
    title: '人工智能训练师（三级）',
    date: '2026-11-22',
    note: '报名 11-06 13:30–16:30，长宁校区主楼 216',
    confirmed: true,
  },
  {
    id: 'zikao-2027-04',
    title: '2027 年 4 月自考',
    date: '2027-04-17',
    note: '上海考区 4 月考期，首日按周六预估',
    confirmed: false,
  },
  {
    id: 'pets-3',
    title: '公共英语三级（PETS-3）',
    date: '2027-03-20',
    note: '上半年笔试通常 3 月第 3 个周六，报名在前一年 12 月',
    confirmed: false,
  },
  {
    id: 'ielts',
    title: '雅思（上半年，4 月后场次）',
    date: '2027-06-05',
    note: '上半年 5–6 月多场可选，机考每周开考',
    confirmed: false,
  },
  {
    id: 'zikao-2027-10',
    title: '2027 年 10 月自考',
    date: '2027-10-16',
    note: '上海考区 10 月考期，首日按周六预估',
    confirmed: false,
  },
  {
    id: 'kaoyan-2027-12',
    title: '2027 年 12 月考研',
    date: '2027-12-18',
    note: '初试通常 12 月第 3 个周末（周六日）',
    confirmed: false,
  },
];
