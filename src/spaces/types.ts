import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';
export interface TodayTask {
  id: string;
  title: string;
  date: string;
  status: string;
  to: string;
}
export interface SpaceSummary {
  message: string;
  tasks: TodayTask[];
  next: { label: string; to: string };
  resume?: { label: string; to: string };
  metrics?: { label: string; value: string }[];
}
export interface SummaryViewProps {
  summary: SpaceSummary;
}
export interface SpaceModule {
  id: string;
  entry: string;
  navigation: [string, string][];
  routes: RouteObject[];
  load: () => Promise<{
    loadSummary: (signal?: AbortSignal) => Promise<SpaceSummary>;
    Summary: ComponentType<SummaryViewProps>;
  }>;
}
export interface Space {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  entry: string | null;
  order: number;
  visible: boolean;
  status: 'AVAILABLE' | 'COMING_SOON';
  permission: string;
  defaultJoined: boolean;
}
export interface Preference {
  spaceId: string;
  joined: boolean;
  favorite: boolean;
  hidden: boolean;
  position: number;
  revision: number;
  lastPath: string | null;
  visitedAt: string | null;
}
export interface Directory {
  spaces: Space[];
  preferences: Preference[];
}
