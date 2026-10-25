import { useEffect, useMemo, useRef, useState } from 'react';
import qGirl from '../assets/q-girl.svg';
import { Check, ChevronLeft, ChevronRight, ClipboardCopy, ExternalLink, ImageDown, Send, Trash2 } from 'lucide-react';

/**
 * 学习日报：一天三条（做了什么 / 卡在哪 / 明天做什么），存在本机浏览器里。
 * 不接后端，所以换设备看不到；数据只在 localStorage 的 xj.daily.v1 里。
 */

const STORE_KEY = 'xj.daily.v1';

interface Entry {
  did: string;
  blocked: string;
  next: string;
  updatedAt: number;
  /** 发布的文案与时间（前端先只做本地记录） */
  publishTitle?: string;
  publishBody?: string;
  publishedAt?: number;
}

type Store = Record<string, Entry>;

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function keyOf(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function read(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function todayKey() {
  return keyOf(new Date());
}

function isEmpty(entry: Entry | undefined) {
  return !entry || (!entry.did.trim() && !entry.blocked.trim() && !entry.next.trim());
}

/** 从今天往前数连续写了几天。 */
function streakOf(store: Store) {
  let streak = 0;
  const cursor = new Date();
  while (!isEmpty(store[keyOf(cursor)])) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function DailyPage() {
  const [store, setStore] = useState<Store>(() => read());
  const [current, setCurrent] = useState<string>(() => todayKey());
  const [saved, setSaved] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishBody, setPublishBody] = useState('');
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const entry = store[current] ?? { did: '', blocked: '', next: '', updatedAt: 0 };
  const isToday = current === todayKey();
  const streak = useMemo(() => streakOf(store), [store]);

  const history = useMemo(
    () =>
      Object.entries(store)
        .filter(([, value]) => !isEmpty(value))
        .sort((a, b) => (a[0] < b[0] ? 1 : -1)),
    [store],
  );

  // 输入停 600ms 自动存，避免「写了没保存」
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStore((previous) => {
        const draft = previous[current];
        if (!draft) return previous;
        const next = { ...previous, [current]: { ...draft, updatedAt: Date.now() } };
        write(next);
        return next;
      });
    }, 600);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [current]);

  function update(patch: Partial<Entry>) {
    setStore((previous) => {
      const merged: Entry = {
        ...(previous[current] ?? { did: '', blocked: '', next: '', updatedAt: 0 }),
        ...patch,
        updatedAt: Date.now(),
      };
      const next = { ...previous };
      if (isEmpty(merged)) delete next[current];
      else next[current] = merged;
      write(next);
      return next;
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  /** 显式保存：立即落盘，不必等自动保存。 */
  function saveNow() {
    const draft = store[current];
    const next = { ...store };
    if (draft && !isEmpty(draft)) next[current] = { ...draft, updatedAt: Date.now() };
    write(next);
    setStore(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  /** 从三条内容生成一版小红书文案。 */
  function buildDraft() {
    const date = parseKey(current);
    const label = `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
    const firstLine = entry.did.trim().split('\n')[0]?.trim() ?? '';
    const clause = firstLine.split(/[，。；、！？,;!?]/)[0]?.trim() ?? '';
    const title = clause ? clause.slice(0, 20) : `${label} 自考复盘`;
    const parts = [`${label} 自考复盘`, ''];
    if (entry.did.trim()) parts.push(`今天做完的：`, entry.did.trim(), '');
    if (entry.blocked.trim()) parts.push(`卡住的地方：`, entry.blocked.trim(), '');
    if (entry.next.trim()) parts.push(`明天继续：`, entry.next.trim(), '');
    parts.push('#自考 #上海自考 #专升本 #计算机科学与技术 #学习打卡');
    return { title, body: parts.join('\n').trim() };
  }

  function openPublish() {
    const stored = store[current];
    if (stored?.publishTitle || stored?.publishBody) {
      setPublishTitle(stored.publishTitle ?? '');
      setPublishBody(stored.publishBody ?? '');
    } else {
      const draft = buildDraft();
      setPublishTitle(draft.title);
      setPublishBody(draft.body);
    }
    setCopied(false);
    setPublishOpen(true);
  }

  async function copyPublish() {
    const text = `${publishTitle}\n\n${publishBody}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function markPublished() {
    setStore((previous) => {
      const base = previous[current] ?? { did: '', blocked: '', next: '', updatedAt: Date.now() };
      const next = {
        ...previous,
        [current]: { ...base, publishTitle, publishBody, publishedAt: Date.now(), updatedAt: Date.now() },
      };
      write(next);
      return next;
    });
  }

  /** 生成 3:4 封面图（小红书要图），直接下载 PNG。 */
  async function downloadCover() {
    const width = 900;
    const height = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;

    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#8b93f8');
    gradient.addColorStop(0.55, '#b39bf2');
    gradient.addColorStop(1, '#f0b0d4');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const date = parseKey(current);
    const week = WEEKDAYS[date.getDay()];
    const pad = 72;

    context.fillStyle = 'rgba(255,255,255,0.92)';
    context.font = '500 32px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText(
      `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} 周${week}`,
      pad,
      130,
    );

    context.fillStyle = 'rgba(255,255,255,0.66)';
    context.font = '600 24px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.textAlign = 'right';
    context.fillText('菲比啾比卷卷卷', width - pad, 130);
    context.textAlign = 'left';

    // 标题最多三行，按宽度折行
    context.fillStyle = '#ffffff';
    context.font = '700 60px "PingFang SC", "Microsoft YaHei", sans-serif';
    const title = publishTitle.trim() || '今天也在推进';
    const chars = [...title];
    const lines: string[] = [];
    let line = '';
    for (const char of chars) {
      if (context.measureText(line + char).width > width - pad * 2) {
        lines.push(line);
        line = char;
        if (lines.length === 3) break;
      } else {
        line += char;
      }
    }
    if (lines.length < 3 && line) lines.push(line);
    const titleTop = 340;
    lines.forEach((text, index) => {
      context.fillText(text, pad, titleTop + index * 80);
    });

    // 标题下面两条要点，让封面不空
    const clauseOf = (text: string) => {
      const value = text.trim().split('\n')[0]?.split(/[，。；、！？,;!?]/)[0]?.trim() ?? '';
      return value.length > 24 ? `${value.slice(0, 24)}…` : value;
    };
    const bullets = [
      entry.blocked.trim() ? `卡点：${clauseOf(entry.blocked)}` : '',
      entry.next.trim() ? `明天：${clauseOf(entry.next)}` : '',
    ].filter(Boolean);

    if (bullets.length > 0) {
      context.fillStyle = 'rgba(255,255,255,0.86)';
      context.font = '500 27px "PingFang SC", "Microsoft YaHei", sans-serif';
      bullets.forEach((text, index) => {
        context.fillText(text, pad, titleTop + lines.length * 80 + 30 + index * 52);
      });
    }

    // 右下角放角色贴纸，压住大片空白
    const image = new Image();
    image.src = qGirl;
    try {
      await image.decode();
      const size = 360;
      context.drawImage(image, width - pad - size, height - pad - size + 20, size, size);
    } catch {
      // 贴纸加载失败就不画，不影响导出
    }

    context.fillStyle = 'rgba(255,255,255,0.9)';
    context.font = '500 28px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText(streak > 0 ? `连续记录 ${streak} 天` : '今天开始记录', pad, height - 120);

    const link = document.createElement('a');
    link.download = `日报-${current}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function shift(days: number) {
    const date = parseKey(current);
    date.setDate(date.getDate() + days);
    setCurrent(keyOf(date));
  }

  function clearDay() {
    setStore((previous) => {
      const next = { ...previous };
      delete next[current];
      write(next);
      return next;
    });
  }

  const date = parseKey(current);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <h1 className="text-ink text-[22px] font-semibold">日报</h1>
        <p className="text-secondary text-[13px]">
          {isToday ? '今天写了什么，明天要做什么。' : '补记或回看某一天。'}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-5">
        <section className="glass px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="min-w-0">
              <p className="text-ink text-[17px] font-semibold tabular-nums">
                {date.getFullYear()} 年 {date.getMonth() + 1} 月 {date.getDate()} 日
                <span className="text-muted ml-2 text-[13px] font-normal">周{WEEKDAYS[date.getDay()]}</span>
              </p>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setCurrent(todayKey())}
                  className="text-brand mt-0.5 text-[12px]"
                >
                  回到今天
                </button>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                aria-label="前一天"
                onClick={() => shift(-1)}
                className="text-secondary hover:text-ink flex size-8 items-center justify-center rounded-full border border-line"
              >
                <ChevronLeft size={15} strokeWidth={1.9} />
              </button>
              <button
                type="button"
                aria-label="后一天"
                onClick={() => shift(1)}
                className="text-secondary hover:text-ink flex size-8 items-center justify-center rounded-full border border-line"
              >
                <ChevronRight size={15} strokeWidth={1.9} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-secondary text-[13px]">今天做了什么</span>
              <textarea
                value={entry.did}
                onChange={(event) => update({ did: event.target.value })}
                placeholder="看了哪一章、做了几道题、跑了哪个示例。"
                className="field-solid h-28 resize-y px-3 py-2.5 text-[14px] leading-6 outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-secondary text-[13px]">卡在哪</span>
              <textarea
                value={entry.blocked}
                onChange={(event) => update({ blocked: event.target.value })}
                placeholder="哪些没搞懂，明天要不要问人或查资料。"
                className="field-solid h-20 resize-y px-3 py-2.5 text-[14px] leading-6 outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-secondary text-[13px]">明天要做什么</span>
              <textarea
                value={entry.next}
                onChange={(event) => update({ next: event.target.value })}
                placeholder="具体到题号或章节，明天照着做。"
                className="field-solid h-20 resize-y px-3 py-2.5 text-[14px] leading-6 outline-none"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveNow}
              disabled={isEmpty(store[current])}
              className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-[13px] disabled:opacity-50"
            >
              <Check size={13} strokeWidth={2} />
              保存
            </button>
            <button
              type="button"
              onClick={openPublish}
              disabled={isEmpty(entry)}
              className="pill pill--solid flex items-center gap-1.5 px-4 py-1.5 text-[13px] disabled:opacity-50"
            >
              <Send size={13} strokeWidth={2} />
              发布
            </button>
            {saved && <span className="text-brand text-[12px]">已保存</span>}
            {store[current]?.publishedAt && !publishOpen && (
              <span className="text-muted text-[12px]">
                {new Date(store[current].publishedAt!).toLocaleDateString('zh-CN')} 已发布过
              </span>
            )}
            {!isEmpty(store[current]) && (
              <button
                type="button"
                onClick={clearDay}
                className="text-muted hover:text-danger ml-auto flex items-center gap-1.5 text-[12px]"
              >
                <Trash2 size={13} strokeWidth={1.8} />
                清空这天
              </button>
            )}
          </div>
        </section>

        <section className="glass px-4 py-4 sm:px-5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-ink text-[15px] font-semibold">记录</h2>
            <span className="text-muted text-[12px]">
              共 {history.length} 天{streak > 0 ? `，已连续 ${streak} 天` : ''}
            </span>
          </div>

          {history.length === 0 ? (
            <p className="text-muted mt-3 text-[13px]">还没有记录，写完今天这页就会出现在这里。</p>
          ) : (
            <ul className="mt-3 flex max-h-[420px] flex-col gap-0.5 overflow-y-auto pr-1">
              {history.map(([key, value]) => {
                const active = key === current;
                const d = parseKey(key);
                const firstLine = value.did.trim().split('\n')[0] || value.next.trim().split('\n')[0] || '（只记了卡点）';
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setCurrent(key)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full rounded-[10px] px-2.5 py-2 text-left transition-colors ${
                        active ? 'bg-brand-soft text-brand-ink' : 'text-secondary hover:text-ink'
                      }`}
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium tabular-nums">
                          {d.getMonth() + 1} 月 {d.getDate()} 日
                        </span>
                        <span className="text-muted text-[12px]">周{WEEKDAYS[d.getDay()]}</span>
                        {key === todayKey() && <span className="text-brand text-[12px]">今天</span>}
                      </span>
                      <span className="text-muted mt-0.5 block truncate text-[12px]">{firstLine}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {publishOpen && (
        <section className="glass px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-ink text-[15px] font-semibold">发布到小红书</h2>
            {store[current]?.publishedAt && (
              <span className="text-brand text-[12px]">
                已于 {new Date(store[current].publishedAt!).toLocaleString('zh-CN', { hour12: false })} 标记发布
              </span>
            )}
            <button
              type="button"
              onClick={() => setPublishOpen(false)}
              className="text-muted hover:text-ink ml-auto text-[12px]"
            >
              收起
            </button>
          </div>

          <label className="mt-3 flex flex-col gap-1.5">
            <span className="flex items-baseline gap-2">
              <span className="text-secondary text-[13px]">标题</span>
              <span className="text-muted text-[12px]">{publishTitle.length}/20</span>
            </span>
            <input
              value={publishTitle}
              maxLength={20}
              onChange={(event) => setPublishTitle(event.target.value)}
              className="field-solid h-11 px-3 text-[14px] outline-none"
            />
          </label>

          <label className="mt-3 flex flex-col gap-1.5">
            <span className="flex items-baseline gap-2">
              <span className="text-secondary text-[13px]">正文</span>
              <span className="text-muted text-[12px]">{publishBody.length}/1000</span>
            </span>
            <textarea
              value={publishBody}
              maxLength={1000}
              onChange={(event) => setPublishBody(event.target.value)}
              className="field-solid h-56 resize-y px-3 py-2.5 text-[14px] leading-6 outline-none"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyPublish}
              className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-[13px]"
            >
              <ClipboardCopy size={13} strokeWidth={1.9} />
              {copied ? '已复制' : '复制文案'}
            </button>
            <button
              type="button"
              onClick={downloadCover}
              className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-[13px]"
            >
              <ImageDown size={13} strokeWidth={1.9} />
              下载封面图
            </button>
            <a
              href="https://creator.xiaohongshu.com/publish/publish"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-[13px]"
            >
              <ExternalLink size={13} strokeWidth={1.9} />
              打开小红书发布页
            </a>
            <button
              type="button"
              onClick={markPublished}
              className="pill pill--solid flex items-center gap-1.5 px-4 py-1.5 text-[13px]"
            >
              <Send size={13} strokeWidth={2} />
              标记已发布
            </button>
            <button
              type="button"
              onClick={() => {
                const draft = buildDraft();
                setPublishTitle(draft.title);
                setPublishBody(draft.body);
              }}
              className="text-muted hover:text-ink text-[12px]"
            >
              按今天重写一版
            </button>
          </div>

          <p className="text-muted mt-3 text-[12px] leading-5">
            现在这一版接的是「复制文案 + 打开发布页」，粘贴就能发。要做到点一下真发出去，得接小红书的发布接口或登录态，那部分放到后端再做。
          </p>
        </section>
      )}
    </div>
  );
}
