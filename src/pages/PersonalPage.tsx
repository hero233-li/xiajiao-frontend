import { Link } from 'react-router-dom';
import { BookOpen, Activity, ArrowRight, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/http';
import { useAuth } from '../hooks/useAuth';
import { useFitnessList, type Summary } from '../api/fitness';
import { Button } from '../components/Button';
interface Personal {
  today: string;
  study: { title: string; message: string; target: { route: string; courseCode?: string } | null };
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
        <div>
          <p className="eyebrow">A LITTLE PROGRESS, EVERY DAY</p>
          <h1>{profile.data?.[0]?.data?.displayName || auth.user?.username}，欢迎回来。</h1>
          <p className="secondary">学习与生活，各有自己的节奏。</p>
        </div>
        <span className="home-date">
          <CalendarDays size={18} />
          {data?.today ?? '今天'}
        </span>
      </div>
      <div className="space-entries">
        <Link className="space-entry study-entry" to="/study">
          <div className="space-number">01 / STUDY</div>
          <BookOpen size={36} />
          <h2>自学空间</h2>
          <p>
            让知识连成路径。继续阅读、练习，
            <br />
            把下一步学扎实。
          </p>
          <span>
            进入自学空间 <ArrowRight size={20} />
          </span>
          <div className="space-art study-art" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </Link>
        <Link className="space-entry fitness-entry" to="/fitness">
          <div className="space-number">02 / FITNESS</div>
          <Activity size={36} />
          <h2>健身空间</h2>
          <p>
            安排训练与饮食，记录身体的变化，
            <br />
            留意每一天的感受。
          </p>
          <span>
            进入健身空间 <ArrowRight size={20} />
          </span>
          <div className="space-art fitness-art" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </Link>
      </div>
      <section className="home-today">
        <div className="section-title">
          <h2>今天，先做这些</h2>
          <span className="secondary">保持简单，行动明确</span>
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
              <Link to="/study">
                继续学习 <ArrowRight size={17} />
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
                      : '给今天留一笔'}
                </h3>
                <p>
                  {data?.fitnessToday.checkedIn
                    ? `连续打卡 ${data.fitness.streak} 天。`
                    : '训练、饮食、体重与每日感受，可按自己的需要记录。'}
                </p>
              </div>
              <Link to="/fitness">
                {data?.fitnessToday.checkedIn ? '查看记录' : '开始记录'} <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        )}
      </section>
      <aside className="home-note">
        <span>给自己的空间</span>
        <p>无需一次做完所有事情。让每次记录，都能接上下一次。</p>
        <Link to="/settings">管理个人资料与偏好</Link>
      </aside>
    </main>
  );
}
