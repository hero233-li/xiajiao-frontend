import '@testing-library/jest-dom/vitest';
import { http, HttpResponse } from 'msw';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from '../mocks/server';
import { resetMockSession } from '../mocks/handlers';
import { sessionStore } from '../api/session';
import { initializeAuthRecovery } from '../api/auth-recovery';
import { notifications } from '../utils/notifications';
beforeAll(() => {
  window.scrollTo = vi.fn();
  server.listen({ onUnhandledRequest: 'error' });
  initializeAuthRecovery();
});
beforeEach(() => {
  server.use(
    http.get('/api/v1/fitness/records/profile', () =>
      HttpResponse.json({
        code: 0,
        message: 'ok',
        data: { items: [], page: 1, size: 30, total: 0 },
      }),
    ),
  );
  sessionStore.clear();
  resetMockSession();
  notifications.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  sessionStore.clear();
  resetMockSession();
  notifications.clear();
});
afterAll(() => server.close());
