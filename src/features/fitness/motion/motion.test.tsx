import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { resolveMotion } from './catalog';
import { cyclePose, elbowFor } from './LatPulldown';
import { ExerciseMotion } from './ExerciseMotion';

const exercise = { id: 'record-uuid', name: '高位下拉 Lat Pulldown', type: 'STRENGTH' as const };
function media(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}
describe('training motion', () => {
  it('uses canonical IDs ahead of names and rejects unsupported variations', () => {
    expect(resolveMotion({ ...exercise, id: 'lat-pulldown', name: '改名后的动作' })).toBe(
      'lat-pulldown',
    );
    expect(resolveMotion(exercise)).toBe('lat-pulldown');
    expect(resolveMotion({ ...exercise, name: '颈后高位下拉' })).toBeUndefined();
    expect(resolveMotion({ ...exercise, type: 'CARDIO' })).toBeUndefined();
  });
  it('keeps both arm lengths constant across the complete cycle and loops continuously', () => {
    for (let time = 0; time <= 6; time += 0.01) {
      const { pull } = cyclePose(time);
      for (const side of [-1, 1] as const) {
        const shoulder = { x: side === -1 ? 180 : 240, y: 176 };
        const hand = { x: side === -1 ? 132 : 288, y: 43 + pull * 140 };
        const elbow = elbowFor(shoulder, hand, side);
        expect(Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y)).toBeCloseTo(72, 8);
        expect(Math.hypot(elbow.x - hand.x, elbow.y - hand.y)).toBeCloseTo(72, 8);
      }
    }
    expect(cyclePose(2.5).pull).toBe(1);
    expect(cyclePose(6).pull).toBe(cyclePose(0).pull);
  });
  it('mounts playback only inside the viewer and supports controls and close', () => {
    media(false);
    const frame = vi.spyOn(window, 'requestAnimationFrame');
    render(<ExerciseMotion exercise={exercise} />);
    expect(frame).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '查看动作：高位下拉' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(frame).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '慢速播放' }));
    expect(screen.getByRole('button', { name: /慢速播放/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: '重新播放' }));
    expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭弹窗' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    frame.mockRestore();
  });
  it('honors reduced motion with selectable still poses and no playback loop', () => {
    media(true);
    const frame = vi.spyOn(window, 'requestAnimationFrame');
    render(<ExerciseMotion exercise={exercise} />);
    fireEvent.click(screen.getByRole('button', { name: '查看动作：高位下拉' }));
    expect(frame).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '暂停' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下拉结束' }));
    expect(screen.getByRole('dialog').querySelector('[data-part="bar"]')).toHaveAttribute(
      'transform',
      'translate(0 180)',
    );
    frame.mockRestore();
  });
});
