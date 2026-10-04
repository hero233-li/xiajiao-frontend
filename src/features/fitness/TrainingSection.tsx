import {
ChevronLeft,
ChevronRight
} from 'lucide-react';
import {
localToday,
shiftDate,
type Models
} from '../../api/fitness';
import { Button } from '../../components/Button';
import {
trainingNames
} from '../../features/fitness/Editor';

import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { ExerciseList,State,weekday } from './display';

export function TrainingSection({workspace}: {workspace: FitnessWorkspace}) {
 const { section, date, setDate, summary, day, start, period, setPeriod, from, to, history, statistics, goals, profile, edit, setEdit, copy, setCopy, destination, setDestination, templateName, setTemplateName, notice, setNotice, copyDirty, setCopyDirty, copyKey, setCopyKey, copyRevision, setCopyRevision, mutation, open, remove, data, s, goal, weight, action } = workspace;
 if (!data) return null;
 return (              <>
<State loading={history.isPending} error={history.error} retry={history.refetch}>{null}</State>

                <div className="period-toolbar">
                  <Button variant="ghost" onClick={() => setDate(shiftDate(date, -7))}>
                    <ChevronLeft size={16} />
                    上一周
                  </Button>
                  <strong>
                    {start} — {shiftDate(start, 6)}
                  </strong>
                  <Button variant="ghost" onClick={() => setDate(shiftDate(date, 7))}>
                    下一周
                    <ChevronRight size={16} />
                  </Button>
                </div>
                <div className="week-plan">
                  {history.data?.map((d) => (
                    <button
                      className={d.date === date ? 'selected' : ''}
                      key={d.date}
                      data-date={d.date}
                      onClick={() => setDate(d.date)}
                    >
                      <span>{weekday(d.date)}</span>
                      <strong>{d.date.slice(5)}</strong>
                      <small>
                        {d.rest
                          ? '休息日'
                          : d.records['training-plan']?.data
                            ? `${d.records['training-plan'].data.exercises.length} 项训练`
                            : '未安排'}
                      </small>
                      <em>
                        {
                          (
                            { PENDING: '待完成', UNPLANNED: '未安排', ...trainingNames } as Record<
                              string,
                              string
                            >
                          )[d.trainingState]
                        }
                      </em>
                    </button>
                  ))}
                </div>
                <div className="fitness-two-col">
                  <section className="platform-section">
                    <div className="section-title">
                      <h2>计划 · {date}</h2>
                      {action('training-plan', '编辑安排')}
                    </div>
                    {data.rest ? (
                      <p className="inline-empty">今天安排休息，可以照常打卡。</p>
                    ) : (
                      <ExerciseList rows={data.records['training-plan']?.data?.exercises ?? []} />
                    )}
                    <p>{data.records['training-plan']?.data?.note}</p>
                    {data.records['training-plan']?.data && (
                      <div className="row">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setCopy({
                              kind: 'training-plan',
                              mode: 'copy',
                              sourceKind: 'training-plan',
                              sourceKey: date,
                              data: data.records['training-plan']!.data!,
                            });
                            setDestination(shiftDate(date, 1));
                          }}
                        >
                          复制到指定日期
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setCopy({
                              kind: 'training-plan',
                              mode: 'template',
                              data: data.records['training-plan']!.data!,
                            });
                            setTemplateName('');
                          }}
                        >
                          存为训练模板
                        </Button>
                      </div>
                    )}
                  </section>
                  <section className="platform-section">
                    <div className="section-title">
                      <h2>实际训练</h2>
                      {date <= localToday() &&
                        action(
                          'training',
                          '记录实际',
                          data.records.training?.data ?? {
                            status: '' as Models['training']['status'],
                            exercises: (data.records['training-plan']?.data?.exercises ?? []).map(e=>({...e,completed:false})),
                            note: null,
                            planSnapshot: null,
                          },
                        )}
                    </div>
                    {data.records.training?.data ? (
                      <>
                        <p className="record-status">
                          {trainingNames[data.records.training.data.status]}
                        </p>
                        <ExerciseList rows={data.records.training.data.exercises} />
                        <p>{data.records.training.data.note}</p>
                        <Button
                          variant="ghost"
                          onClick={() => remove(data.records.training!, '实际训练')}
                        >
                          删除实际训练
                        </Button>
                      </>
                    ) : (
                      <p className="inline-empty">
                        尚未记录。实际数据可在计划基础上修改，不会改变计划。
                      </p>
                    )}
                  </section>
                </div>
              </>
);
}
