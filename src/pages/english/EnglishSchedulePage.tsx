import { useState, type FormEvent } from 'react';
import { CalendarClock, Cloud, CloudOff, Loader2, Plus, Trash2, TrendingUp } from 'lucide-react';
import { useStudyTracker } from '../../lib/studyTracker';

const exams = [
  {
    name: '全国英语等级考试三级（PETS-3 · 只报笔试）',
    when: '预计 2027-03-20（3 月第 3 个周六）；2026 年 12 月下旬盯紧上海网报抢位（pets.neea.edu.cn），无需报口语',
    target: '目标笔试 75–80+ 高分',
    purpose: '每天 15–20 词三碰法防遗忘；笔试合格即可免考自考 13000，高分同时给雅思与考研英二打地基',
    state: '12 月盯报名',
  },
  {
    name: '雅思（IELTS）',
    when: '预计 2027-06-05（4 月自考结束后 7–8 周集中冲刺，机考每周多场可选）',
    target: '目标高分（6.5–7.0+）',
    purpose: '兼顾工作、交大学位英语替代与考研英语（二）降维打击',
    state: 'S4 启动',
  },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function EnglishSchedulePage() {
  const { doc, syncState, blocked, addEnglishMock, removeEnglishMock } = useStudyTracker();
  const [exam, setExam] = useState<'PETS-3' | 'IELTS'>('PETS-3');
  const [date, setDate] = useState(todayStr);
  const [score, setScore] = useState('');
  const [note, setNote] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!score.trim() || blocked) return;
    addEnglishMock({
      exam,
      date: date || todayStr(),
      score: score.trim(),
      note: note.trim() || undefined,
    });
    setScore('');
    setNote('');
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-[22px] font-semibold">英语备考与模考记录</h1>
        <p className="text-secondary mt-1 text-[13px]">
          一条能力线打穿三场考试：PETS-3 高分 → 雅思高分 → 考研英语（二）。
        </p>
      </div>

      <div className="glass divide-line/70 divide-y">
        {exams.map((item) => (
          <div key={item.name} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
            <span className="bg-brand-soft text-brand-ink mt-0.5 grid size-10 shrink-0 place-items-center rounded-full">
              <CalendarClock size={18} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-ink text-[15px] font-medium">{item.name}</p>
                <span className="bg-success-soft text-success-ink rounded-full px-2 py-0.5 text-[11px] font-medium">
                  {item.target}
                </span>
              </div>
              <p className="text-secondary mt-1 text-[13px]">{item.when}</p>
              <p className="text-muted mt-1 text-[12px]">{item.purpose}</p>
            </div>
            <span className="bg-brand-soft/80 text-brand-ink shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium">
              {item.state}
            </span>
          </div>
        ))}
      </div>

      <section className="glass p-5 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-ink flex items-center gap-2 text-[15px] font-semibold">
            <TrendingUp size={16} strokeWidth={1.8} className="text-brand-ink" />
            模考分数记录
          </h2>
          <span className="text-muted inline-flex items-center gap-1 text-[11px]">
            {syncState === 'loading' || syncState === 'saving' ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                同步中…
              </>
            ) : syncState === 'offline' ? (
              <>
                <CloudOff size={12} className="text-warn" />
                离线只读
              </>
            ) : (
              <>
                <Cloud size={12} className="text-brand-ink" />
                云端同步 · 共 {doc.englishMocks.length} 次
              </>
            )}
          </span>
        </header>

        <form onSubmit={handleSubmit} className="mt-3.5 grid gap-2 sm:grid-cols-[110px_136px_110px_minmax(0,1fr)_auto]">
          <select
            value={exam}
            onChange={(e) => setExam(e.target.value as 'PETS-3' | 'IELTS')}
            aria-label="考试类型"
            className="field py-2 text-[13px]"
          >
            <option value="PETS-3">PETS-3</option>
            <option value="IELTS">雅思</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="模考日期"
            className="field py-2 text-[13px] tabular-nums"
          />
          <input
            type="text"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            disabled={blocked}
            placeholder={exam === 'PETS-3' ? '分数如 74' : '分数如 6.5'}
            className="field py-2 text-[13px] tabular-nums"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={blocked}
            placeholder="薄弱项备注（如：听力错 8 题，阅读 34/40）"
            className="field py-2 text-[13px]"
          />
          <button
            type="submit"
            disabled={blocked || !score.trim()}
            className="pill pill--solid px-3.5 py-2 text-[13px] font-medium disabled:opacity-45"
          >
            <Plus size={14} strokeWidth={2} />
            记一条
          </button>
        </form>

        {doc.englishMocks.length ? (
          <ul className="mt-4 flex flex-col gap-2">
            {doc.englishMocks.map((rec) => (
              <li key={rec.id} className="glass-tile flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                <span
                  className={[
                    'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                    rec.exam === 'PETS-3'
                      ? 'bg-brand-soft text-brand-ink'
                      : 'bg-success-soft text-success-ink',
                  ].join(' ')}
                >
                  {rec.exam}
                </span>
                <span className="text-ink text-[15px] font-semibold tabular-nums">{rec.score}</span>
                <span className="text-muted text-[12px] tabular-nums">{rec.date}</span>
                {rec.note ? <span className="text-secondary min-w-0 flex-1 text-[13px]">{rec.note}</span> : <span className="flex-1" />}
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => removeEnglishMock(rec.id)}
                  aria-label="删除记录"
                  className="text-muted hover:text-danger grid size-6 place-items-center rounded-full transition-colors cursor-pointer"
                >
                  <Trash2 size={13} strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-4 text-[13px]">
            暂无模考记录。W1 先限时做 1 套 PETS-3 真题摸底并记在这里，后面每次刷整卷看着分数往 80+ 涨。
          </p>
        )}
      </section>
    </div>
  );
}
