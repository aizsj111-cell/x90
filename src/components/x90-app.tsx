"use client";

import { useEffect, useMemo, useState } from "react";

import {
  calculateDashboardStats,
  calculateEstimatedTargetDate,
  generateFeedback,
  getTodayRecord,
  REMINDERS,
  TASK_KEYS,
  TASK_LABELS,
  upsertRecord,
  VIOLATION_KEYS,
  VIOLATION_LABELS,
} from "@/lib/plan";
import { loadState, saveState } from "@/lib/storage";
import { AppState, DailyRecord, ExerciseType, Mood, TaskKey, UserPlan, ViolationKey } from "@/lib/types";

type TabKey = "home" | "checkin" | "data" | "settings";

function getTodayString() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function createFallbackState(): AppState {
  const today = getTodayString();

  return {
    plan: {
      startDate: today,
      days: 90,
      startWeight: 72,
      targetWeight: 57,
      waterGoal: 2,
      walkMinutesGoal: 40,
      sleepTimeGoal: "23:30",
    },
    records: [
      {
        date: today,
        dayIndex: 1,
        weight: null,
        waist: null,
        mood: "normal",
        exercise: "none",
        tasks: {
          breakfast: false,
          lunch: false,
          dinner: false,
          water: false,
          walk: false,
          strength: false,
          noMilkTea: false,
          noLateSnack: false,
          noSugaryDrink: false,
          noBeer: false,
          sleepEarly: false,
        },
        violations: {
          lateSnack: false,
          milkTea: false,
          sugaryDrink: false,
          beer: false,
          lateSleep: false,
        },
        note: "",
        completionRate: 0,
      },
    ],
  };
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative rounded-[28px] border border-[var(--card-border)] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "blue" | "green" | "red";
}) {
  const bg =
    accent === "green"
      ? "bg-[var(--soft-green)]"
      : accent === "red"
        ? "bg-[var(--soft-red)]"
        : "bg-[var(--soft-blue)]";

  return (
    <div className={`rounded-3xl ${bg} p-4`}>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function LineChart({
  data,
  stroke,
  unit,
}: {
  data: Array<{ label: string; value: number }>;
  stroke: string;
  unit: string;
}) {
  if (data.length === 0) {
    return <div className="rounded-3xl bg-slate-50 p-6 text-sm text-[var(--muted)]">还没有足够数据</div>;
  }

  const width = 300;
  const height = 140;
  const values = data.map((item) => item.value);
  const latestPoint = data[data.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * width;
      const y = height - ((item.value - min) / range) * (height - 12) - 6;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full">
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{data[0]?.label}</span>
        <span>
          最新 {latestPoint?.value}
          {unit}
        </span>
      </div>
    </div>
  );
}

export function X90App() {
  const [tab, setTab] = useState<TabKey>("home");
  const [state, setState] = useState<AppState>(() => {
    if (typeof window === "undefined") {
      return createFallbackState();
    }

    return loadState() ?? createFallbackState();
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentDate = getTodayString();
  const stats = useMemo(
    () => calculateDashboardStats(state.plan, state.records, currentDate),
    [state.plan, state.records, currentDate],
  );
  const todayRecord = useMemo(
    () => getTodayRecord(state.plan, state.records, currentDate),
    [state.plan, state.records, currentDate],
  );
  const feedback = useMemo(
    () => generateFeedback(todayRecord, state.records),
    [todayRecord, state.records],
  );

  const weightPoints = state.records
    .filter((record) => record.weight !== null)
    .map((record) => ({ label: `Day ${record.dayIndex}`, value: record.weight as number }));
  const waistPoints = state.records
    .filter((record) => record.waist !== null)
    .map((record) => ({ label: `Day ${record.dayIndex}`, value: record.waist as number }));
  const estimatedDate = calculateEstimatedTargetDate(
    state.plan.startWeight,
    state.plan.targetWeight,
    state.records,
  );

  function commitRecord(record: DailyRecord) {
    setState((current) => ({
      ...current,
      records: upsertRecord(current.records, record, current.plan),
    }));
  }

  function toggleTask(task: TaskKey) {
    const record = {
      ...todayRecord,
      tasks: {
        ...todayRecord.tasks,
        [task]: !todayRecord.tasks[task],
      },
    };
    commitRecord(record);
  }

  function updateViolation(key: ViolationKey, checked: boolean) {
    const record = {
      ...todayRecord,
      violations: {
        ...todayRecord.violations,
        [key]: checked,
      },
    };
    commitRecord(record);
  }

  function updateField<Key extends keyof DailyRecord>(key: Key, value: DailyRecord[Key]) {
    commitRecord({
      ...todayRecord,
      [key]: value,
    });
  }

  function updatePlan<Key extends keyof UserPlan>(key: Key, value: UserPlan[Key]) {
    setState((current) => ({
      ...current,
      plan: {
        ...current.plan,
        [key]: value,
      },
    }));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-6">
      <header className="mb-5 px-1">
        <p className="text-sm font-medium text-[var(--primary)]">X90 小张90天减肥计划</p>
        <h1 className="mt-1 text-[2rem] font-semibold tracking-[-0.05em]">每天打开 30 秒，也算在变瘦</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Day {stats.dayIndex} / {state.plan.days} · 关闭后数据仍保存在本机
        </p>
      </header>

      <div className="space-y-4">
        <div data-section="home" style={{ display: tab === "home" ? "block" : "none" }}>
          <>
            <SectionCard title="今日概览" subtitle="核心进度一眼看清">
              <div className="grid grid-cols-2 gap-3">
                <div data-metric="currentWeight"><Metric label="当前体重" value={`${stats.currentWeight} kg`} accent="blue" /></div>
                <div data-metric="targetWeight"><Metric label="目标体重" value={`${stats.targetWeight} kg`} accent="green" /></div>
                <div data-metric="distanceToGoal"><Metric label="距离目标" value={`${stats.distanceToGoal} kg`} accent="red" /></div>
                <div data-metric="todayCompletionRate"><Metric label="今日完成率" value={`${stats.todayCompletionRate}%`} accent="green" /></div>
                <div data-metric="streakDays"><Metric label="连续打卡" value={`${stats.streakDays} 天`} accent="blue" /></div>
                <div data-metric="remainingDays"><Metric label="剩余天数" value={`${stats.remainingDays} 天`} accent="blue" /></div>
              </div>
            </SectionCard>

            <SectionCard title="今日任务" subtitle="点一下就算完成">
              <div className="space-y-3">
                {TASK_KEYS.map((task) => {
                  const checked = todayRecord.tasks[task];
                  return (
                    <button
                      key={task}
                      type="button"
                      onClick={() => toggleTask(task)}
                      data-task={task}
                      className={`relative z-10 flex w-full touch-manipulation items-center justify-between rounded-3xl border px-4 py-4 text-left transition ${
                        checked
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <span className="font-medium">{TASK_LABELS[task]}</span>
                      <span className="text-lg">{checked ? "✅" : "◻️"}</span>
                    </button>
                  );
                })}
                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-[var(--muted)]">
                  今日体重记录
                  <input
                    data-record-field="weight"
                    value={todayRecord.weight ?? ""}
                    onChange={(event) => updateField("weight", toNumberOrNull(event.target.value))}
                    inputMode="decimal"
                    placeholder="72"
                    className="relative z-10 mt-3 block w-full touch-manipulation rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="今日反馈" subtitle="先用规则反馈，后面再升级成真 AI">
              <div className="space-y-3">
                <div className="rounded-3xl bg-[var(--soft-blue)] p-4">
                  <p className="text-sm text-[var(--muted)]">今日评价</p>
                  <p data-feedback="rating" className="mt-2 text-base font-medium">{feedback.rating}</p>
                </div>
                <div className="rounded-3xl bg-[var(--soft-green)] p-4">
                  <p className="text-sm text-[var(--muted)]">明日建议</p>
                  <p data-feedback="tomorrowFocus" className="mt-2 text-base font-medium">{feedback.tomorrowFocus}</p>
                </div>
                <div className="rounded-3xl bg-[var(--soft-red)] p-4">
                  <p className="text-sm text-[var(--muted)]">一句提醒</p>
                  <p data-feedback="reminder" className="mt-2 text-base font-medium">{feedback.reminder}</p>
                  <p data-feedback="warning" className="mt-2 text-sm text-slate-600">{feedback.warning}</p>
                </div>
              </div>
            </SectionCard>
          </>
        </div>

        <div data-section="checkin" style={{ display: tab === "checkin" ? "block" : "none" }}>
          <SectionCard title="每日打卡" subtitle="今天的状态今天留痕">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">今日体重 (kg)</span>
                <input
                  data-record-field="weight"
                  value={todayRecord.weight ?? ""}
                  onChange={(event) => updateField("weight", toNumberOrNull(event.target.value))}
                  inputMode="decimal"
                  className="relative z-10 block w-full touch-manipulation rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">今日腰围 (cm)</span>
                <input
                  data-record-field="waist"
                  value={todayRecord.waist ?? ""}
                  onChange={(event) => updateField("waist", toNumberOrNull(event.target.value))}
                  inputMode="decimal"
                  className="relative z-10 block w-full touch-manipulation rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />
              </label>
              <div>
                <p className="mb-2 text-sm text-[var(--muted)]">今日心情</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["good", "好"],
                    ["normal", "一般"],
                    ["bad", "差"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateField("mood", value as Mood)}
                      data-mood={value}
                      className={`relative z-10 touch-manipulation rounded-2xl border px-4 py-3 ${
                        todayRecord.mood === value
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-[var(--muted)]">今日运动</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["none", "无"],
                    ["walk", "快走"],
                    ["strength", "力量"],
                    ["both", "两者都有"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateField("exercise", value as ExerciseType)}
                      data-exercise={value}
                      className={`relative z-10 touch-manipulation rounded-2xl border px-4 py-3 ${
                        todayRecord.exercise === value
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-[var(--muted)]">今日是否破戒</p>
                <div className="space-y-2">
                  {VIOLATION_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <span>{VIOLATION_LABELS[key]}</span>
                      <input
                        type="checkbox"
                        data-violation={key}
                        checked={todayRecord.violations[key]}
                        onChange={(event) => updateViolation(key, event.target.checked)}
                        className="relative z-10 h-5 w-5 touch-manipulation"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">今日备注</span>
                <textarea
                  data-record-field="note"
                  value={todayRecord.note}
                  onChange={(event) => updateField("note", event.target.value)}
                  rows={4}
                  className="relative z-10 block w-full touch-manipulation rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="比如：今天有点累，但晚餐控制住了"
                />
              </label>
              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                已保存。今日完成率 {stats.todayCompletionRate}% ，当前反馈会自动刷新。
              </div>
            </div>
          </SectionCard>
        </div>

        <div data-section="data" style={{ display: tab === "data" ? "block" : "none" }}>
          <>
            <SectionCard title="变化趋势" subtitle="看见变化，比纯靠意志更有效">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm text-[var(--muted)]">体重变化</p>
                  <LineChart data={weightPoints} stroke="#1677ff" unit="kg" />
                </div>
                <div>
                  <p className="mb-2 text-sm text-[var(--muted)]">腰围变化</p>
                  <LineChart data={waistPoints} stroke="#16a34a" unit="cm" />
                </div>
              </div>
            </SectionCard>
            <SectionCard title="数据总览" subtitle="每天一小步，累计就是趋势">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="已减重量" value={`${stats.weightLost} kg`} accent="green" />
                <Metric label="总完成率" value={`${stats.totalCompletionRate}%`} accent="blue" />
                <Metric label="距离目标" value={`${stats.distanceToGoal} kg`} accent="red" />
                <Metric label="预计达标" value={estimatedDate ?? "继续记录"} accent="green" />
              </div>
            </SectionCard>
            <SectionCard title="固定计划" subtitle="你给的默认计划已经内置">
              <div className="space-y-3 text-sm text-slate-700">
                <p>早餐：鸡蛋 + 豆浆 / 牛奶</p>
                <p>午餐：半盘菜 + 一份肉 + 半碗饭</p>
                <p>晚餐：一盘菜 + 一份肉，不吃米饭</p>
                <p>力量训练：深蹲 20 个 × 3 组，俯卧撑 15 个 × 3 组，平板 60 秒 × 3 组</p>
                <p>禁止事项：夜宵、奶茶、含糖饮料、啤酒、连续熬夜</p>
              </div>
            </SectionCard>
          </>
        </div>

        <div data-section="settings" style={{ display: tab === "settings" ? "block" : "none" }}>
          <>
            <SectionCard title="计划设置" subtitle="目标先简单，先把坚持做出来">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--muted)]">开始日期</span>
                  <input
                    type="date"
                    data-plan-field="startDate"
                    value={state.plan.startDate}
                    onChange={(event) => updatePlan("startDate", event.target.value)}
                    className="relative z-10 block w-full touch-manipulation rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  />
                </label>
                {[
                  ["startWeight", "初始体重"],
                  ["targetWeight", "目标体重"],
                  ["days", "目标天数"],
                  ["waterGoal", "喝水目标(L)"],
                  ["walkMinutesGoal", "快走目标(分钟)"],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-2 block text-sm text-[var(--muted)]">{label}</span>
                    <input
                      data-plan-field={key}
                      value={state.plan[key as keyof UserPlan]}
                      onChange={(event) =>
                        updatePlan(key as keyof UserPlan, Number(event.target.value) as never)
                      }
                      inputMode="decimal"
                      className="relative z-10 block w-full touch-manipulation rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--muted)]">睡觉时间</span>
                  <input
                    type="time"
                    data-plan-field="sleepTimeGoal"
                    value={state.plan.sleepTimeGoal}
                    onChange={(event) => updatePlan("sleepTimeGoal", event.target.value)}
                    className="relative z-10 block w-full touch-manipulation rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  />
                </label>
              </div>
            </SectionCard>
            <SectionCard title="提醒时间" subtitle="V1 先做页面内提醒，推送后续再加">
              <div className="space-y-2">
                {REMINDERS.map((item) => (
                  <div
                    key={item.time}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                  >
                    <span>{item.label}</span>
                    <span className="font-medium text-slate-500">{item.time}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        </div>
      </div>

      <nav className="sticky bottom-4 z-20 mt-6 flex w-full gap-2 rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
        {[
          ["home", "首页"],
          ["checkin", "打卡"],
          ["data", "数据"],
          ["settings", "设置"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as TabKey)}
            data-nav={key}
            className={`relative z-10 flex-1 touch-manipulation rounded-2xl px-3 py-3 text-sm font-medium ${
              tab === key ? "bg-[var(--primary)] text-white" : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </main>
  );
}
