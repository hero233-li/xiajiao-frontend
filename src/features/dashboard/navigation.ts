import type { Navigation } from '../../api/generated/models';
/** 所有入口接收后端的同一 Navigation，保留稳定条目和题目 ID。 */
export function learningTargetPath(target: Navigation, _cycleId?: string) {
  const query = new URLSearchParams();
  if (target.chapterId && target.pane !== 'PRACTICE') query.set('chapterId', target.chapterId);
  if (target.itemId) query.set('itemId', target.itemId);
  if (target.questionId) query.set('questionId', target.questionId);
  const chapter =
    target.pane === 'PRACTICE' && target.chapterId
      ? `/${encodeURIComponent(target.chapterId)}`
      : '';
  return `/zikao/course/${encodeURIComponent(target.courseCode)}/${target.pane.toLowerCase()}${chapter}?${query}`;
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(`${date}T00:00:00+08:00`));
}
