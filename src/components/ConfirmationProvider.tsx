import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
const Context = createContext<(message: string) => Promise<boolean>>(() => Promise.resolve(false));
export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const resolver = useRef<((answer: boolean) => void) | null>(null);
  const answer = (value: boolean) => { resolver.current?.(value); resolver.current = null; setMessage(''); };
  return <Context.Provider value={message => new Promise(resolve => {
    resolver.current?.(false); resolver.current = resolve; setMessage(message);
  })}>{children}<Modal open={!!message} title="确认操作" onClose={() => answer(false)}>
    <p>{message}</p><div className="modal-actions"><Button variant="secondary" onClick={() => answer(false)}>取消，保留内容</Button><Button onClick={() => answer(true)}>确认继续</Button></div>
  </Modal></Context.Provider>;
}
export const useConfirmation = () => useContext(Context);
