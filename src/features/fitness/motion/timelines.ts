import { cyclePose } from './LatPulldown';
export { cyclePose };
const smooth = (t: number) => t * t * (3 - 2 * t);
// Static holds enter once, remain stable, then exit; this is a shortened illustration, not a timer.
export function holdPose(seconds: number) {
  const t = ((seconds % 12) + 12) % 12;
  if (t < 0.7) return { pull: 0, phase: 0 };
  if (t < 2.3) return { pull: smooth((t - 0.7) / 1.6), phase: 1 };
  if (t < 9) return { pull: 1, phase: 2 };
  if (t < 11.5) return { pull: 1 - smooth((t - 9) / 2.5), phase: 3 };
  return { pull: 0, phase: 0 };
}
export function gaitPose(seconds: number) {
  const t = ((seconds % 2) + 2) % 2;
  return { pull: (1 - Math.cos(t * Math.PI)) / 2, phase: Math.min(3, Math.floor(t * 2)) };
}
export function circlePose(seconds: number) {
  const t = ((seconds % 8) + 8) % 8;
  return { pull: (1 - Math.cos(t * Math.PI)) / 2, phase: t < 4 ? 1 : 3 };
}
