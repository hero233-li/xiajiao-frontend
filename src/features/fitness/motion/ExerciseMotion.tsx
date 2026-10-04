import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import type { Exercise } from '../../../api/fitness';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import { motions, resolveMotion, type MotionId } from './catalog';
import type { MotionDefinition } from './types';
import './motion.css';

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
export function MotionViewer({ motionId, onClose }: { motionId: MotionId; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState<MotionId>(motionId);
  const motion: MotionDefinition = motions[selectedId];
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [keyPose, setKeyPose] = useState(0);
  const elapsed = useRef(0);
  useEffect(() => {
    if (!playing || reduced) return;
    let frame: number, previous: number | undefined;
    const tick = (now: number) => {
      // Do not fast-forward when returning from a background browser tab.
      if (previous !== undefined && !document.hidden)
        elapsed.current += Math.min((now - previous) / 1000, 0.05) * (slow ? 0.5 : 1);
      previous = now;
      setSeconds(elapsed.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, slow, reduced]);
  const pose = motion.poseAt(seconds);
  const Illustration = motion.Illustration;
  return (
    <Modal open title={motion.name} onClose={onClose}>
      <div className="exercise-motion-viewer" data-motion-id={selectedId}>
        {motion.related && (
          <div className="motion-variants" aria-label="选择子动作">
            {motion.related.map((id) => (
              <Button
                key={id}
                variant={id === selectedId ? 'primary' : 'secondary'}
                aria-pressed={id === selectedId}
                onClick={() => {
                  setSelectedId(id as MotionId);
                  elapsed.current = 0;
                  setSeconds(0);
                  setKeyPose(0);
                }}
              >
                {motions[id as MotionId].name}
              </Button>
            ))}
          </div>
        )}
        <p className="motion-subtitle">{motion.subtitle}</p>
        <div className="motion-stage">
          <Illustration
            pull={reduced ? keyPose : pose.pull}
            seconds={reduced ? (keyPose ? motion.stillSeconds : 0) : seconds}
          />
        </div>
        {reduced ? (
          <>
            <p className="help">已遵循系统“减少动态效果”设置，展示静态关键姿势。</p>
            <div className="motion-controls" aria-label="切换静态姿势">
              <Button
                variant={keyPose === 0 ? 'primary' : 'secondary'}
                aria-pressed={keyPose === 0}
                onClick={() => setKeyPose(0)}
              >
                起始 / 回位
              </Button>
              <Button
                variant={keyPose === 1 ? 'primary' : 'secondary'}
                aria-pressed={keyPose === 1}
                onClick={() => setKeyPose(1)}
              >
                {motion.endLabel}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="motion-playback-status">
              <span>{motion.phaseLabels[pose.phase]}</span>
              <span>
                {slow ? '0.5× 慢速' : '1× 正常速度'} · {playing ? '循环播放' : '已暂停'}
              </span>
            </div>
            <div className="motion-controls" aria-label="动画播放控制">
              <Button onClick={() => setPlaying(!playing)}>
                {playing ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
                {playing ? '暂停' : '播放'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  elapsed.current = 0;
                  setSeconds(0);
                  setPlaying(true);
                }}
              >
                <RotateCcw size={16} aria-hidden="true" />
                重新播放
              </Button>
              <Button variant="secondary" aria-pressed={slow} onClick={() => setSlow(!slow)}>
                慢速播放{slow ? ' · 已开启' : ''}
              </Button>
            </div>
          </>
        )}
        {motion.note && <p className="motion-note">{motion.note}</p>}
        <ol className="motion-steps">
          {motion.steps.map((step, i) => (
            <li key={step.name}>
              <span className="motion-step-number">{i + 1}</span>
              <div>
                <h3>{step.name}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <section className="motion-errors">
          <h3>常见错误</h3>
          <ul>
            {motion.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
        <p className="motion-reference">
          依据{' '}
          <a href={motion.source} target="_blank" rel="noreferrer">
            {motion.sourceLabel} ↗
          </a>{' '}
          绘制。
          {motion.extraSources?.map((source) => (
            <span key={source.url}>
              {' '}
              另参见{' '}
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label} ↗
              </a>
              。
            </span>
          ))}{' '}
          此图是简化动作示意，关节角度与器械比例仍需教练人工核对。
        </p>
      </div>
    </Modal>
  );
}
export function ExerciseMotion({
  exercise,
  motionId: explicitId,
}: {
  exercise: Pick<Exercise, 'id' | 'name' | 'type'>;
  motionId?: MotionId;
}) {
  const id = explicitId ?? resolveMotion(exercise);
  const [open, setOpen] = useState(false);
  if (!id) return null;
  const Illustration = motions[id].Illustration;
  return (
    <div className="exercise-motion-entry">
      <div className="motion-thumbnail" aria-hidden="true">
        <Illustration />
      </div>
      <Button
        type="button"
        variant="secondary"
        aria-label={`查看动作：${motions[id].name}`}
        onClick={() => setOpen(true)}
      >
        查看动作
      </Button>
      {open && <MotionViewer key={id} motionId={id} onClose={() => setOpen(false)} />}
    </div>
  );
}
