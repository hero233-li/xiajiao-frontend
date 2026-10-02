import { useEffect, useId, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSearchParams } from '../features/cycle/navigation';
import { FilePenLine, Plus, Search } from 'lucide-react';
import type { Note } from '../api/generated/models';
import { useNoteCourses, useNotes, useNoteTags } from '../api/notes';
import { errorMessage } from '../api/errors';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { NoteEditor, recentNoteCourse } from '../features/notes/NoteEditor';
import { NoteContent } from '../features/notes/NoteContent';
import { formatShanghaiDate } from '../utils/date';
import '../features/notes/notes.css';
export function Component() {
  const { code } = useParams();
  const [search, setSearch] = useSearchParams();
  const courses = useNoteCourses(search.get('cycleId') || undefined);
  const current = courses.data?.find((course) => course.code === code);
  const rawCourse = search.get('courseId');
  const courseId = rawCourse === 'all' ? undefined : rawCourse || current?.id;
  const q = search.get('q') ?? '';
  const tag = search.get('tag') ?? '';
  const rawPage = Number(search.get('page') || '1');
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [input, setInput] = useState(q);
  const [editor, setEditor] = useState<Note | 'new' | null>(null);
  const [notice, setNotice] = useState('');
  const id = useId();
  const ready = !code || !!current;
  const notes = useNotes(
    { courseId, q: q || undefined, tag: tag || undefined, page, size: 20 },
    ready,
  );
  const tags = useNoteTags(courseId, ready);
  const change = (name: string, value: string) =>
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(name, value);
      else next.delete(name);
      if (name !== 'page') next.delete('page');
      return next;
    });
  useEffect(() => {
    setInput(q);
  }, [q]);
  useEffect(() => {
    if (input === q) return;
    const timer = window.setTimeout(
      () =>
        setSearch(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (input) next.set('q', input);
            else next.delete('q');
            next.delete('page');
            return next;
          },
          { replace: true },
        ),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [input, q, setSearch]);
  useEffect(() => {
    if (current && rawCourse === null)
      setSearch(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('courseId', current.id);
          return next;
        },
        { replace: true },
      );
  }, [current, rawCourse, setSearch]);
  const clear = () => {
    setInput('');
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      ['q', 'tag', 'page', 'courseId', 'from', 'to'].forEach((key) => next.delete(key));
      if (current) next.set('courseId', current.id);
      return next;
    });
  };
  const filtered = !!q || !!tag || (!!courseId && courseId !== current?.id);
  const defaultCourse =
    current?.id ||
    (courses.data?.some((course) => course.id === recentNoteCourse()) ? recentNoteCourse() : '');
  return (
    <div className="notes-page stack">
      <h2>{code ? '课程备注' : '全部学习备注'}</h2>
      <section className="card notes-filters" aria-label="筛选备注">
        <label htmlFor={`${id}-search`}>
          <Search size={18} aria-hidden="true" /> 搜索正文
          <input
            type="search"
            id={`${id}-search`}
            maxLength={200}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入关键词"
          />
        </label>
        <label htmlFor={`${id}-course`}>
          课程
          <select
            id={`${id}-course`}
            value={courseId ?? 'all'}
            disabled={courses.isPending || !!courses.error}
            onChange={(event) => change('courseId', event.target.value)}
          >
            <option value="all">全部课程</option>
            {courseId && !courses.data?.some((course) => course.id === courseId) && (
              <option value={courseId}>已选课程</option>
            )}
            {courses.data?.map((course) => (
              <option value={course.id} key={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          {courses.isPending ? (
            <span role="status">课程加载中…</span>
          ) : courses.error ? (
            <span className="notes-help">课程暂不可选，请在下方重试。</span>
          ) : null}
        </label>
        <label htmlFor={`${id}-tag`}>
          标签
          <select
            id={`${id}-tag`}
            value={tag}
            disabled={!ready || tags.isPending || !!tags.error}
            onChange={(event) => change('tag', event.target.value)}
          >
            <option value="">全部标签</option>
            {tag && !tags.data?.tags.some((item) => item.name === tag) && (
              <option value={tag}>#{tag.replace(/^#/, '')}</option>
            )}
            {tags.data?.tags.map((item) => (
              <option value={item.name} key={item.name}>
                #{item.name.replace(/^#/, '')}（{item.count}）
              </option>
            ))}
          </select>
          {tags.isPending && ready ? (
            <span role="status">标签加载中…</span>
          ) : tags.error ? (
            <span className="notes-help">标签暂不可选，请在下方重试。</span>
          ) : !ready ? (
            <span className="notes-help">请等待课程信息加载。</span>
          ) : null}
        </label>
        <Button
          disabled={!courses.data?.length || !ready}
          disabledReason="课程列表暂不可用，请先加载课程信息。"
          onClick={() => setEditor('new')}
        >
          <Plus size={20} aria-hidden="true" />
          新建备注
        </Button>
      </section>
      {courses.error ? (
        <ErrorState
          message={`课程加载失败：${errorMessage(courses.error)}`}
          onRetry={() => {
            void courses.refetch();
          }}
        />
      ) : courses.data?.length === 0 ? (
        <EmptyState
          message="暂无可用课程。"
          actionLabel="重新加载课程"
          onAction={() => {
            void courses.refetch();
          }}
        />
      ) : code && courses.data && !current ? (
        <EmptyState
          message="当前课程不可用。"
          actionLabel="重新加载课程"
          onAction={() => {
            void courses.refetch();
          }}
        />
      ) : null}
      {tags.error ? (
        <ErrorState
          message={`标签加载失败：${errorMessage(tags.error)}`}
          onRetry={() => {
            void tags.refetch();
          }}
        />
      ) : tags.data?.tags.length === 0 ? (
        <div className="notes-help">
          <p>当前范围还没有标签，可在备注正文中使用 #标签。</p>
          <Button
            variant="secondary"
            onClick={() => {
              void tags.refetch();
            }}
          >
            重新加载标签
          </Button>
        </div>
      ) : null}
      {notice && (
        <div className="notes-success" role="status">
          ✓ {notice}
          <Button variant="ghost" aria-label="关闭保存提示" onClick={() => setNotice('')}>
            关闭
          </Button>
        </div>
      )}
      <section className="stack" aria-label="备注列表" aria-busy={ready && notes.isPending}>
        {!ready && courses.isPending ? (
          <div className="card" role="status">
            正在加载课程信息…
          </div>
        ) : !ready ? null : notes.isPending ? (
          <div className="card" role="status">
            正在加载备注…
          </div>
        ) : notes.error ? (
          <ErrorState
            message={errorMessage(notes.error)}
            onRetry={() => {
              void notes.refetch();
            }}
          />
        ) : notes.data.items.length === 0 ? (
          <EmptyState
            message={filtered ? '没有符合条件的备注。' : '还没有备注，记下今天的学习收获吧。'}
            actionLabel={filtered ? '清除筛选' : courses.data?.length ? '新建备注' : '重新加载课程'}
            onAction={
              filtered
                ? clear
                : courses.data?.length
                  ? () => setEditor('new')
                  : () => {
                      void courses.refetch();
                    }
            }
          />
        ) : (
          notes.data.items.map((note) => (
            <article className="card stack" key={note.id}>
              <div className="row">
                <h2 className="notes-title">
                  {courses.data?.find((course) => course.id === note.courseId)?.name ??
                    `课程编号：${note.courseId}`}
                </h2>
                <time dateTime={note.noteDate}>{formatShanghaiDate(note.noteDate)}</time>
                <Button
                  variant="secondary"
                  onClick={() => setEditor(note)}
                  aria-label={`编辑 ${formatShanghaiDate(note.noteDate)} 的备注`}
                >
                  <FilePenLine size={20} aria-hidden="true" />
                  编辑
                </Button>
              </div>
              <NoteContent
                content={note.content}
                tags={note.tags}
                onTag={(value) => change('tag', value)}
              />
              <div className="row" aria-label="备注标签">
                {note.tags.map((value) => (
                  <Button
                    key={value}
                    variant="ghost"
                    className="notes-tag"
                    onClick={() => change('tag', value)}
                  >
                    #{value.replace(/^#/, '')}
                  </Button>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
      {ready && notes.data && notes.data.total > 0 && (
        <nav className="row" aria-label="备注分页">
          <span>
            第 {notes.data.page} 页 · 共 {notes.data.total} 条
          </span>
          <Button
            variant="secondary"
            disabled={notes.data.page <= 1}
            disabledReason="已经是第一页。"
            onClick={() => change('page', String(notes.data.page - 1))}
          >
            上一页
          </Button>
          <Button
            variant="secondary"
            disabled={notes.data.page * notes.data.size >= notes.data.total}
            disabledReason="已经是最后一页。"
            onClick={() => change('page', String(notes.data.page + 1))}
          >
            下一页
          </Button>
          {filtered && (
            <Button variant="ghost" onClick={clear}>
              清除筛选
            </Button>
          )}
        </nav>
      )}
      {editor && (
        <NoteEditor
          courses={courses.data ?? []}
          note={editor === 'new' ? undefined : editor}
          defaultCourseId={defaultCourse}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setNotice('备注已保存');
          }}
        />
      )}
    </div>
  );
}
