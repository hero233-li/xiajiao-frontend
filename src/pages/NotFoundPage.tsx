import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
export function Component() { const navigate = useNavigate(); return <><h1>页面未找到</h1><EmptyState message="这个地址暂时无法访问。" actionLabel="返回健康检查" onAction={() => navigate('/health')} /></>; }
