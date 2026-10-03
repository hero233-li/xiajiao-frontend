import { useQuery } from '@tanstack/react-query';
import { ArrowRight, PencilLine, FileCheck2, Files } from 'lucide-react';
import { CyclePicker, useCycle } from '../features/cycle/CycleContext';
import { Link } from '../features/cycle/navigation';
import { listCourses } from '../api/generated/courses/courses';
import { RegionState } from '../components/dashboard/RegionState';
export function Component() {
  const cycle = useCycle();
  const courses = useQuery({
    queryKey: ['my-courses', cycle?.cycleId],
    enabled: !!cycle?.cycleId,
    queryFn: async ({ signal }) =>
      (await listCourses({ cycleId: cycle!.cycleId!, size: 100 }, { signal, silent: true })).data,
  });
  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">PRACTICE / 练习与检测</p>
          <h1>练到理解，测出方向。</h1>
          <p className="secondary">日常练习及时看解析，正式检测独立作答后查看结果。</p>
        </div>
        <CyclePicker />
      </header>
      {cycle?.pending || (!!cycle?.cycleId && courses.isPending) ? (
        <RegionState kind="loading" message="正在读取课程题库…" />
      ) : cycle?.error ? (
        <RegionState kind="error" message="考试周期加载失败" retry={cycle.retry} />
      ) : !cycle?.cycleId ? (
        <RegionState kind="empty" message="暂无考试周期" />
      ) : courses.isError ? (
        <RegionState kind="error" message="题库入口加载失败" retry={() => void courses.refetch()} />
      ) : (
        <div className="training-options">
          {[
            [
              'practice',
              '章节练习与错题',
              PencilLine,
              '按章节选题，提交后查看答案与解析。错题、收藏和存疑题随时复习。',
            ],
            [
              'detect',
              '章节检测与模拟卷',
              FileCheck2,
              '先查看资格和规则。开始后计时持续，答案自动保存，交卷后查看结果。',
            ],
            [
              'exams',
              '真题与成绩记录',
              Files,
              '按年月找真题，手动录入成绩并上传答题照片，查看趋势与样本依据。',
            ],
          ].map(([pane, label, Icon, desc]) => {
            const Glyph = Icon as typeof PencilLine;
            return (
              <section className="training-option" key={String(pane)}>
                <Glyph size={24} />
                <h2>{String(label)}</h2>
                <p>{String(desc)}</p>
                {courses.data?.items
                  .filter((c) => c.capabilities[pane === 'exams' ? 'exams' : 'practice'])
                  .map((c) => (
                    <Link
                      key={c.id}
                      to={`/zikao/course/${c.code}/${pane === 'detect' ? 'practice?mode=detect' : pane}`}
                    >
                      <strong>{c.name}</strong>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                {!courses.data?.items.some(
                  (c) => c.capabilities[pane === 'exams' ? 'exams' : 'practice'],
                ) && <p className="inline-empty">本周期暂无可用课程。</p>}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
