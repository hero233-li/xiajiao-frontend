import { Outlet } from 'react-router-dom';
import { UnsavedChangesProvider } from '../components/UnsavedGuard';
export { Component as ErrorBoundary } from '../pages/RouteErrorPage';
export function Component() {
  return (
    <UnsavedChangesProvider>
      <Outlet />
    </UnsavedChangesProvider>
  );
}
