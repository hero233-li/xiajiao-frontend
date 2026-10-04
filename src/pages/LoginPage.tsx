import { useEffect } from 'react';
import { BookOpen, Activity } from 'lucide-react';
import { LoginForm } from '../features/auth/LoginForm';
import '../styles/platform.css';
import '../features/auth/login.css';
export function Component() {
  useEffect(() => {
    document.title = '登录 · 知途个人管理平台';
  }, []);
  return (
    <main className="login-desk">
      <header className="login-brand">
        <span>途</span>
        <strong>
          知途 <small>个人管理平台</small>
        </strong>
      </header>
      <div className="login-body">
        <section className="login-introduction">
          <p className="eyebrow">学习与生活的任务桌面</p>
          <h2>学习与生活，一处管理。</h2>
          <p>继续学习，记录训练，回看自己的进展。</p>
          <div className="login-capabilities">
            <div>
              <BookOpen size={22} />
              <strong>自学</strong>
              <span>课程 · 练习 · 学习计划</span>
            </div>
            <div>
              <Activity size={22} />
              <strong>健身</strong>
              <span>训练 · 饮食 · 日常记录</span>
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
      <footer>知途个人管理平台</footer>
    </main>
  );
}
