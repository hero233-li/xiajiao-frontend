import { Card } from '../components/Card';
import { PageContainer } from '../components/PageContainer';
import { LoginForm } from '../features/auth/LoginForm';
export function Component() { return <main><PageContainer className="login-container"><Card><h1>登录学习知途</h1><p>登录后返回你刚才访问的地址。</p><LoginForm /></Card></PageContainer></main>; }
