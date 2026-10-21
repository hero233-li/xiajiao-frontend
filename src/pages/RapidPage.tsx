import { useContext, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AuthContext } from '../features/auth/AuthProvider';
import data from '../features/rapid/student.json';
import roadmap from '../features/rapid/roadmap.md?raw';
import '../features/rapid/rapid.css';
import { RapidPhotoPanel } from '../features/rapid/RapidPhotoPanel';
type Row = {
  subject: string;
  topic: string;
  status: string;
  evidence: string;
  seen: string;
  error: string;
  next: string;
  retest: string;
};
type Saved = { rows: Row[]; drafts: Record<string, string> };
const states = ['未测', '待学习', '有提示能做', '独立能做', '隔天复测通过', '暂缓'];
const tabs = ['今天怎么做', '四科短诊断', '高数学习块', '独立练习', '路线图', '学习进度'];
const seed: Row[] = data.subjects.flatMap((s) =>
  s.questions.map((q) => ({
    subject: s.code,
    topic: q.id + ' · ' + q.stem.slice(0, 18),
    status: '未测',
    evidence: '本轮原创诊断，尚未提交',
    seen: '否',
    error: '待作答',
    next: '独立作答后分类批改',
    retest: '独立通过后隔天',
  })),
);
const slots = [
  ['18:30-18:55', '高数诊断', 'H1-H6，25分钟'],
  ['19:00-19:25', '离散诊断', 'D1-D6，25分钟'],
  ['19:30-19:55', '线代诊断', 'L1-L6，25分钟'],
  ['20:00-20:25', '系统诊断', 'S1-S5，25分钟'],
  ['20:30-21:15', '高数首块', '讲解 → G → I1/I2，45分钟'],
  ['21:20-22:00', '离散小块', '按批改选一个题型；未批改先自查'],
  ['22:05-22:25', '高数其他章', '诊断漏问与前置，不再刷整章一'],
  ['22:25-22:50', '离散回收', '只修一个错误、写方法卡'],
  ['22:50-23:10', '线代保温', '回收最接近完成的一题'],
  ['23:10-23:30', '系统保温', '检查单位和角色，23:30停止'],
];
function Workspace({ userId }: { userId: string }) {
  const storageKey = 'rapid-20261020-v1:' + userId;
  const [saved, setSaved] = useState<Saved>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return v && Array.isArray(v.rows) && v.drafts ? v : { rows: seed, drafts: {} };
    } catch {
      return { rows: seed, drafts: {} };
    }
  });
  const [tab, setTab] = useState(0),
    [subject, setSubject] = useState('00023'),
    [notice, setNotice] = useState('');
  useEffect(() => {
    document.title = '速刷提升 · 知途';
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      setNotice('本机保存失败，请立即导出备份。');
    }
  }, [storageKey, saved]);
  const current = data.subjects.find((s) => s.code === subject)!;
  const update = (i: number, k: keyof Row, value: string) =>
    setSaved((v) => ({ ...v, rows: v.rows.map((r, j) => (j === i ? { ...r, [k]: value } : r)) }));
  const exportProgress = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' }),
    );
    a.download = '速刷提升_本机进度_20261020.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <section className="rapid-page">
      <header className="rapid-hero">
        <div>
          <p className="eyebrow">2026.10.20 - 10.25 · 四科冲刺 · v1.0</p>
          <h1>速刷提升</h1>
          <p>先找到能修的小题型，再把基础题独立做完整。</p>
          <span className="rapid-chip">争取四科60分</span>
          <span className="rapid-chip">不追解锁门槛</span>
          <span className="rapid-chip">今晚23:30停止</span>
        </div>
        <div className="rapid-exam">
          <b>10/24</b>
          <span>09:00 离散 · 14:30 高数</span>
          <b>10/25</b>
          <span>09:00 线代 · 14:30 系统</span>
        </div>
      </header>
      <p className="rapid-note">
        短测只查缺口，不预测整科分数或通过概率。缺页、未批改、未提交保留待核对。作答支持上传图片批改；照片与批改记录归本人账号保存，进度表仍存本机。不计入正式成绩或解锁规则。
      </p>
      <div className="rapid-tabs" role="tablist" aria-label="速刷提升阶段">
        {tabs.map((t, i) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === i}
            onClick={() => {
              setTab(i);
              setNotice('');
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {notice && (
        <p role="status" className="rapid-note">
          {notice}
        </p>
      )}
      <div role="tabpanel" aria-label={tabs[tab]}>
        {tab === 0 && (
          <>
            <div className="rapid-heading">
              <div>
                <h2>今晚先做四科短诊断</h2>
                <p>每科25分钟，先独立写，再交教练。中间各休息5分钟。</p>
              </div>
              <button onClick={() => setTab(1)}>开始短诊断 →</button>
            </div>
            <div className="rapid-grid">
              {data.subjects.map((s) => (
                <button
                  className="rapid-subject"
                  key={s.code}
                  onClick={() => {
                    setSubject(s.code);
                    setTab(1);
                  }}
                >
                  <span>{s.code} · 原创诊断</span>
                  <h3>{s.name}</h3>
                  <p>{s.questions.length}题 · 25分钟 · 闭卷</p>
                </button>
              ))}
            </div>
            <section className="rapid-card">
              <h2>今天的顺序</h2>
              <div className="rapid-schedule">
                {slots.map(([time, title, detail]) => (
                  <div key={time}>
                    <time>{time}</time>
                    <b>{title}</b>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
              <p>
                净学习4.5小时、休息30分钟。开始较晚先删订正块；不足135分钟则高数学习块移到明天，不足90分钟则四科各做前两题10分钟，其余标未测，不记欠账。详见路线图。
              </p>
            </section>
            <section className="rapid-card">
              <h3>提交后只推进下一小步</h3>
              <p>
                先区分方法不会、计算、审题漏问、时间不足、图片识别或缺页；再给独立证据、1-3个修补点、下一份材料与用时、进入条件、缩小分支、隔天复测。后三科学习卷按真实作答再出。
              </p>
            </section>
          </>
        )}
        {tab === 1 && (
          <>
            <div className="rapid-heading">
              <div>
                <h2>四科短诊断 · 原创题型材料</h2>
                <p>每题练习用5分，不换算正式成绩。卡住90秒先跳过，每科25分钟到时停。</p>
              </div>
              <a href="/sprint-20261020/diagnostic-student.pdf" target="_blank" rel="noreferrer">
                打印学生版 PDF
              </a>
            </div>
            <div className="rapid-tabs" aria-label="选择科目">
              {data.subjects.map((s) => (
                <button
                  key={s.code}
                  aria-pressed={subject === s.code}
                  onClick={() => setSubject(s.code)}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <p className="rapid-note">{current.notes}</p>
            {current.questions.map((q) => (
              <article className="rapid-card" key={q.id}>
                <small>
                  {q.id} · 建议{q.minutes}分钟
                </small>
                <p className="rapid-question">{q.stem}</p>
              </article>
            ))}
            <p className="rapid-note">明确未测：{current.untested}</p>
            <RapidPhotoPanel
              key={subject}
              userId={userId}
              packId={'diagnostic-' + subject + '-v1'}
              code={subject}
              minutes={25}
            />
          </>
        )}
        {tab === 2 && (
          <>
            <div className="rapid-heading">
              <div>
                <h2>高数第一块 · 平面方程与距离</h2>
                <p>00023 · 阶段二 · 原创题型学习 · 全块45分钟</p>
              </div>
              <a href="/sprint-20261020/calculus-learning.pdf" target="_blank" rel="noreferrer">
                打印讲解 PDF
              </a>
            </div>
            {data.lesson.map(([title, body]) => (
              <article className="rapid-card" key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
            <button onClick={() => setTab(3)}>合上讲解，做两道独立题 →</button>
          </>
        )}
        {tab === 3 && (
          <>
            <div className="rapid-heading">
              <div>
                <h2>高数 · 独立练习</h2>
                <p>00023 · 阶段二 · 原创题型训练 · 共18分钟，合上讲解和方法卡。</p>
              </div>
              <a href="/sprint-20261020/calculus-independent.pdf" target="_blank" rel="noreferrer">
                打印独立学生卷
              </a>
            </div>
            {data.independent.map((q) => (
              <article className="rapid-card" key={q.id}>
                <small>
                  {q.id} · 建议{q.minutes}分钟
                </small>
                <p className="rapid-question">{q.stem}</p>
              </article>
            ))}
            <RapidPhotoPanel
              userId={userId}
              packId="independent-00023-v1"
              code="00023"
              minutes={18}
            />
            <p className="rapid-note">
              独立关键步骤正确且不漏问才进入下一步；隔天新题通过后才记暂时掌握。答案独立保存在本机交付目录，交卷前不要查看。
            </p>
          </>
        )}
        {tab === 4 && (
          <article className="rapid-card rapid-markdown">
            <ReactMarkdown>{roadmap}</ReactMarkdown>
          </article>
        )}
        {tab === 5 && (
          <>
            <div className="rapid-heading">
              <div>
                <h2>学习进度 · 证据优先</h2>
                <p>
                  “未测”指本轮新题未提交，不抹去历史证据。可导入本机交付的学习进度基线JSON。换设备前导出，不自动云同步。
                </p>
              </div>
              <button onClick={exportProgress}>导出进度与草稿</button>
            </div>
            <label className="rapid-import">
              导入本机进度 JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  try {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const v = JSON.parse(await f.text());
                    if (
                      !Array.isArray(v.rows) ||
                      v.rows.length > 300 ||
                      !v.drafts ||
                      typeof v.drafts !== 'object' ||
                      Array.isArray(v.drafts) ||
                      Object.values(v.drafts).some((x) => typeof x !== 'string') ||
                      v.rows.some(
                        (r: Row) =>
                          [
                            'subject',
                            'topic',
                            'status',
                            'evidence',
                            'seen',
                            'error',
                            'next',
                            'retest',
                          ].some((k) => typeof r[k as keyof Row] !== 'string') ||
                          !states.includes(r.status),
                      )
                    )
                      throw new Error();
                    setSaved(v);
                    setNotice('已导入本机进度。');
                  } catch {
                    setNotice('文件格式不正确，未替换已有进度。');
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <p className="rapid-note">
              独立能做需无提示、关键步骤正确；隔天复测通过需未见新题证据。看懂、抄完答案不记掌握。每次更新写来源与看答案情况。
            </p>
            <div className="rapid-progress">
              {saved.rows.map((r, i) => (
                <article className="rapid-card" key={i}>
                  <h3>
                    {r.subject} · {r.topic}
                  </h3>
                  <div className="rapid-fields">
                    <label>
                      当前状态
                      <select
                        value={r.status}
                        onChange={(e) => update(i, 'status', e.target.value)}
                      >
                        {states.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    {(
                      [
                        ['evidence', '证据来源'],
                        ['seen', '是否看过答案'],
                        ['error', '主要错误'],
                        ['next', '下一步'],
                        ['retest', '复测时间'],
                      ] as const
                    ).map(([field, label]) => (
                      <label key={field}>
                        {label}
                        <input
                          value={r[field]}
                          onChange={(e) => update(i, field, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
export function Component() {
  const auth = useContext(AuthContext);
  if (!auth?.user?.id) return <p>请先登录本人账号，再查看速刷提升。</p>;
  return <Workspace key={auth.user.id} userId={auth.user.id} />;
}
