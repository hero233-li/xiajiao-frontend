import { createUuid } from '../../utils/uuid';
import { useState } from 'react';
import { UnsavedGuard } from './UnsavedGuard';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import {
  fitnessApi,
  useFitnessList,
  useFitnessMutation,
  type Entry,
  type TrainingPlan,
  type Meals,
  type Day,
  type Models,
  shiftDate,
} from '../../api/fitness';
import { ExerciseFields, FoodFields } from './Editor';
type TemplateKind = 'training-template' | 'meal-template' | 'week-template';
interface TemplateDraft {
  name: string;
  plans: TrainingPlan[];
  meal: Meals;
}
export function TemplateManager({
  kind,
  date,
  days,
}: {
  kind: TemplateKind;
  date: string;
  days?: Day[];
}) {
  const query = useFitnessList(kind);
  const mutation = useFitnessMutation();
  const [entry, setEntry] = useState<Entry<TemplateKind> | null>(null);
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [active, setActive] = useState(0);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saveKey, setSaveKey] = useState(() => createUuid());
  const patch = (p: Partial<TemplateDraft>) => {
    setDraft((d) => ({ ...d!, ...p }));
    setDirty(true);
    setSaveKey(createUuid());
  };
  const open = (e: Entry<TemplateKind>) => {
    setEntry(e);
    setDirty(false);
    const data = e.data!;
    setDraft({
      name: data.name,
      plans:
        e.kind === 'week-template'
          ? (data as Models['week-template']).days
          : e.kind === 'training-template'
            ? [(data as Models['training-template']).plan]
            : [],
      meal:
        e.kind === 'meal-template'
          ? (data as Models['meal-template']).plan
          : { foods: [], note: null },
    });
    setActive(0);
    setMessage('');
    setSaveKey(createUuid());
  };
  const close = () => {
    if (!mutation.isPending && (!dirty || window.confirm('关闭模板编辑？尚未保存的改动会被放弃。')))
      setDraft(null);
  };
  const createWeek = () => {
    if (!days || days.length !== 7 || days.some((d) => !d.records['training-plan']?.data)) {
      setMessage('请先为这一周的7天分别安排训练或休息，再保存周模板。');
      return;
    }
    setEntry(null);
    setDirty(false);
    setDraft({
      name: '',
      plans: days.map((d) => structuredClone(d.records['training-plan']!.data!)),
      meal: { foods: [], note: null },
    });
    setActive(0);
    setSaveKey(createUuid());
  };
  const apply = async (e: Entry<TemplateKind>) => {
    setMessage('');
    try {
      if (kind === 'week-template') {
        const current = await fitnessApi.history(date, shiftDate(date, 6));
        if (
          current.some((d) => d.records['training-plan']?.data) &&
          !window.confirm(`为 ${date} 起的7天生成安排，会覆盖已有计划；实际记录保留。确定继续？`)
        )
          return;
        await mutation.mutateAsync(() =>
          fitnessApi.generateWeek(
            e.key,
            date,
            current.map((d) => d.records['training-plan']?.revision ?? -1),
          ),
        );
      } else {
        const destination = kind === 'training-template' ? 'training-plan' : 'meal-plan';
        const existing = await fitnessApi.get(destination, date);
        if (existing?.data && !window.confirm(`${date} 已有计划，确定用此模板覆盖？实际记录保留。`))
          return;
        await mutation.mutateAsync(() =>
          fitnessApi.copy(kind, e.key, date, existing?.revision ?? -1),
        );
      }
      setMessage('模板已生成独立日期安排。');
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  return (
    <section className="platform-section">
      <div className="section-title">
        <h2>
          {kind === 'week-template'
            ? '个人周训练模板'
            : kind === 'training-template'
              ? '个人训练模板'
              : '个人食谱模板'}
        </h2>
        {kind === 'week-template' && (
          <Button variant="secondary" onClick={createWeek}>
            当前周存为模板
          </Button>
        )}
      </div>
      {message && !draft && (
        <p role="status" className="platform-notice">
          {message}
        </p>
      )}
      {query.isPending ? (
        <p role="status">正在读取模板…</p>
      ) : query.error ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => query.refetch()}>重新读取模板</Button>
        </div>
      ) : (
        <>
          {query.data?.length ? (
            query.data.map(
              (e) =>
                e.data && (
                  <div key={e.key} className="template-row">
                    <div>
                      <strong>{e.data.name}</strong>
                      <small>个人维护 · 复制为独立快照</small>
                    </div>
                    <Button
                      variant="secondary"
                      loading={mutation.isPending}
                      onClick={() => void apply(e)}
                    >
                      应用到 {date}
                      {kind === 'week-template' ? ' 起的一周' : ''}
                    </Button>
                    <Button variant="ghost" onClick={() => open(e)}>
                      编辑模板
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={mutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `确定删除模板“${e.data!.name}”？已生成的日期安排和实际记录会保留。`,
                          )
                        )
                          void mutation
                            .mutateAsync(() => fitnessApi.delete(e))
                            .catch((error) => setMessage(error.message));
                      }}
                    >
                      删除模板
                    </Button>
                  </div>
                ),
            )
          ) : (
            <p className="inline-empty">
              还没有模板。
              {kind === 'week-template'
                ? '安排完整一周后，可保存为周模板。'
                : '编辑日期计划后，可存为模板反复使用。'}
            </p>
          )}
          {query.hasMore && (
            <Button variant="ghost" onClick={() => query.loadMore()}>
              加载更多模板
            </Button>
          )}
        </>
      )}
      {draft && (
        <Modal open title={entry ? '编辑个人模板' : '保存周训练模板'} onClose={close}>
          <form
            className="platform-form"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage('');
              const key = entry?.key ?? saveKey;
              let data: Models[TemplateKind];
              if (kind === 'meal-template') data = { name: draft.name, plan: draft.meal };
              else if (kind === 'week-template') data = { name: draft.name, days: draft.plans };
              else data = { name: draft.name, plan: draft.plans[0] };
              void mutation
                .mutateAsync(() =>
                  fitnessApi.save(kind, key, data, entry?.revision ?? -1, undefined, saveKey),
                )
                .then(() => {
                  setDraft(null);
                  setMessage('模板已保存，过去的安排和实际记录保持不变。');
                })
                .catch((error) => setMessage(error.message));
            }}
          >
            <UnsavedGuard dirty={dirty} />
            <fieldset disabled={mutation.isPending}>
              <label>
                模板名称
                <input
                  required
                  maxLength={160}
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </label>
              {kind === 'meal-template' ? (
                <FoodFields
                  rows={draft.meal.foods}
                  onChange={(foods) => patch({ meal: { ...draft.meal, foods } })}
                />
              ) : (
                <>
                  {kind === 'week-template' && (
                    <div className="week-template-tabs">
                      {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((label, i) => (
                        <button
                          type="button"
                          key={i}
                          aria-pressed={i === active}
                          onClick={() => setActive(i)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={draft.plans[active].rest}
                      onChange={(e) =>
                        patch({
                          plans: draft.plans.map((p, i) =>
                            i === active
                              ? {
                                  ...p,
                                  rest: e.target.checked,
                                  exercises: e.target.checked ? [] : p.exercises,
                                }
                              : p,
                          ),
                        })
                      }
                    />
                    休息安排
                  </label>
                  {!draft.plans[active].rest && (
                    <ExerciseFields
                      rows={draft.plans[active].exercises}
                      onChange={(exercises) =>
                        patch({
                          plans: draft.plans.map((p, i) =>
                            i === active ? { ...p, exercises } : p,
                          ),
                        })
                      }
                    />
                  )}
                </>
              )}
            </fieldset>
            {message && (
              <p role="alert" className="status-error">
                {message}
              </p>
            )}
            <div className="form-actions">
              <Button variant="ghost" type="button" onClick={close}>
                取消
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                保存模板
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
