import { useNavigate } from '../features/cycle/navigation';
import { EmptyState } from '../components/EmptyState';
export function Component() { const navigate = useNavigate(); return <><h1>页面未找到</h1><EmptyState message="这个地址暂时无法访问。" actionLabel="返回备考总览" onAction={() => navigate('/zikao')} /></>; }
