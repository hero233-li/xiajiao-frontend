import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, ClipboardList } from 'lucide-react';

interface ZikaoSession {
  code: string;
  name: string;
  credit: string;
  slot: string;
  state: string;
  note: string;
}

const aprilSessions: ZikaoSession[] = [
  {
    code: '04737',
    name: 'C++程序设计',
    credit: '3 学分',
    slot: '2027-04-10 / 11（具体半日待公布）',
    state: '重点攻坚',
    note: '零基础，11-23 起全程慢火推进，3/21 起刷 6 套 150 分钟整卷',
  },
  {
    code: '13215',
    name: 'Java语言程序设计',
    credit: '3 学分',
    slot: '2027-04-10 / 11（具体半日待公布）',
    state: '12 月结项',
    note: 'W1–W3 直接刷 5 套近年真题（目标 ≥75）后封存，考前回看错题',
  },
  {
    code: '13003',
    name: '数据结构与算法',
    credit: '4 学分',
    slot: '2027-04-10 / 11（具体半日待公布）',
    state: '复用 408',
    note: '12 月 ch1-3、1-2 月 ch4-6、3 月 ch7-8；8 大算法闭卷手写',
  },
  {
    code: '13005',
    name: '软件工程',
    credit: '3 学分',
    slot: '2027-04-10 / 11（具体半日待公布）',
    state: '3 月突击',
    note: '3 月上中旬启动：30 核心术语 + 耦合内聚排序 + 测试用例大题',
  },
];

const adminMilestones = [
  { when: '2027 年 2 月底 – 3 月初', title: '2027-04 上海自考网上报名', detail: '登录 shmeea.edu.cn 核对四科场次无冲突并第一时间完成缴费' },
  { when: '2027 年 5 月下旬', title: '4 月自考出分 → 报实践 + 办免考/转换', detail: '查交大继续教育学院（ce.sjtu.edu.cn）报 04738/13216/13004/13006 实践，凭 PETS-3 办 13000 免考，三级通过办 13011 转换' },
  { when: '2027 年 10 月中旬', title: '2027-10 考期收尾重考', detail: '借考研数二 / 408 同步重考高数、线代、系统原理等；11 月底出分可赶上复旦复试 8 门资格审查' },
];

export function SchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-[22px] font-semibold">考试日程</h1>
          <p className="text-secondary mt-1 text-[13px]">2027 年 4 月自考四科目标（13 学分）与关键报名/实践节点。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/zikao/plan" className="pill pill--solid px-3.5 py-1.5 text-[12px] font-medium">
            看完整计划
            <ArrowRight size={13} strokeWidth={2} />
          </Link>
          <Link to="/zikao/courses" className="pill px-3.5 py-1.5 text-[12px] font-medium">
            全部科目（77 学分）
          </Link>
        </div>
      </div>

      <section className="glass divide-line/70 divide-y">
        {aprilSessions.map((item) => (
          <div key={item.code} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
            <span className="bg-brand-soft text-brand-ink mt-0.5 grid size-10 shrink-0 place-items-center rounded-full">
              <CalendarClock size={18} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted text-[12px] tabular-nums">{item.code}</span>
                <p className="text-ink text-[15px] font-medium">{item.name}</p>
                <span className="bg-surface-2 text-secondary rounded-full px-2 py-0.5 text-[11px] tabular-nums">
                  {item.credit}
                </span>
              </div>
              <p className="text-secondary mt-1 text-[13px]">{item.slot}</p>
              <p className="text-muted mt-1 text-[12px]">{item.note}</p>
            </div>
            <span className="bg-brand-soft/80 text-brand-ink shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium">
              {item.state}
            </span>
          </div>
        ))}
      </section>

      <section className="glass px-4 py-4 sm:px-5">
        <h2 className="text-ink flex items-center gap-2 text-[15px] font-semibold">
          <ClipboardList size={16} strokeWidth={1.8} className="text-brand-ink" />
          报名与考后关键节点
        </h2>
        <ol className="mt-3 flex flex-col gap-3">
          {adminMilestones.map((m) => (
            <li key={m.title} className="glass-tile px-3.5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-ink text-[14px] font-medium">{m.title}</p>
                <span className="text-brand-ink text-[12px] font-medium tabular-nums">{m.when}</span>
              </div>
              <p className="text-secondary mt-1 text-[12px] leading-relaxed">{m.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-muted text-[12px]">
        上海自考具体开考半日与报名时间以「上海招考热线」（shmeea.edu.cn）正式公告为准，公布后补录精确场次。
      </p>
    </div>
  );
}
