import type { ReactNode } from 'react';
import { Button } from '../../components/Button';
export function DirectoryState({
  pending,
  error,
  retry,
  children,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
  children: ReactNode;
}) {
  if (pending)
    return (
      <section className="platform-section" role="status">
        正在读取空间…
      </section>
    );
  if (error)
    return (
      <section className="platform-section" role="alert">
        <h2>空间暂时无法读取</h2>
        <p>{error.message}</p>
        <Button onClick={retry}>重新加载空间</Button>
      </section>
    );
  return <>{children}</>;
}
