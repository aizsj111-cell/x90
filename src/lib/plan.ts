import {
  AppState,
  DailyFeedback,
  DailyRecord,
  UserProfile,
  TaskKey,
  UserPlan,
  ViolationKey,
} from "@/lib/types";

export const TASK_KEYS: TaskKey[] = [
  "breakfast",
  "lunch",
  "dinner",
  "water",
  "walk",
  "strength",
  "noMilkTea",
  "noLateSnack",
  "noSugaryDrink",
  "noBeer",
  "sleepEarly",
];

export const VIOLATION_KEYS: ViolationKey[] = [
  "lateSnack",
  "milkTea",
  "sugaryDrink",
  "beer",
  "lateSleep",
];

export const TASK_LABELS: Record<TaskKey, string> = {
  breakfast: "早餐达标",
  lunch: "午餐达标",
  dinner: "晚餐达标",
  water: "喝水 2L",
  walk: "快走 40 分钟",
  strength: "力量训练",
  noMilkTea: "不喝奶茶",
  noLateSnack: "不吃夜宵",
  noSugaryDrink: "不喝含糖饮料",
  noBeer: "不喝啤酒",
  sleepEarly: "23:30 前睡觉",
};

export const VIOLATION_LABELS: Record<ViolationKey, string> = {
  lateSnack: "夜宵",
  milkTea: "奶茶",
  sugaryDrink: "含糖饮料",
  beer: "啤酒",
  lateSleep: "熬夜",
};

export const REMINDERS = [
  { time: "08:00", label: "称体重" },
  { time: "09:00", label: "早餐打卡" },
  { time: "12:30", label: "午餐打卡" },
  { time: "18:30", label: "晚餐打卡" },
  { time: "20:30", label: "快走 / 运动" },
  { time: "21:30", label: "今日总结" },
  { time: "23:00", label: "准备睡觉" },
];

export function createDefaultProfile(): UserProfile {
  return {
    nickname: "",
    gender: "female",
    age: null,
    heightCm: null,
    completed: false,
  };
}

export function createDefaultPlan(today: string): UserPlan {
  return {
    startDate: today,
    days: 90,
    startWeight: 72,
    targetWeight: 57,
    waterGoal: 2,
    walkMinutesGoal: 40,
    sleepTimeGoal: "23:30",
  };
}

export function createEmptyDailyRecord(date: string, dayIndex: number): DailyRecord {
  return {
    date,
    dayIndex,
    weight: null,
    waist: null,
    mood: "normal",
    exercise: "none",
    tasks: Object.fromEntries(TASK_KEYS.map((key) => [key, false])) as Record<TaskKey, boolean>,
    violations: Object.fromEntries(
      VIOLATION_KEYS.map((key) => [key, false]),
    ) as Record<ViolationKey, boolean>,
    note: "",
    completionRate: 0,
  };
}

export function createInitialState(today: string): AppState {
  return {
    profile: createDefaultProfile(),
    plan: createDefaultPlan(today),
    records: [createEmptyDailyRecord(today, 1)],
  };
}

export function getDayIndex(startDate: string, currentDate: string): number {
  const start = new Date(startDate);
  const current = new Date(currentDate);
  const diff = Math.floor((current.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

export function getCompletionRate(record: DailyRecord): number {
  const completed = TASK_KEYS.filter((key) => record.tasks[key]).length;
  return Math.round((completed / TASK_KEYS.length) * 100);
}

export function isRecordActive(record: DailyRecord): boolean {
  return (
    record.weight !== null ||
    record.waist !== null ||
    record.note.trim().length > 0 ||
    TASK_KEYS.some((key) => record.tasks[key]) ||
    VIOLATION_KEYS.some((key) => record.violations[key])
  );
}

export function getCompletionSummary(records: DailyRecord[]): DailyRecord[] {
  return records.map((record) => ({
    ...record,
    completionRate: getCompletionRate(record),
  }));
}

export function upsertRecord(
  records: DailyRecord[],
  record: DailyRecord,
  plan: UserPlan,
): DailyRecord[] {
  const next = records.some((item) => item.date === record.date)
    ? records.map((item) => (item.date === record.date ? record : item))
    : [...records, record];

  return next
    .map((item) => ({
      ...item,
      dayIndex: getDayIndex(plan.startDate, item.date),
      completionRate: getCompletionRate(item),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getLatestWeight(plan: UserPlan, records: DailyRecord[]): number {
  const latest = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((record) => record.weight !== null);

  return latest?.weight ?? plan.startWeight;
}

function getStreak(records: DailyRecord[]): number {
  const active = [...records]
    .filter(isRecordActive)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (active.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < active.length; index += 1) {
    const previous = new Date(active[index - 1].date);
    const current = new Date(active[index].date);
    const diff = Math.floor((previous.getTime() - current.getTime()) / 86_400_000);

    if (diff === 1) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

export function calculateDashboardStats(
  plan: UserPlan,
  records: DailyRecord[],
  currentDate: string,
) {
  const sorted = getCompletionSummary(records);
  const dayIndex = Math.min(getDayIndex(plan.startDate, currentDate), plan.days);
  const currentWeight = getLatestWeight(plan, sorted);
  const todayRecord =
    sorted.find((record) => record.date === currentDate) ??
    createEmptyDailyRecord(currentDate, dayIndex);
  const totalCompletion =
    sorted.filter(isRecordActive).reduce((sum, record) => sum + record.completionRate, 0) /
    Math.max(sorted.filter(isRecordActive).length, 1);

  return {
    dayIndex,
    currentWeight,
    targetWeight: plan.targetWeight,
    distanceToGoal: Number((currentWeight - plan.targetWeight).toFixed(1)),
    weightLost: Number((plan.startWeight - currentWeight).toFixed(1)),
    remainingDays: Math.max(plan.days - dayIndex, 0),
    todayCompletionRate: todayRecord.completionRate,
    streakDays: getStreak(sorted),
    totalCompletionRate: Math.round(totalCompletion),
  };
}

export function calculateEstimatedTargetDate(
  startWeight: number,
  targetWeight: number,
  records: DailyRecord[],
): string | null {
  const weighted = [...records]
    .filter((record) => record.weight !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (weighted.length < 2) {
    return null;
  }

  const first = weighted[0];
  const last = weighted[weighted.length - 1];
  if (first.weight === null || last.weight === null || last.weight >= startWeight) {
    return null;
  }

  const elapsedDays = Math.max(
    1,
    Math.floor((new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000),
  );
  const lost = first.weight - last.weight;
  const dailyLoss = lost / elapsedDays;

  if (dailyLoss <= 0) {
    return null;
  }

  const remaining = last.weight - targetWeight;
  if (remaining <= 0) {
    return last.date;
  }

  const daysNeeded = Math.ceil(remaining / dailyLoss) + 1;
  const estimate = new Date(last.date);
  estimate.setDate(estimate.getDate() + daysNeeded);
  return estimate.toISOString().slice(0, 10);
}

export function getTodayRecord(plan: UserPlan, records: DailyRecord[], today: string): DailyRecord {
  return (
    records.find((record) => record.date === today) ??
    createEmptyDailyRecord(today, getDayIndex(plan.startDate, today))
  );
}

export function generateFeedback(
  record: DailyRecord,
  records: DailyRecord[],
): DailyFeedback {
  const completionRate = record.completionRate || getCompletionRate(record);
  const recentThree = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const noExerciseStreak =
    recentThree.length === 3 &&
    recentThree.every((item) => item.exercise === "none" && !item.tasks.walk && !item.tasks.strength);

  let rating = "今天整体还可以，但有项目没完成。";
  let tomorrowFocus = "明天优先完成喝水和快走。";
  let warning = "继续控制晚餐，保持节奏。";

  if (completionRate >= 85) {
    rating = "今天执行很好，继续保持。";
    tomorrowFocus = "明天重点保持晚餐不吃主食。";
    warning = "别因为今天做得好就放松夜宵和睡觉时间。";
  } else if (completionRate < 60) {
    rating = "今天执行偏弱，不要放弃。";
    tomorrowFocus = "明天只抓三件事：不喝奶茶、不吃夜宵、快走 30 分钟。";
    warning = "先把节奏找回来，比一次练太猛更重要。";
  }

  if (record.violations.milkTea) {
    rating =
      completionRate < 60
        ? "今天执行偏弱，奶茶影响也比较大。"
        : "今天整体不错，但奶茶影响比较大。";
    tomorrowFocus = "奶茶是明天第一控制项，换成无糖茶或黑咖啡。";
  }

  if (record.violations.lateSnack) {
    warning = "夜宵比少运动更影响减脂，明晚晚餐蛋白质吃够。";
  }

  if (noExerciseStreak) {
    tomorrowFocus = "已经连续 3 天没运动，明天先快走 30 分钟恢复节奏。";
  }

  return {
    rating,
    tomorrowFocus,
    warning,
    reminder: "坚持 90 天，不靠狠，靠每天不断。",
  };
}
