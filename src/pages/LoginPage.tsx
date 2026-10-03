import { useEffect } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { LoginForm } from '../features/auth/LoginForm';
import '../features/auth/login.css';
export function Component() {
  useEffect(() => {
    document.title = '登录 · 学习知途';
  }, []);
  return (
    <main className="login-page" aria-labelledby="login-title">
      <div className="login-story">
        <div className="desk-brand">
          <span className="brand-symbol">途</span>
          <span>
            学习知途<small>自考学习工作台</small>
          </span>
        </div>
        <div>
          <p className="eyebrow">LEARN WITH INTENTION</p>
          <h2>
            知识有来路。
            <br />
            努力有去处。
          </h2>
          <p>
            让今天的任务、读过的内容和练过的题，
            <br />
            连成一条清晰的学习路径。
          </p>
          <ul>
            <li>
              <Check size={17} /> 从今日任务接着学习
            </li>
            <li>
              <Check size={17} /> 阅读、练习与检测有序衔接
            </li>
            <li>
              <Check size={17} /> 每一份进度与笔记妥善记录
            </li>
          </ul>
        </div>
        <p className="login-story-foot">学习知途 / 为每一天的学习而设计</p>
      </div>
      <section className="login-panel">
        <BookOpen size={28} aria-hidden="true" />
        <header className="login-heading">
          <p className="eyebrow">欢迎回来</p>
          <h1 id="login-title">登录学习知途</h1>
          <p className="secondary">登录后，回到你的学习进度。</p>
        </header>
        <LoginForm />
        <p className="login-footer secondary">登录成功后将返回刚才访问的页面。</p>
      </section>
    </main>
  );
}
