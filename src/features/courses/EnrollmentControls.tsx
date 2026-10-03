import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getEnrollment, saveEnrollment } from '../../api/generated/courses/courses';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import type { EnrollmentWrite } from '../../api/generated/models';
export function EnrollmentControls({ courseId, cycleId }: { courseId: string; cycleId: string }) {
  const query = useQuery({
    queryKey: ['enrollment', courseId, cycleId],
    queryFn: async () => (await getEnrollment(courseId, cycleId, { silent: true })).data,
  });
  const client = useQueryClient();
  const [draft, setDraft] = useState<EnrollmentWrite | null>(null);
  const save = useMutation({
    mutationFn: async (body: EnrollmentWrite) =>
      (await saveEnrollment(courseId, cycleId, body, { silent: true })).data,
    onSuccess: async () => {
      setDraft(null);
      await client.invalidateQueries({ queryKey: ['enrollment', courseId, cycleId] });
      await client.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });
  return (
    <div className="enrollment-line">
      {query.isPending ? (
        <small role="status">正在读取报考状态…</small>
      ) : query.isError ? (
        <Button variant="ghost" onClick={() => void query.refetch()}>
          重试报考状态
        </Button>
      ) : (
        <>
          <small>
            {query.data?.paid ? '已缴费' : '未标记缴费'}
            {query.data?.officialScore !== null && query.data?.officialScore !== undefined
              ? ` · 正式成绩 ${query.data.officialScore} 分`
              : ''}
          </small>
          <Button
            variant="ghost"
            onClick={() => {
              save.reset();
              const e = query.data;
              setDraft({
                paid: e?.paid ?? false,
                fee: e?.fee ?? null,
                officialScore: e?.officialScore ?? null,
                officialPassed: e?.officialPassed ?? null,
                passedMonth: e?.passedMonth ?? null,
                note: e?.note ?? '',
                expectedRevision: e?.revision ?? 0,
              });
            }}
          >
            报考记录
          </Button>
        </>
      )}
      <Modal
        open={!!draft}
        title="报考与正式成绩"
        onClose={() => {
          if (!save.isPending) setDraft(null);
        }}
      >
        {draft && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(draft);
            }}
          >
            <label className="row">
              <input
                type="checkbox"
                checked={draft.paid}
                onChange={(e) => setDraft({ ...draft, paid: e.target.checked })}
              />
              已缴纳报考费
            </label>
            <label>
              报考费（元）
              <input
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                value={draft.fee ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, fee: e.target.value === '' ? null : Number(e.target.value) })
                }
              />
            </label>
            <label>
              正式考试成绩（可留空）
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={draft.officialScore ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    officialScore: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              正式通过状态
              <select
                value={draft.officialPassed === null ? '' : String(draft.officialPassed)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    officialPassed: e.target.value === '' ? null : e.target.value === 'true',
                  })
                }
              >
                <option value="">未记录</option>
                <option value="true">已通过</option>
                <option value="false">未通过</option>
              </select>
            </label>
            <label>
              通过月份
              <input
                type="month"
                value={draft.passedMonth ?? ''}
                onChange={(e) => setDraft({ ...draft, passedMonth: e.target.value || null })}
              />
            </label>
            <label>
              备注
              <textarea
                value={draft.note}
                maxLength={10000}
                rows={3}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </label>
            <p className="secondary">正式成绩独立记录，不代替练习成绩或检测通过资格。</p>
            {save.isError && (
              <p className="status-error" role="alert">
                {save.error.message}。草稿已保留；请关闭并重新读取最新记录后再保存。
              </p>
            )}
            <Button type="submit" loading={save.isPending}>
              保存报考记录
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
