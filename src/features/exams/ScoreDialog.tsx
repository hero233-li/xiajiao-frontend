import { useRef, useState, type FormEvent } from 'react';
import type { Paper, ScoreRecord, ScoreWrite } from '../../api/generated/models';
import { useExamActions } from '../../api/exams';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';

export function ScoreDialog({
  courseId,
  cycleId,
  papers,
  paperId,
  record,
  onClose,
}: {
  courseId: string;
  cycleId: string;
  papers: Paper[];
  paperId: string;
  record?: ScoreRecord;
  onClose: () => void;
}) {
  const { save, upload } = useExamActions(courseId, record?.cycleId ?? cycleId);
  const [image, setImage] = useState<File>();
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState<string>();
  const busy = save.isPending || upload.isPending;
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || imageError) return;
    submitting.current = true;
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      let id = savedId;
      if (!id) {
        const body: ScoreWrite = {
          cycleId: record?.cycleId ?? cycleId,
          paperId: String(data.get('paperId')),
          practicedOn: String(data.get('practicedOn')),
          score: Number(data.get('score')),
          minutes: Number(data.get('minutes')),
          limitMinutes: Number(data.get('limitMinutes')),
          complete: data.get('complete') === 'yes',
          closedBook: data.get('closedBook') === 'yes',
          answersSeenBefore: data.get('answersSeenBefore') === 'yes',
          note: String(data.get('note')),
        };
        const result = await save.mutateAsync({ body, record });
        id = result.record.id;
        setSavedId(id);
      }
      if (image) await upload.mutateAsync({ id, file: image });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请重试');
    } finally {
      submitting.current = false;
    }
  }
  return (
    <Modal open title={record ? '编辑试卷成绩' : '录入试卷成绩'} onClose={onClose}>
      <form className="stack exam-form" onSubmit={(event) => void submit(event)}>
        <p>成绩仅为自报记录，图片仅用于存档，不创建批改任务。</p>
        {savedId && <p role="status">成绩已保存。可重试图片上传，或关闭弹窗保留成绩。</p>}
        <fieldset disabled={busy || !!savedId} className="stack exam-fields">
          <legend className="sr-only">成绩信息</legend>
          <label>
            试卷选择
            <select
              name="paperId"
              defaultValue={record?.paperId ?? paperId}
              required
              disabled={!!record}
            >
              {record && !papers.some((p) => p.id === record.paperId) && (
                <option value={record.paperId}>{record.paperKey}</option>
              )}
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.paperMonth} 试卷{p.sourceCourseCode ? `（来源 ${p.sourceCourseCode}）` : ''}
                </option>
              ))}
            </select>
            {record && (
              <>
                <input type="hidden" name="paperId" value={record.paperId} />
                <span className="secondary">编辑时不能更改所属试卷与考试周期。</span>
              </>
            )}
          </label>
          <label>
            练习日期
            <input required type="date" name="practicedOn" defaultValue={record?.practicedOn} />
          </label>
          <div className="exam-form-grid">
            <label>
              分数（0–100）
              <input
                required
                type="number"
                name="score"
                min="0"
                max="100"
                step="1"
                defaultValue={record?.score}
              />
            </label>
            <label>
              实际用时（分钟）
              <input
                required
                type="number"
                name="minutes"
                min="1"
                max="1440"
                step="1"
                defaultValue={record?.minutes}
              />
            </label>
            <label>
              限时（分钟）
              <input
                required
                type="number"
                name="limitMinutes"
                min="1"
                max="1440"
                step="1"
                defaultValue={record?.limitMinutes}
              />
            </label>
          </div>
          <Binary name="complete" label="是否完整作答？" value={record?.complete} />
          <Binary name="closedBook" label="是否闭卷？" value={record?.closedBook} />
          <Binary
            name="answersSeenBefore"
            label="做题前是否看过本卷答案？"
            value={record?.answersSeenBefore ?? undefined}
          />
          <label>
            备注
            <textarea name="note" rows={3} maxLength={5000} defaultValue={record?.note ?? ''} />
          </label>
        </fieldset>
        <label>
          可选图片存档
          <input
            aria-label="可选图片存档"
            aria-invalid={!!imageError}
            aria-describedby="exam-image-help"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setImage(undefined);
              setImageError('');
              if (!file) return;
              if (
                !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                file.size > 8 * 1024 * 1024
              ) {
                setImageError('仅支持 JPG/PNG/WebP，单张不超过 8MB。');
                event.target.value = '';
                return;
              }
              setImage(file);
            }}
          />
          <span id="exam-image-help" className="secondary">
            仅支持 JPG/PNG/WebP，单张 ≤8MB。{busy ? '正在保存，请稍候。' : ''}
          </span>
        </label>
        {imageError && (
          <p role="alert" className="status-error">
            {imageError}
          </p>
        )}
        {error && (
          <p role="alert" className="status-error">
            {savedId ? '成绩已保存，图片未上传：' : ''}
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            关闭
          </Button>
          <Button
            type="submit"
            loading={busy}
            disabled={!!imageError}
            disabledReason={imageError}
            error={error || undefined}
          >
            {savedId ? '重试图片存档' : error ? '重试保存' : '保存成绩'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function Binary({ name, label, value }: { name: string; label: string; value?: boolean }) {
  return (
    <fieldset className="exam-binary">
      <legend>{label}</legend>
      <label>
        <input type="radio" name={name} value="yes" required defaultChecked={value === true} />是
      </label>
      <label>
        <input type="radio" name={name} value="no" required defaultChecked={value === false} />否
      </label>
    </fieldset>
  );
}
