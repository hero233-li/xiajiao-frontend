import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LocalRubric } from '../../api/generated/models';
import { allPapers, request, message, type Row } from './api';
import { Fields } from './Fields';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
export function Rubrics({
  courseId,
  cycleId,
  setDirty,
}: {
  courseId: string;
  cycleId: string;
  setDirty: (v: boolean) => void;
}) {
  const client = useQueryClient();
  const papers = useQuery({
    queryKey: ['admin-rubric-papers', courseId, cycleId],
    enabled: !!courseId,
    queryFn: () => allPapers(courseId, cycleId),
  });
  const [selected, select] = useState('');
  const paperId = selected || papers.data?.[0]?.id || '';
  const query = useQuery({
    queryKey: ['admin-rubrics', courseId, cycleId, paperId],
    enabled: !!paperId,
    queryFn: () =>
      request<LocalRubric[]>(
        `/grading/rubrics?courseId=${courseId}&cycleId=${cycleId}&paperId=${paperId}`,
      ),
  });
  const [editing, edit] = useState<{ id?: string; value: Row }>();
  const [publishing, publish] = useState<LocalRubric>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    setDirty(!!editing);
    return () => setDirty(false);
  }, [editing, setDirty]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await action();
      await query.refetch();
      await client.invalidateQueries({
        predicate: (q) => !String(q.queryKey[0]).startsWith('admin-'),
      });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    if (!busy && (!editing || window.confirm('放弃未提交的评分标准修改？'))) edit(undefined);
  };
  return (
    <section className="admin-operations">
      <h2>试卷评分标准</h2>
      <p>维护题目、参考答案和评分点。发布版本只读，创建新草稿后才能修改；后端校验分值与评分点。</p>
      <label>
        选择试卷{' '}
        <select
          aria-label="评分标准试卷"
          value={paperId}
          disabled={!!editing || busy}
          onChange={(e) => select(e.target.value)}
        >
          {papers.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.paperMonth} · {p.paperKey}
            </option>
          ))}
        </select>
      </label>
      {papers.isPending && <p role="status">读取试卷…</p>}
      {papers.isError && (
        <p role="alert">
          {message(papers.error)} <Button onClick={() => void papers.refetch()}>重试</Button>
        </p>
      )}
      {!papers.isPending && !papers.data?.length && (
        <p>尚无试卷。请先在“文件资料”上传 PDF，再在“试卷维护”关联资料。</p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}。未提交内容仍保留。
        </p>
      )}
      {success && (
        <p role="status" className="admin-success">
          {success}
        </p>
      )}
      <div className="admin-actions">
        <Button
          disabled={!paperId || busy || !!editing}
          onClick={() => edit({ value: { questions: [] } })}
        >
          新建评分标准草稿
        </Button>
      </div>
      {query.isFetching && <p role="status">读取评分标准…</p>}
      {query.isError && (
        <p role="alert">
          {message(query.error)} <Button onClick={() => void query.refetch()}>重试</Button>
        </p>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>版本</th>
              <th>状态</th>
              <th>题目数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map((r) => (
              <tr key={r.id}>
                <td>v{r.version}</td>
                <td>{r.state === 'DRAFT' ? '草稿' : '已发布 · 只读'}</td>
                <td>{r.document.questions.length}</td>
                <td>
                  <div className="admin-actions">
                    <Button
                      variant="secondary"
                      disabled={busy || !!editing}
                      onClick={() =>
                        edit({
                          id: r.state === 'DRAFT' ? r.id : undefined,
                          value: structuredClone(r.document) as unknown as Row,
                        })
                      }
                    >
                      {r.state === 'DRAFT' ? '继续编辑' : '复制为新草稿'}
                    </Button>
                    {r.state === 'DRAFT' && (
                      <Button disabled={busy || !!editing} onClick={() => publish(r)}>
                        发布评分标准
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!query.isFetching && paperId && !query.data?.length && (
        <p>此试卷尚无评分标准。可创建人工维护的草稿。</p>
      )}
      <Modal
        open={!!editing}
        title={editing?.id ? '编辑评分标准草稿' : '新建评分标准草稿'}
        onClose={close}
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await request(
                  `/grading/rubrics${editing.id ? '/' + editing.id : `?courseId=${courseId}&paperId=${paperId}`}`,
                  editing.id ? 'PUT' : 'POST',
                  editing.value,
                );
                edit(undefined);
                setSuccess('评分标准草稿已保存，尚未发布。');
              });
            }}
          >
            <Fields
              name="LocalRubricDocument"
              value={editing.value}
              disabled={busy}
              onChange={(v) => edit({ ...editing, value: v as Row })}
            />
            {error && (
              <p role="alert" className="admin-error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button type="button" variant="secondary" disabled={busy} onClick={close}>
                取消
              </Button>
              <Button type="submit" loading={busy}>
                保存草稿
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={!!publishing}
        title={`发布评分标准 v${publishing?.version}`}
        onClose={() => !busy && publish(undefined)}
      >
        <p>此标准将用于新的批改任务；已发布版本无法直接修改。后端将重新校验所有题目与分值。</p>
        {error && <p role="alert">{error}</p>}
        <div className="modal-actions">
          <Button variant="secondary" disabled={busy} onClick={() => publish(undefined)}>
            取消
          </Button>
          <Button
            loading={busy}
            onClick={() =>
              void run(async () => {
                await request(`/grading/rubrics/${publishing!.id}/publish`, 'POST');
                publish(undefined);
                setSuccess('评分标准已发布。');
              })
            }
          >
            确认发布评分标准
          </Button>
        </div>
      </Modal>
    </section>
  );
}
