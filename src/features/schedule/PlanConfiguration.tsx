import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, ArrowUp, ArrowDown } from 'lucide-react';
import { listCourses } from '../../api/generated/courses/courses';
import { createPlan } from '../../api/generated/schedule/schedule';
import { useReschedulePreview, useRescheduleConfirm } from '../../api/schedule';
import { useCycle } from '../cycle/CycleContext';
import { useSearchParams } from '../cycle/navigation';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import type { Plan, PlanConfig, Course } from '../../api/generated/models';
import { durationLabel, dayLabel } from './display';

export function offsetDate(day: string, offset: number) {
  return new Date(Date.parse(day) + offset * 86400000).toISOString().slice(0, 10);
}
function initialConfig(cycleId: string, courses: Course[], start: string, plan?: Plan): PlanConfig {
  const priority =
    plan?.config.coursePriority.filter((id) =>
      courses.some((c) => c.id === id && c.courseType === 'THEORY'),
    ) ?? [];
  for (const c of courses.filter((c) => c.courseType === 'THEORY'))
    if (!priority.includes(c.id)) priority.push(c.id);
  const selected = priority.slice(0, 4);
  return {
    cycleId,
    name: plan?.config.name ?? '五周备考计划',
    strategy: 'WEEKLY_35',
    startDate: start,
    endDate: offsetDate(start, 34),
    coursePriority: selected,
    courseScope: selected,
    dayCapacities: Array.from({ length: 35 }, (_, i) => ({
      day: offsetDate(start, i),
      capacityMinutes: plan?.config.dayCapacities[i]?.capacityMinutes ?? 180,
    })),
  };
}
export function PlanConfiguration({ plan }: { plan?: Plan }) {
  const cycle = useCycle();
  const [, setParams] = useSearchParams();
  const client = useQueryClient();
  const cycleId = plan?.config.cycleId ?? cycle?.cycleId;
  const courses = useQuery({
    queryKey: ['my-courses', cycleId],
    enabled: !!cycleId,
    queryFn: async () =>
      (await listCourses({ cycleId: cycleId!, size: 100 }, { silent: true })).data,
  });
  const [draft, setDraft] = useState<PlanConfig | null>(null);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={!cycleId || !courses.data?.items.length}
        onClick={() => {
          const dates = cycle?.selected?.courses
            ?.filter((c) =>
              courses.data!.items.some(
                (course) => course.id === c.courseId && course.courseType === 'THEORY',
              ),
            )
            .map((c) => c.examDate)
            .filter((date): date is string => !!date)
            .sort();
          const start =
            plan?.config.startDate ??
            (dates?.[0] ? offsetDate(dates[0], -35) : cycle?.selected?.startDate);
          if (start) setDraft(initialConfig(cycleId!, courses.data!.items, start, plan));
        }}
      >
        {plan ? <Pencil size={16} /> : <Plus size={16} />} {plan ? '编辑当前计划' : '新建计划'}
      </Button>
      {courses.isError && (
        <Button variant="ghost" onClick={() => void courses.refetch()}>
          重试课程加载
        </Button>
      )}
      {draft && (
        <ConfigurationDialog
          key={plan?.revision ?? 'new'}
          initial={draft}
          courses={courses.data!.items}
          plan={plan}
          onClose={() => setDraft(null)}
          onCreated={async (id) => {
            setDraft(null);
            await client.invalidateQueries({ queryKey: ['plans'] });
            await client.invalidateQueries({ queryKey: ['dashboard'] });
            setParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('planId', id);
              next.delete('week');
              next.delete('revision');
              return next;
            });
          }}
        />
      )}
    </>
  );
}
function ConfigurationDialog({
  initial,
  courses,
  plan,
  onClose,
  onCreated,
}: {
  initial: PlanConfig;
  courses: Course[];
  plan?: Plan;
  onClose: () => void;
  onCreated: (id: string) => Promise<void>;
}) {
  const [config, setConfig] = useState(initial);
  const [error, setError] = useState('');
  const [minutes, setMinutes] = useState(180);
  const [accept, setAccept] = useState(false);
  const [review, setReview] = useState(false);
  const preview = useReschedulePreview(plan?.id ?? '');
  const confirm = useRescheduleConfirm(plan?.id ?? '');
  const create = useMutation({
    retry: false,
    mutationFn: async () =>
      (await createPlan({ config, acceptUnscheduled: accept }, { silent: true })).data,
    onSuccess: (p) => onCreated(p.id),
  });
  const busy = preview.isPending || confirm.isPending || create.isPending;
  function range(start: string, end: string) {
    if (!start || !end) return;
    const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
    if (days < 1 || days > 366) return;
    setConfig((c) => ({
      ...c,
      startDate: start,
      endDate: end,
      dayCapacities: Array.from({ length: days }, (_, i) => ({
        day: offsetDate(start, i),
        capacityMinutes: c.dayCapacities[i]?.capacityMinutes ?? minutes,
      })),
    }));
  }
  function priority(ids: string[]) {
    setConfig((c) => ({ ...c, coursePriority: ids, courseScope: ids }));
  }
  function validate() {
    if (!config.name?.trim()) return '请填写计划名称';
    if (config.strategy === 'WEEKLY_35' && config.coursePriority.length !== 4)
      return '五周方案需要选择4门理论课';
    if (!config.coursePriority.length) return '至少选择一门课程';
    if (
      config.dayCapacities.some(
        (d) =>
          !Number.isInteger(d.capacityMinutes) || d.capacityMinutes < 0 || d.capacityMinutes > 1440,
      )
    )
      return '每天的时间应为0至1440分钟的整数';
    return '';
  }
  const data = preview.data;
  return (
    <Modal
      key={review ? 'preview' : 'config'}
      open
      title={plan ? '编辑当前计划' : '建立学习计划'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {review && data ? (
        <div className="stack plan-config-review">
          <p className="eyebrow">确认新版本 · {data.baseRevision + 1}</p>
          <h3>{data.proposedPlan.config.name}</h3>
          <p>
            {data.proposedPlan.config.startDate} 至 {data.proposedPlan.config.endDate} ·{' '}
            {data.proposedPlan.dayCount} 天。旧版本仍可查看；完成状态与原学习记录保持关联。
          </p>
          <div className="plan-week-preview">
            {data.proposedPlan.weeks.map((w, i) => (
              <div key={w.index}>
                <strong>
                  第 {w.index} 周 ·{' '}
                  {config.strategy === 'WEEKLY_35'
                    ? i === 4
                      ? '真题与复习'
                      : courses.find((c) => c.id === config.coursePriority[i])?.name
                    : '按优先级学习'}
                </strong>
                <small>
                  {w.startDate} — {w.endDate}
                </small>
                <span>已排 {durationLabel(w.scheduledMinutes)}</span>
              </div>
            ))}
          </div>
          {data.gapMinutes > 0 ? (
            <>
              <p role="alert" className="status-warning">
                仍有 {durationLabel(data.gapMinutes)}{' '}
                无法排入，包括时间不足或考试日期未确定的任务。增加对应周的容量后可重新预览。
              </p>
              <ul>
                {data.proposedPlan.courseSummaries.map((c) => {
                  const gap = [...data.proposedPlan.unscheduled, ...data.proposedPlan.awaitingDate]
                    .filter((s) =>
                      data.proposedPlan.tasks.some((t) => t.id === s.taskId && t.courseId === c.id),
                    )
                    .reduce((sum, s) => sum + s.minutes, 0);
                  return gap > 0 ? (
                    <li key={c.id}>
                      {c.name}：{durationLabel(gap)} 待安排
                    </li>
                  ) : null;
                })}
              </ul>
              <label className="row">
                <input
                  type="checkbox"
                  checked={accept}
                  onChange={(e) => setAccept(e.target.checked)}
                  disabled={busy}
                />
                接受这些任务保持待安排
              </label>
            </>
          ) : (
            <p className="notes-success">所有任务已排入对应时间范围。</p>
          )}
          {confirm.isError && (
            <p role="alert" className="status-error">
              {confirm.error.message}。配置仍保留，请返回并重新预览。
            </p>
          )}
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setReview(false);
                setAccept(false);
                confirm.reset();
              }}
            >
              返回修改
            </Button>
            <Button
              type="button"
              loading={confirm.isPending}
              disabled={data.gapMinutes > 0 && !accept}
              disabledReason="请先调整容量或明确接受待安排任务"
              onClick={() =>
                confirm.mutate(
                  {
                    previewId: data.id,
                    body: {
                      baseRevision: data.baseRevision,
                      inputFingerprint: data.inputFingerprint,
                      acceptUnscheduled: accept,
                      confirm: true,
                    },
                  },
                  { onSuccess: () => onClose() },
                )
              }
            >
              确认保存新版本
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const message = validate();
            setError(message);
            if (message) return;
            if (plan)
              preview.mutate(
                { baseRevision: plan.revision, config },
                {
                  onSuccess: () => {
                    setReview(true);
                    setAccept(false);
                  },
                },
              );
            else create.mutate();
          }}
        >
          <p className="secondary">
            完整35天、五个学习周。前四周按顺序各学一门理论课，第五周集中安排已发布的真题与复习任务。每门理论课必须先发布
            REVIEW
            复习任务模板，预计分钟数由管理员维护。每科任务遵守考试截止日期，时间不足会明确提示。
          </p>
          <fieldset className="plan-config-fields" disabled={busy}>
            <label>
              计划名称
              <input
                required
                maxLength={100}
                value={config.name ?? ''}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </label>
            <label>
              排期方式
              <select
                value={config.strategy}
                onChange={(e) => {
                  const strategy = e.target.value as PlanConfig['strategy'];
                  if (strategy === 'WEEKLY_35') {
                    const ids = courses
                      .filter((c) => c.courseType === 'THEORY')
                      .map((c) => c.id)
                      .slice(0, 4);
                    setConfig({
                      ...config,
                      strategy,
                      coursePriority: ids,
                      courseScope: ids,
                      endDate: offsetDate(config.startDate, 34),
                      dayCapacities: Array.from({ length: 35 }, (_, i) => ({
                        day: offsetDate(config.startDate, i),
                        capacityMinutes: config.dayCapacities[i]?.capacityMinutes ?? minutes,
                      })),
                    });
                  } else setConfig({ ...config, strategy });
                }}
              >
                <option value="WEEKLY_35">五周备考 · 一周一科＋最后一周真题复习</option>
                <option value="SEQUENTIAL">按科目优先级连续安排</option>
              </select>
            </label>
            <div className="schedule-fields">
              <label>
                开始日期
                <input
                  type="date"
                  required
                  value={config.startDate}
                  onInput={(e) =>
                    e.currentTarget.value &&
                    range(
                      e.currentTarget.value,
                      config.strategy === 'WEEKLY_35'
                        ? offsetDate(e.currentTarget.value, 34)
                        : config.endDate,
                    )
                  }
                  onChange={(e) =>
                    e.target.value &&
                    range(
                      e.target.value,
                      config.strategy === 'WEEKLY_35'
                        ? offsetDate(e.target.value, 34)
                        : config.endDate,
                    )
                  }
                />
              </label>
              <label>
                结束日期
                <input
                  type="date"
                  required
                  readOnly={config.strategy === 'WEEKLY_35'}
                  min={config.startDate}
                  value={config.endDate}
                  onInput={(e) =>
                    e.currentTarget.value && range(config.startDate, e.currentTarget.value)
                  }
                  onChange={(e) => range(config.startDate, e.target.value)}
                />
                <small>
                  {config.strategy === 'WEEKLY_35'
                    ? '开始日计作第1天，结束日为第35天。'
                    : '保留原连续排期规则。'}
                </small>
              </label>
            </div>
            <fieldset>
              <legend>涉及科目</legend>
              {courses.map((c) => (
                <label key={c.id} className="row">
                  <input
                    type="checkbox"
                    checked={config.coursePriority.includes(c.id)}
                    disabled={config.strategy === 'WEEKLY_35' && c.courseType !== 'THEORY'}
                    onChange={(e) =>
                      priority(
                        e.target.checked
                          ? [...config.coursePriority, c.id]
                          : config.coursePriority.filter((id) => id !== c.id),
                      )
                    }
                  />
                  {c.name}
                  {config.strategy === 'WEEKLY_35' && c.courseType !== 'THEORY' && (
                    <small>实践科目另行安排</small>
                  )}
                </label>
              ))}
            </fieldset>
            <div>
              <h3>{config.strategy === 'WEEKLY_35' ? '前四周的科目顺序' : '科目优先级'}</h3>
              <ol className="schedule-priority">
                {config.coursePriority.map((id, i) => (
                  <li key={id}>
                    <span>
                      {config.strategy === 'WEEKLY_35' ? `第${i + 1}周 · ` : ''}
                      {courses.find((c) => c.id === id)?.name}
                    </span>
                    {[-1, 1].map((delta) => (
                      <Button
                        type="button"
                        key={delta}
                        variant="ghost"
                        disabled={i + delta < 0 || i + delta >= config.coursePriority.length}
                        aria-label={`${delta < 0 ? '提高' : '降低'}${courses.find((c) => c.id === id)?.name}优先级`}
                        onClick={() => {
                          const ids = [...config.coursePriority];
                          [ids[i], ids[i + delta]] = [ids[i + delta], ids[i]];
                          priority(ids);
                        }}
                      >
                        {delta < 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      </Button>
                    ))}
                  </li>
                ))}
              </ol>
              {config.strategy === 'WEEKLY_35' && (
                <p className="secondary">第5周 · 四门课的真题与复习</p>
              )}
            </div>
            <div>
              <h3>逐日可用时间</h3>
              <p className="secondary">
                单位为分钟，0 表示休息。更改开始日期会按第几天保留你的容量设置。
              </p>
              <div className="plan-capacity-bulk">
                <label>
                  批量设置分钟
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    step={1}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!Number.isInteger(minutes) || minutes < 0 || minutes > 1440}
                  onClick={() =>
                    setConfig({
                      ...config,
                      dayCapacities: config.dayCapacities.map((d) => ({
                        ...d,
                        capacityMinutes: minutes,
                      })),
                    })
                  }
                >
                  应用到所有日期
                </Button>
              </div>
              {Array.from({ length: Math.ceil(config.dayCapacities.length / 7) }, (_, week) => (
                <details
                  key={week}
                  className="plan-capacity-week"
                  open={week === 0 ? true : undefined}
                >
                  <summary>
                    第 {week + 1} 周容量 · {config.dayCapacities[week * 7]?.day} 起
                  </summary>
                  <div className="plan-capacity-grid">
                    {config.dayCapacities.slice(week * 7, week * 7 + 7).map((d, i) => (
                      <label key={d.day}>
                        {dayLabel(d.day)}
                        <input
                          aria-label={`${d.day}可用分钟`}
                          type="number"
                          min={0}
                          max={1440}
                          required
                          step={1}
                          value={d.capacityMinutes}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              dayCapacities: config.dayCapacities.map((item, index) =>
                                index === week * 7 + i
                                  ? { ...item, capacityMinutes: Number(e.target.value) }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </fieldset>
          {!plan && (
            <label className="row">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                disabled={busy}
              />
              接受容量不足的任务保持“未排入”
            </label>
          )}
          {(error || create.isError || preview.isError) && (
            <p role="alert" className="status-error">
              {error || create.error?.message || preview.error?.message}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" disabled={busy} onClick={onClose}>
              取消
            </Button>
            <Button type="submit" loading={busy}>
              {plan ? '预览修改与重排' : '确认配置并创建'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
