import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { expect, it } from 'vitest';
import { UnsavedChangesProvider, UnsavedGuard } from './UnsavedGuard';
function Forms() {
  const [one, setOne] = useState('');
  const [two, setTwo] = useState('');
  return (
    <UnsavedChangesProvider>
      <label>
        表单一
        <input value={one} onChange={(e) => setOne(e.target.value)} />
      </label>
      <label>
        表单二
        <input value={two} onChange={(e) => setTwo(e.target.value)} />
      </label>
      <UnsavedGuard dirty={!!one} />
      <UnsavedGuard dirty={!!two} />
    </UnsavedChangesProvider>
  );
}
it('多个表单共用一个导航阻止器，空表单不覆盖另一个草稿', async () => {
  const router = createMemoryRouter([
    { path: '/', element: <Forms /> },
    { path: '/next', element: <p>下一页</p> },
  ]);
  render(<RouterProvider router={router} />);
  await userEvent.type(screen.getByLabelText('表单一'), '保留草稿');
  await router.navigate('/next');
  expect(await screen.findByRole('dialog', { name: '有未保存的修改' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(screen.getByLabelText('表单一')).toHaveValue('保留草稿');
  await router.navigate('/next');
  await userEvent.click(await screen.findByRole('button', { name: '确认' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/next'));
});
