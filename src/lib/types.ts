export type Mood = "good" | "normal" | "bad";
export type ExerciseType = "none" | "walk" | "strength" | "both";

export type TaskKey =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "water"
  | "walk"
  | "strength"
  | "noMilkTea"
  | "noLateSnack"
  | "noSugaryDrink"
  | "noBeer"
  | "sleepEarly";

export type ViolationKey =
  | "lateSnack"
  | "milkTea"
  | "sugaryDrink"
  | "beer"
  | "lateSleep";

export interface UserPlan {
  startDate: string;
  days: number;
  startWeight: number;
  targetWeight: number;
  waterGoal: number;
  walkMinutesGoal: number;
  sleepTimeGoal: string;
}

export interface DailyRecord {
  date: string;
  dayIndex: number;
  weight: number | null;
  waist: number | null;
  mood: Mood;
  exercise: ExerciseType;
  tasks: Record<TaskKey, boolean>;
  violations: Record<ViolationKey, boolean>;
  note: string;
  completionRate: number;
}

export interface AppState {
  plan: UserPlan;
  records: DailyRecord[];
}

export interface DailyFeedback {
  rating: string;
  tomorrowFocus: string;
  warning: string;
  reminder: string;
}
