import type { ComponentType } from 'react';
import type { ExerciseType } from '../../../api/fitness';
export interface MotionDefinition {
  id: string;
  name: string;
  subtitle: string;
  Illustration: ComponentType<{ pull?: number; seconds?: number }>;
  poseAt: (seconds: number) => { pull: number; phase: number };
  duration: number;
  phaseLabels: readonly [string, string, string, string];
  endLabel: string;
  stillSeconds: number;
  types: readonly ExerciseType[];
  aliases: readonly string[];
  steps: readonly { name: string; text: string }[];
  errors: readonly string[];
  source: string;
  sourceLabel: string;
  related?: readonly string[];
  extraSources?: readonly { label: string; url: string }[];
  note?: string;
}
