import { createUuid } from '../utils/uuid';
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './http';
import type {
  Goal,
  Weight,
  TrainingPlan,
  Training,
  Meals,
  Checkin,
  Water,
  TrainingTemplate,
  MealTemplate,
  WeekTemplate,
  Profile,
} from './fitness-models';
export * from './fitness-models';
export interface Models {
  goal: Goal;
  weight: Weight;
  'training-plan': TrainingPlan;
  training: Training;
  'meal-plan': Meals;
  meals: Meals;
  checkin: Checkin;
  water: Water;
  'training-template': TrainingTemplate;
  'meal-template': MealTemplate;
  'week-template': WeekTemplate;
  profile: Profile;
}
export type Kind = keyof Models;
export interface Entry<K extends Kind = Kind> {
  kind: K;
  key: string;
  revision: number;
  data: Models[K] | null;
}
export type Records = { [K in Kind]?: Entry<K> };
export interface Day {
  date: string;
  records: Records;
  checkedIn: boolean;
  rest: boolean;
  partial: boolean;
  state: string;
  trainingState: string;
  nutrition: Nutrition;
  plannedNutrition: Nutrition;
}
export interface Nutrient {
  knownTotal: number | null;
  complete: boolean;
  knownCount: number;
  foodCount: number;
}
export interface Nutrition {
  kcal: Nutrient;
  protein: Nutrient;
  carbs: Nutrient;
  fat: Nutrient;
}
export interface WeightWindow {
  mean: number | null;
  samples: number;
  from: string;
  to: string;
}
export interface Stats {
  from: string;
  to: string;
  checkinDays: number;
  dietDays: number;
  plannedTrainingDays: number;
  completedTrainingDays: number;
  partialTrainingDays: number;
  skippedTrainingDays: number;
  restDays: number;
  trainingRate: number | null;
  sevenDayWeight: WeightWindow;
  nutrition: Nutrition;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
export interface ImportWeek {
  startDate: string;
  days: {
    training: TrainingPlan;
    meals: Meals;
    expectedTrainingRevision: number;
    expectedMealRevision: number;
  }[];
}
export interface Summary {
  goalRevision: number;
  sevenDayWeight: WeightWindow;
  today: string;
  currentGoal: Entry<'goal'> | null;
  latestWeight: Entry<'weight'> | null;
  streak: number;
  weekCheckins: number;
  weekElapsedDays: number;
  weekRate: number;
}
const request = async <T>(url: string, method = 'GET', data?: unknown, idempotencyKey?: string) =>
  (
    await apiRequest<{ data: T; code: number; message: string }>({
      url: `/api/v1/fitness${url}`,
      method,
      data,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      silent: true,
    })
  ).data;
export const fitnessApi = {
  importWeek: (body: ImportWeek, key: string) =>
    request<{ items: Entry[] }>('/weeks/import', 'POST', body, key),
  summary: () => request<Summary>('/summary'),
  day: (date: string) => request<Day>(`/days/${date}`),
  history: (from: string, to: string) => request<Day[]>(`/history?from=${from}&to=${to}`),
  list: <K extends Kind>(kind: K, page = 1) =>
    request<Page<Entry<K>>>(`/records/${kind}?page=${page}&size=30`),
  get: <K extends Kind>(kind: K, key: string) =>
    request<Entry<K> | null>(`/records/${kind}/${key}`),
  save: <K extends Kind>(
    kind: K,
    key: string,
    data: Models[K],
    expectedRevision: number,
    expectedGoalRevision?: number,
    idempotencyKey = createUuid(),
  ) =>
    request<Entry<K>>(
      `/records/${kind}/${key}`,
      'PUT',
      { data, expectedRevision, expectedGoalRevision },
      idempotencyKey,
    ),
  statistics: (from: string, to: string) => request<Stats>(`/statistics?from=${from}&to=${to}`),
  copy: (
    sourceKind: Kind,
    sourceKey: string,
    destination: string,
    expectedRevision: number,
    key = createUuid(),
  ) =>
    request<Entry>('/copy', 'POST', { sourceKind, sourceKey, destination, expectedRevision }, key),
  generateWeek: (
    templateKey: string,
    monday: string,
    expectedRevisions: number[],
    key = createUuid(),
  ) =>
    request<{ items: Entry[] }>(
      '/weeks/generate',
      'POST',
      { templateKey, monday, expectedRevisions },
      key,
    ),
  endGoal: (expectedGoalRevision: number, key = createUuid()) =>
    request('/goals/end', 'POST', { expectedGoalRevision }, key),
  delete: (entry: Entry) =>
    request<null>(`/records/${entry.kind}/${entry.key}?revision=${entry.revision}`, 'DELETE'),
};
export const useFitnessSummary = () =>
  useQuery({ queryKey: ['fitness', 'summary'], queryFn: fitnessApi.summary });
export const useFitnessDay = (date: string) =>
  useQuery({ queryKey: ['fitness', 'day', date], queryFn: () => fitnessApi.day(date) });
export const useFitnessHistory = (from: string, to: string, enabled = true) =>
  useQuery({
    queryKey: ['fitness', 'history', from, to],
    enabled,
    queryFn: () => fitnessApi.history(from, to),
  });
export const useFitnessStats = (from: string, to: string, enabled = true) =>
  useQuery({
    queryKey: ['fitness', 'stats', from, to],
    enabled,
    queryFn: () => fitnessApi.statistics(from, to),
  });
export function useFitnessList<K extends Kind>(kind: K) {
  const query = useInfiniteQuery({
    queryKey: ['fitness', 'list', kind],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fitnessApi.list(kind, pageParam),
    getNextPageParam: (last) => (last.page * last.size < last.total ? last.page + 1 : undefined),
  });
  return {
    ...query,
    data: query.data?.pages.flatMap((p) => p.items),
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
  };
}
export function useFitnessMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['fitness'] }),
        client.invalidateQueries({ queryKey: ['personal-home'] }),
      ]);
    },
  });
}
export const localToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const shiftDate = (day: string, amount: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};
