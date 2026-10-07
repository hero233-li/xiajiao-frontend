import { useSpaces } from '../spaces/api';
import { DirectoryState } from '../features/platform/DirectoryState';
import { ActionDesk } from '../features/platform/ActionDesk';
export function Component() {
  const d = useSpaces();
  return (
    <main id="main-content" className="platform-main" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">跨空间安排</p>
          <h1>今日任务</h1>
          <p className="secondary">进入原任务页面执行，每个空间保留自己的完成规则。</p>
        </div>
      </div>
      <DirectoryState pending={d.isPending} error={d.error} retry={() => void d.refetch()}>
        {d.data && <ActionDesk directory={d.data} tasksOnly />}
      </DirectoryState>
    </main>
  );
}
