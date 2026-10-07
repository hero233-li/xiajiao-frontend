import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { server } from '../../mocks/server';
import { localToday, type Day } from '../../api/fitness';
import { QuickRecords } from './QuickRecords';

it('saves weight2 with its own revision without writing weight1', async () => {
  const date = localToday();
  const day = {
    date,
    records: {
      weight: { kind: 'weight', key: date, revision: 7, data: { kg: 70, note: 'first' } },
      weight2: { kind: 'weight2', key: date, revision: 2, data: { kg: 65, note: 'second' } },
    },
  } as Day;
  const writes: Array<{ path: string; body: unknown }> = [];
  server.use(
    http.put('/api/v1/fitness/records/:kind/:date', async ({ request, params }) => {
      const body = (await request.json()) as { data: unknown };
      writes.push({ path: String(params.kind), body });
      return HttpResponse.json({
        code: 0,
        message: '成功',
        data: { kind: params.kind, key: date, revision: 3, data: body.data },
      });
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <QueryClientProvider client={client}>
          <QuickRecords day={day} onlyWeight />
          <QuickRecords day={day} onlyWeight weightKind="weight2" />
        </QueryClientProvider>
      ),
    },
  ]);
  render(<RouterProvider router={router} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('体重2（kg）'), '64.5');
  await user.click(screen.getByRole('button', { name: '保存体重2' }));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]).toEqual({
    path: 'weight2',
    body: { data: { kg: 64.5, note: 'second' }, expectedRevision: 2 },
  });
  expect(screen.getByText('70 kg · 已记录')).toBeVisible();
});
