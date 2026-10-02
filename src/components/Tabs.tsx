import { useId, useRef, type ReactNode, type KeyboardEvent } from 'react';
export interface TabItem { id: string; label: string; content: ReactNode; disabledReason?: string; }
export function Tabs({ items, value, onChange, label }: { items: TabItem[]; value: string; onChange: (id: string) => void; label: string }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = items.findIndex(item => item.id === value);
  const enabled = items.map((item,index) => !item.disabledReason ? index : -1).filter(index => index >= 0);
  const onKey = (event: KeyboardEvent, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !enabled.length) return;
    event.preventDefault();
    const position = enabled.indexOf(index);
    const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)! : enabled[(position + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
    refs.current[next]?.focus(); onChange(items[next].id);
  };
  return <div><div role="tablist" aria-label={label} className="tabs-list">{items.map((item,index) => <button type="button" key={item.id} ref={node => { refs.current[index] = node; }} role="tab" className="tab" id={`${base}-tab-${index}`} aria-controls={`${base}-panel-${index}`} aria-selected={item.id === value} aria-describedby={item.disabledReason ? `${base}-reason-${index}` : undefined} tabIndex={index === active || (active < 0 && index === enabled[0]) ? 0 : -1} disabled={!!item.disabledReason} title={item.disabledReason} onClick={() => onChange(item.id)} onKeyDown={event => onKey(event,index)}>{item.label}</button>)}</div>
    {items.map((item,index) => <div key={item.id}>{item.disabledReason && <p className="button-reason" id={`${base}-reason-${index}`}>{item.label}：{item.disabledReason}</p>}<div role="tabpanel" id={`${base}-panel-${index}`} aria-labelledby={`${base}-tab-${index}`} tabIndex={0} hidden={item.id !== value} className="tab-panel">{item.content}</div></div>)}
  </div>;
}
