/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalEarned } from './localEarned';

export interface LocalAnswer {
  number: string;
  recognizedAnswer: string;
  points: LocalEarned[];
  pages: number[];
  reviewItems: string[];
}
