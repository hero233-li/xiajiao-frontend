import { CyclePicker } from '../features/cycle/CycleContext';
import { useState } from 'react';
import { Link, useSearchParams } from '../features/cycle/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listCourses, saveEnrollment } from '../api/generated/courses/courses';
import type { Course } from '../api/generated/models';
import { useExamCycles } from '../api/dashboard';
import { CourseCard } from '../components/dashboard/CourseCard';
import { errorMessage } from '../api/errors';
import '../features/dashboard/dashboard.css';
export function Component() {
  const [params] = useSearchParams();
  const cycleId = params.get('cycleId') || '';
  const cycles = useExamCycles(1);
  const client = useQueryClient();
  const [saved, setSaved] = useState('');
  const courses = useQuery({ queryKey: ['my-courses', cycleId], enabled: !!cycleId,
    queryFn: async ({ signal }) => (await listCourses({ cycleId, size: 100 }, { signal })).data });
  const enrollment = useMutation({
    mutationFn: async (course: Course) => {
      const old = course.enrollment;
      return saveEnrollment(course.id, cycleId, { paid: !old?.paid, fee: old?.fee ?? null,
        officialScore: old?.officialScore ?? null, officialPassed: old?.officialPassed ?? null,
        passedMonth: old?.passedMonth ?? null, note: old?.note ?? '', expectedRevision: old?.revision ?? 0 });
    },
    onSuccess: async (_, course) => { setSaved(`${course.name}报考状态已保存`); await client.invalidateQueries(); },
  });
  const cycle = cycles.data?.items.find(c => c.id === cycleId);
  return <section className="ov-page" aria-label="我的科目">
    <header className="ov-heading"><div><p className="ov-kicker">学习知途</p><h1>我的科目</h1></div><Link to={`/zikao${cycleId ? `` : ''}`}>返回备考总览</Link></header>
    <CyclePicker />
    {cycles.isError && <p role="alert">{errorMessage(cycles.error)} <button onClick={() => void cycles.refetch()}>重试</button></p>}
    {!cycleId && <p>选择考试周期，查看科目与本人报考状态。</p>}
    {courses.isPending && cycleId && <p>正在加载科目…</p>}
    {courses.isError && <p role="alert">{errorMessage(courses.error)} <button onClick={() => void courses.refetch()}>重试</button></p>}
    {enrollment.isError && <p role="alert">{errorMessage(enrollment.error)}</p>}
    {saved && <p role="status">{saved}</p>}
    <div className="ov-course-grid">{courses.data?.items.map(course => <div key={course.id}>
      <CourseCard course={course} cycleId={cycleId} exam={cycle?.courses.find(c => c.courseId === course.id)} />
      <p>{course.enrollment?.paid ? '已记录报考缴费' : '尚未记录报考缴费'}</p>
      <button disabled={enrollment.isPending} onClick={() => enrollment.mutate(course)}>{course.enrollment?.paid ? '撤销缴费标记' : '标记已缴费'} · {course.name}</button>
      <p><Link to={`/zikao/course/${course.code}/knowledge`}>知识合集</Link> · {course.capabilities.practice && <Link to={`/zikao/course/${course.code}/practice`}>章节练习</Link>}{course.capabilities.manual && <Link to={`/zikao/course/${course.code}/manual`}>实践手册</Link>}</p>
    </div>)}</div>
  </section>;
}
