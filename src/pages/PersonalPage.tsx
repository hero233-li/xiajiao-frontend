import { useQuery } from '@tanstack/react-query';
import { Activity,ArrowRight,BookOpen,CalendarDays,CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFitnessList,type Summary } from '../api/fitness';
import type { Navigation } from '../api/generated/models';
import { apiRequest } from '../api/http';
import { Button } from '../components/Button';
import { learningTargetPath } from '../features/dashboard/navigation';
import { useAuth } from '../hooks/useAuth';
interface Personal {
  today: string;
  study: { title: string; message: string; target: Navigation | null };
  fitness: Summary;
  fitnessToday: { checkedIn: boolean; rest: boolean; partial: boolean };
}
export function Component() {
  const auth = useAuth();
  const profile = useFitnessList('profile');
  const summary = useQuery({
    queryKey: ['personal-home'],
    queryFn: async () =>
      (await apiRequest<{ data: Personal }>({ url: '/api/v1/personal/summary', silent: true }))
        .data,
  });
  const data = summary.data;
  return (
    <main id="main-content" className="platform-main personal-main" tabIndex={-1}>
      <div className="page-heading">
        <div><p className="eyebrow">个人首页</p><h1>今天的行动</h1><p className="secondary">{profile.data?.[0]?.data?.displayName || auth.user?.username}，查看安排，接着完成下一项。</p></div>
        <span className="home-date"><CalendarDays size={18} />{data?.today ?? '今天'}</span>
      </div>
      <section className="home-today">
        <div className="section-title">
          <h2>今日安排</h2>
          <span className="secondary">学习与健身</span>
        </div>
        {summary.isPending ? (
          <p role="status">正在读取今日摘要…</p>
        ) : summary.error ? (
          <div role="alert">
            <p>{summary.error.message}</p>
            <Button onClick={() => summary.refetch()}>重新加载摘要</Button>
          </div>
        ) : (
          <div className="today-agenda">
            <div>
              <span className="agenda-marker study-marker">
                <BookOpen size={19} />
              </span>
              <div>
                <h3>{data?.study.title ?? '今日学习'}</h3>
                <p>{data?.study.message ?? '进入空间安排今天的学习。'}</p>
              </div>
              <Link className="button button-primary" to={data?.study.target ? learningTargetPath(data.study.target) : '/study/schedule?create=1'}>
                {data?.study.target ? '开始这一项' : '安排学习'} <ArrowRight size={17} />
              </Link>
            </div>
            <div>
              <span className="agenda-marker fitness-marker">
                {data?.fitnessToday.checkedIn ? <CheckCircle2 size={19} /> : <Activity size={19} />}
              </span>
              <div>
                <h3>
                  {data?.fitnessToday.checkedIn
                    ? '今天已打卡'
                    : data?.fitnessToday.rest
                      ? '今天是休息安排'
                      : '今天待记录'}
                </h3>
                <p>
                  {data?.fitnessToday.checkedIn
                    ? `连续打卡 ${data.fitness.streak} 天。`
                    : '查看今日训练和饮食安排，快速记录体重、饮水与打卡。'}
                </p>
              </div>
              <Link to="/fitness">
                {data?.fitnessToday.checkedIn ? '查看记录' : '开始记录'} <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        )}
      </section>
      <section className="home-spaces" aria-label="空间入口">
        <Link to="/study"><BookOpen size={24}/><div><h2>自学空间</h2><p>课程、任务与学习记录</p></div><ArrowRight size={20}/></Link>
        <Link to="/fitness"><Activity size={24}/><div><h2>健身空间</h2><p>训练、饮食与身体记录</p></div><ArrowRight size={20}/></Link>
      </section>
      <Link className="text-action" to="/settings">管理个人资料与偏好</Link>
    </main>
  );
}
