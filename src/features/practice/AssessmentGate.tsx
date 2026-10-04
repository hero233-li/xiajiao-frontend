import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { getUnlock } from '../../api/generated/exams/exams';
import { applyAssessment, listAssessments } from '../../api/generated/practice/practice';
import { Link, useNavigate } from '../cycle/navigation';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { RegionState } from '../../components/dashboard/RegionState';
import { formatShanghaiDate } from '../../utils/date';
import { createUuid } from '../../utils/uuid';
export function AssessmentGate({
  courseId,
  code,
  cycleId,
}: {
  courseId: string;
  code: string;
  cycleId: string;
}) {
  const unlock = useQuery({
    queryKey: ['unlock', courseId, cycleId],
    queryFn: async () => (await getUnlock(courseId, { cycleId }, { silent: true })).data,
  });
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ['assessment-history', courseId, page],
    queryFn: async () =>
      (await listAssessments(courseId, { page, size: 10 }, { silent: true })).data,
  });
  const [confirm, setConfirm] = useState(false);
  const key = useRef(createUuid());
  const navigate = useNavigate();
  const start = useMutation({
    retry: false,
    mutationFn: async () =>
      (
        await applyAssessment(
          courseId,
          { kind: 'MOCK', chapterId: null },
          { cycleId },
          { silent: true, headers: { 'Idempotency-Key': key.current } },
        )
      ).data,
    onSuccess: (session) => navigate(`/study/course/${code}/tests/${session.id}`),
  });
  return (
    <section className="assessment-entry">
      <div className="mock-entry">
        <div>
          <p className="eyebrow">MOCK EXAM / 模拟检测</p>
          <h3>检验整门课程的掌握情况</h3>
          <p className="secondary">
            先完成要求的章节检测，再参加模拟卷。申请后立即开始计时，离开页面不会暂停。
          </p>
        </div>
        <div>
          {unlock.isPending ? (
            <p role="status">正在核对资格…</p>
          ) : unlock.isError ? (
            <Button variant="secondary" onClick={() => void unlock.refetch()}>
              重试资格查询
            </Button>
          ) : (
            <>
              <Button
                disabled={!unlock.data.canApplyMock}
                disabledReason={
                  unlock.data.missingChapterIds.length
                    ? `尚有 ${unlock.data.missingChapterIds.length} 个章节未通过`
                    : '当前课程尚未满足组卷条件，请查看下方章节检测条件。'
                }
                onClick={() => setConfirm(true)}
              >
                查看规则并开始
              </Button>
              {!unlock.data.canApplyMock && <p className="secondary">资格与组卷条件由系统核定。</p>}
            </>
          )}
        </div>
      </div>
      <details className="assessment-history">
        <summary>继续检测 / 历次结果</summary>
        {history.isPending ? (
          <p role="status">正在读取检测记录…</p>
        ) : history.isError ? (
          <RegionState
            kind="error"
            message="检测历史加载失败"
            retry={() => void history.refetch()}
          />
        ) : (
          <>
            {!history.data.items.length ? (
              <p className="inline-empty">尚未参加检测。满足章节条件后，首次检测会显示在这里。</p>
            ) : (
              <ul>
                {history.data.items.map((session) => (
                  <li key={session.id}>
                    <span>
                      <strong>{session.kind === 'MOCK' ? '模拟卷' : '章节检测'}</strong>
                      <small>
                        {formatShanghaiDate(session.startedAt)} ·{' '}
                        {session.score === null ? '成绩待生成' : `${session.score} 分`}
                      </small>
                    </span>
                    <Link
                      className="text-action"
                      to={`/study/course/${code}/tests/${session.id}${session.status === 'IN_PROGRESS' ? '' : '/result'}`}
                    >
                      {session.status === 'IN_PROGRESS' ? '继续作答' : '查看结果'}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="row">
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>
                上一页
              </Button>
              <small>第 {page} 页</small>
              <Button
                variant="ghost"
                disabled={page * history.data.size >= history.data.total}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </>
        )}
      </details>
      <Modal
        open={confirm}
        title="开始模拟检测"
        onClose={() => {
          if (!start.isPending) setConfirm(false);
        }}
      >
        <div className="stack">
          <p>
            本次检测使用当前发布的课程内容与检测策略。题数、限时与通过线由系统生成，进入试卷后显示。
          </p>
          <ul>
            <li>确认开始后立即计时，切换页面不会暂停。</li>
            <li>答案自动保存；网络异常时会显示未同步状态。</li>
            <li>交卷前可检查漏答，交卷后查看成绩、解析及薄弱点。</li>
            <li>若题库、审核或权重不足，申请会被拒绝，不创建可作答试卷。</li>
          </ul>
          {start.isError && (
            <p role="alert" className="status-error">
              {start.error.message}
            </p>
          )}
          <Button loading={start.isPending} onClick={() => start.mutate()}>
            确认开始计时
          </Button>
        </div>
      </Modal>
    </section>
  );
}
