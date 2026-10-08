import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ContentEditor } from './ContentEditor';
import type { ContentRelease, TaskTemplate } from '../../api/generated/models';
const api = vi.hoisted(() => ({ request: vi.fn(), all: vi.fn() }));
vi.mock('./api', async () => ({
  ...(await vi.importActual('./api')),
  request: api.request,
  all: api.all,
}));
const resource = {
  kind: 'LINK' as const,
  label: '已有阅读资料',
  url: 'https://example.com/read',
  fileId: null,
};
let release: ContentRelease, templates: TaskTemplate[];
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider
        router={createMemoryRouter([
          {
            path: '/',
            element: (
              <ContentEditor
                courseId="course"
                release={release}
                onChanged={async () => {}}
                setDirty={() => {}}
              />
            ),
          },
        ])}
      />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  release = {
    id: 'release',
    courseId: 'course',
    versionNo: 4,
    state: 'DRAFT',
    publishedAt: null,
    sourceSha: null,
    draftRevision: 0,
  };
  templates = [
    {
      id: 'original',
      kind: 'PAPER',
      title: '原有真题',
      estimatedMinutes: 75,
      sortOrder: 0,
      resource,
    },
  ];
  api.all.mockImplementation(async (url: string) =>
    url.endsWith('releases') ? [{ ...release }] : [],
  );
  api.request.mockImplementation(
    async (
      url: string,
      method = 'GET',
      body?: { templates: TaskTemplate[] },
      revision?: number,
    ) => {
      if (method === 'PUT') {
        expect(revision).toBe(release.draftRevision);
        templates = structuredClone(body!.templates);
        release = { ...release, draftRevision: (release.draftRevision ?? 0) + 1 };
        return { templates };
      }
      if (url.endsWith('/task-templates')) return { templates: structuredClone(templates) };
      if (url.endsWith('/catalog')) return { chapters: [] };
      if (url.endsWith('/knowledge')) return { modules: [] };
      if (url.endsWith('/questions')) return { questions: [] };
      if (url.endsWith('/assessment-policy')) return {};
      if (url.endsWith('/validation'))
        return {
          valid: true,
          issues: [],
          contentCounts: { chapters: 0, items: 0, points: 0, questions: 0 },
        };
      if (url.endsWith('/publication')) {
        expect(revision).toBe(release.draftRevision);
        expect(body).toEqual({ confirm: true });
        return { ...release, state: 'PUBLISHED' };
      }
    },
  );
});
describe('Admin release editing', () => {
  it('isolates a failed content region and preserves edits while retrying it', async () => {
    const original = api.request.getMockImplementation()!;
    let failing = true;
    api.request.mockImplementation(async (...args) => {
      if (String(args[0]).endsWith('/knowledge') && failing) throw new Error('知识分区暂不可用');
      return original(...args);
    });
    mount();
    const user = userEvent.setup();
    await screen.findByDisplayValue('原有真题');
    await user.clear(screen.getByLabelText('任务1名称'));
    await user.type(screen.getByLabelText('任务1名称'), '尚未保存的任务');
    await user.click(screen.getByRole('button', { name: /知识内容/ }));
    await screen.findByText(/知识内容读取失败/);
    expect(screen.getByRole('button', { name: '保存修改' })).toBeEnabled();
    failing = false;
    await user.click(screen.getByRole('button', { name: '重试当前分区' }));
    await waitFor(() => expect(screen.queryByText(/知识内容读取失败/)).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /计划任务.*未保存/ }));
    expect(screen.getByDisplayValue('尚未保存的任务')).toBeInTheDocument();
    expect(api.request.mock.calls.some((call) => call[1] === 'PUT')).toBe(false);
  });

  it('saves the full list, preserves originals and resource fields, and publishes only after latest validation', async () => {
    mount();
    const user = userEvent.setup();
    await screen.findByDisplayValue('原有真题');
    expect(screen.getByRole('button', { name: '发布此版本' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '新增复习任务' }));
    expect(screen.getByLabelText('任务2预计分钟')).toHaveValue(null);
    await user.type(screen.getByLabelText('任务2名称'), '错题复习');
    await user.type(screen.getByLabelText('任务2预计分钟'), '85');
    await user.selectOptions(screen.getByLabelText('任务2资料'), JSON.stringify(resource));
    await user.click(screen.getByLabelText('上移任务2'));
    await user.click(screen.getByRole('button', { name: '保存并校验' }));
    await screen.findByText('已保存最新修改，校验通过。');
    expect(templates).toHaveLength(2);
    expect(templates[1]).toEqual({
      id: 'original',
      kind: 'PAPER',
      title: '原有真题',
      estimatedMinutes: 75,
      sortOrder: 1,
      resource,
    });
    expect(templates[0]).toMatchObject({
      kind: 'REVIEW',
      title: '错题复习',
      estimatedMinutes: 85,
      resource,
      sortOrder: 0,
    });
    await user.click(screen.getByRole('button', { name: '发布此版本' }));
    await user.click(screen.getByRole('button', { name: '确认启用版本 4' }));
    await screen.findByText(/发布成功。返回学习计划/);
    expect(api.request.mock.calls.filter((c) => c[0].endsWith('/validation'))).toHaveLength(2);
  });
  it('requires explicit deletion confirmation and permits undo before saving', async () => {
    mount();
    const user = userEvent.setup();
    await screen.findByDisplayValue('原有真题');
    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('原有真题');
    await user.click(screen.getByRole('button', { name: '确认从清单移除' }));
    expect(screen.queryByDisplayValue('原有真题')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '撤销上一步修改' }));
    expect(screen.getByDisplayValue('原有真题')).toBeInTheDocument();
    expect(api.request.mock.calls.some((c) => c[1] === 'PUT')).toBe(false);
  });
  it('keeps local edits on revision conflict and does not overwrite the server', async () => {
    mount();
    const user = userEvent.setup();
    await screen.findByDisplayValue('原有真题');
    await user.clear(screen.getByLabelText('任务1名称'));
    await user.type(screen.getByLabelText('任务1名称'), '保留本地改动');
    release = { ...release, draftRevision: 2 };
    await user.click(screen.getByRole('button', { name: '保存修改' }));
    await screen.findByText(/草稿版本已被其他操作修改/);
    expect(screen.getByDisplayValue('保留本地改动')).toBeInTheDocument();
    expect(api.request.mock.calls.some((c) => c[1] === 'PUT')).toBe(false);
  });
  it('keeps edits and no success message when publishing fails', async () => {
    mount();
    const user = userEvent.setup();
    await screen.findByDisplayValue('原有真题');
    await user.click(screen.getByRole('button', { name: '保存并校验' }));
    await screen.findByText('已保存最新修改，校验通过。');
    api.request.mockRejectedValueOnce(new Error('发布写入失败'));
    await user.click(screen.getByRole('button', { name: '发布此版本' }));
    await user.click(screen.getByRole('button', { name: '确认启用版本 4' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('发布写入失败'));
    expect(screen.getByDisplayValue('原有真题')).toBeInTheDocument();
    expect(screen.queryByText(/发布成功。/)).not.toBeInTheDocument();
  });
  it('renders published versions as read-only', async () => {
    release = { ...release, state: 'PUBLISHED' };
    mount();
    await screen.findByDisplayValue('原有真题');
    expect(screen.getByLabelText('任务1名称')).toBeDisabled();
    expect(screen.getByRole('button', { name: '新增复习任务' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '保存修改' })).not.toBeInTheDocument();
  });
});
