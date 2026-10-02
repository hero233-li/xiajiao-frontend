export interface Notice { id: number; message: string; }
let notices: Notice[] = [];
let sequence = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export const notifications = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => notices,
  error(message: string) { if (notices.some((item) => item.message === message)) return; notices = [...notices.slice(-2), { id: ++sequence, message }]; emit(); },
  dismiss(id: number) { notices = notices.filter((item) => item.id !== id); emit(); },
  clear() { notices = []; emit(); },
};
