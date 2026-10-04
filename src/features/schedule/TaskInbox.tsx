import { useState } from 'react';
import type { Plan,PlanTask } from '../../api/generated/models';
import { Button } from '../../components/Button';
import { Link } from '../cycle/navigation';
import { durationLabel,shanghaiDate,taskHref } from './display';
type Group = 'today' | 'overdue' | 'future' | 'completed';
export function TaskInbox({plan,busy,save}: {plan:Plan;busy:boolean;save:(tasks:PlanTask[],completed:boolean)=>void}) {
 const today=shanghaiDate(plan.asOf); const [group,setGroup]=useState<Group>('today');
 const groups:Record<Group,PlanTask[]>={today:[],overdue:[],future:[],completed:[]};
 for(const task of plan.tasks){
  const dates=plan.days.filter(d=>d.segments.some(s=>s.taskId===task.id)).map(d=>d.day);
  if(task.completed) groups.completed.push(task);
  else if(dates.includes(today)) groups.today.push(task);
  else if(dates.some(d=>d<today)) groups.overdue.push(task);
  else if(dates.some(d=>d>today)) groups.future.push(task);
 }
 const labels:Record<Group,string>={today:'今日',overdue:'逾期',future:'未来',completed:'已完成'};
 return <section className="platform-section task-inbox"><div className="section-title"><h2>任务清单</h2><span className="help">{today} · 以服务器计划快照为准</span></div>
 <div className="inbox-filters" role="group" aria-label="任务分类">{(Object.keys(labels) as Group[]).map(key=><button key={key} aria-pressed={group===key} onClick={()=>setGroup(key)}>{labels[key]} <span>{groups[key].length}</span></button>)}</div>
 {groups[group].length ? <ol className="task-ledger">{groups[group].map(task=><li key={task.id} data-done={task.completed}><Button variant="ghost" disabled={busy} aria-label={`${task.completed?'取消完成':'完成'}：${task.title}`} onClick={()=>save([task],!task.completed)}><span className="task-check">{task.completed?'✓':''}</span></Button><div><Link to={taskHref(task,plan.config.cycleId)}>{task.title}</Link><small>{plan.courseSummaries.find(c=>c.id===task.courseId)?.name} · 预计{durationLabel(task.estimatedMinutes)}</small></div><Link className="ledger-go" aria-label={`打开任务：${task.title}`} to={taskHref(task,plan.config.cycleId)}>打开</Link></li>)}</ol> : <p className="inline-empty">没有{labels[group]}任务。{group==='today'?'可以调整当前计划，为今天安排学习时间。':''}</p>}
 </section>;
}
