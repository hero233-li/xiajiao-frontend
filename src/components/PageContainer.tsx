import type { HTMLAttributes } from 'react';
export function PageContainer({ size = 'list', className = '', ...props }: HTMLAttributes<HTMLDivElement> & { size?: 'list' | 'course' | 'practice' }) {
  return <div {...props} className={`page-container page-container-${size} ${className}`} />;
}
