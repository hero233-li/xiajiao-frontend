import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../mocks/server';
import generated from '../../mocks/generated.json';
import type { Course, Note, NoteWrite, NoteUpdate } from '../../api/generated/models';
import { Component as NotesPage } from '../../pages/NotesPage';
import { Component as QuickPreview } from '../../pages/QuickNotePreviewPage';
import { QuickNote } from './QuickNote';
import { shanghaiToday } from './NoteEditor';
const data = <T,>(operation: string): T =>
  structuredClone(generated.find((row) => row.operationId === operation)!.example.data) as T;
const ok = (value: unknown) => HttpResponse.json({ code: 0, data: value, message: 'ok' });
let note: Note;
let course: Course;
let params: URLSearchParams;
let writes: Array<NoteWrite | NoteUpdate>;
function Location() {
  return <output data-testid="url">{useLocation().search}</output>;
}
function mount(
  path = '/study/notes?cycleId=cycle',
  quick?: { initialContent: string; defaultCourseId?: string },
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Location />
        {quick ? (
          <QuickNote {...quick} cycleId="cycle" />
        ) : (
          <Routes>
            <Route path="/study/notes" element={<NotesPage />} />
            <Route path="/study/course/:code/notes" element={<NotesPage />} />
            <Route path="/study/notes/quick-note-preview" element={<QuickPreview />} />
          </Routes>
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  writes = [];
  params = new URLSearchParams();
  note = data<Note>('getNote');
  course = data<Course>('getCourseByCode');
  course.id = note.courseId;
  note.content = '复习极限 #高数\n<script>测试</script>';
  note.tags = ['高数'];
  server.use(
    http.get('*/api/v1/exams/cycles', () =>
      ok({ items: [{ id: 'cycle' }], total: 1, page: 1, size: 1 }),
    ),
    http.get('*/api/v1/courses', () => ok({ items: [course], total: 1, page: 1, size: 100 })),
    http.get('*/api/v1/notes/tags', () => ok({ tags: [{ name: '高数', count: 1 }] })),
    http.get('*/api/v1/notes', ({ request }) => {
      params = new URL(request.url).searchParams;
      return ok({ items: [note], total: 1, page: Number(params.get('page') ?? 1), size: 20 });
    }),
    http.post('*/api/v1/notes', async ({ request }) => {
      const body = (await request.json()) as NoteWrite;
      writes.push(body);
      note = { ...note, ...body };
      return ok(note);
    }),
    http.put('*/api/v1/notes/:id', async ({ request }) => {
      const body = (await request.json()) as NoteUpdate;
      writes.push(body);
      note = { ...note, ...body, revision: note.revision + 1 };
      return ok(note);
    }),
  );
});
describe('笔记页面', () => {
  it('正文纯文本、保留换行，点击后端标签通过接口筛选并同步 URL', async () => {
    const user = userEvent.setup();
    const view = mount();
    await screen.findByText(/复习极限/);
    expect(view.container.querySelector('script')).toBeNull();
    expect(screen.getByText(/测试/)).toHaveTextContent('<script>测试</script>');
    await user.click(screen.getByRole('button', { name: '筛选标签 高数' }));
    await waitFor(() => expect(params.get('tag')).toBe('高数'));
    expect(decodeURIComponent(screen.getByTestId('url').textContent!)).toContain('tag=高数');
  });
  it('搜索防抖 300ms，刷新后 URL 筛选和输入保持', async () => {
    const user = userEvent.setup();
    const first = mount();
    await screen.findByText(/复习极限/);
    await user.type(screen.getByRole('searchbox'), '极限');
    expect(params.get('q')).toBeNull();
    await waitFor(() => expect(params.get('q')).toBe('极限'));
    const url = screen.getByTestId('url').textContent!;
    first.unmount();
    mount(`/study/notes${url}`);
    await screen.findByText(/复习极限/);
    expect(screen.getByRole('searchbox')).toHaveValue('极限');
    expect(params.get('q')).toBe('极限');
  });
  it('课程笔记预设当前课程，保存新笔记时采用当前课程和上海日期', async () => {
    const user = userEvent.setup();
    mount(`/study/course/${course.code}/notes?cycleId=cycle`);
    await waitFor(() => expect(params.get('courseId')).toBe(course.id));
    await user.click(screen.getByRole('button', { name: '写一条笔记' }));
    expect(within(screen.getByRole('dialog')).getByLabelText('课程')).toHaveValue(course.id);
    expect(screen.getByLabelText('日期（上海时间）')).toHaveValue(shanghaiToday());
    await user.type(screen.getByLabelText('笔记正文'), '新收获 #高数');
    await user.click(screen.getByRole('button', { name: '保存笔记' }));
    await screen.findByText('✓ 笔记已保存');
    expect(writes[0]).toMatchObject({
      courseId: course.id,
      noteDate: shanghaiToday(),
      content: '新收获 #高数',
    });
  });
  it('编辑失败保留内容，重试沿用 expectedRevision 且不发送课程字段', async () => {
    server.use(http.put('*/api/v1/notes/:id', () => HttpResponse.error()));
    const user = userEvent.setup();
    mount();
    await screen.findByText(/复习极限/);
    await user.click(screen.getByRole('button', { name: /编辑 .* 的笔记/ }));
    expect(within(screen.getByRole('dialog')).getByLabelText('课程')).toBeDisabled();
    await user.clear(screen.getByLabelText('笔记正文'));
    await user.type(screen.getByLabelText('笔记正文'), '保留我的编辑');
    await user.click(screen.getByRole('button', { name: '保存笔记' }));
    await screen.findByText(/输入内容已保留/);
    expect(screen.getByLabelText('笔记正文')).toHaveValue('保留我的编辑');
    server.use(
      http.put('*/api/v1/notes/:id', async ({ request }) => {
        const body = (await request.json()) as NoteUpdate;
        writes.push(body);
        return ok({ ...note, ...body });
      }),
    );
    await user.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText('✓ 笔记已保存');
    expect(writes[0]).toEqual({
      noteDate: note.noteDate,
      content: '保留我的编辑',
      expectedRevision: note.revision,
    });
  });
  it('关闭未保存内容确认，Esc 可返回编辑，放弃后焦点回触发按钮', async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText(/复习极限/);
    const trigger = screen.getByRole('button', { name: /编辑 .* 的笔记/ });
    await user.click(trigger);
    await user.type(screen.getByLabelText('笔记正文'), '修改');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toHaveAccessibleName('放弃未保存的内容？');
    await user.keyboard('{Escape}');
    expect(screen.getByLabelText('笔记正文')).toHaveValue(`${note.content}修改`);
    await user.click(screen.getByRole('button', { name: '取消' }));
    await user.click(screen.getByRole('button', { name: '放弃修改并关闭' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('字数超过 5000 禁止保存并说明原因', async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText(/复习极限/);
    await user.click(screen.getByRole('button', { name: '写一条笔记' }));
    await user.click(screen.getByLabelText('笔记正文'));
    await user.paste('字'.repeat(5001));
    expect(screen.getByText(/5001 \/ 5000 字/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存笔记' })).toBeDisabled();
    expect(screen.getByText('正文不能超过 5000 字。')).toBeInTheDocument();
  });
  it('笔记加载状态', async () => {
    server.use(
      http.get('*/api/v1/notes', async () => {
        await delay(100);
        return ok({ items: [note], page: 1, size: 20, total: 1 });
      }),
    );
    mount();
    await screen.findByText('正在加载笔记…');
    await screen.findByText(/复习极限/);
  });
  it('没有笔记和没有匹配笔记使用不同空状态，清除筛选', async () => {
    server.use(http.get('*/api/v1/notes', () => ok({ items: [], page: 1, size: 20, total: 0 })));
    const user = userEvent.setup();
    mount('/study/notes?cycleId=cycle&q=没有');
    await screen.findByText('没有符合条件的笔记。');
    await user.click(screen.getByRole('button', { name: '清除筛选' }));
    await screen.findByText('还没有笔记，记下今天的学习收获吧。');
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
  it('笔记请求失败可以重试', async () => {
    server.use(http.get('*/api/v1/notes', () => HttpResponse.error()));
    const user = userEvent.setup();
    mount();
    await screen.findByText('加载遇到问题');
    server.use(
      http.get('*/api/v1/notes', () => ok({ items: [note], page: 1, size: 20, total: 1 })),
    );
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText(/复习极限/);
  });
  it('标签空状态和失败有恢复行动', async () => {
    server.use(http.get('*/api/v1/notes/tags', () => HttpResponse.error()));
    const user = userEvent.setup();
    mount();
    await screen.findByText(/标签加载失败/);
    server.use(http.get('*/api/v1/notes/tags', () => ok({ tags: [] })));
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText(/当前范围还没有标签/);
    expect(screen.getByRole('button', { name: '重新加载标签' })).toBeInTheDocument();
  });
  it('分页由后端 total 决定并同步 URL', async () => {
    server.use(
      http.get('*/api/v1/notes', ({ request }) => {
        params = new URL(request.url).searchParams;
        return ok({ items: [note], page: Number(params.get('page') ?? 1), size: 20, total: 21 });
      }),
    );
    const user = userEvent.setup();
    mount();
    await screen.findByText(/复习极限/);
    await user.click(screen.getByRole('button', { name: '下一页' }));
    await screen.findByText('第 2 页 · 共 21 条');
    expect(params.get('page')).toBe('2');
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();
  });
});
describe('QuickNote 独立组件', () => {
  it('独立页面支持预填，保存仅含正文课程和默认日期，并显示 toast', async () => {
    const user = userEvent.setup();
    mount('/study/notes', { initialContent: '复盘错题\n#高数', defaultCourseId: course.id });
    await user.click(screen.getByRole('button', { name: '快速记一条' }));
    await screen.findByLabelText('笔记正文');
    expect(screen.getByLabelText('笔记正文')).toHaveValue('复盘错题\n#高数');
    expect(screen.queryByLabelText('日期（上海时间）')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存笔记' }));
    await screen.findByText('笔记已保存');
    expect(writes[0]).toEqual({
      content: '复盘错题\n#高数',
      courseId: course.id,
      noteDate: shanghaiToday(),
    });
  });
  it('独立测试路由可用，预填没有编辑也会确认放弃', async () => {
    const user = userEvent.setup();
    mount(`/study/notes/quick-note-preview?cycleId=cycle&courseId=${course.id}`);
    expect(screen.getByRole('heading', { name: '快速笔记独立测试页' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '快速记一条' }));
    await screen.findByLabelText('笔记正文');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toHaveAccessibleName('放弃未保存的内容？');
  });
  it('课程空状态和请求错误可重试', async () => {
    server.use(http.get('*/api/v1/courses', () => HttpResponse.error()));
    const user = userEvent.setup();
    mount('/study/notes', { initialContent: '预填', defaultCourseId: course.id });
    await user.click(screen.getByRole('button', { name: '快速记一条' }));
    await screen.findByText('加载遇到问题');
    server.use(http.get('*/api/v1/courses', () => ok({ items: [], total: 0, page: 1, size: 100 })));
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('暂无可用课程。');
    server.use(
      http.get('*/api/v1/courses', () => ok({ items: [course], total: 1, page: 1, size: 100 })),
    );
    await user.click(screen.getByRole('button', { name: '重新加载课程' }));
    await screen.findByLabelText('笔记正文');
    expect(screen.getByLabelText('笔记正文')).toHaveValue('预填');
  });
  it('QuickNote 保存失败保留预填及追加内容', async () => {
    server.use(http.post('*/api/v1/notes', () => HttpResponse.error()));
    const user = userEvent.setup();
    mount('/study/notes', { initialContent: '错题预填', defaultCourseId: course.id });
    await user.click(screen.getByRole('button', { name: '快速记一条' }));
    await screen.findByLabelText('笔记正文');
    await user.type(screen.getByLabelText('笔记正文'), '补充');
    await user.click(screen.getByRole('button', { name: '保存笔记' }));
    await screen.findByText(/输入内容已保留/);
    expect(screen.getByLabelText('笔记正文')).toHaveValue('错题预填补充');
    expect(screen.queryByText('笔记已保存')).not.toBeInTheDocument();
  });
  it('弹窗 Tab 循环保持焦点，最近保存的课程作为下一条默认值', async () => {
    localStorage.setItem('notes-recent-course:undefined', course.id);
    const user = userEvent.setup();
    mount('/study/notes', { initialContent: '正文' });
    await user.click(screen.getByRole('button', { name: '快速记一条' }));
    await screen.findByLabelText('笔记正文');
    expect(screen.getByLabelText('课程')).toHaveValue(course.id);
    screen.getByRole('button', { name: '保存笔记' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: '关闭弹窗' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: '保存笔记' })).toHaveFocus();
  });
});
