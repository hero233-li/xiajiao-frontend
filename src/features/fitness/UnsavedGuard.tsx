import { useContext } from 'react';
import { UNSAFE_DataRouterContext, useBeforeUnload, useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const router = useContext(UNSAFE_DataRouterContext);
  useBeforeUnload((e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  return router ? <RouteGuard dirty={dirty} /> : null;
}
function RouteGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(dirty);
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="有未保存的修改"
      message="离开会放弃当前输入。取消可继续编辑。"
      onClose={() => {
        if (blocker.state === 'blocked') blocker.reset();
      }}
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
}
