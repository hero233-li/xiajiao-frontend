import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { UNSAFE_DataRouterContext, useBeforeUnload, useBlocker } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';
type Register = (id: string, dirty: boolean) => void;
const Registry = createContext<Register | null>(null);
/** One router blocker for the entire page; multiple forms contribute their dirty state. */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [forms, setForms] = useState<Set<string>>(() => new Set());
  const register = useCallback<Register>(
    (id, dirty) =>
      setForms((previous) => {
        if (previous.has(id) === dirty) return previous;
        const next = new Set(previous);
        if (dirty) next.add(id);
        else next.delete(id);
        return next;
      }),
    [],
  );
  const value = useMemo(() => register, [register]);
  return (
    <Registry.Provider value={value}>
      <RouteGuard dirty={forms.size > 0} />
      {children}
    </Registry.Provider>
  );
}
function RegisteredGuard({ dirty, register }: { dirty: boolean; register: Register }) {
  const id = useId();
  useLayoutEffect(() => {
    register(id, dirty);
    return () => register(id, false);
  }, [id, dirty, register]);
  return null;
}
export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const register = useContext(Registry);
  const router = useContext(UNSAFE_DataRouterContext);
  return register ? (
    <RegisteredGuard dirty={dirty} register={register} />
  ) : router ? (
    <RouteGuard dirty={dirty} />
  ) : null;
}
function RouteGuard({ dirty }: { dirty: boolean }) {
  useBeforeUnload((e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  const blocker = useBlocker(dirty);
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="有未保存的修改"
      message="离开会放弃当前输入。取消可继续编辑，已保存的数据仍保留。"
      onClose={() => {
        if (blocker.state === 'blocked') blocker.reset();
      }}
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
}
