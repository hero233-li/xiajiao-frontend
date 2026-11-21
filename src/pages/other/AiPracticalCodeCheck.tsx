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

export function AiPracticalCodeCheck({ onExit }: { onExit: () => void }) {
  const [stage, setStage] = useState<CodeDrillStage | 'all'>('3.2');
  const [code, setCode] = useState<string>('3.2.1');
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
  const estScore = totalBlanks ? Math.round((item.codeScore * rightCount) / totalBlanks * 10) / 10 : 0;
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
    <div className="space-y-3">
      {/* 顶部导航与阶段切换 */}
      <section className="glass px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-ink text-[16px] font-semibold">实操代码盲填检测（20 题秒判）</h2>
            <p className="text-secondary mt-0.5 text-[12px]">
              直接对着官方 .ipynb 原卷空格敲代码，0 秒核对对错；单题正确率 ≥80% 自动标过关。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={randomBlind} className="pill pill--solid px-3 py-1.5 text-[12px]">
              <Shuffle size={12} className="mr-1 inline" />
              本阶段随机盲测 1 题
            </button>
            <button type="button" onClick={onExit} className="pill px-3 py-1.5 text-[12px]">
              返回实操首页
            </button>
          </div>
        </div>

        {/* 阶段筛选 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CODE_DRILL_STAGES.map((s) => {
            const list = AI_PRACTICAL_CODE_DRILLS.filter((it) => it.stage === s.id);
            const okN = list.filter((it) => stats[it.code]?.passed).length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => switchStage(s.id)}
                className={`pill px-3 py-1 text-[12px] ${stage === s.id ? 'pill--solid' : ''}`}
              >
                {s.id} · {s.badge}（{okN}/{list.length}）
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => switchStage('all')}
            className={`pill px-3 py-1 text-[12px] ${stage === 'all' ? 'pill--solid' : ''}`}
          >
            全部 20 题
          </button>
        </div>

        {/* 题号按钮条 */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {stageItems.map((it) => {
            const st = stats[it.code];
            const active = it.code === item.code;
            return (
              <button
                key={it.code}
                type="button"
                onClick={() => selectCode(it.code)}
                className={`rounded-md border px-2.5 py-1 text-[12px] tabular-nums transition ${
                  active
                    ? 'border-brand bg-brand-soft text-brand-ink font-semibold'
                    : st?.passed
                      ? 'border-accent-green/50 bg-accent-green/10 text-accent-green'
                      : st
                        ? 'border-danger/50 bg-danger-soft text-danger'
                        : 'border-line text-secondary hover:border-brand/50'
                }`}
              >
                {it.code}
                {st ? ` · ${st.bestPct}%` : ''}
              </button>
            );
          })}
          <span className="text-muted ml-auto text-[12px] tabular-nums">
            当前范围已过关 {passedInStage} / {stageItems.length} 题
          </span>
        </div>
      </section>

      {/* 当前题信息 + 口诀栏 */}
      <section className="glass px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">
              {item.code}
            </span>
            <h3 className="text-ink text-[15px] font-semibold">{item.title}</h3>
            <span className="text-muted text-[12px] tabular-nums">
              {stageMeta?.badge} · 代码部分约 {item.codeScore} 分 · 共 {totalBlanks} 空
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTip((v) => !v)}
              className="pill px-2.5 py-1 text-[12px]"
            >
              <Lightbulb size={12} className="mr-1 inline" />
              {showTip ? '隐藏口诀（盲测）' : '显示口诀'}
            </button>
            <button
              type="button"
              onClick={() => setShowRef((v) => !v)}
              className="pill px-2.5 py-1 text-[12px]"
            >
              {showRef ? <EyeOff size={12} className="mr-1 inline" /> : <Eye size={12} className="mr-1 inline" />}
              {showRef ? '收起完整参考代码' : '查看完整参考代码'}
            </button>
            <a
              className="pill px-2.5 py-1 text-[12px]"
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
              <ExternalLink size={12} className="mr-1 inline" />
              去 Jupyter 实跑
            </a>
          </div>
        </div>
        {showTip ? (
          <p className="border-line text-brand-ink mt-2.5 rounded-[10px] border px-3 py-2 text-[12.5px] leading-relaxed">
            <Lightbulb size={13} className="mr-1 inline" />
            套路提示：{item.tip}
          </p>
        ) : null}
      </section>

      {/* 判分结果摘要条 */}
      {checked ? (
        <section
          className={`glass flex flex-wrap items-center justify-between gap-3 border-l-4 px-4 py-3.5 sm:px-5 ${
            pct >= 80 ? 'border-l-accent-green' : 'border-l-danger'
          }`}
        >
          <div>
            <p className="text-ink text-[15px] font-semibold tabular-nums">
              答对 {rightCount} / {totalBlanks} 空（{pct}%） · 约估代码得分{' '}
              <span className={pct >= 80 ? 'text-accent-green' : 'text-danger'}>
                {estScore} / {item.codeScore} 分
              </span>
              {pct >= 80 ? ' · 已过关' : ' · 未到 80% 线，把红空再订正一遍'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {wrongRows.length > 0 ? (
              <button type="button" onClick={retryWrongOnly} className="pill pill--solid px-3 py-1.5 text-[12px]">
                只清空 {wrongRows.length} 个错空重填
              </button>
            ) : null}
            <button type="button" onClick={resetAll} className="pill px-3 py-1.5 text-[12px]">
              <RotateCcw size={12} className="mr-1 inline" />
              整题清空再盲测
            </button>
          </div>
        </section>
      ) : null}

      {/* 行内代码盲填区 */}
      <section className="glass px-3 py-4 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted text-[12px] tabular-nums">
            已填 {filledCount} / {totalBlanks} 空（按 Enter 自动跳下一空，引号与多余空格不扣分）
          </span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={doCheck} className="pill pill--solid px-4 py-1.5 text-[13px]">
              <Check size={13} className="mr-1 inline" />
              秒判对错
            </button>
            <button type="button" onClick={resetAll} className="pill px-3 py-1.5 text-[12px]">
              <RotateCcw size={12} className="mr-1 inline" />
              清空重写
            </button>
          </div>
        </div>

        <div className="border-line bg-surface-2/60 overflow-x-auto rounded-[12px] border p-3 font-mono text-[12.5px] leading-7">
          {lines.map((line, lineIdx) => {
            const parts = line.split(/(\{\{\d+\}\})/g);
            const isComment = line.trim().startsWith('#');
            return (
              <div key={lineIdx} className="flex items-baseline whitespace-pre">
                <span className="text-muted mr-3 inline-block w-7 shrink-0 text-right text-[11px] select-none tabular-nums">
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
                          className={`rounded border px-1.5 py-0.5 font-mono text-[12px] outline-none transition ${
                            ok
                              ? 'border-accent-green bg-accent-green/15 text-accent-green'
                              : bad
                                ? 'border-danger bg-danger-soft text-danger'
                                : 'border-brand/50 bg-surface text-ink focus:border-brand focus:ring-brand/30 focus:ring-1'
                          }`}
                        />
                        {ok ? <Check size={13} className="text-accent-green shrink-0" /> : null}
                        {bad ? <X size={13} className="text-danger shrink-0" /> : null}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={doCheck} className="pill pill--solid px-5 py-2 text-[13px]">
            <Check size={14} className="mr-1 inline" />
            秒判对错
          </button>
        </div>
      </section>

      {/* 错空逐条对照 */}
      {checked && wrongRows.length > 0 ? (
        <section className="glass px-4 py-4 sm:px-5">
          <h3 className="text-danger text-[14px] font-semibold">错空对照（共 {wrongRows.length} 处）</h3>
          <div className="mt-2.5 space-y-2">
            {wrongRows.map((r) => (
              <div
                key={r.idx}
                className="border-danger/35 bg-danger-soft/50 rounded-[10px] border px-3 py-2 font-mono text-[12px]"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-danger font-semibold">空 {r.idx + 1}</span>
                  <span className="text-muted">你填：</span>
                  <span className="text-danger break-all">{r.mine.trim() || '（未填）'}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-accent-green font-semibold">标准：</span>
                  <span className="text-ink break-all">{r.blank.answer}</span>
                  {r.blank.alts?.length ? (
                    <span className="text-muted">（等价：{r.blank.alts.join(' 或 ')}）</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 完整参考代码（默认收起） */}
      {showRef ? (
        <section className="glass px-4 py-4 sm:px-5">
          <h3 className="text-ink text-[14px] font-semibold">{item.code} 完整参考代码</h3>
          <pre className="border-line bg-surface-2/60 text-ink mt-2 overflow-x-auto rounded-[12px] border p-3 font-mono text-[12px] leading-relaxed">
            {fillFullCode(item)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
