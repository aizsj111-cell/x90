import { createDefaultProfile } from "@/lib/plan";
import { AppState } from "@/lib/types";

const STORAGE_KEY = "x90-app-state";

export function loadState(): AppState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;

    return {
      profile: parsed.profile ?? createDefaultProfile(),
      plan: parsed.plan as AppState["plan"],
      records: parsed.records as AppState["records"],
    };
  } catch {
    return null;
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
