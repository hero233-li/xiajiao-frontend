import { AlertTriangle, ArrowDown, ArrowUp, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Plan, RescheduleRequest } from '../../api/generated/models';
import { useRescheduleConfirm, useReschedulePreview } from '../../api/schedule';
import { Button } from '../../components/Button';
import { durationLabel, isWeekend, planDays, wholeHours } from './display';
import './schedule.css';
import { State } from './ScheduleState';

function Priority({
  ids,
  plan,
  setIds,
}: {
  ids: string[];
  plan: Plan;
  setIds: (ids: string[]) => void;
}) {
  function move(index: number, delta: number) {
    const next = [...ids];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setIds(next);
  }
  return (
    <ol className="schedule-priority">
      {ids.map((id, index) => {
        const name =
          plan.courseSummaries.find((course) => course.id === id)?.name || `科目 ${index + 1}`;
        return (
          <li key={id}>
            <span>{name}</span>
            <Button
              variant="secondary"
              aria-label={`${name}上移`}
              disabled={index === 0}
              disabledReason="已经是第一位"
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={20} aria-hidden="true" />
            </Button>
            <Button
              variant="secondary"
              aria-label={`${name}下移`}
              disabled={index === ids.length - 1}
              disabledReason="已经是最后一位"
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={20} aria-hidden="true" />
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
export function SettingsView({ plan }: { plan: Plan }) {
  function capacityLabel(weekend: boolean) {
    const values = [
      ...new Set(
        plan.config.dayCapacities
          .filter((item) => isWeekend(item.day) === weekend)
          .map((item) => item.capacityMinutes),
      ),
    ];
    return values.length === 1
      ? durationLabel(values[0])
      : values.length
        ? '按日期单独配置（见下方）'
        : '未配置';
  }
  return (
    <div className="schedule-dialog">
      <p role="note">
        这里显示已保存的设置，仅供查看。调整日期、每日容量或科目顺序请使用“编辑当前计划”，预览确认后生成新版本。
      </p>
      <dl className="schedule-settings-values">
        <div>
          <dt>起始日期</dt>
          <dd>{plan.config.startDate}</dd>
        </div>
        <div>
          <dt>结束日期</dt>
          <dd>{plan.config.endDate}</dd>
        </div>
        <div>
          <dt>计划天数</dt>
          <dd>{planDays(plan.config.startDate, plan.config.endDate)} 天</dd>
        </div>
        <div>
          <dt>工作日每日容量</dt>
          <dd>{capacityLabel(false)}</dd>
        </div>
        <div>
          <dt>周末每日容量</dt>
          <dd>{capacityLabel(true)}</dd>
        </div>
      </dl>
      <h3>科目顺序</h3>
      <ol>
        {plan.config.coursePriority.map((id, index) => (
          <li key={id}>
            {plan.courseSummaries.find((course) => course.id === id)?.name || `科目 ${index + 1}`}
          </li>
        ))}
      </ol>
      <details>
        <summary>查看各日容量</summary>
        <ul>
          {plan.config.dayCapacities.map((item) => (
            <li key={item.day}>
              {item.day} · {durationLabel(item.capacityMinutes)}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
export function Preview({
  plan,
  onDone,
  onCancel,
}: {
  plan: Plan;
  onDone: () => void;
  onCancel: () => void;
}) {
  const preview = useReschedulePreview(plan.id);
  const confirm = useRescheduleConfirm(plan.id);
  const started = useRef(false);
  const requestLock = useRef(false);
  const [accept, setAccept] = useState(false);
  const [adjust, setAdjust] = useState<'time' | 'priority' | null>(null);
  const [work, setWork] = useState('');
  const [weekend, setWeekend] = useState('');
  const [priority, setPriority] = useState(plan.config.coursePriority);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      preview.mutate({ baseRevision: plan.revision });
    }
  }, [plan.revision, preview]);
  function repreview(body: RescheduleRequest) {
    if (requestLock.current) return;
    requestLock.current = true;
    setAccept(false);
    confirm.reset();
    preview.mutate(
      { ...preview.variables, ...body },
      {
        onSuccess: () => setAdjust(null),
        onSettled: () => {
          requestLock.current = false;
        },
      },
    );
  }
  const data = preview.data;
  const frozen = preview.isPending || confirm.isPending;
  return (
    <div className="schedule-dialog">
      <p>
        已完成任务、今天和未来的安排保持不动。逾期未完成任务由服务器从明天重新安排，不延长考试日期。
      </p>
      <p className="schedule-caption">预览仅保存预览资源，正式计划在确认后才改变。</p>
      {preview.isPending ? (
        <State loading />
      ) : preview.isError ? (
        <State
          error={preview.error}
          retry={() => repreview(preview.variables || { baseRevision: plan.revision })}
        />
      ) : (
        data && (
          <>
            <h3>将移动的任务</h3>
            {data.moves.length ? (
              <ul>
                {data.moves.map((move) => {
                  const original = plan.days
                    .flatMap((day) => day.segments)
                    .find((segment) => segment.id === move.segmentId);
                  return (
                    <li key={move.segmentId}>
                      {plan.tasks.find((task) => task.id === original?.taskId)?.title || '任务'}：
                      {move.fromDate} →{' '}
                      {move.toSegments.length
                        ? move.toSegments
                            .map(
                              (segment) =>
                                `${segment.scheduledOn || '未排入'}（${durationLabel(segment.minutes)}）`,
                            )
                            .join('、')
                        : '未排入'}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <>
                <p>暂无需要移动的任务。</p>
                <Button
                  variant="secondary"
                  onClick={() => repreview({ baseRevision: plan.revision })}
                >
                  重新预览
                </Button>
              </>
            )}
            <details>
              <summary>不动的已完成任务</summary>
              {plan.tasks.some((task) => task.completed) ? (
                <ul>
                  {plan.tasks
                    .filter((task) => task.completed)
                    .map((task) => (
                      <li key={task.id}>
                        <Check size={16} aria-hidden="true" />
                        {task.title}
                      </li>
                    ))}
                </ul>
              ) : (
                <p>暂无已完成任务。</p>
              )}
            </details>
            {data.gapMinutes > 0 && (
              <section className="schedule-warning">
                <p>
                  <AlertTriangle size={20} aria-hidden="true" />
                  缺口约 {wholeHours(data.gapHours)} 小时（{data.gapMinutes}{' '}
                  分钟），考试日期不会延长。
                </p>
                <div className="schedule-actions">
                  {data.options.includes('INCREASE_DAILY_TIME') && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAdjust('time');
                        setAccept(false);
                      }}
                    >
                      增加每日时长
                    </Button>
                  )}
                  {data.options.includes('CHANGE_COURSE_PRIORITY') && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAdjust('priority');
                        setAccept(false);
                      }}
                    >
                      调整科目优先级
                    </Button>
                  )}
                  {data.options.includes('ACCEPT_UNSCHEDULED') && (
                    <label className="schedule-task">
                      <input
                        type="checkbox"
                        checked={accept}
                        onChange={(event) => {
                          setAccept(event.target.checked);
                          setAdjust(null);
                        }}
                      />
                      接受溢出任务标记为“未排入”
                    </label>
                  )}
                </div>
              </section>
            )}
            {adjust === 'time' && (
              <section>
                <h3>调整逾期重排容量</h3>
                <div className="schedule-fields">
                  <label>
                    工作日每日小时
                    <input
                      type="number"
                      step="any"
                      value={work}
                      onChange={(event) => setWork(event.target.value)}
                    />
                  </label>
                  <label>
                    周末每日小时
                    <input
                      type="number"
                      step="any"
                      value={weekend}
                      onChange={(event) => setWeekend(event.target.value)}
                    />
                  </label>
                </div>
                <Button
                  loading={preview.isPending}
                  disabled={!work && !weekend}
                  disabledReason="请填写至少一种每日时长"
                  onClick={() =>
                    repreview({
                      baseRevision: plan.revision,
                      dayCapacities: plan.config.dayCapacities.map((item) => ({
                        ...item,
                        capacityMinutes:
                          item.day <= data.asOf
                            ? item.capacityMinutes
                            : (isWeekend(item.day) ? weekend : work) !== ''
                              ? Number(isWeekend(item.day) ? weekend : work) * 60
                              : item.capacityMinutes,
                      })),
                    })
                  }
                >
                  重新预览
                </Button>
              </section>
            )}
            {adjust === 'priority' && (
              <section>
                <h3>科目优先级</h3>
                <Priority ids={priority} plan={plan} setIds={setPriority} />
                <Button
                  onClick={() =>
                    repreview({ baseRevision: plan.revision, coursePriority: priority })
                  }
                >
                  重新预览
                </Button>
              </section>
            )}
          </>
        )
      )}
      {confirm.isError && <p role="alert">{confirm.error.message}。如预览已失效，请重新预览。</p>}
      <div className="schedule-actions schedule-dialog-footer">
        <Button
          disabled={
            !data ||
            preview.isError ||
            confirm.isError ||
            preview.isPending ||
            (data.gapMinutes > 0 && !accept) ||
            adjust !== null
          }
          disabledReason={
            !data || preview.isError || preview.isPending || confirm.isError
              ? '请先取得有效预览'
              : adjust
                ? '修改后请先重新预览'
                : '请调整方案或明确接受未排入任务'
          }
          loading={confirm.isPending}
          loadingLabel="正在确认顺延"
          onClick={() => {
            if (data && !confirm.isPending)
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
                { onSuccess: onDone },
              );
          }}
        >
          确认顺延
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        {confirm.isError && (
          <Button
            variant="secondary"
            disabled={frozen}
            disabledReason="正在处理请求"
            onClick={() => {
              setAdjust(null);
              repreview({ baseRevision: plan.revision });
            }}
          >
            重新预览
          </Button>
        )}
      </div>
    </div>
  );
}
