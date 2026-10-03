import { useEffect, useId, useRef, useState } from 'react';
import type { Course, Note, NoteWrite } from '../../api/generated/models';
import { useWriteNote } from '../../api/notes';
import { sessionStore } from '../../api/session';
import { errorMessage } from '../../api/errors';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import './notes.css';
export function shanghaiToday() {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
const recentKey = () => `notes-recent-course:${sessionStore.getSnapshot()?.user.id}`;
export function recentNoteCourse() {
  try {
    return localStorage.getItem(recentKey()) ?? '';
  } catch {
    return '';
  }
}
export function NoteEditor({
  courses,
  note,
  defaultCourseId = '',
  initialContent = '',
  quick = false,
  onClose,
  onSaved,
}: {
  courses: Course[];
  note?: Note;
  defaultCourseId?: string;
  initialContent?: string;
  quick?: boolean;
  onClose: () => void;
  onSaved: (note: Note) => void;
}) {
  const initial = useRef<NoteWrite>({
    courseId: note?.courseId ?? defaultCourseId,
    noteDate: note?.noteDate ?? shanghaiToday(),
    content: note?.content ?? initialContent,
  });
  const [draft, setDraft] = useState(initial.current);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState('');
  const mutation = useWriteNote();
  const id = useId();
  const focus = useRef<HTMLButtonElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dirty =
    draft.content !== initial.current.content ||
    draft.courseId !== initial.current.courseId ||
    draft.noteDate !== initial.current.noteDate;
  // A supplied prefill is also unsaved content, even before the first keystroke.
  const unsaved = dirty || (!note && draft.content.length > 0);
  const close = () => {
    if (mutation.isPending) return;
    if (unsaved) setDiscard((value) => !value);
    else onClose();
  };
  useEffect(() => {
    if (discard) focus.current?.focus();
    else textarea.current?.focus();
  }, [discard]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (unsaved) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [unsaved]);
  const count = Array.from(draft.content).length;
  const reason = !draft.content.trim()
    ? '请填写笔记正文。'
    : count > 5000
      ? '正文不能超过 5000 字。'
      : !draft.courseId
        ? '请选择课程。'
        : !draft.noteDate
          ? '请选择日期。'
          : '';
  const save = async () => {
    if (reason || mutation.isPending) return;
    setError('');
    try {
      const saved = await mutation.mutateAsync(
        note
          ? {
              kind: 'update',
              id: note.id,
              body: {
                content: draft.content,
                noteDate: draft.noteDate,
                expectedRevision: note.revision,
              },
            }
          : { kind: 'create', body: draft },
      );
      try {
        localStorage.setItem(recentKey(), saved.courseId);
      } catch {
        /* The note is already saved; recent selection is optional. */
      }
      onSaved(saved);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };
  return (
    <Modal
      open
      title={discard ? '放弃未保存的内容？' : quick ? '快速记一条' : note ? '编辑笔记' : '新建笔记'}
      onClose={close}
    >
      {discard ? (
        <div className="stack">
          <p>关闭后，尚未保存的内容将丢失。</p>
          <div className="row">
            <button
              ref={focus}
              className="button button-secondary"
              onClick={() => setDiscard(false)}
            >
              继续编辑
            </button>
            <Button onClick={onClose}>放弃修改并关闭</Button>
          </div>
        </div>
      ) : (
        <form
          className="notes-editor stack"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label htmlFor={`${id}-course`}>课程</label>
          <select
            id={`${id}-course`}
            value={draft.courseId}
            disabled={!!note || mutation.isPending}
            aria-describedby={note ? `${id}-course-reason` : undefined}
            onChange={(event) => setDraft((value) => ({ ...value, courseId: event.target.value }))}
          >
            <option value="">请选择课程</option>
            {note && !courses.some((course) => course.id === note.courseId) && (
              <option value={note.courseId}>当前笔记所属课程</option>
            )}
            {courses.map((course) => (
              <option value={course.id} key={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          {note && (
            <p id={`${id}-course-reason`} className="notes-help">
              已有笔记的课程不能修改。
            </p>
          )}
          {!quick && (
            <>
              <label htmlFor={`${id}-date`}>日期（上海时间）</label>
              <input
                type="date"
                id={`${id}-date`}
                value={draft.noteDate}
                disabled={mutation.isPending}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, noteDate: event.target.value }))
                }
              />
            </>
          )}
          <label htmlFor={`${id}-content`}>笔记正文</label>
          <textarea
            ref={textarea}
            id={`${id}-content`}
            value={draft.content}
            rows={quick ? 5 : 8}
            disabled={mutation.isPending}
            aria-describedby={`${id}-count`}
            aria-invalid={count > 5000}
            onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))}
          />
          <p id={`${id}-count`} className={count > 5000 ? 'notes-help status-error' : 'notes-help'}>
            {count} / 5000 字 · 使用 #标签 记录主题
          </p>
          {error && (
            <p role="alert" className="status-error">
              保存失败：{error}，输入内容已保留。
              {error.includes('冲突') && '请核对最新笔记后再编辑。'}
            </p>
          )}
          {mutation.isPending && <p role="status">正在保存，请稍候再关闭。</p>}
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={mutation.isPending}
              disabledReason="正在保存，请稍候再关闭。"
              onClick={close}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={!!reason}
              disabledReason={reason}
              loading={mutation.isPending}
              loadingLabel="正在保存笔记"
              error={error || undefined}
            >
              {error ? '重试保存' : '保存笔记'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
