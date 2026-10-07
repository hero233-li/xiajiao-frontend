import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSpaces } from '../spaces/api';
import { DirectoryState } from '../features/platform/DirectoryState';
import { ActionDesk } from '../features/platform/ActionDesk';
export function Component() {
  const { user } = useAuth();
  const directory = useSpaces();
  const date = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());
  return (
    <main id="main-content" className="platform-main growth-home" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{date}</p>
          <h1>今天，接着向前</h1>
          <p className="secondary">{user?.username}，从一项具体行动开始。</p>
        </div>
        <Link className="button button-secondary" to="/spaces">
          选择空间
        </Link>
      </div>
      <DirectoryState
        pending={directory.isPending}
        error={directory.error}
        retry={() => void directory.refetch()}
      >
        {directory.data && <ActionDesk directory={directory.data} />}
      </DirectoryState>
    </main>
  );
}
