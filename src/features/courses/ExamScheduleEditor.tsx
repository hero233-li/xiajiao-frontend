import { useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getCycle, adminUpdateCycle } from '../../api/generated/exams/exams';
import type { Course, CycleCourse, ExamCycle } from '../../api/generated/models';
import { ApiError, errorMessage } from '../../api/errors';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';

function sameSchedule(a: CycleCourse, b: CycleCourse) {
  return a.examDate === b.examDate && a.startsAt === b.startsAt && a.endsAt === b.endsAt;
}

export function ExamScheduleEditor({
  course,
  cycle,
  onClose,
  onSaved,
}: {
  course: Course;
  cycle: ExamCycle;
  onClose: () => void;
  onSaved: (cycle: ExamCycle) => void;
}) {
  const client = useQueryClient();
  const initial = cycle.courses.find((exam) => exam.courseId === course.id)!;
  const [baseline, setBaseline] = useState(initial);
  const [date, setDate] = useState(initial.examDate ?? '');
  const [start, setStart] = useState(initial.startsAt?.slice(0, 5) ?? '');
  const [end, setEnd] = useState(initial.endsAt?.slice(0, 5) ?? '');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const close = () => {
    if (!pending.current) onClose();
  };
  const refresh = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const latest = (await getCycle(cycle.id, { silent: true })).data;
      const exam = latest.courses.find((item) => item.courseId === course.id);
      if (!exam) throw new Error('此科目已不在当前周期，请关闭弹窗并刷新科目。');
      setBaseline(exam);
      setDate(exam.examDate ?? '');
      setStart(exam.startsAt?.slice(0, 5) ?? '');
      setEnd(exam.endsAt?.slice(0, 5) ?? '');
      setConflict(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current || conflict) return;
    setError('');
    if ((!date && (start || end)) || !!start !== !!end) {
      setError('请填写考试日期及完整的开始、结束时间；日期待确认时请清空时段。');
      return;
    }
    if (start && end <= start) {
      setError('结束时间必须晚于开始时间。');
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      // Read immediately before writing: preserve all other courses and cycle metadata.
      const latest = (await getCycle(cycle.id, { silent: true })).data;
      const current = latest.courses.find((exam) => exam.courseId === course.id);
      if (!current) throw new Error('此科目已不在当前周期，请关闭弹窗并刷新科目。');
      if (!sameSchedule(current, baseline))
        throw new ApiError('考试安排已被其他操作修改，请读取最新安排后再保存。', 409, 40901);
      const schedule: CycleCourse = {
        courseId: course.id,
        examDate: date || null,
        startsAt: start ? `${start}:00` : null,
        endsAt: end ? `${end}:00` : null,
      };
      const updated = (
        await adminUpdateCycle(
          cycle.id,
          {
            name: latest.name,
            startDate: latest.startDate,
            endDate: latest.endDate,
            courses: latest.courses.map((exam) => (exam.courseId === course.id ? schedule : exam)),
          },
          { silent: true },
        )
      ).data;
      client.setQueriesData<{ items: ExamCycle[]; total: number }>(
        { queryKey: ['cycle-context'] },
        (previous) =>
          previous && {
            ...previous,
            items: previous.items.map((item) => (item.id === updated.id ? updated : item)),
          },
      );
      void client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
      onSaved(updated);
    } catch (cause) {
      setError(errorMessage(cause));
      setConflict(cause instanceof ApiError && cause.code === 40901);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal open title={`修改考试时间 · ${course.name}`} onClose={close}>
      <p className="secondary">
        {cycle.name}。保存后会更新此周期的考试安排与倒计时，已有学习计划不会自动重排。
      </p>
      <form className="stack" onSubmit={(event) => void save(event)}>
        <label htmlFor="exam-date">
          考试日期
          <input
            id="exam-date"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={date}
            disabled={busy}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <div className="subjects-time-fields">
          <label htmlFor="exam-start">
            开始时间
            <input
              id="exam-start"
              type="time"
              value={start}
              disabled={busy}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label htmlFor="exam-end">
            结束时间
            <input
              id="exam-end"
              type="time"
              value={end}
              disabled={busy}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
        </div>
        <Button
          variant="ghost"
          type="button"
          disabled={busy}
          onClick={() => {
            setDate('');
            setStart('');
            setEnd('');
            setError('');
          }}
        >
          设为日期待确认
        </Button>
        <p className="subjects-editor-feedback status-error" role="alert">
          {error}
        </p>
        {conflict && (
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void refresh()}>
            读取最新安排
          </Button>
        )}
        <div className="modal-actions">
          <Button type="button" variant="secondary" disabled={busy} onClick={close}>
            取消
          </Button>
          <Button
            type="submit"
            loading={busy}
            disabled={conflict}
            loadingLabel="正在保存考试时间，请稍候"
          >
            保存考试时间
          </Button>
        </div>
      </form>
    </Modal>
  );
}
