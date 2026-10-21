import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bankRequest, type BankSession } from '../api/bank';
import { Button } from '../components/Button';
import { OnlineAssessment } from './OnlineAssessment';
import { SheetAssessment } from './SheetAssessment';

export function Component() {
  const { testId = '', code = '' } = useParams();
  const query = useQuery({
    queryKey: ['bank-session', testId],
    queryFn: () => bankRequest<BankSession>(`/bank/sessions/${testId}`),
    refetchOnWindowFocus: false,
    refetchInterval: (q) =>
      q.state.data && ['PENDING', 'NEEDS_REVIEW', 'FAILED'].includes(q.state.data.status)
        ? q.state.data.status === 'PENDING'
          ? 5000
          : 15000
        : false,
  });
  if (query.isPending) return <p role="status">正在读取独立试卷…</p>;
  if (query.isError || !query.data)
    return (
      <p role="alert">
        {query.error?.message ?? '试卷读取失败'}
        <Button onClick={() => void query.refetch()}>重新读取</Button>
      </p>
    );
  const session = query.data;
  if (session.submissionMode === 'SHEET_PHOTOS')
    return <SheetAssessment session={session} testId={testId} code={code} />;
  return <OnlineAssessment session={session} testId={testId} code={code} />;
}
