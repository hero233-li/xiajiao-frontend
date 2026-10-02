import { ErrorState } from '../components/ErrorState';
export function Component() { return <ErrorState message="页面暂时无法加载，请刷新后重试。" onRetry={() => window.location.reload()} />; }
