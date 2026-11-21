import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ExternalLink, Eye, EyeOff, Lightbulb, RotateCcw, Shuffle, X } from 'lucide-react';
import {
  AI_PRACTICAL_CODE_DRILLS,
  CODE_DRILL_STAGES,
  type CodeBlank,
  type CodeDrillItem,
  type CodeDrillStage,
} from '../../data/aiPracticalCodeDrills';

const API = '/ai-lab';
const PROGRESS_KEY = 'xj.ai.practical.codecheck.v1';

interface CheckStat {
  bestPct: number;
  lastRight: number;
  total: number;
  passed: boolean;
}

function loadStats(): Record<string, CheckStat> {
  try {
    const raw = window.sessionStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CheckStat>) : {};
  } catch {
    return {};
  }
}

function saveStats(stats: Record<string, CheckStat>) {
  try {
    window.sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(stats));
  } catch {
    /* 忽略 */
  }
}

/** 归一化 Python 代码片段：统一单双引号、去除运算符/括号/逗号周围多余空格，避免因空格或引号误判。 */
function normalizePy(raw: string): string {
  return raw
    .trim()
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*([=,()[\]{}:+\-*/<>!&|.])\s*/g, '$1')
    .trim();
}

function isBlankMatch(input: string, blank: CodeBlank): boolean {
  const norm = normalizePy(input);
  if (!norm) return false;
  const targets = [blank.answer, ...(blank.alts ?? [])];
  return targets.some((t) => normalizePy(t) === norm);
}

function fillFullCode(item: CodeDrillItem): string {
  return item.template.replace(/\{\{(\d+)\}\}/g, (_, idx: string) => item.blanks[Number(idx)]?.answer ?? '');
}

export function AiPracticalCodeCheck({ onExit, fixedCode }: { onExit: () => void; fixedCode?: string }) {
  const fixedItem = fixedCode ? AI_PRACTICAL_CODE_DRILLS.find((it) => it.code === fixedCode) : undefined;
  const [stage, setStage] = useState<CodeDrillStage | 'all'>(fixedItem?.stage ?? '3.2');
  const [code, setCode] = useState<string>(fixedCode ?? '3.2.1');
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [showRef, setShowRef] = useState(false);
  const [stats, setStats] = useState<Record<string, CheckStat>>(() => loadStats());
  const [jupyterToken, setJupyterToken] = useState('');
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    void fetch(API + '/config')
      .then((r) => r.json())
      .then((d) => {
        if (d?.token) setJupyterToken(String(d.token));
      })
      .catch(() => undefined);
  }, []);

  const stageItems = useMemo(
    () => (stage === 'all' ? AI_PRACTICAL_CODE_DRILLS : AI_PRACTICAL_CODE_DRILLS.filter((it) => it.stage === stage)),
    [stage],
  );

  const item = useMemo(
    () => AI_PRACTICAL_CODE_DRILLS.find((it) => it.code === code) ?? stageItems[0] ?? AI_PRACTICAL_CODE_DRILLS[0],
    [code, stageItems],
  );

  const selectCode = (nextCode: string, blind = false) => {
    setCode(nextCode);
    setInputs({});
    setChecked(false);
    setShowRef(false);
    if (blind) setShowTip(false);
    inputRefs.current = {};
    window.setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 50);
  };

  const switchStage = (nextStage: CodeDrillStage | 'all') => {
    setStage(nextStage);
    const list =
      nextStage === 'all' ? AI_PRACTICAL_CODE_DRILLS : AI_PRACTICAL_CODE_DRILLS.filter((it) => it.stage === nextStage);
    if (list.length && !list.some((it) => it.code === code)) {
      selectCode(list[0].code);
    }
  };

  const randomBlind = () => {
    const unpassed = stageItems.filter((it) => !stats[it.code]?.passed);
    const pool = unpassed.length ? unpassed : stageItems;
    const candidates = pool.length > 1 ? pool.filter((it) => it.code !== item.code) : pool;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    if (picked) selectCode(picked.code, true);
  };

  const blankResults = useMemo(() => {
    return item.blanks.map((b, idx) => ({
      idx,
      mine: inputs[idx] ?? '',
      ok: isBlankMatch(inputs[idx] ?? '', b),
      blank: b,
    }));
  }, [item, inputs]);

  const rightCount = blankResults.filter((r) => r.ok).length;
  const totalBlanks = item.blanks.length;
  const pct = totalBlanks ? Math.round((rightCount / totalBlanks) * 100) : 0;
  const estScore = totalBlanks ? Math.round(((item.codeScore * rightCount) / totalBlanks) * 10) / 10 : 0;
  const filledCount = Object.values(inputs).filter((v) => v.trim().length > 0).length;

  const doCheck = () => {
    setChecked(true);
    const passed = pct >= 80;
    setStats((prev) => {
      const old = prev[item.code];
      const next: Record<string, CheckStat> = {
        ...prev,
        [item.code]: {
          bestPct: Math.max(old?.bestPct ?? 0, pct),
          lastRight: rightCount,
          total: totalBlanks,
          passed: (old?.passed ?? false) || passed,
        },
      };
      saveStats(next);
      return next;
    });
  };

  const retryWrongOnly = () => {
    const next: Record<number, string> = {};
    let firstWrong = -1;
    for (const r of blankResults) {
      if (r.ok) next[r.idx] = inputs[r.idx] ?? '';
      else if (firstWrong === -1) firstWrong = r.idx;
    }
    setInputs(next);
    setChecked(false);
    if (firstWrong >= 0) {
      window.setTimeout(() => inputRefs.current[firstWrong]?.focus(), 30);
    }
  };

  const resetAll = () => {
    setInputs({});
    setChecked(false);
    window.setTimeout(() => inputRefs.current[0]?.focus(), 30);
  };

  const lines = useMemo(() => item.template.split('\n'), [item.template]);
  const passedInStage = stageItems.filter((it) => stats[it.code]?.passed).length;
  const wrongRows = checked ? blankResults.filter((r) => !r.ok) : [];
  const stageMeta = CODE_DRILL_STAGES.find((s) => s.id === item.stage);

  return (
    <div className="space-y-4">
      {/* 顶部导航与阶段切换 */}
      <section className="glass p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-ink text-[15px] font-semibold">代码盲填检测</h2>
            {fixedCode ? (
              <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                {item.code}
              </span>
            ) : (
              <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                20 题 0 秒判分
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {fixedCode ? null : (
              <button type="button" onClick={randomBlind} className="pill pill--solid px-3.5 py-1.5 text-[12px] font-medium">
                <Shuffle size={13} />
                本阶段随机盲测
              </button>
            )}
            <button type="button" onClick={onExit} className="pill px-3.5 py-1.5 text-[12px]">
              {fixedCode ? '返回考试' : '返回实操首页'}
            </button>
          </div>
        </div>

        {fixedCode ? null : (
          <div className="hairline-t mt-3.5 space-y-3 pt-3.5">
            {/* 阶段筛选 */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="segmented max-w-full overflow-x-auto">
                {CODE_DRILL_STAGES.map((s) => {
                  const list = AI_PRACTICAL_CODE_DRILLS.filter((it) => it.stage === s.id);
                  const okN = list.filter((it) => stats[it.code]?.passed).length;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      data-active={stage === s.id}
                      onClick={() => switchStage(s.id)}
                      className="segmented-item px-3 py-1 text-[12px]"
                    >
                      <span className="tabular-nums">{s.id}</span>
                      <span className="opacity-80">{s.badge}</span>
                      <span className="tabular-nums opacity-75">
                        {okN}/{list.length}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  data-active={stage === 'all'}
                  onClick={() => switchStage('all')}
                  className="segmented-item px-3 py-1 text-[12px]"
                >
                  全部 20 题
                </button>
              </div>

              <span className="text-muted text-[12px] tabular-nums">
                已过关 {passedInStage} / {stageItems.length} 题
              </span>
            </div>

            {/* 题号按钮条 */}
            <div className="flex flex-wrap items-center gap-1.5">
              {stageItems.map((it) => {
                const st = stats[it.code];
                const active = it.code === item.code;
                return (
                  <button
                    key={it.code}
                    type="button"
                    onClick={() => selectCode(it.code)}
                    className={`rounded-[10px] border px-2.5 py-1 text-[12px] tabular-nums transition-colors duration-[var(--duration)] ease-[var(--ease-out)] ${
                      active
                        ? 'border-brand bg-brand font-medium text-white'
                        : st?.passed
                          ? 'border-success/40 bg-success-soft/70 text-success-ink font-medium'
                          : st
                            ? 'border-danger/40 bg-danger-soft/70 text-danger-ink'
                            : 'hairline bg-glass-fill-quiet text-secondary hover:border-brand/50 hover:text-ink'
                    }`}
                  >
                    {it.code}
                    {st ? <span className="ml-1 opacity-85">{st.bestPct}%</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 当前题信息 + 口诀栏 */}
      <section className="glass p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">
              {item.code}
            </span>
            <h3 className="text-ink text-[15px] font-semibold">{item.title}</h3>
            <span className="text-muted text-[12px] tabular-nums">
              {stageMeta?.badge} 代码约 {item.codeScore} 分 共 {totalBlanks} 空
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTip((v) => !v)}
              className="pill px-3 py-1 text-[12px]"
            >
              <Lightbulb size={13} />
              {showTip ? '隐藏口诀' : '显示口诀'}
            </button>
            <button
              type="button"
              onClick={() => setShowRef((v) => !v)}
              className="pill px-3 py-1 text-[12px]"
            >
              {showRef ? <EyeOff size={13} /> : <Eye size={13} />}
              {showRef ? '收起参考代码' : '参考代码'}
            </button>
            <a
              className="pill px-3 py-1 text-[12px]"
              href={
                '/jupyter/tree/' +
                encodeURIComponent('素材') +
                '/' +
                encodeURIComponent(item.code) +
                (jupyterToken ? '?token=' + encodeURIComponent(jupyterToken) : '')
              }
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={13} />
              去 Jupyter 实跑
            </a>
          </div>
        </div>

        {showTip ? (
          <p className="bg-brand-soft/50 text-brand-ink mt-3 rounded-[12px] px-3.5 py-2.5 text-[13px] leading-relaxed">
            <Lightbulb size={14} className="mr-1.5 inline" />
            {item.tip}
          </p>
        ) : null}
      </section>

      {/* 判分结果摘要条（遵循 A10：无左边缘彩条，改用语义徽章与浅底） */}
      {checked ? (
        <section
          className={`glass flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5 ${
            pct >= 80 ? 'border-success/35' : 'border-danger/35'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                pct >= 80 ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink'
              }`}
            >
              {pct >= 80 ? '已过关' : '未到 80% 线'}
            </span>
            <p className="text-ink text-[15px] font-semibold tabular-nums">
              答对 {rightCount} / {totalBlanks} 空（{pct}%）
            </p>
            <span className={`text-[13px] font-medium tabular-nums ${pct >= 80 ? 'text-success-ink' : 'text-danger-ink'}`}>
              约估 {estScore} / {item.codeScore} 分
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {wrongRows.length > 0 ? (
              <button type="button" onClick={retryWrongOnly} className="pill pill--solid px-3.5 py-1.5 text-[12px] font-medium">
                只清空 {wrongRows.length} 个错空重填
              </button>
            ) : null}
            <button type="button" onClick={resetAll} className="pill px-3.5 py-1.5 text-[12px]">
              <RotateCcw size={12} />
              整题清空再盲测
            </button>
          </div>
        </section>
      ) : null}

      {/* 悬浮操作：固定在视口右侧靠中，代码再长也能随时点击秒判/清空 */}
      <div className="fixed top-1/2 right-2 z-30 hidden -translate-y-1/2 sm:block">
        <div className="glass-panel flex flex-col items-stretch gap-1.5 rounded-[18px] p-2">
          <span className="text-muted py-0.5 text-center text-[12px] font-medium tabular-nums">
            {filledCount} / {totalBlanks}
          </span>
          <button
            type="button"
            onClick={doCheck}
            className="pill pill--solid px-3.5 py-2 text-[13px] font-medium whitespace-nowrap"
          >
            <Check size={14} />
            秒判对错
          </button>
          <button type="button" onClick={resetAll} className="pill px-3.5 py-2 text-[13px] whitespace-nowrap">
            <RotateCcw size={13} />
            清空重写
          </button>
        </div>
      </div>

      {/* 行内代码盲填区 */}
      <section className="glass p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-secondary text-[13px] font-medium tabular-nums">
              已填 {filledCount} / {totalBlanks} 空
            </span>
            <div className="bg-surface-2 h-1.5 w-28 overflow-hidden rounded-full">
              <div
                className="bg-brand h-full rounded-full transition-all duration-[var(--duration)] ease-[var(--ease-out)]"
                style={{ width: `${totalBlanks ? Math.round((filledCount / totalBlanks) * 100) : 0}%` }}
              />
            </div>
            <span className="text-muted hidden text-[12px] sm:inline">
              <kbd className="kbd mr-1">Enter</kbd>跳下一空，引号与空格容错
            </span>
          </div>

          {/* 小屏保留内联操作条；桌面端使用视口右侧悬浮条 */}
          <div className="flex flex-wrap gap-2 sm:hidden">
            <button type="button" onClick={doCheck} className="pill pill--solid px-3.5 py-1.5 text-[12px] font-medium">
              <Check size={13} />
              秒判对错
            </button>
            <button type="button" onClick={resetAll} className="pill px-3 py-1.5 text-[12px]">
              <RotateCcw size={12} />
              清空重写
            </button>
          </div>
        </div>

        <div className="hairline bg-surface/80 overflow-x-auto rounded-[14px] p-3.5 font-mono text-[13px] leading-8 sm:p-4 sm:pr-28 2xl:pr-4">
          {lines.map((line, lineIdx) => {
            const parts = line.split(/(\{\{\d+\}\})/g);
            const isComment = line.trim().startsWith('#');
            return (
              <div key={lineIdx} className="flex items-baseline whitespace-pre">
                <span className="hairline-r text-muted mr-3 inline-block w-8 shrink-0 pr-2 text-right text-[12px] select-none tabular-nums">
                  {lineIdx + 1}
                </span>
                <span className={isComment ? 'text-muted' : 'text-ink'}>
                  {parts.map((seg, segIdx) => {
                    const m = seg.match(/^\{\{(\d+)\}\}$/);
                    if (!m) return <Fragment key={segIdx}>{seg}</Fragment>;
                    const bIdx = Number(m[1]);
                    const blank = item.blanks[bIdx];
                    const val = inputs[bIdx] ?? '';
                    const ok = checked && isBlankMatch(val, blank);
                    const bad = checked && !ok;
                    const widthCh = Math.min(Math.max(blank.answer.length + 3, 12), 56);
                    return (
                      <span key={segIdx} className="inline-flex items-center gap-1 align-baseline">
                        <input
                          ref={(el) => {
                            inputRefs.current[bIdx] = el;
                          }}
                          type="text"
                          value={val}
                          spellCheck={false}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          placeholder={`空${bIdx + 1}`}
                          style={{ width: `${widthCh}ch` }}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            setInputs((prev) => ({ ...prev, [bIdx]: nextVal }));
                            if (checked) setChecked(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (bIdx + 1 < totalBlanks) {
                                inputRefs.current[bIdx + 1]?.focus();
                              } else {
                                doCheck();
                              }
                            }
                          }}
                          className={`rounded-[6px] border px-2 py-0.5 font-mono text-[12px] leading-normal outline-none transition-colors ${
                            ok
                              ? 'border-success bg-success-soft/80 text-success-ink'
                              : bad
                                ? 'border-danger bg-danger-soft text-danger-ink'
                                : 'border-brand/45 bg-canvas text-ink focus:border-brand focus:ring-brand/25 focus:ring-2'
                          }`}
                        />
                        {ok ? <Check size={14} className="text-success-ink shrink-0" /> : null}
                        {bad ? <X size={14} className="text-danger-ink shrink-0" /> : null}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 错空逐条对照 */}
      {checked && wrongRows.length > 0 ? (
        <section className="glass p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <h3 className="text-ink text-[15px] font-semibold">错空对照</h3>
            <span className="bg-danger-soft text-danger-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
              {wrongRows.length} 处
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {wrongRows.map((r) => (
              <div
                key={r.idx}
                className="hairline bg-surface/65 rounded-[14px] px-4 py-3 font-mono text-[13px]"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="bg-danger-soft text-danger-ink rounded-full px-2 py-0.5 font-sans text-[12px] font-medium">
                    空 {r.idx + 1}
                  </span>
                  <span className="text-muted font-sans text-[12px]">你填</span>
                  <span className="text-danger-ink break-all">{r.mine.trim() || '（未填）'}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                  <span className="bg-success-soft text-success-ink rounded-full px-2 py-0.5 font-sans text-[12px] font-medium">
                    标准
                  </span>
                  <span className="text-ink break-all font-medium">{r.blank.answer}</span>
                  {r.blank.alts?.length ? (
                    <span className="text-muted font-sans text-[12px]">等价：{r.blank.alts.join(' 或 ')}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 完整参考代码（默认收起） */}
      {showRef ? (
        <section className="glass p-4 sm:p-5">
          <h3 className="text-ink text-[15px] font-semibold">{item.code} 完整参考代码</h3>
          <pre className="hairline bg-surface/80 text-ink mt-3 overflow-x-auto rounded-[14px] p-4 font-mono text-[13px] leading-relaxed">
            {fillFullCode(item)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
