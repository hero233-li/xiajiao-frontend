import { useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { Card } from '../components/Card';
import { PageContainer } from '../components/PageContainer';
import { LoginForm } from '../features/auth/LoginForm';
import '../features/auth/login.css';

export function Component() {
  useEffect(() => {
    const previous = document.title;
    document.title = '登录 · 学习知途';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <main className="login-page" aria-labelledby="login-title">
      <PageContainer className="login-container">
        <Card className="login-panel">
          <div className="login-brand">
            <span className="login-brand-icon">
              <BookOpen size={24} aria-hidden="true" />
            </span>
            <span>学习知途</span>
          </div>
          <header className="login-heading">
            <h1 id="login-title">登录学习知途</h1>
            <p className="login-intro">登录后继续备考</p>
            <p className="secondary">查看学习进度、练习题目，记录每一步收获。</p>
          </header>
          <LoginForm />
          <p className="login-footer secondary">登录成功后，将返回你刚才访问的页面。</p>
        </Card>
      </PageContainer>
    </main>
  );
}
