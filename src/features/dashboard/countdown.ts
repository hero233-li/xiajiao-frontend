export const EXAM_SOURCE = 'https://ce.sjtu.edu.cn/';
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
// Read the official page's target date as data; never evaluate its JavaScript.
export function parseExamTarget(html: string): number {
  const match = html.match(
    /\b(?:const|let|var)\s+targetDate\s*=\s*new\s+Date\(\s*["']([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s+(\d{2}):(\d{2}):(\d{2})["']\s*\)/,
  );
  if (!match) throw new Error('官网倒计时格式已变化，请查看官网确认考试时间。');
  const [, monthName, day, year, hour, minute, second] = match;
  const month = months.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
  const values = [Number(year), month, Number(day), Number(hour), Number(minute), Number(second)];
  const [y, m, d, h, min, sec] = values;
  const utc = new Date(Date.UTC(y, m, d, h, min, sec));
  if (
    m < 0 ||
    y < 2020 ||
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m ||
    utc.getUTCDate() !== d ||
    utc.getUTCHours() !== h ||
    utc.getUTCMinutes() !== min ||
    utc.getUTCSeconds() !== sec
  )
    throw new Error('官网倒计时日期无效，请查看官网确认考试时间。');
  // The exam is held in China; device time zone must not change the target.
  return utc.getTime() - 8 * 60 * 60 * 1000;
}
export function countdownParts(target: number, now: number) {
  const minutes = Math.floor(Math.max(0, target - now) / 60000);
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor(minutes / 60) % 24,
    minutes: minutes % 60,
  };
}

export type ExamSession = {
  date: string;
  time: string;
  courses: { code: string; name: string; national: boolean }[];
};
export function confirmedExamSessions(
  official: ExamSession[],
  courses: { id: string; code: string; name: string }[],
  exams: { courseId: string; examDate: string | null; startsAt: string | null; endsAt: string | null }[],
): ExamSession[] {
  const confirmed = exams.flatMap((exam) => {
    const course = courses.find((item) => item.id === exam.courseId);
    if (!course || !exam.examDate || !exam.startsAt) return [];
    return [{
      date: exam.examDate,
      time: exam.startsAt.slice(0, 5) + (exam.endsAt ? `-${exam.endsAt.slice(0, 5)}` : '（开考）'),
      courses: [{ code: course.code, name: course.name, national: official.some((session) => session.courses.some((item) => item.code === course.code && item.national)) }],
    }];
  });
  const codes = new Set(confirmed.flatMap((session) => session.courses.map((course) => course.code)));
  return [
    ...confirmed.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    ...official.flatMap((session) => {
      const remaining = session.courses.filter((course) => !codes.has(course.code));
      return remaining.length ? [{ ...session, courses: remaining }] : [];
    }),
  ];
}
export function parseExamSchedule(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const headings = [...doc.querySelectorAll('h5')];
  const title = headings.find((node) => node.textContent?.includes('理论课考试日程'));
  const major = title?.nextElementSibling;
  const section = major?.nextElementSibling;
  const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
  const sessions: ExamSession[] = [...(section?.querySelectorAll('.col-md-3') ?? [])].map(
    (node) => {
      const header = clean(node.querySelector('h6')?.textContent);
      const match = header.match(
        /^(\d{1,2}\.\d{1,2}日[（(]星期.[）)])\s*(\d{2}:\d{2}-\d{2}:\d{2})$/,
      );
      if (!match) throw new Error('官网考试日程格式已变化，请查看官网确认。');
      const copy = node.cloneNode(true) as Element;
      copy.querySelectorAll('br,h6').forEach((line) => line.after(doc.createTextNode('\n')));
      const courses = (copy.textContent ?? '').split('\n').flatMap((line) => {
        const course = clean(line).match(/^(\*)?\((\d{5})\)\s*(.+)$/);
        return course ? [{ code: course[2], name: course[3], national: !!course[1] }] : [];
      });
      if (!courses.length) throw new Error('官网课程列表暂不可用，请查看官网确认。');
      return { date: match[1], time: match[2], courses };
    },
  );
  if (!title || !sessions.length) throw new Error('官网考试日程暂不可用，请查看官网确认。');
  const notes = [...doc.querySelectorAll('p')].map((node) => clean(node.textContent));
  const practice = notes.find((text) => text.includes('本次实践考科目'));
  const practiceList = practice?.split(/安排[:：]/)[1]?.split('实践考科目考试日期')[0] ?? '';
  const practiceCourses = [...practiceList.matchAll(/(?:^|[,，])\s*(\d{5})\s*([^,，]+)/g)].map(
    (match) => ({ code: match[1], name: match[2].trim(), national: false }),
  );
  const practiceDates = practice?.match(/考试日期暂定([^，。]+?日)/)?.[1];
  return {
    title: clean(title.textContent),
    major: clean(major?.textContent),
    sessions,
    note: notes.find((text) => text.includes('*表示全国统考科目'))?.split('*表示')[1],
    practice,
    practiceCourses,
    practiceDates,
  };
}

export function personalExamSessions(
  schedule: ReturnType<typeof parseExamSchedule>,
  codes: string[],
) {
  const selected = new Set(codes);
  const theory = schedule.sessions.flatMap((session) => {
    const courses = session.courses.filter((course) => selected.has(course.code));
    return courses.length ? [{ ...session, courses }] : [];
  });
  const practical = schedule.practiceCourses.filter((course) => selected.has(course.code));
  return [
    ...theory,
    ...(practical.length
      ? [
          {
            date: schedule.practiceDates ? `${schedule.practiceDates}（暂定）` : '日期待官网通知',
            time: '具体时段待通知',
            courses: practical,
          },
        ]
      : []),
  ];
}
