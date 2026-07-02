import { describe, expect, it } from "vitest";

import {
  calculateDashboardStats,
  calculateEstimatedTargetDate,
  createEmptyDailyRecord,
  createInitialState,
  generateFeedback,
  getCompletionSummary,
} from "@/lib/plan";

describe("plan helpers", () => {
  it("creates the initial state with defaults", () => {
    const state = createInitialState("2026-07-01");

    expect(state.plan.startWeight).toBe(72);
    expect(state.plan.targetWeight).toBe(57);
    expect(state.records).toHaveLength(1);
    expect(state.records[0].dayIndex).toBe(1);
  });

  it("builds an empty daily record with all tasks tracked", () => {
    const record = createEmptyDailyRecord("2026-07-02", 2);

    expect(record.tasks.breakfast).toBe(false);
    expect(record.tasks.noBeer).toBe(false);
    expect(record.violations.lateSleep).toBe(false);
    expect(record.completionRate).toBe(0);
  });

  it("computes completion and streak from daily records", () => {
    const complete = createEmptyDailyRecord("2026-07-01", 1);
    complete.weight = 72;
    complete.tasks.breakfast = true;
    complete.tasks.lunch = true;
    complete.tasks.dinner = true;
    complete.tasks.water = true;
    complete.tasks.walk = true;
    complete.tasks.strength = true;
    complete.tasks.noMilkTea = true;
    complete.tasks.noLateSnack = true;
    complete.tasks.noSugaryDrink = true;
    complete.tasks.noBeer = true;
    complete.tasks.sleepEarly = true;

    const partial = createEmptyDailyRecord("2026-07-02", 2);
    partial.weight = 71.4;
    partial.tasks.breakfast = true;
    partial.tasks.lunch = true;
    partial.tasks.noMilkTea = true;
    partial.tasks.noLateSnack = true;
    partial.tasks.noSugaryDrink = true;
    partial.tasks.noBeer = true;

    const summary = getCompletionSummary([complete, partial]);
    const stats = calculateDashboardStats({
      startDate: "2026-07-01",
      days: 90,
      startWeight: 72,
      targetWeight: 57,
      waterGoal: 2,
      walkMinutesGoal: 40,
      sleepTimeGoal: "23:30",
    }, [complete, partial], "2026-07-02");

    expect(summary[0].completionRate).toBe(100);
    expect(summary[1].completionRate).toBe(55);
    expect(stats.currentWeight).toBe(71.4);
    expect(stats.streakDays).toBe(2);
    expect(stats.dayIndex).toBe(2);
  });

  it("generates focused feedback based on completion and violations", () => {
    const record = createEmptyDailyRecord("2026-07-03", 3);
    record.tasks.breakfast = true;
    record.tasks.noMilkTea = false;
    record.tasks.noLateSnack = false;
    record.violations.milkTea = true;
    record.violations.lateSnack = true;
    record.completionRate = 45;

    const feedback = generateFeedback(record, [record]);

    expect(feedback.rating).toContain("偏弱");
    expect(feedback.tomorrowFocus).toContain("奶茶");
    expect(feedback.warning).toContain("夜宵");
  });

  it("estimates the target date from current trend", () => {
    const records = [
      { ...createEmptyDailyRecord("2026-07-01", 1), weight: 72 },
      { ...createEmptyDailyRecord("2026-07-08", 8), weight: 71 },
    ];

    expect(calculateEstimatedTargetDate(72, 57, records)).toBe("2026-10-15");
  });
});
