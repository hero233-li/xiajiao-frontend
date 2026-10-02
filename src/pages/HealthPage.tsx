import { HealthCheck } from '../features/health/HealthCheck';
export function Component() { return <><h1>工程健康检查</h1><p className="secondary">验证接口连接、统一请求层和登录恢复流程。</p><HealthCheck /></>; }
