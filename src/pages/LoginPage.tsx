import { useEffect } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { LoginForm } from '../features/auth/LoginForm';
import '../styles/platform.css';
import '../styles/growth.css';
import '../features/auth/login.css';
export function Component() {
  useEffect(() => {
    document.title = '登录 · 知途个人成长平台';
  }, []);
  return (
    <main className="login-desk">
      <header className="login-brand">
        <BookOpen size={30} strokeWidth={1.8} />
        <strong>
          知途 <small>个人成长平台</small>
        </strong>
      </header>
      <div className="login-body">
        <section className="login-introduction">
          <p className="eyebrow">学习与生活的任务桌面</p>
          <h2>学习与生活，一处管理。</h2>
          <p>继续学习，记录训练，回看自己的进展。</p>
          <div className="login-path" aria-label="平台结构">
            <span>个人首页</span>
            <ArrowRight size={16} />
            <span>我的空间</span>
            <ArrowRight size={16} />
            <span>今日行动</span>
          </div>
          <div className="login-route">
            <BookOpen size={22} />
            <div>
              <strong>每个方向，都有清晰的下一步</strong>
              <span>课程阅读、训练安排与日常记录，在各自空间展开。</span>
            </div>
          </div>
        </section>
        <section className="login-entry" aria-labelledby="login-title">
          <p className="eyebrow">个人账号</p>
          <h1 id="login-title">欢迎回来</h1>
          <p className="secondary">登录后继续你的任务和记录。</p>
          <LoginForm />
        </section>
      </div>
      <footer>知途个人成长平台</footer>
    </main>
  );
}
