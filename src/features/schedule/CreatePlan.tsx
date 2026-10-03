import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { useCycle } from '../cycle/CycleContext';
import { useSearchParams } from '../cycle/navigation';
import { listCourses } from '../../api/generated/courses/courses';
import { createPlan } from '../../api/generated/schedule/schedule';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
export function CreatePlan() {
  const cycle = useCycle();
  const client = useQueryClient();
  const [, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const courses = useQuery({
    queryKey: ['my-courses', cycle?.cycleId],
    enabled: !!cycle?.cycleId,
    queryFn: async () =>
      (await listCourses({ cycleId: cycle!.cycleId!, size: 100 }, { silent: true })).data,
  });
  const [priority, setPriority] = useState<string[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [minutes, setMinutes] = useState(90);
  const [accept, setAccept] = useState(false);
  const [localError, setLocalError] = useState('');
  const create = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!cycle?.cycleId || !start || !end || !priority.length)
        throw new Error('请选择科目并填写计划日期');
      const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
      if (days < 1 || days > 366) throw new Error('日期范围应为1至366天');
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)
        throw new Error('每日时间应为0至1440分钟的整数');
      return (
        await createPlan(
          {
            config: {
              cycleId: cycle.cycleId,
              startDate: start,
              endDate: end,
              coursePriority: priority,
              courseScope: priority,
              dayCapacities: Array.from({ length: days }, (_, i) => ({
                day: new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10),
                capacityMinutes: minutes,
              })),
            },
            acceptUnscheduled: accept,
          },
          { silent: true },
        )
      ).data;
    },
    onSuccess: async (plan) => {
      setOpen(false);
      await client.invalidateQueries({ queryKey: ['plans'] });
      await client.invalidateQueries({ queryKey: ['dashboard'] });
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('planId', plan.id);
        next.delete('week');
        return next;
      });
    },
  });
  const lookup = new Map(courses.data?.items.map((c) => [c.id, c]));
  function move(index: number, offset: number) {
    const next = [...priority];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setPriority(next);
  }
  return (
    <>
      <Button
        variant="secondary"
        disabled={
          !cycle?.cycleId || courses.isPending || courses.isError || !courses.data?.items.length
        }
        onClick={() => {
          create.reset();
          setLocalError('');
          setOpen(true);
          if (!priority.length) setPriority(courses.data!.items.map((c) => c.id));
          if (!start) setStart(cycle?.selected?.startDate ?? '');
          if (!end) setEnd(cycle?.selected?.endDate ?? '');
        }}
      >
        <Plus size={16} />
        新建计划
      </Button>
      {courses.isError && (
        <Button variant="ghost" onClick={() => void courses.refetch()}>
          重试课程加载
        </Button>
      )}
      <Modal
        open={open}
        title="建立学习计划"
        onClose={() => {
          if (!create.isPending) setOpen(false);
        }}
      >
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setLocalError('');
            create.mutate();
          }}
        >
          <p className="secondary">
            先定时间与课程优先级。系统按已发布内容的预计时长排期，各科任务严格安排在考试前；不会覆盖已有计划。
          </p>
          <div className="schedule-fields">
            <label>
              开始日期
              <input
                type="date"
                required
                value={start}
                disabled={create.isPending}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              结束日期
              <input
                type="date"
                required
                min={start}
                value={end}
                disabled={create.isPending}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          <label>
            每日可用时间（分钟）
            <input
              type="number"
              required
              min={0}
              max={1440}
              step={1}
              value={minutes}
              disabled={create.isPending}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
          <fieldset disabled={create.isPending}>
            <legend>选择课程范围</legend>
            {courses.data?.items.map((course) => (
              <label key={course.id} className="row">
                <input
                  type="checkbox"
                  checked={priority.includes(course.id)}
                  onChange={(e) =>
                    setPriority(
                      e.target.checked
                        ? [...priority, course.id]
                        : priority.filter((id) => id !== course.id),
                    )
                  }
                />
                {course.name}
              </label>
            ))}
          </fieldset>
          <div>
            <h3>科目优先级</h3>
            <ol className="schedule-priority">
              {priority.map((id, i) => (
                <li key={id}>
                  <span>{lookup.get(id)?.name}</span>
                  <Button
                    variant="ghost"
                    disabled={i === 0 || create.isPending}
                    aria-label={`提高${lookup.get(id)?.name}优先级`}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={i === priority.length - 1 || create.isPending}
                    aria-label={`降低${lookup.get(id)?.name}优先级`}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={16} />
                  </Button>
                </li>
              ))}
            </ol>
          </div>
          <label className="row">
            <input
              type="checkbox"
              checked={accept}
              disabled={create.isPending}
              onChange={(e) => setAccept(e.target.checked)}
            />
            接受容量不足的任务保持“未排入”
          </label>
          <small>
            不勾选时，有容量缺口将拒绝创建并说明原因。考试日未知的课程保留为待确认，系统不会猜测日期。
          </small>
          {(create.isError || localError) && (
            <p role="alert" className="status-error">
              {localError || create.error?.message}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" disabled={create.isPending} onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={!priority.length} loading={create.isPending}>
              确认配置并创建
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
