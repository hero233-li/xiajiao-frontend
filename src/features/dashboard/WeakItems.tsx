import type { Course } from '../../api/generated/models';
import { useWrongQuestions } from '../../api/practice-selection';
import { Link } from '../cycle/navigation';
import { RegionState } from '../../components/dashboard/RegionState';
function CourseWeakItems({course}: {course:Course}) {
 const query=useWrongQuestions(course.id,1);
 return <div className="weak-course"><h3>{course.name}</h3>{query.isPending?<RegionState kind="loading" message="正在读取错题…"/>:query.error?<RegionState kind="error" message={query.error.message} retry={query.refetch}/>:<><p>{query.data?.total ? `${query.data.total} 道错题待巩固` : '当前没有错题记录'}</p>{!!query.data?.total && <Link className="text-action" to={`/study/course/${course.code}/practice`}>选择错题重做 →</Link>}</>}</div>;
}
export function WeakItems({courses}: {courses:Course[]}) {return <section className="platform-section"><div className="section-title"><h2>薄弱项与复习</h2><span className="help">来自实际错题记录</span></div>{courses.filter(c=>c.capabilities.practice).map(c=><CourseWeakItems key={c.id} course={c}/>)}{!courses.some(c=>c.capabilities.practice)&&<p className="inline-empty">当前课程没有开放题库。</p>}</section>;}
