import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  fitnessApi,
  shiftDate,
  useFitnessMutation,
  useFitnessHistory,
  type ImportWeek,
} from '../../api/fitness';
import { Button } from '../../components/Button';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { Modal } from '../../components/Modal';
import { createUuid } from '../../utils/uuid';
import { EditorPageFrame, ExerciseFields, FoodFields, mealNames } from './Editor';
import { createFirstWeek, firstWeekStartDate, type FirstWeekDay } from './first-week';
import { ExerciseMotion } from './motion/ExerciseMotion';
import { UnsavedGuard } from '../../components/UnsavedGuard';

export function FirstWeekPlan({ page = false }: { page?: boolean }) {
  const navigate = useNavigate();
  const Wrapper = page ? EditorPageFrame : Modal;
  const [draft, setDraft] = useState<FirstWeekDay[] | null>(null);
  const [startDate, setStartDate] = useState(firstWeekStartDate);
  const source = useFitnessHistory(firstWeekStartDate, shiftDate(firstWeekStartDate, 6), page);
  useEffect(() => {
    if (source.data) {
      const saved = createFirstWeek(source.data);
      if (saved.length === 7) setDraft((current) => current ?? saved);
    }
  }, [source.data]);
  const [active, setActive] = useState(0);
  const [view, setView] = useState<'training' | 'meals'>('training');
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const attempt = useRef<{ key: string; body: ImportWeek } | null>(null);
  const mutation = useFitnessMutation();
  const confirm = useConfirmation();
  const changed = () => {
    setDirty(true);
    attempt.current = null;
    setMessage('');
  };
  const patch = (value: Partial<FirstWeekDay>) => {
    setDraft((rows) => rows!.map((row, i) => (i === active ? { ...row, ...value } : row)));
    changed();
  };
  const close = async () => {
    if (
      !mutation.isPending &&
      (!dirty || (await confirm('离开第一周计划？尚未保存的修改会被放弃。')))
    ) {
      flushSync(() => {
        setDraft(null);
        setDirty(false);
      });
      if (page) navigate('/fitness/templates');
    }
  };
  const save = async () => {
    if (!draft) return;
    setMessage('');
    try {
      await mutation.mutateAsync(async () => {
        if (!attempt.current) {
          const existing = await fitnessApi.history(startDate, shiftDate(startDate, 6));
          const occupied = existing.filter(
            (d) => d.records['training-plan']?.data || d.records['meal-plan']?.data,
          );
          if (
            occupied.length &&
            !(await confirm(
              `${occupied.map((d) => d.date).join('、')} 已有训练或食谱计划。确定用当前第一周内容覆盖这7天的计划？实际训练、饮食、体重和打卡会保留。`,
            ))
          )
            return false;
          attempt.current = {
            key: createUuid(),
            body: {
              startDate,
              days: draft.map((day, i) => ({
                training: day.training,
                meals: day.meals,
                expectedTrainingRevision: existing[i].records['training-plan']?.revision ?? -1,
                expectedMealRevision: existing[i].records['meal-plan']?.revision ?? -1,
              })),
            },
          };
        }
        const response = await fitnessApi.importWeek(attempt.current.body, attempt.current.key);
        setSaved(startDate);
        flushSync(() => {
          setDraft(null);
          setDirty(false);
        });
        if (page) navigate(`/fitness/training?date=${startDate}`);
        return response;
      });
    } catch (error) {
      // A version conflict is definitive; refresh versions only after the user chooses to retry.
      const e = error as Error & { status?: number; response?: { status?: number } };
      if (e.status === 409 || e.response?.status === 409) attempt.current = null;
      setMessage(e.message || '保存失败，请重试。未保存的编辑仍在。');
    }
  };
  const day = draft?.[active];
  return (
    <>
      {!page && (
        <section className="first-week-entry">
          <div>
            <p className="eyebrow">你的第一周</p>
            <h2>训练 + 三餐，按天执行</h2>
            <p className="secondary">
              查看账号中已保存的第一周训练、三餐与加餐，以及采购、记录和复盘说明。
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              navigate('/fitness/first-week');
              setActive(0);
              setView('training');
              setEditing(false);
              setDirty(false);
              setMessage('');
              attempt.current = null;
            }}
          >
            查看第一周计划
          </Button>
        </section>
      )}
      {page && !draft && (
        <p role={source.error ? 'alert' : 'status'}>
          {source.isPending
            ? '正在读取已保存的第一周计划…'
            : source.error
              ? '读取失败，请重新打开页面。'
              : '第一周尚未保存完整的7天训练与食谱，请先在日期计划中补齐。'}
        </p>
      )}
      {saved && (
        <p role="status" className="platform-notice">
          已保存 {saved} 至 {shiftDate(saved, 6)} 的训练与食谱。
          <Link to={`/fitness/training?date=${saved}`}>查看 / 修改训练</Link> ·{' '}
          <Link to={`/fitness/meals?date=${saved}`}>查看 / 修改食谱</Link>
        </p>
      )}
      {draft && day && (
        <Wrapper open title="第一周训练与食谱" onClose={close}>
          <form
            className="platform-form first-week-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <UnsavedGuard dirty={dirty} />
            <fieldset disabled={mutation.isPending}>
              <label>
                Day 1 开始日期
                <input
                  type="date"
                  required
                  min="1900-01-01"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    changed();
                  }}
                />
              </label>
              <p className="secondary">
                这里读取账号中已保存的第一周安排。长期目标不作为一周目标；第二周等实际记录后再调整。修改并保存只更新计划，不生成实际记录或打卡。
              </p>
              <details className="planning-column">
                <summary>查看采购、备餐与每日记录说明</summary>
                <p className="first-week-note">{draft[0].meals.note}</p>
                <h3>第7天复盘</h3>
                <p className="first-week-note">{draft[6].training.note}</p>
              </details>
              <div className="week-template-tabs first-week-tabs">
                {draft.map((d, i) => (
                  <button
                    type="button"
                    key={i}
                    aria-pressed={active === i}
                    onClick={async () => {
                      setActive(i);
                      setEditing(false);
                    }}
                  >
                    <strong>Day {i + 1}</strong>
                    <small>{startDate ? shiftDate(startDate, i) : '选择日期'}</small>
                  </button>
                ))}
              </div>
              <div className="section-title">
                <h3>
                  Day {active + 1} · {day.title}
                </h3>
                <div className="row">
                  <Button
                    variant={view === 'training' ? 'primary' : 'ghost'}
                    type="button"
                    onClick={async () => {
                      setView('training');
                      setEditing(false);
                    }}
                  >
                    训练步骤
                  </Button>
                  <Button
                    variant={view === 'meals' ? 'primary' : 'ghost'}
                    type="button"
                    onClick={async () => {
                      setView('meals');
                      setEditing(false);
                    }}
                  >
                    三餐与加餐
                  </Button>
                </div>
              </div>
              <Button variant="secondary" type="button" onClick={() => setEditing(!editing)}>
                {editing ? '返回当天说明' : view === 'training' ? '修改当天训练' : '修改当天食谱'}
              </Button>
              {view === 'training' ? (
                <>
                  {editing ? (
                    <>
                      <label className="check-field">
                        <input
                          type="checkbox"
                          checked={day.training.rest}
                          onChange={(e) =>
                            patch({
                              training: {
                                ...day.training,
                                rest: e.target.checked,
                                exercises: e.target.checked ? [] : day.training.exercises,
                              },
                            })
                          }
                        />
                        休息安排
                      </label>
                      {!day.training.rest && (
                        <ExerciseFields
                          rows={day.training.exercises}
                          onChange={(exercises) =>
                            patch({ training: { ...day.training, exercises } })
                          }
                        />
                      )}
                      <label>
                        当天训练说明
                        <textarea
                          maxLength={2000}
                          value={day.training.note ?? ''}
                          onChange={(e) =>
                            patch({ training: { ...day.training, note: e.target.value || null } })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <p className="first-week-note">{day.training.note}</p>
                      {!day.training.rest && (
                        <ol className="first-week-steps">
                          {day.training.exercises.map((item) => (
                            <li key={item.id}>
                              <div className="exercise-motion-heading">
                                <strong>{item.name}</strong>
                                <ExerciseMotion exercise={item} />
                              </div>
                              <p className="first-week-dose">
                                {item.type === 'STRENGTH'
                                  ? `${item.sets ?? '—'}组${item.reps ? ` × ${item.reps}次` : ' · 次数/保持时间见说明'}${item.kg != null ? ` · ${item.kg}kg` : ' · 重量见说明或自行填写'}`
                                  : item.minutes != null
                                    ? `${item.minutes}分钟`
                                    : '时长见说明'}
                              </p>
                              <p>{item.note}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  {editing ? (
                    <>
                      <FoodFields
                        rows={day.meals.foods}
                        onChange={(foods) => patch({ meals: { ...day.meals, foods } })}
                      />
                      <label>
                        当天食谱说明
                        <textarea
                          maxLength={2000}
                          value={day.meals.note ?? ''}
                          onChange={(e) =>
                            patch({ meals: { ...day.meals, note: e.target.value || null } })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <p className="first-week-note">{day.meals.note}</p>
                      <div className="first-week-meals">
                        {(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const).map((meal) => (
                          <section key={meal}>
                            <h4>{mealNames[meal]}</h4>
                            {day.meals.foods
                              .filter((f) => f.meal === meal)
                              .map((f, i) => (
                                <div className="first-week-food" key={i}>
                                  <strong>{f.name}</strong>
                                  <span>
                                    {f.quantity != null
                                      ? `${f.quantity}${f.unit}`
                                      : '份量按说明 / 可填写'}
                                  </span>
                                  {f.note && <p>{f.note}</p>}
                                </div>
                              ))}
                          </section>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </fieldset>
            {message && (
              <p role="alert" className="status-error">
                {message} 可再次保存；并发修改时请确认是否覆盖最新计划。
              </p>
            )}
            <div className="form-actions first-week-actions">
              <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
                关闭
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                保存7天训练与食谱
              </Button>
            </div>
          </form>
        </Wrapper>
      )}
    </>
  );
}
