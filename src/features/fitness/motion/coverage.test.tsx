import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ExerciseMotion } from './ExerciseMotion';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../../../api/fitness';
import { motions, resolveMotion } from './catalog';
import type { MotionDefinition } from './types';
import { joint } from './drawing';
import { legPressPose, pressPose, rowPose, curlPose, hipThrustPose } from './MachineMotions';
import { deadBugPose, walkingPose, squatPose, hingePose } from './BodyMotions';
const length = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
describe('complete training animation catalog', () => {
  it('covers every exercise in all seven first-week days without changing records', () => {
    const rows = Object.values(motions).flatMap((motion) =>
      motion.aliases.map((name) => ({ id: 'test', name, type: motion.types[0] }) as Exercise),
    );
    const before = JSON.stringify(rows);
    for (const row of rows) expect(resolveMotion(row), row.name).toBeDefined();
    expect(JSON.stringify(rows)).toBe(before);
    expect(resolveMotion({ id: 'unknown', name: '我的自定义训练', type: 'OTHER' })).toBeUndefined();
    expect(
      resolveMotion({ id: 'unknown', name: '颈后高位下拉', type: 'STRENGTH' }),
    ).toBeUndefined();
  });
  it('renders every illustration across two cycles with finite coordinates', () => {
    for (const definition of Object.values(motions)) {
      const motion: MotionDefinition = definition;
      for (let time = 0; time <= motion.duration * 2; time += 0.2) {
        const pose = motion.poseAt(time),
          Illustration = motion.Illustration;
        expect(pose.pull).toBeGreaterThanOrEqual(0);
        expect(pose.pull).toBeLessThanOrEqual(1);
        const markup = renderToStaticMarkup(<Illustration pull={pose.pull} seconds={time} />);
        expect(markup, `${motion.id} at ${time}`).not.toMatch(/NaN|Infinity/);
        expect(markup).toContain('role="img"');
        expect(markup).toContain('aria-label=');
      }
      expect(motion.poseAt(0).pull).toBeCloseTo(motion.poseAt(motion.duration).pull, 8);
      if (motion.related)
        for (const id of motion.related) expect(Object.hasOwn(motions, id)).toBe(true);
    }
  });
  it('preserves segment lengths and grip/foot targets across rigid motion chains', () => {
    for (let p = 0; p <= 1; p += 0.02) {
      const leg = legPressPose(p);
      expect(length(leg.hip, leg.knee)).toBeCloseTo(95, 8);
      expect(length(leg.knee, leg.foot)).toBeCloseTo(95, 8);
      for (const pose of [pressPose(p), rowPose(p)]) {
        expect(length(pose.shoulder, pose.elbow)).toBeCloseTo(70, 8);
        expect(length(pose.elbow, pose.hand)).toBeCloseTo(70, 8);
      }
      const curl = curlPose(p);
      expect(length(curl.knee, curl.foot)).toBeCloseTo(83, 8);
      expect(length(curl.knee, curl.pad)).toBeCloseTo(68, 8);
      const hip = hipThrustPose(p);
      expect(length(hip.shoulder, hip.hip)).toBeCloseTo(105, 8);
      expect(length(hip.hip, hip.knee)).toBeCloseTo(88, 8);
      expect(length(hip.knee, hip.foot)).toBeCloseTo(92, 8);
      for (const side of [-1, 1]) {
        const bug = deadBugPose(p, side);
        expect(length(bug.shoulder, bug.elbow)).toBeCloseTo(51, 8);
        expect(length(bug.elbow, bug.hand)).toBeCloseTo(49, 8);
        expect(length(bug.hip, bug.knee)).toBeCloseTo(60, 8);
        expect(length(bug.knee, bug.foot)).toBeCloseTo(65, 8);
      }
      const squat = squatPose(p);
      expect(length(squat.hip, squat.knee)).toBeCloseTo(65, 8);
      expect(length(squat.knee, squat.foot)).toBeCloseTo(67, 8);
      const hinge = hingePose(p);
      expect(length(hinge.hip, hinge.knee)).toBeCloseTo(64, 8);
      expect(length(hinge.knee, hinge.foot)).toBeCloseTo(65, 8);
    }
    for (let t = 0; t <= 4; t += 0.02)
      for (const side of [-1, 1])
        for (const incline of [0, 8]) {
          const walk = walkingPose(t, side, incline);
          expect(length(walk.hip, walk.knee)).toBeCloseTo(64, 8);
          expect(length(walk.knee, walk.foot)).toBeCloseTo(64, 8);
        }
    expect(() => joint({ x: 0, y: 0 }, { x: 200, y: 0 }, 50, 50)).toThrow();
  });
  it('keeps static holds still, and alternates opposite limbs rather than same-side dead bug', () => {
    for (const id of [
      'plank',
      'recovery-stretch',
      'hamstring-stretch',
      'calf-stretch',
      'glute-stretch',
      'chest-stretch',
      'back-stretch',
    ] as const) {
      expect(motions[id].poseAt(3)).toEqual({ pull: 1, phase: 2 });
      expect(motions[id].poseAt(8)).toEqual({ pull: 1, phase: 2 });
    }
    const a = deadBugPose(1, 1),
      b = deadBugPose(1, -1),
      start = deadBugPose(0, 1);
    expect(a.hand.x).not.toBe(start.hand.x);
    expect(a.foot.x).toBe(start.foot.x);
    expect(b.foot.x).not.toBe(start.foot.x);
    expect(b.hand.x).toBe(start.hand.x);
  });
  it('switches all warm-up and stretching sub-actions and resets static key poses', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    for (const [name, type, expectedCount] of [
      ['动态热身', 'MOBILITY', 5],
      ['恢复拉伸', 'MOBILITY', 6],
    ] as const) {
      const { unmount } = render(<ExerciseMotion exercise={{ id: 'legacy-uuid', name, type }} />);
      fireEvent.click(screen.getByRole('button', { name: /^查看动作：/ }));
      const dialog = screen.getByRole('dialog');
      const buttons = dialog.querySelectorAll<HTMLButtonElement>('.motion-variants button');
      expect(buttons).toHaveLength(expectedCount);
      for (const button of buttons) {
        fireEvent.click(
          dialog.querySelector<HTMLButtonElement>('.motion-controls button:last-child')!,
        );
        fireEvent.click(button);
        expect(button).toHaveAttribute('aria-pressed', 'true');
        expect(dialog.querySelector('h2')?.textContent).toBe(button.textContent);
        expect(screen.getByRole('button', { name: '起始 / 回位' })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      }
      unmount();
    }
  });
});
