import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, RotateCcw } from 'lucide-react';
import { cloudPull, cloudPut } from '../lib/aiSync';
import { checkIds, dailyIds, daysLeftInPhase, onceIds, phaseOf } from '../data/dailyPlan';

/**
 * 日报里的「今日计划」：按日期自动对上阶段清单，勾选即完成。
 * - 每日清单按天存（同一天多处都一致），换天自动换一组
 * - 一次性任务与阶段末自检跨天保留
 * - 本机 localStorage + 服务器云端同步（换设备也能接着勾）
 */

const DAILY_KEY = 'xj.plan.daily.v1';
const ONCE_KEY = 'xj.plan.once.v1';
const META_KEY = 'xj.plan.meta.v1';
const CLOUD_KEY = 'daily-plan';

type DailyChecks = Record<string, string[]>;

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 存不下就算了，不打断写日报 */
  }
}

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function TodayPlan({ dateKey }: { dateKey: string }) {
  const phase = useMemo(() => phaseOf(dateKey), [dateKey]);
  const [daily, setDaily] = useState<DailyChecks>(() => loadJson<DailyChecks>(DAILY_KEY, {}));
  const [once, setOnce] = useState<string[]>(() => loadJson<string[]>(ONCE_KEY, []));
  const [showOnce, setShowOnce] = useState(false);
  const pushTimer = useRef<number | null>(null);

  // 进页面：云端更新就拉下来；本机更新或云端为空就推上去
  useEffect(() => {
    let alive = true;
    void (async () => {
      const remote = await cloudPull<{ daily?: DailyChecks; once?: string[] }>(CLOUD_KEY);
      if (!alive) return;
      const localAt = Number(localStorage.getItem(META_KEY) ?? 0);
      const remoteAt = remote?.updatedAt ?? 0;
      if (remote && remoteAt > localAt) {
        const nextDaily = remote.data.daily ?? {};
        const nextOnce = remote.data.once ?? [];
        saveJson(DAILY_KEY, nextDaily);
        saveJson(ONCE_KEY, nextOnce);
        localStorage.setItem(META_KEY, String(remoteAt));
        setDaily(nextDaily);
        setOnce(nextOnce);
        return;
      }
      const localDaily = loadJson<DailyChecks>(DAILY_KEY, {});
      const localOnce = loadJson<string[]>(ONCE_KEY, []);
      const hasLocal = Object.keys(localDaily).length > 0 || localOnce.length > 0;
      if (hasLocal && (!remote || remoteAt < localAt || localAt === 0)) {
        const now = Date.now();
        localStorage.setItem(META_KEY, String(now));
        void cloudPut(CLOUD_KEY, { daily: localDaily, once: localOnce, updatedAt: now });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const push = useCallback((nextDaily: DailyChecks, nextOnce: string[]) => {
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => {
      const now = Date.now();
      localStorage.setItem(META_KEY, String(now));
      void cloudPut(CLOUD_KEY, { daily: nextDaily, once: nextOnce, updatedAt: now });
    }, 700);
  }, []);

  const todayChecked = daily[dateKey] ?? [];

  function toggleDaily(id: string) {
    const nextDaily = { ...daily, [dateKey]: toggle(todayChecked, id) };
    if (nextDaily[dateKey].length === 0) delete nextDaily[dateKey];
    setDaily(nextDaily);
    saveJson(DAILY_KEY, nextDaily);
    push(nextDaily, once);
  }

  function toggleOnce(id: string) {
    const nextOnce = toggle(once, id);
    setOnce(nextOnce);
    saveJson(ONCE_KEY, nextOnce);
    push(daily, nextOnce);
  }

  if (!phase) {
    return (
      <section className="glass px-4 py-4 sm:px-5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-ink text-[15px] font-semibold">今日计划</h2>
          <span className="text-muted text-[12px]">这天不在计划阶段内</span>
        </div>
        <p className="text-muted mt-2 text-[13px]">
          阶段 A 从 2026-11-04 开始，到 2027-04-10 考试结束。往前往后翻日历就能看到对应阶段的清单。
        </p>
      </section>
    );
  }

  const dailyItems = dailyIds(phase);
  const onceItems = onceIds(phase);
  const checkItems = checkIds(phase);
  const groups = phase.daily.map((group) => ({
    title: group.title,
    hint: group.hint,
    items: dailyItems.filter((item) => item.title === group.title && item.hint === group.hint),
  }));
  const doneDaily = dailyItems.filter((item) => todayChecked.includes(item.id)).length;
  const doneOnce = onceItems.filter((item) => once.includes(item.id)).length;
  const doneCheck = checkItems.filter((item) => once.includes(item.id)).length;

  return (
    <section className="glass px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-ink text-[15px] font-semibold">今日计划</h2>
        <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[12px]">{phase.label}</span>
        <span className="text-muted text-[12px]">
          还剩 {daysLeftInPhase(phase, dateKey)} 天 · 今天 {doneDaily}/{dailyItems.length}
        </span>
        <span className="text-muted ml-auto text-[12px]">只勾真正做完的，没做完留空</span>
      </div>
      {phase.note && <p className="text-secondary mt-1 text-[12px]">{phase.note}</p>}

      <div className="mt-3 flex flex-col gap-3">
        {groups.map((group, gi) => (
          <div key={`g${gi}`} className="flex flex-col gap-1.5">
            {group.title && (
              <div className="flex items-baseline gap-2">
                <span className="text-ink text-[13px] font-medium">{group.title}</span>
                {group.hint && <span className="text-muted text-[12px]">{group.hint}</span>}
              </div>
            )}
            {group.items.map((item) => {
              const on = todayChecked.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleDaily(item.id)}
                  className="group flex items-start gap-2.5 text-left"
                >
                  <span
                    className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[6px] border transition ${
                      on ? 'border-brand bg-brand text-white' : 'border-line bg-transparent text-transparent'
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span
                    className={`text-[13.5px] leading-6 transition-colors ${
                      on ? 'text-muted line-through decoration-line' : 'text-ink/90 group-hover:text-ink'
                    }`}
                  >
                    {item.text}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {(onceItems.length > 0 || checkItems.length > 0) && (
        <div className="border-line/70 mt-4 border-t pt-3">
          <button
            type="button"
            onClick={() => setShowOnce((value) => !value)}
            className="text-secondary hover:text-ink flex items-center gap-1.5 text-[12.5px]"
          >
            <ChevronDown size={13} className={showOnce ? 'rotate-180 transition' : 'transition'} />
            阶段还差：一次性任务 {doneOnce}/{onceItems.length}
            {checkItems.length ? ` · 自检 ${doneCheck}/${checkItems.length}` : ''}
          </button>

          {showOnce && (
            <div className="mt-2.5 flex flex-col gap-3">
              {onceItems.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {onceItems.map((item) => {
                    const on = once.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleOnce(item.id)}
                        className="group flex items-start gap-2.5 text-left"
                      >
                        <span
                          className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[6px] border transition ${
                            on ? 'border-brand bg-brand text-white' : 'border-line bg-transparent text-transparent'
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span
                          className={`text-[13px] leading-6 ${
                            on ? 'text-muted line-through decoration-line' : 'text-ink/90 group-hover:text-ink'
                          }`}
                        >
                          {item.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {checkItems.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-secondary text-[12px]">阶段末自检</span>
                  {checkItems.map((item) => {
                    const on = once.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleOnce(item.id)}
                        className="group flex items-start gap-2.5 text-left"
                      >
                        <span
                          className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border transition ${
                            on ? 'border-success bg-success text-white' : 'border-line bg-transparent text-transparent'
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span
                          className={`text-[13px] leading-6 ${
                            on ? 'text-muted line-through decoration-line' : 'text-ink/90 group-hover:text-ink'
                          }`}
                        >
                          {item.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!window.confirm('清掉这个阶段的一次性任务与自检勾选？（每日清单不受影响）')) return;
                  const keepDaily = daily;
                  const nextOnce = once.filter((id) => !id.startsWith(`${phase.id}-`));
                  setOnce(nextOnce);
                  saveJson(ONCE_KEY, nextOnce);
                  push(keepDaily, nextOnce);
                }}
                className="text-muted hover:text-ink flex items-center gap-1 self-start text-[12px]"
              >
                <RotateCcw size={12} />
                重置本阶段勾选
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
