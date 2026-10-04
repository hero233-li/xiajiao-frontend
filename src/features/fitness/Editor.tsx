import { createUuid } from '../../utils/uuid';
import { useEffect, useState, useRef } from 'react';
import { useBlocker, useBeforeUnload } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import {
  fitnessApi,
  useFitnessMutation,
  localToday,
  type Kind,
  type Models,
  type Entry,
  type Exercise,
  type Food,
  type Goal,
  type Weight,
  type TrainingPlan,
  type Training,
  type Meals,
  type Checkin,
  type Water,
  type Profile,
} from '../../api/fitness';
export const goalNames = { LOSE: '减重', GAIN: '增重', MAINTAIN: '维持' };
export const trainingNames = {
  COMPLETED: '完成',
  PARTIAL: '部分完成',
  SKIPPED: '跳过',
  REST: '休息',
};
export const mealNames = { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '加餐' };
export const exerciseNames = {
  STRENGTH: '力量',
  CARDIO: '有氧',
  MOBILITY: '灵活性',
  OTHER: '其他',
};
export type Editable = Exclude<Kind, 'training-template' | 'meal-template' | 'week-template'>;
export interface EditSpec {
  kind: Editable;
  key: string;
  entry?: Entry;
  initial?: Models[Editable];
  goalRevision?: number;
}
type Draft = Goal & Weight & TrainingPlan & Training & Meals & Checkin & Water & Profile;
const defaults: Record<Editable, unknown> = {
  goal: {
    type: 'MAINTAIN',
    startDate: localToday(),
    startWeight: null,
    targetWeight: null,
    targetDate: null,
    note: null,
  },
  weight: { kg: null, note: null },
  'training-plan': { rest: false, exercises: [], note: null },
  training: { status: 'COMPLETED', exercises: [], note: null, planSnapshot: null },
  'meal-plan': { foods: [], note: null },
  meals: { foods: [], note: null },
  checkin: { sleepHours: null, feeling: null, note: null },
  water: { ml: null },
  profile: { displayName: '', bio: null, compact: false, weekStartsMonday: true },
};
export const titles: Record<Editable, string> = {
  goal: '设置新目标',
  weight: '体重记录',
  'training-plan': '训练安排',
  training: '实际训练',
  'meal-plan': '食谱计划',
  meals: '实际饮食',
  checkin: '每日打卡',
  water: '饮水记录',
  profile: '个人资料与偏好',
};
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100000,
  step = 'any',
  required = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        required={required}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </label>
  );
}
export function ExerciseFields({
  rows,
  onChange,
  actual = false,
}: {
  rows: Exercise[];
  onChange: (rows: Exercise[]) => void;
  actual?: boolean;
}) {
  const change = (i: number, patch: Partial<Exercise>) =>
    onChange(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  return (
    <div className="editor-rows">
      {rows.map((row, i) => (
        <fieldset key={i}>
          <legend>项目 {i + 1}</legend>
          <div className="form-grid">
            <label>
              动作名称
              <input
                required
                maxLength={160}
                value={row.name}
                onChange={(e) => change(i, { name: e.target.value })}
              />
            </label>
            <label>
              项目类型
              <select
                value={row.type}
                onChange={(e) =>
                  change(i, {
                    type: e.target.value as Exercise['type'],
                    sets: null,
                    reps: null,
                    kg: null,
                    minutes: null,
                    km: null,
                  })
                }
              >
                {Object.entries(exerciseNames).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {row.type === 'STRENGTH' ? (
              <>
                <NumberField
                  label="组数"
                  value={row.sets}
                  min={1}
                  max={100}
                  step="1"
                  onChange={(sets) => change(i, { sets })}
                />
                <NumberField
                  label="次数"
                  value={row.reps}
                  min={1}
                  max={10000}
                  step="1"
                  onChange={(reps) => change(i, { reps })}
                />
                <NumberField
                  label="重量（kg）"
                  value={row.kg}
                  max={2000}
                  onChange={(kg) => change(i, { kg })}
                />
              </>
            ) : (
              <>
                <NumberField
                  label="时长（分钟）"
                  value={row.minutes}
                  max={1440}
                  onChange={(minutes) => change(i, { minutes })}
                />
                {row.type === 'CARDIO' && (
                  <NumberField
                    label="距离（km）"
                    value={row.km}
                    max={1000}
                    onChange={(km) => change(i, { km })}
                  />
                )}
              </>
            )}
            <label className="full-field">
              项目备注
              <input
                maxLength={2000}
                value={row.note ?? ''}
                onChange={(e) => change(i, { note: e.target.value || null })}
              />
            </label>
          </div>
          {actual && (
            <label className="check-field">
              <input
                type="checkbox"
                checked={row.completed === true}
                onChange={(e) => change(i, { completed: e.target.checked })}
              />
              项目 {i + 1} 已完成
            </label>
          )}
          <div className="row">
            <Button
              type="button"
              variant="ghost"
              disabled={i === 0}
              onClick={() => {
                const next = [...rows];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
            >
              上移
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={i === rows.length - 1}
              onClick={() => {
                const next = [...rows];
                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                onChange(next);
              }}
            >
              下移
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(rows.filter((_, n) => n !== i))}
            >
              移除项目 {i + 1}
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...rows,
            {
              id: createUuid(),
              name: '',
              type: 'STRENGTH',
              sets: null,
              reps: null,
              kg: null,
              minutes: null,
              km: null,
              note: null,
              completed: actual ? false : null,
            },
          ])
        }
      >
        添加自定义动作
      </Button>
      <p className="help">按类型填写需要的字段，留空表示未记录。</p>
    </div>
  );
}
export function FoodFields({ rows, onChange }: { rows: Food[]; onChange: (rows: Food[]) => void }) {
  const change = (i: number, patch: Partial<Food>) =>
    onChange(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  return (
    <div className="editor-rows">
      {rows.map((row, i) => (
        <fieldset key={i}>
          <legend>食物 {i + 1}</legend>
          <div className="form-grid">
            <label>
              餐次
              <select
                value={row.meal}
                onChange={(e) => change(i, { meal: e.target.value as Food['meal'] })}
              >
                {Object.entries(mealNames).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              食物名称
              <input
                required
                maxLength={160}
                value={row.name}
                onChange={(e) => change(i, { name: e.target.value })}
              />
            </label>
            <NumberField
              label="份量"
              value={row.quantity}
              min={0.001}
              onChange={(quantity) => change(i, { quantity })}
            />
            <label>
              单位
              <input
                maxLength={32}
                required={row.quantity != null}
                placeholder="如：克、碗、份"
                value={row.unit ?? ''}
                onChange={(e) => change(i, { unit: e.target.value || null })}
              />
            </label>
            <label className="full-field">
              食物备注
              <input
                maxLength={2000}
                value={row.note ?? ''}
                onChange={(e) => change(i, { note: e.target.value || null })}
              />
            </label>
          </div>
          <details>
            <summary>可选营养数据（自行填写）</summary>
            <div className="form-grid">
              <NumberField
                label="热量（kcal）"
                value={row.kcal}
                onChange={(kcal) => change(i, { kcal })}
              />
              <NumberField
                label="蛋白质（g）"
                value={row.protein}
                max={10000}
                onChange={(protein) => change(i, { protein })}
              />
              <NumberField
                label="碳水（g）"
                value={row.carbs}
                max={10000}
                onChange={(carbs) => change(i, { carbs })}
              />
              <NumberField
                label="脂肪（g）"
                value={row.fat}
                max={10000}
                onChange={(fat) => change(i, { fat })}
              />
            </div>
          </details>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(rows.filter((_, n) => n !== i))}
          >
            移除食物 {i + 1}
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...rows,
            {
              meal: 'BREAKFAST',
              name: '',
              quantity: null,
              unit: null,
              kcal: null,
              protein: null,
              carbs: null,
              fat: null,
              note: null,
            },
          ])
        }
      >
        添加食物
      </Button>
      <p className="help">没有接入营养数据库。未填写的营养数值按未知处理。</p>
    </div>
  );
}
export function FitnessEditor({
  spec,
  onClose,
  onSaved,
}: {
  spec: EditSpec;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(
    () => structuredClone(spec.initial ?? spec.entry?.data ?? defaults[spec.kind]) as Draft,
  );
  const [dirty, setDirty] = useState(false);
  const [saveKey, setSaveKey] = useState(() => createUuid());
  const [date, setDate] = useState(spec.key);
  const [entry, setEntry] = useState(spec.entry);
  const [checking, setChecking] = useState(false);
  const [checkedDate, setCheckedDate] = useState(spec.key);
  const dateRequest = useRef(0);
  const [error, setError] = useState('');
  const mutation = useFitnessMutation();
  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
    setSaveKey(createUuid());
  };
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('表单尚未保存，确定离开？')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useBeforeUnload((e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  const close = () => {
    if (!mutation.isPending && (!dirty || window.confirm('当前内容尚未保存，确定放弃？')))
      onClose();
  };
  const daily = !['goal', 'profile'].includes(spec.kind);
  const actual = !['training-plan', 'meal-plan'].includes(spec.kind);
  const chooseDate = async (value: string) => {
    setDate(value);
    setCheckedDate('');
    setSaveKey(createUuid());
    const requestId = ++dateRequest.current;
    if (!value) {
      setError('请选择记录日期');
      return;
    }
    setChecking(true);
    setError('');
    try {
      const existing = await fitnessApi.get(spec.kind, value);
      if (requestId === dateRequest.current) {
        setEntry(existing ?? undefined);
        setCheckedDate(value);
      }
    } catch (e) {
      if (requestId === dateRequest.current) setError((e as Error).message);
    } finally {
      if (requestId === dateRequest.current) setChecking(false);
    }
  };
  return (
    <Modal open title={`${entry?.data ? '修改' : '创建'}${titles[spec.kind]}`} onClose={close}>
      <form
        className="platform-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (checking || mutation.isPending || checkedDate !== date) return;
          setError('');
          const key = spec.kind === 'goal' ? spec.key : date;
          void mutation
            .mutateAsync(() =>
              fitnessApi.save(
                spec.kind,
                key,
                draft,
                entry?.revision ?? -1,
                spec.goalRevision,
                saveKey,
              ),
            )
            .then(() => {
              setDirty(false);
              onClose();
              onSaved?.();
            })
            .catch((e) => setError(e.message));
        }}
      >
        <fieldset disabled={mutation.isPending || checking}>
          {daily && (
            <label>
              记录日期
              <input
                type="date"
                required
                min="1900-01-01"
                max={actual ? localToday() : undefined}
                value={date}
                onChange={(e) => {
                  setDirty(true);
                  void chooseDate(e.target.value);
                }}
              />
            </label>
          )}
          {checking && <p role="status">正在检查日期…</p>}
          {daily && entry?.data && (
            <p className="editor-notice">
              该日期已有{titles[spec.kind]}。保存将修改这条记录，不会新增重复记录。
            </p>
          )}
          {spec.kind === 'goal' && (
            <>
              <div className="form-grid">
                <label>
                  目标类型
                  <select
                    value={draft.type}
                    onChange={(e) => patch({ type: e.target.value as Goal['type'] })}
                  >
                    {Object.entries(goalNames).map(([v, n]) => (
                      <option key={v} value={v}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  起始日期
                  <input
                    type="date"
                    required
                    value={draft.startDate}
                    onChange={(e) => patch({ startDate: e.target.value })}
                  />
                </label>
                <NumberField
                  label="起始体重（kg）"
                  required
                  min={0.001}
                  max={999999}
                  value={draft.startWeight}
                  onChange={(v) => patch({ startWeight: v as number })}
                />
                <NumberField
                  label="目标体重（kg）"
                  required
                  min={0.001}
                  max={999999}
                  value={draft.targetWeight}
                  onChange={(v) => patch({ targetWeight: v as number })}
                />
                <label>
                  目标日期（可选）
                  <input
                    type="date"
                    min={draft.startDate}
                    value={draft.targetDate ?? ''}
                    onChange={(e) => patch({ targetDate: e.target.value || null })}
                  />
                </label>
              </div>
              <p className="help">
                维持目标请填写相同的起始、目标体重。每次调整保存为新目标，历史保持原样。
              </p>
            </>
          )}
          {spec.kind === 'weight' && (
            <NumberField
              label="体重（kg）"
              required
              min={0.001}
              max={999999}
              value={draft.kg}
              onChange={(v) => patch({ kg: v as number })}
            />
          )}
          {spec.kind === 'training-plan' && (
            <label className="check-field">
              <input
                type="checkbox"
                checked={draft.rest}
                onChange={(e) =>
                  patch({
                    rest: e.target.checked,
                    exercises: e.target.checked ? [] : draft.exercises,
                  })
                }
              />
              安排为休息日
            </label>
          )}
          {spec.kind === 'training' && (
            <label>
              训练状态
              <select
                value={draft.status}
                onChange={(e) =>
                  patch({
                    status: e.target.value as Training['status'],
                    exercises: e.target.value === 'REST' ? [] : draft.exercises,
                  })
                }
              >
                {Object.entries(trainingNames).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
          {((spec.kind === 'training-plan' && !draft.rest) ||
            (spec.kind === 'training' && draft.status !== 'REST')) && (
            <ExerciseFields
              rows={draft.exercises}
              actual={spec.kind === 'training'}
              onChange={(exercises) => patch({ exercises })}
            />
          )}
          {['meal-plan', 'meals'].includes(spec.kind) && (
            <FoodFields rows={draft.foods} onChange={(foods) => patch({ foods })} />
          )}
          {spec.kind === 'checkin' && (
            <>
              <div className="form-grid">
                <NumberField
                  label="睡眠时长（小时，可选）"
                  value={draft.sleepHours}
                  max={24}
                  onChange={(sleepHours) => patch({ sleepHours })}
                />
                <label>
                  主观状态
                  <select
                    value={draft.feeling ?? ''}
                    onChange={(e) =>
                      patch({ feeling: e.target.value ? Number(e.target.value) : null })
                    }
                  >
                    <option value="">未填写</option>
                    <option value="1">1 · 疲惫</option>
                    <option value="2">2 · 偏低</option>
                    <option value="3">3 · 平稳</option>
                    <option value="4">4 · 良好</option>
                    <option value="5">5 · 精力充沛</option>
                  </select>
                </label>
              </div>
              <p className="help">打卡是独立记录，无需先填满训练、饮食或体重。</p>
            </>
          )}
          {spec.kind === 'water' && (
            <NumberField
              label="饮水量（ml）"
              required
              max={20000}
              step="1"
              value={draft.ml}
              onChange={(v) => patch({ ml: v as number })}
            />
          )}
          {spec.kind === 'profile' && (
            <>
              <label>
                显示名称
                <input
                  required
                  maxLength={80}
                  value={draft.displayName}
                  onChange={(e) => patch({ displayName: e.target.value })}
                />
              </label>
              <label>
                个人介绍
                <textarea
                  maxLength={2000}
                  value={draft.bio ?? ''}
                  onChange={(e) => patch({ bio: e.target.value || null })}
                />
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={draft.compact}
                  onChange={(e) => patch({ compact: e.target.checked })}
                />
                紧凑显示
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={draft.weekStartsMonday}
                  onChange={(e) => patch({ weekStartsMonday: e.target.checked })}
                />
                日历从周一开始
              </label>
            </>
          )}
          {!['water', 'profile'].includes(spec.kind) && (
            <label>
              备注 / 每日感受
              <textarea
                rows={3}
                maxLength={2000}
                value={draft.note ?? ''}
                onChange={(e) => patch({ note: e.target.value || null })}
              />
            </label>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="status-error">
            {error}
            {error.includes('修订') || error.includes('已存在')
              ? '。草稿已保留；请关闭后重新读取记录，再应用修改。'
              : ''}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={close} disabled={mutation.isPending}>
            取消
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={checking || checkedDate !== date}
          >
            保存{titles[spec.kind]}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
