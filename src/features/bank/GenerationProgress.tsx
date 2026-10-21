import { useEffect, useState } from 'react';
import { Check, LoaderCircle, AlertCircle } from 'lucide-react';
import type { WeaknessPlan } from '../../api/bank';

export function GenerationProgress({ plan, mode = 'generation' }: { plan: WeaknessPlan; mode?: 'generation' | 'grading' }) {
  const grading = mode === 'grading';
  const steps = grading ? ['等待处理', 'AI 逐题批改', '核验并保存', '批改完成'] : ['等待处理', 'AI 生成题目', '校验并保存', '生成完成'];
  const [now, setNow] = useState(Date.now);
  const state = grading ? plan.taskState : plan.generationState;
  const createdAt = grading ? plan.gradingCreatedAt : plan.generationCreatedAt;
  const active = state === 'QUEUED' || state === 'GRADING';
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active, createdAt]);
  if (!state) return null;
  const review = grading && state === 'REVIEW';
  const complete = state === 'COMPLETED' || review;
  const failed = state === 'FAILED';
  const stage = grading ? plan.gradingProgress?.stage : plan.generationProgress?.stage;
  const current = complete ? 3 : state === 'QUEUED' ? 0 : stage === 'VALIDATING' ? 2 : stage === 'PREPARING' ? 0 : 1;
  const title = grading
    ? review ? 'AI 批改完成，部分题目待核对' : complete ? '本组 AI 批改已完成' : failed ? '本次批改未完成' :
      state === 'QUEUED' ? '作答已提交，正在等待批改' : stage === 'PREPARING' ? '正在读取答卷与评分标准' : current === 2 ? '正在核验评分并保存' : 'AI 正在逐题批改作答'
    : complete ? `第 ${plan.drillRound ?? 2} 组阶梯题已生成` : failed ? '本次生成未完成' :
    state === 'QUEUED' ? '申请已收到，正在等待处理' : stage === 'PREPARING' ? '正在准备本次弱项信息' :
    current === 2 ? '正在校验题目并保存' : 'AI 正在生成新的 10 道阶梯题';
  const start = Date.parse(createdAt ?? '');
  const seconds = Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / 1000)) : null;
  const elapsed = seconds === null ? '' : seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)} 分 ${String(seconds % 60).padStart(2, '0')} 秒`;
  return (
    <section className={`weakness-generation-progress ${complete ? 'is-complete' : failed ? 'is-failed' : ''}`} aria-label={grading ? '阶梯题批改进度' : '阶梯题生成进度'}>
      <div className="weakness-generation-progress-head">
        <div role="status">
          {complete ? <Check size={18} /> : failed ? <AlertCircle size={18} /> : <LoaderCircle className="spin" size={18} />}
          <strong>{title}</strong>
        </div>
        {active && elapsed && <span aria-live="off">已等待 {elapsed}</span>}
      </div>
      <ol className="weakness-generation-steps" aria-label={grading ? '批改阶段' : '生成阶段'}>
        {steps.map((label, index) => (
          <li key={label} className={index < current || complete ? 'is-done' : index === current ? 'is-current' : ''}
            aria-current={index === current && !complete ? 'step' : undefined}>
            <span>{index < current || complete ? <Check size={13} /> : index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
      <p className="weakness-generation-progress-note">
        {grading ? (
          review ? '请查看下方题目的得分与核对提示，确认作答照片清楚后再处理。' :
          complete ? `本组 ${plan.drillCorrect}/${plan.drillTotal} 道已答对，逐题得分和反馈已更新。` :
          failed ? `${plan.taskError || '批改服务暂时不可用'}。作答照片已保留，可重新提交批改。` :
          state === 'QUEUED' && !plan.workerOnline ? '批改程序暂未在线，作答已保留；上线后会继续处理。' :
          current === 2 ? '正在核验评分点、题目对应关系和得分，完成后自动展示结果。' :
          `共 ${plan.drillTotal} 道题，按本组评分标准逐题批改。每 5 秒自动更新，离开页面后任务仍会继续。`
        ) : complete ? '新一组已显示在下方，可以开始作答。' : failed ? `${plan.generationError || '生成服务暂时不可用'}。上一组题目和批改结果已保留，可重新申请。` :
          state === 'QUEUED' && !plan.workerOnline ? '生成程序暂未在线，申请已保留；上线后会继续处理。' :
          current === 2 ? '正在检查 10 道题、答案和评分标准，完成后自动切换新一组。' :
          '基础 3 道 · 进阶 4 道 · 提高 3 道。每 5 秒自动更新，离开页面后任务仍会继续。'}
      </p>
    </section>
  );
}

export function GradingProgress({ plan }: { plan: WeaknessPlan }) {
  return <GenerationProgress plan={plan} mode="grading" />;
}
