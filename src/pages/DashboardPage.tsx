import { useEffect } from 'react';
import { ExamCountdown } from '../features/dashboard/ExamCountdown';
export function DashboardPage() {
  useEffect(() => {
    document.title = '考试倒计时 · 知途个人成长平台';
  }, []);
  return (
    <section className="study-workbench">
      <header className="page-heading">
        <div>
          <p className="eyebrow">自学空间</p>
          <h1>今日</h1>
        </div>
      </header>
      <ExamCountdown />
    </section>
  );
}
export const Component = DashboardPage;
