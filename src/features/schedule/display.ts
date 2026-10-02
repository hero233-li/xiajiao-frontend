import type { PlanTask } from '../../api/generated/models';
export function shanghaiDate(instant: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant));
}
export function dayLabel(day: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  }).format(new Date(`${day}T12:00:00+08:00`));
}
export const hours = (minutes: number) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(minutes / 60);
export const wholeHours = (hours: number) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(hours);
export const isWeekend = (day: string) =>
  [0, 6].includes(new Date(`${day}T12:00:00+08:00`).getUTCDay());
export function taskHref(task: PlanTask, _cycleId?: string) {
  const params = new URLSearchParams();
  if (task.target.chapterId) params.set('chapterId', task.target.chapterId);
  if (task.target.itemId) params.set('itemId', task.target.itemId);
  const pane =
    task.kind === 'PAPER'
      ? 'exams'
      : task.kind === 'ITEM'
        ? 'catalog'
        : task.target.pane.toLowerCase();
  return `/zikao/course/${encodeURIComponent(task.target.courseCode)}/${pane}?${params}${pane === 'catalog' && task.target.chapterId ? `#${encodeURIComponent(task.target.chapterId)}` : ''}`;
}

export function durationLabel(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours ? `${hours} 小时${rest ? ` ${rest} 分钟` : ''}` : `${rest} 分钟`;
}
export function planDays(start: string, end: string) {
  return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1);
}
