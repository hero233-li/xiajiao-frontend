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

/** Display ordering only: the API orders courses by code, not exam date. */
export function orderedExams(data: import('../../api/generated/models').Dashboard) {
  const dateTime = (item: import('../../api/generated/models').Countdown) => {
    const exam = data.cycle?.courses.find((exam) => exam.courseId === item.courseId);
    const date = item.examDate ?? exam?.examDate;
    return date ? `${date}T${exam?.startsAt ?? '23:59:59'}` : '\uffff';
  };
  return data.countdowns
    .map((item, index) => ({ item, index }))
    .sort((a, b) => dateTime(a.item).localeCompare(dateTime(b.item)) || a.index - b.index)
    .map(({ item }) => item);
}

/** Classify only confirmed plan details; absence of a suggestion alone cannot prove completion. */
export function todayPlanState(
  plan: import('../../api/generated/models').Plan | undefined,
  localDate: string,
): 'empty' | 'completed' | 'pending' | 'unknown' {
  if (!plan) return 'unknown';
  const today = plan.days.find((day) => day.day === localDate);
  if (!today || !today.segments.length) return 'empty';
  const tasks = today.segments.map((segment) =>
    plan.tasks.find((task) => task.id === segment.taskId),
  );
  if (tasks.some((task) => !task)) return 'unknown';
  return tasks.every((task) => task?.completed) ? 'completed' : 'pending';
}
