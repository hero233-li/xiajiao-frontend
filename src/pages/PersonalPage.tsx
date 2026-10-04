import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, BookOpen, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFitnessList, type Summary } from '../api/fitness';
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
    staleTime: 0,
    queryFn: async () =>
      (await apiRequest<{ data: Personal }>({ url: '/api/v1/personal/summary', silent: true }))
        .data,
  });
  const data = summary.data;
  return (
    <main id="main-content" className="platform-main personal-main" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">个人首页</p>
          <h1>今天的行动</h1>
          <p className="secondary">
            {profile.data?.[0]?.data?.displayName || auth.user?.username}
            ，查看安排，接着完成下一项。
          </p>
        </div>
        <span className="home-date">
          <CalendarDays size={18} />
          {data?.today ?? '今天'}
        </span>
      </div>
      {summary.isPending ? (
        <p role="status">正在读取今日安排…</p>
      ) : summary.error ? (
        <section className="home-load-error" role="alert">
          <h2>今日安排暂不可用</h2>
          <p>{summary.error.message}</p>
          <Button onClick={() => void summary.refetch()}>重新加载摘要</Button>
        </section>
      ) : (
        <div className="home-action-desk">
          <section className="home-study-action" aria-label="今日学习行动">
            <header>
              <BookOpen size={22} aria-hidden="true" />
              <h2>今日学习</h2>
              <span>{data?.study.target ? '待继续' : '暂无安排'}</span>
            </header>
            <h3>{data?.study.title || '安排下一次学习'}</h3>
            <p>{data?.study.message}</p>
            <div className="home-main-action">
              <Link
                className="button button-primary"
                to={
                  data?.study.target
                    ? learningTargetPath(data.study.target)
                    : '/study/schedule?create=1'
                }
              >
                {data?.study.target ? '开始这一项' : '安排学习'}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/study/schedule">查看任务清单</Link>
            </div>
            <nav aria-label="学习快捷入口">
              <Link to="/study/courses">课程与阅读</Link>
              <Link to="/study/training">练习与检测</Link>
              <Link to="/study/notes">学习笔记</Link>
            </nav>
          </section>
          <section className="home-fitness-action" aria-label="今日健身行动">
            <header>
              <Activity size={22} aria-hidden="true" />
              <h2>今日健身</h2>
              <span>{data?.fitnessToday.checkedIn ? '已打卡' : '待记录'}</span>
            </header>
            <h3>
              {data?.fitnessToday.checkedIn
                ? '今天已打卡'
                : data?.fitnessToday.rest
                  ? '今天是休息安排'
                  : '查看安排，记录今天'}
            </h3>
            <p>
              {data?.fitnessToday.checkedIn
                ? `连续打卡 ${data.fitness.streak} 天。训练、饮食与体重可继续补充。`
                : '训练与饮食分别记录，体重和饮水随手填写。'}
            </p>
            <div className="home-main-action">
              <Link className="button button-secondary" to="/fitness">
                {data?.fitnessToday.checkedIn ? '查看记录' : '开始记录'}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/fitness/weight">快速记体重</Link>
            </div>
            <nav aria-label="健身快捷入口">
              <Link to="/fitness/training">训练计划</Link>
              <Link to="/fitness/meals">今日饮食</Link>
              <Link to="/fitness/history">记录回顾</Link>
            </nav>
          </section>
        </div>
      )}
      <nav className="home-space-strip" aria-label="空间入口">
        <strong>进入空间</strong>
        <Link to="/study">
          自学空间 <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link to="/fitness">
          健身空间 <ArrowRight size={16} aria-hidden="true" />
        </Link>
        {auth.user?.role === 'ADMIN' && (
          <Link to="/admin">
            管理工作台 <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
        <Link to="/settings">账号与偏好</Link>
      </nav>
    </main>
  );
}
