import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  fitnessApi,
  localToday,
  shiftDate,
  useFitnessDay,
  useFitnessHistory,
  useFitnessList,
  useFitnessMutation,
  useFitnessStats,
  useFitnessSummary,
  type Entry,
  type Kind,
  type Meals,
  type Models,
} from '../api/fitness';
import { Button } from '../components/Button';
import { useConfirmation } from '../components/ConfirmationProvider';
import { Modal } from '../components/Modal';
import { FitnessEditor, titles, type Editable, type EditSpec } from '../features/fitness/Editor';
import { FitnessEditPage } from '../features/fitness/EditPage';
import { FirstWeekPlan } from '../features/fitness/FirstWeekPlan';
import { TemplateManager } from '../features/fitness/Templates';
import { UnsavedGuard } from '../features/fitness/UnsavedGuard';
import { createUuid } from '../utils/uuid';

import { monday, present, State } from '../features/fitness/display';
import { GoalsSection } from '../features/fitness/GoalsSection';
import { HistorySection } from '../features/fitness/HistorySection';
import { MealsSection } from '../features/fitness/MealsSection';
import { TodaySection } from '../features/fitness/TodaySection';
import { TrainingSection } from '../features/fitness/TrainingSection';
import { WeightSection } from '../features/fitness/WeightSection';
const labels: Record<string, string> = {
  today: '健身今天',
  templates: '模板库',
  goals: '目标管理',
  training: '训练计划',
  meals: '食谱与饮食',
  weight: '体重记录',
  history: '打卡与历史',
};
export function useFitnessWorkspace() {
  const confirm = useConfirmation();
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.split('/')[2] || 'today';
  const [params, setParams] = useSearchParams();
  const requested = params.get('date') || localToday();
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(requested) && !Number.isNaN(Date.parse(requested))
      ? requested
      : localToday();
  const setDate = (value: string) => setParams({ date: value });
  const summary = useFitnessSummary();
  const day = useFitnessDay(date);
  const start = monday(date),
    monthStart = date.slice(0, 7) + '-01',
    monthEnd = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0, 12))
      .toISOString()
      .slice(0, 10);
  const [period, setPeriod] = useState<'month' | 'week'>('month');
  const from =
    section === 'training'
      ? start
      : section === 'weight' || section === 'goals'
        ? shiftDate(section === 'goals' ? localToday() : date, -29)
        : period === 'week'
          ? start
          : monthStart;
  const to =
    section === 'training'
      ? shiftDate(start, 6)
      : section === 'weight' || section === 'goals'
        ? section === 'goals'
          ? localToday()
          : date
        : period === 'week'
          ? shiftDate(start, 6)
          : monthEnd;
  const history = useFitnessHistory(
    from,
    to,
    ['training', 'weight', 'goals', 'history', 'templates'].includes(section),
  );
  const statistics = useFitnessStats(from, to, section === 'history');
  const goals = useFitnessList('goal');
  const profile = useFitnessList('profile');
  const [edit, setEdit] = useState<EditSpec | null>(null);
  const [copy, setCopy] = useState<{
    kind: 'training-plan' | 'meal-plan';
    mode: 'copy' | 'template';
    sourceKind?: Kind;
    sourceKey?: string;
    data: Models['training-plan'] | Meals;
  } | null>(null);
  const [destination, setDestination] = useState(date);
  const [templateName, setTemplateName] = useState('');
  const [notice, setNotice] = useState('');
  const [copyDirty, setCopyDirty] = useState(false);
  const [copyKey, setCopyKey] = useState(() => createUuid());
  const [copyRevision, setCopyRevision] = useState<number | null>(null);
  useEffect(() => {
    setCopyDirty(false);
    setCopyRevision(null);
    setCopyKey(createUuid());
  }, [copy]);
  const mutation = useFitnessMutation();
  const open = async (kind: Editable, initial?: Models[Editable], entry?: Entry) => {
    if (['training-plan', 'training', 'meal-plan', 'meals'].includes(kind)) {
      const existing = day.data?.records[kind];
      const copyPlan =
        (!existing?.data && (kind === 'training' || kind === 'meals')) ||
        (!!initial && initial !== existing?.data);
      if (
        existing?.data &&
        copyPlan &&
        !(await confirm('已有实际记录。以计划预填编辑内容？保存时将修改已有记录。'))
      )
        return;
      navigate(
        `/fitness/edit/${kind}?${new URLSearchParams({ date: entry?.key ?? date, back: location.pathname, ...(copyPlan || initial ? { copy: '1' } : {}) })}`,
      );
      return;
    }
    setEdit({
      kind,
      key: kind === 'goal' ? createUuid() : (entry?.key ?? date),
      entry: entry ?? day.data?.records[kind],
      initial,
      goalRevision: summary.data?.goalRevision,
    });
  };
  const remove = async (entry: Entry, label: string) => {
    if (!(await confirm(`确定删除 ${entry.key} 的${label}？此操作会移除该记录。`))) return;
    setNotice('');
    void mutation
      .mutateAsync(() => fitnessApi.delete(entry))
      .then(() => setNotice(`${label}已删除`))
      .catch((e) => setNotice(`删除失败：${e.message}`));
  };
  const data = day.data,
    s = summary.data;
  const goal = s?.currentGoal?.data,
    weight = s?.latestWeight?.data;
  const action = (kind: Editable, label?: string, initial?: Models[Editable]) => (
    <Button
      variant="secondary"
      disabled={
        mutation.isPending ||
        (date > localToday() && !['training-plan', 'meal-plan', 'goal'].includes(kind))
      }
      onClick={() => open(kind, initial)}
    >
      {label ?? `${present(data!, kind) ? '修改' : '记录'}${titles[kind]}`}
    </Button>
  );
  return {
    confirm,
    section,
    date,
    setDate,
    summary,
    day,
    start,
    period,
    setPeriod,
    from,
    to,
    history,
    statistics,
    goals,
    profile,
    edit,
    setEdit,
    copy,
    setCopy,
    destination,
    setDestination,
    templateName,
    setTemplateName,
    notice,
    setNotice,
    copyDirty,
    setCopyDirty,
    copyKey,
    setCopyKey,
    copyRevision,
    setCopyRevision,
    mutation,
    open,
    remove,
    data,
    s,
    goal,
    weight,
    action,
  };
}
export type FitnessWorkspace = ReturnType<typeof useFitnessWorkspace>;
function FitnessWorkspacePage() {
  const workspace = useFitnessWorkspace();
  const {
    confirm,
    section,
    date,
    setDate,
    day,
    start,
    history,
    edit,
    setEdit,
    copy,
    setCopy,
    destination,
    setDestination,
    templateName,
    setTemplateName,
    notice,
    setNotice,
    copyDirty,
    setCopyDirty,
    copyKey,
    setCopyKey,
    copyRevision,
    setCopyRevision,
    mutation,
    open,
    data,
  } = workspace;
  if (!labels[section])
    return (
      <main id="main-content" className="platform-main">
        <h1>页面不存在</h1>
        <Link to="/fitness">返回健身首页</Link>
      </main>
    );
  return (
    <main id="main-content" className="platform-main fitness-main" tabIndex={-1}>
      {section !== 'today' && (
        <div className="page-heading">
          <div>
            <p className="eyebrow">健身记录</p>
            <h1>{labels[section]}</h1>
            <p className="secondary">
              {section === 'today'
                ? '查看当天安排，记录已完成的训练、饮食与日常数据。'
                : section === 'goals'
                  ? '查看当前目标与历史目标，调整时保留已有记录。'
                  : section === 'training'
                    ? '安排与实做分别记录，休息也是计划的一部分。'
                    : section === 'meals'
                      ? '计划吃什么，记录实际吃了什么。'
                      : section === 'weight'
                        ? '快速录入体重，查看真实样本、日期与趋势。'
                        : section === 'templates'
                          ? '编辑个人模板，再为指定日期生成独立安排。'
                          : '按周或按月查看打卡、训练、饮食与体重记录。'}
            </p>
          </div>
          {section === 'goals' ? (
            <Button onClick={() => open('goal')}>＋ 设置新目标</Button>
          ) : (
            <label className="date-control">
              查看日期
              <input
                type="date"
                required
                min="1900-01-01"
                max="2100-12-31"
                value={date}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </label>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="platform-notice">
          {notice}
        </p>
      )}
      {section === 'templates' && (
        <>
          <FirstWeekPlan />
          <TemplateManager kind="training-template" date={date} />
          <TemplateManager kind="meal-template" date={date} />
          <TemplateManager kind="week-template" date={start} days={history.data} />
        </>
      )}
      {section === 'goals' && <GoalsSection workspace={workspace} />}
      {section === 'history' && <HistorySection workspace={workspace} />}
      {section !== 'goals' && section !== 'templates' && section !== 'history' && (
        <State
          loading={day.isPending}
          error={day.error}
          retry={() => {
            void day.refetch();
          }}
        >
          {data && (
            <>
              {section === 'today' && <TodaySection workspace={workspace} />}

              {section === 'training' && <TrainingSection workspace={workspace} />}
              {section === 'meals' && <MealsSection workspace={workspace} />}
              {section === 'weight' && <WeightSection workspace={workspace} />}
            </>
          )}
        </State>
      )}
      {edit && (
        <FitnessEditor
          key={`${edit.kind}-${edit.key}`}
          spec={edit}
          onSaved={() => setNotice(`${titles[edit.kind]}已保存`)}
          onClose={async () => {
            setEdit(null);
            setNotice('');
          }}
        />
      )}
      {copy && (
        <Modal
          open
          title={copy.mode === 'copy' ? '复制计划' : '保存个人模板'}
          onClose={async () => {
            if (
              !mutation.isPending &&
              (!copyDirty || (await confirm('复制或模板内容尚未保存，确定关闭？')))
            )
              setCopy(null);
          }}
        >
          <form
            className="platform-form"
            onSubmit={(e) => {
              e.preventDefault();
              setNotice('');
              void mutation
                .mutateAsync(async () => {
                  if (copy.mode === 'template') {
                    if (copy.kind === 'training-plan')
                      return fitnessApi.save(
                        'training-template',
                        copyKey,
                        { name: templateName, plan: copy.data as Models['training-plan'] },
                        -1,
                        undefined,
                        copyKey,
                      );
                    return fitnessApi.save(
                      'meal-template',
                      copyKey,
                      { name: templateName, plan: copy.data as Meals },
                      -1,
                      undefined,
                      copyKey,
                    );
                  }
                  const existing = await fitnessApi.get(copy.kind, destination);
                  if (
                    existing?.data &&
                    !(await confirm(
                      `${destination} 已有计划，确定覆盖该日期的计划？实际记录不受影响。`,
                    ))
                  )
                    return false;
                  const expected = copyRevision ?? existing?.revision ?? -1;
                  setCopyRevision(expected);
                  return fitnessApi.copy(
                    copy.sourceKind!,
                    copy.sourceKey!,
                    destination,
                    expected,
                    copyKey,
                  );
                })
                .then((result) => {
                  if (result === false) return;
                  setCopy(null);
                  setNotice('已保存');
                })
                .catch((e) => setNotice(`保存失败：${e.message}`));
            }}
          >
            <UnsavedGuard dirty={copyDirty} />
            {copy.mode === 'copy' ? (
              <label>
                目标日期
                <input
                  type="date"
                  required
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setCopyDirty(true);
                    setCopyRevision(null);
                    setCopyKey(createUuid());
                  }}
                />
              </label>
            ) : (
              <label>
                模板名称
                <input
                  required
                  maxLength={160}
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value);
                    setCopyDirty(true);
                    setCopyKey(createUuid());
                  }}
                />
              </label>
            )}
            <p className="help">复制保存独立的计划，原计划和实际记录保持各自的数据。</p>
            {notice && <p role="alert">{notice}</p>}
            <Button type="submit" loading={mutation.isPending}>
              确认保存
            </Button>
          </form>
        </Modal>
      )}
    </main>
  );
}

export function Component() {
  const location = useLocation();
  const [params] = useSearchParams();
  const kind = location.pathname.split('/')[3];
  if (location.pathname === '/fitness/first-week')
    return (
      <main id="main-content" className="platform-main" tabIndex={-1}>
        <FirstWeekPlan page />
      </main>
    );
  if (location.pathname.startsWith('/fitness/template-edit/'))
    return (
      <main id="main-content" className="platform-main" tabIndex={-1}>
        {['training-template', 'meal-template', 'week-template'].includes(kind) ? (
          <TemplateManager
            page
            kind={kind as 'training-template' | 'meal-template' | 'week-template'}
            date={params.get('date') || localToday()}
          />
        ) : (
          <p>模板类型不存在。</p>
        )}
      </main>
    );
  return location.pathname.startsWith('/fitness/edit/') ? (
    <FitnessEditPage kind={kind as Editable} />
  ) : (
    <FitnessWorkspacePage />
  );
}
