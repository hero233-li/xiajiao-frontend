import { Outlet } from 'react-router-dom';
export { Component as ErrorBoundary } from '../pages/RouteErrorPage';
export function Component() { return <Outlet />; }
