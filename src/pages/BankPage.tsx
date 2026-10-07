import { useParams } from 'react-router-dom';
import { useSearchParams } from '../features/cycle/navigation';
import { usePracticeCourse } from '../api/practice-selection';
import { BankPractice } from '../features/bank/BankPractice';
import { PracticeSelectionPage } from './PracticeSelectionPage';
export function Component() {
  const { code = '', chapterId } = useParams();const [search] = useSearchParams();const cycleId = search.get('cycleId') ?? '';
  const course = usePracticeCourse(code, cycleId);
  if (!cycleId) return <PracticeSelectionPage />;
  if (course.isPending) return <p role="status">正在读取课程…</p>;
  if (course.isError) return <p role="alert">{course.error.message}</p>;
  return <BankPractice courseId={course.data.id} code={code} cycleId={cycleId} initialChapter={chapterId} />;
}
