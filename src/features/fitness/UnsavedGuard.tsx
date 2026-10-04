import { useEffect } from 'react';
import { useBlocker, useBeforeUnload } from 'react-router-dom';
/** Mount only alongside the open form, so the router has one active form blocker. */
export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('表单尚未保存，确定离开？')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useBeforeUnload((event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  return null;
}
