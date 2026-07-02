import { describe, expect, it, beforeEach } from "vitest";

import { loadState } from "@/lib/storage";

describe("storage helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("fills a default profile when loading older saved state", () => {
    window.localStorage.setItem(
      "x90-app-state",
      JSON.stringify({
        plan: {
          startDate: "2026-07-01",
          days: 90,
          startWeight: 72,
          targetWeight: 57,
          waterGoal: 2,
          walkMinutesGoal: 40,
          sleepTimeGoal: "23:30",
        },
        records: [],
      }),
    );

    const state = loadState();

    expect(state?.profile.nickname).toBe("");
    expect(state?.profile.gender).toBe("female");
    expect(state?.profile.completed).toBe(false);
  });
});
