// Generated from backend FitnessModels.java. Run python3 scripts/generate-fitness-types.py.
export type GoalType = 'LOSE' | 'GAIN' | 'MAINTAIN';
export type ExerciseType = 'STRENGTH' | 'CARDIO' | 'MOBILITY' | 'OTHER';
export type TrainingStatus = 'COMPLETED' | 'PARTIAL' | 'SKIPPED' | 'REST';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export interface Goal {
  type: GoalType;
  startDate: string;
  startWeight: number;
  targetWeight: number;
  targetDate: string | null;
  note: string | null;
}
export interface Weight {
  kg: number;
  note: string | null;
}
export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  sets: number | null;
  reps: number | null;
  kg: number | null;
  minutes: number | null;
  km: number | null;
  note: string | null;
  completed: boolean | null;
}
export interface TrainingPlan {
  rest: boolean;
  exercises: Exercise[];
  note: string | null;
}
export interface Training {
  status: TrainingStatus;
  exercises: Exercise[];
  note: string | null;
  planSnapshot: TrainingPlan | null;
}
export interface Food {
  meal: MealType;
  name: string;
  quantity: number | null;
  unit: string | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  note: string | null;
}
export interface Meals {
  foods: Food[];
  note: string | null;
}
export interface Checkin {
  sleepHours: number | null;
  feeling: number | null;
  note: string | null;
}
export interface Water {
  ml: number;
}
export interface TrainingTemplate {
  name: string;
  plan: TrainingPlan;
}
export interface WeekTemplate {
  name: string;
  days: TrainingPlan[];
}
export interface MealTemplate {
  name: string;
  plan: Meals;
}
export interface Profile {
  displayName: string;
  bio: string | null;
  compact: boolean;
  weekStartsMonday: boolean;
}
