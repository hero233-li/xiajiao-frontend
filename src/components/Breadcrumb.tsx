import { Link } from '../features/cycle/navigation';
import { ChevronRight } from 'lucide-react';
export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return <nav className="breadcrumb" aria-label="面包屑"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{index > 0 && <ChevronRight size={16} aria-hidden="true" />}{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>}</li>)}</ol></nav>;
}
