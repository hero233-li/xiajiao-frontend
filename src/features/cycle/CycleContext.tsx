import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { listCycles } from '../../api/generated/exams/exams';
import type { ExamCycle } from '../../api/generated/models';
import { shanghaiDate } from '../schedule/display';

export function cycleKey(cycle: ExamCycle) {
  // Stable short alias; no dependence on list order or mutable names.
  let hash = 2166136261;
  for (const char of cycle.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${cycle.startDate.replaceAll('-', '')}-${(hash >>> 0).toString(36)}`;
}
export function defaultCycle(cycles: ExamCycle[], today: string) {
  return (
    cycles.find((c) => 'isCurrent' in c && c.isCurrent === true) ??
    [...cycles]
      .filter((c) => c.endDate >= today)
      .sort((a, b) => {
        const distance = (c: ExamCycle) =>
          c.startDate <= today ? 0 : Date.parse(c.startDate) - Date.parse(today);
        return (
          distance(a) - distance(b) ||
          a.startDate.localeCompare(b.startDate) ||
          a.id.localeCompare(b.id)
        );
      })[0]
  );
}
const storageKey = 'learning.exam-cycle';
type CycleState = {
  cycleId: string;
  cycles: ExamCycle[];
  selected?: ExamCycle;
  defaultId?: string;
  select: (id: string) => void;
  pending: boolean;
  error: boolean;
  retry: () => void;
  hasMore: boolean;
  loadMore: () => void;
};
export const CycleContext = createContext<CycleState | null>(null);
export const useCycle = () => useContext(CycleContext);
export function CycleProvider({ children }: PropsWithChildren) {
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(1);
  const [saved, setSaved] = useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? '';
    } catch {
      return '';
    }
  });
  const query = useQuery({
    queryKey: ['cycle-context', limit],
    queryFn: async ({ signal }) => {
      const items: ExamCycle[] = [];
      let total = 0;
      for (let page = 1; page <= limit; page++) {
        const data = (await listCycles({ page, size: 100 }, { signal, silent: true })).data;
        if (!data.items.length && items.length < data.total)
          throw new Error('考试周期列表已变化，请重新加载');
        items.push(...data.items);
        total = data.total;
        if (items.length >= total || !data.items.length) break;
      }
      return { items, total };
    },
  });
  const cycles = useMemo(() => query.data?.items ?? [], [query.data]);
  const automatic = defaultCycle(cycles, shanghaiDate(new Date().toISOString()));
  const requested = params.get('cycle');
  const legacy = params.get('cycleId');
  const explicit = cycles.find((c) => (requested ? cycleKey(c) === requested : c.id === legacy));
  const selected =
    explicit ??
    (requested || legacy ? undefined : (cycles.find((c) => c.id === saved) ?? automatic));
  const hasMore = !!query.data && cycles.length < query.data.total;
  useEffect(() => {
    // Resolve a saved/shared choice before falling back; also find the closest current period across pages.
    if (hasMore) setLimit((n) => n + 1);
  }, [hasMore]);
  useEffect(() => {
    if (!selected || hasMore) return;
    try {
      localStorage.setItem(storageKey, selected.id);
    } catch {
      /* storage can be unavailable */
    }
    const next = new URLSearchParams(params);
    next.delete('cycleId');
    if (selected.id !== automatic?.id || requested) next.set('cycle', cycleKey(selected));
    else next.delete('cycle');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    if (saved) setSaved('');
  }, [selected, automatic?.id, params, setParams, requested, hasMore, saved]);
  const select = (id: string) => {
    const cycle = cycles.find((c) => c.id === id);
    if (!cycle) return;

    const next = new URLSearchParams(params);
    next.delete('cycleId');
    next.delete('planId');
    if (id === automatic?.id) next.delete('cycle');
    else next.set('cycle', cycleKey(cycle));
    setParams(next);
  };
  return (
    <CycleContext.Provider
      value={{
        cycleId: selected?.id ?? '',
        selected,
        cycles,
        defaultId: automatic?.id,
        select,
        pending: query.isPending || hasMore,
        error: query.isError,
        retry: () => {
          void query.refetch();
        },
        hasMore,
        loadMore: () => setLimit((n) => n + 1),
      }}
    >
      {children}
    </CycleContext.Provider>
  );
}
export function CyclePicker() {
  const cycle = useCycle();
  if (!cycle || cycle.cycles.length < 2) return null;
  return (
    <label className="cycle-switcher">
      考试周期{' '}
      <select
        aria-label="考试周期"
        value={cycle.cycleId}
        onChange={(e) => cycle.select(e.target.value)}
      >
        {!cycle.selected && <option value="">请选择考试周期</option>}
        {cycle.cycles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
