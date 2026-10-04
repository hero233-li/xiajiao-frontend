import { useEffect } from 'react';
import { BookOpen, Activity, ArrowUpRight } from 'lucide-react';
import { LoginForm } from '../features/auth/LoginForm';
import '../styles/platform.css';
import '../features/auth/login.css';
export function Component() {
  useEffect(() => {
    document.title = '登录 · 知途个人管理平台';
  }, []);
  return (
    <main className="platform-login">
      <section className="platform-login-intro">
        <div className="platform-logo">
          <span>途</span>
          <strong>
            知途<small>个人管理平台</small>
          </strong>
        </div>
        <div>
          <p className="eyebrow">YOUR SPACE, YOUR PACE</p>
          <h2>
            让每一天，
            <br />
            有自己的节奏。
          </h2>
          <p>
            学习、训练和日常记录。
            <br />
            给重要的事，留一个有序的空间。
          </p>
          <div className="login-spaces">
            <span>
              <BookOpen size={19} />
              自学空间
              <ArrowUpRight size={16} />
            </span>
            <span>
              <Activity size={19} />
              健身空间
              <ArrowUpRight size={16} />
            </span>
          </div>
        </div>
        <small>知途 / 记录每一步，留给自己看</small>
      </section>
      <section className="platform-login-form">
        <div>
          <p className="eyebrow">WELCOME BACK</p>
          <h1 id="login-title">欢迎回来</h1>
          <p className="secondary">登录你的个人空间。</p>
          <LoginForm />
          <p className="login-footer secondary">一个账号，继续学习，也照顾生活。</p>
        </div>
      </section>
    </main>
  );
}
