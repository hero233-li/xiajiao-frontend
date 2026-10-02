import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { login } from '../api/generated/auth/auth';
import { sessionStore } from '../api/session';
import { Providers } from '../app/Providers';
import { routes } from '../app/routes';
export async function startDemoSession() {
  const response = await login({ identifier: 'demo', password: 'Demo12345' }, { skipAuth: true, skipRefresh: true });
  sessionStore.start(response.data); return response.data;
}
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path], future: { v7_relativeSplatPath: true } });
  return { router, ...render(<Providers><RouterProvider router={router} future={{ v7_startTransition: true }} /></Providers>) };
}
