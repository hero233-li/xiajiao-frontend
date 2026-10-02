const dateTime = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function formatShanghaiDate(value: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  // 契约的事件时间包含时区；业务日期不能被浏览器本地时区偏移。
  if (!dateOnly && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return '时间格式不正确';
  const date = new Date(dateOnly ? `${value}T00:00:00+08:00` : value);
  if (!Number.isFinite(date.getTime())) return '时间格式不正确';
  const parts = Object.fromEntries(dateTime.formatToParts(date).map(part => [part.type,part.value]));
  return `${parts.month}/${parts.day}${dateOnly ? '' : ` ${parts.hour}:${parts.minute}`}`;
}
