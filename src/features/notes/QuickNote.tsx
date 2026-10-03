import { useEffect, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { useNoteCourses } from '../../api/notes';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { errorMessage } from '../../api/errors';
import { NoteEditor, recentNoteCourse } from './NoteEditor';
import './notes.css';
export interface QuickNoteProps {
  initialContent?: string;
  defaultCourseId?: string;
  defaultCourseCode?: string;
  cycleId?: string;
  openRequest?: { id: string; content: string };
}
/** Mount within a QueryClientProvider. No dependency on page routes or the global toast. */
export function QuickNote(props: QuickNoteProps) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [content, setContent] = useState(props.initialContent);
  useEffect(() => {
    if (!props.openRequest) return;
    setContent(props.openRequest.content);
    setOpen(true);
  }, [props.openRequest]);
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 5000);
    return () => window.clearTimeout(timer);
  }, [saved]);
  return (
    <>
      <Button
        className="notes-floating"
        aria-label="快速记一条"
        onClick={() => {
          setContent(props.initialContent);
          setOpen(true);
        }}
      >
        <Plus aria-hidden="true" size={20} />
        快速记一条
      </Button>
      {open && (
        <QuickPanel
          {...props}
          initialContent={content}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setSaved(true);
          }}
        />
      )}
      {saved && (
        <div className="notes-quick-toast notes-success" role="status">
          <Check size={20} aria-hidden="true" />
          笔记已保存
          <Button variant="ghost" aria-label="关闭保存提示" onClick={() => setSaved(false)}>
            关闭
          </Button>
        </div>
      )}
    </>
  );
}
function QuickPanel({
  initialContent,
  defaultCourseId,
  defaultCourseCode,
  cycleId,
  onClose,
  onSaved,
}: QuickNoteProps & { onClose: () => void; onSaved: () => void }) {
  const courses = useNoteCourses(cycleId);
  if (courses.isPending || courses.error || !courses.data.length)
    return (
      <Modal open title="快速记一条" onClose={onClose}>
        {courses.isPending ? (
          <div role="status" aria-busy="true">
            正在加载课程…
          </div>
        ) : courses.error ? (
          <ErrorState
            message={errorMessage(courses.error)}
            onRetry={() => {
              void courses.refetch();
            }}
          />
        ) : (
          <EmptyState
            message="暂无可用课程。"
            actionLabel="重新加载课程"
            onAction={() => {
              void courses.refetch();
            }}
          />
        )}
      </Modal>
    );
  const preferred =
    defaultCourseId ??
    courses.data.find((course) => course.code === defaultCourseCode)?.id ??
    recentNoteCourse();
  return (
    <NoteEditor
      quick
      courses={courses.data}
      initialContent={initialContent}
      defaultCourseId={courses.data.some((course) => course.id === preferred) ? preferred : ''}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
