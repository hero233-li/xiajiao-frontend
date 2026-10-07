import { useQuery } from '@tanstack/react-query';
import { bankRequest, type BankOverview } from '../../api/bank';
export function BankExamReasons({ courseId, cycleId }: { courseId: string; cycleId: string }) {
  const data = useQuery({ queryKey: ['bank-overview', courseId, cycleId], queryFn: () => bankRequest<BankOverview>(`/bank/courses/${courseId}/overview?cycleId=${cycleId}`) });
  return <section aria-label="真题阻断条件"><h3>真题访问条件</h3>{data.isPending ? <p>正在分别核对报考缴费与能力资格…</p> : data.isError ? <p role="alert">{data.error.message}</p> : data.data.examBlockReasons.length ? <ul>{data.data.examBlockReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>当前后端已确认报考缴费与有效能力资格满足。</p>}</section>;
}
