import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { PracticeNoteRequest } from '../../pages/PracticePage';
import { QuickNote } from './QuickNote';

export default function CourseQuickNote({ code }: { code: string }) {
  const [search] = useSearchParams();
  const location = useLocation();
  const [request, setRequest] = useState<{ id: string; content: string }>();
  useEffect(() => {
    function open(event: Event) {
      if (!location.pathname.includes('/practice/')) return;
      const detail = (event as CustomEvent<PracticeNoteRequest>).detail;
      if (!detail || typeof detail.summary !== 'string') return;
      setRequest({ id: crypto.randomUUID(), content: detail.summary });
    }
    window.addEventListener('practice:note-request', open);
    return () => window.removeEventListener('practice:note-request', open);
  }, [location.pathname]);
  return <QuickNote defaultCourseCode={code} cycleId={search.get('cycleId') ?? undefined} openRequest={request} />;
}
