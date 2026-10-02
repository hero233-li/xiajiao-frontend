import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { Providers } from './app/Providers';
import { routes } from './app/routes';
import { initializeAuthRecovery } from './api/auth-recovery';
import './styles/global.css';
async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_API_MOCK === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ serviceWorker: { url: '/mockServiceWorker.js' }, onUnhandledRequest: 'error', quiet: true });
  }
  initializeAuthRecovery();
  const router = createBrowserRouter(routes,{ future: { v7_relativeSplatPath: true } });
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Providers><RouterProvider router={router} fallbackElement={<p>正在加载页面</p>} future={{ v7_startTransition: true }} /></Providers></React.StrictMode>);
}
void start().catch(() => { const root = document.getElementById('root'); if (root) root.textContent = '页面暂时无法启动，请刷新后重试。'; });
