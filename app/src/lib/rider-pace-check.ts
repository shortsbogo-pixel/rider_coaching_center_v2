import type { OrderRecord, RiderMetric } from "./domain";

export type PaceCondition = "good" | "normal" | "tired" | "risk";
export type MealStatus = "done" | "not_yet" | "skipped";
export type RestStatus = "enough" | "short" | "none";
export type RoutineType = "day" | "night";
export type MusicModeId = "call_tempo" | "rest_relax" | "sleep_winddown";
export type PaceTone = "good" | "warn" | "danger" | "blue";

export interface PaceCheckInput {
  todayCompletedCalls: number;
  todayStartTime: string;
  condition: PaceCondition;
  mealStatus: MealStatus;
  sleepHours: number;
  restStatus: RestStatus;
  weeklyGoalCalls: number;
  routineType: RoutineType;
  musicModeId: MusicModeId;
}

export interface LastWeekPace {
  completedCalls: number;
  activeDays: number;
  averageDailyCalls: number | null;
  hasEnoughDateData: boolean;
}

export interface GoalProgress {
  additionalCallsNeeded: number;
  recommendedPaceText: string;
  nextAction: string;
}

export interface PaceRecommendation {
  title: string;
  message: string;
  tone: PaceTone;
}

export interface RoutineCoaching {
  type: RoutineType;
  label: string;
  title: string;
  points: string[];
}

export interface MusicMode {
  modeId: MusicModeId;
  label: string;
  description: string;
  safetyNote: string;
  futureExternalUrl: string | null;
}

export interface PaceCheckSettings {
  defaultWeeklyGoalCalls: number;
  sleepWarningHours: number;
  riskConditionSafetyMessage: string;
  skippedMealMessage: string;
  dayRoutineMessage: string;
  nightRoutineMessage: string;
  musicModeSafetyNote: string;
}

export const defaultPaceCheckInput: PaceCheckInput = {
  todayCompletedCalls: 0,
  todayStartTime: "",
  condition: "normal",
  mealStatus: "not_yet",
  sleepHours: 6,
  restStatus: "short",
  weeklyGoalCalls: 120,
  routineType: "night",
  musicModeId: "call_tempo",
};

export const defaultPaceCheckSettings: PaceCheckSettings = {
  defaultWeeklyGoalCalls: 120,
  sleepWarningHours: 5,
  riskConditionSafetyMessage: "컨디션이 위험하면 콜 목표보다 멈춤이 먼저입니다. 바로 쉬고 상태를 보세요.",
  skippedMealMessage: "식사를 건너뛰었습니다. 다음 묶음 전 식사부터 챙기세요.",
  dayRoutineMessage: "낮 운행은 식사와 짧은 휴식이 핵심입니다.",
  nightRoutineMessage: "밤 운행은 컨디션 확인이 먼저입니다.",
  musicModeSafetyNote: "운행 중 조작하지 말고 정차 후 선택하세요.",
};

export const routineCoachings: Record<RoutineType, RoutineCoaching> = {
  day: {
    type: "day",
    label: "주간형",
    title: "낮 운행은 식사와 짧은 휴식이 핵심입니다.",
    points: ["점심 전후에 식사부터 챙기세요.", "오후에는 짧게 쉬고 저녁 구간으로 이어가세요.", "졸리면 콜 목표보다 회복이 먼저입니다."],
  },
  night: {
    type: "night",
    label: "야간형",
    title: "밤 운행은 컨디션 확인이 먼저입니다.",
    points: ["저녁 전 식사를 건너뛰지 마세요.", "피곤하면 바로 쉬는 기준을 잡으세요.", "마감 후 수면 시간을 먼저 확보하세요."],
  },
};

export const musicModes: MusicMode[] = [
  {
    modeId: "call_tempo",
    label: "콜 수행 템포 모드",
    description: "일정한 템포를 고르는 모드입니다.",
    safetyNote: "운행 중 조작하지 말고 정차 후 선택하세요.",
    futureExternalUrl: null,
  },
  {
    modeId: "rest_relax",
    label: "휴식 릴랙스 모드",
    description: "짧은 휴식에 맞춘 차분한 모드입니다.",
    safetyNote: "휴식 장소에서만 확인하고 이동 중 조작은 피하세요.",
    futureExternalUrl: null,
  },
  {
    modeId: "sleep_winddown",
    label: "수면 유도 모드",
    description: "운행을 마친 뒤 속도를 낮추는 모드입니다.",
    safetyNote: "운행 종료 후 사용하는 용도이며 주행 중 재생을 전제로 하지 않습니다.",
    futureExternalUrl: null,
  },
];

export function createDefaultPaceCheckInput(
  lastWeekCompletedCalls: number,
  settings: PaceCheckSettings = defaultPaceCheckSettings,
): PaceCheckInput {
  const normalizedSettings = normalizePaceCheckSettings(settings);
  return {
    ...defaultPaceCheckInput,
    weeklyGoalCalls: Math.max(1, Math.round(normalizedSettings.defaultWeeklyGoalCalls || lastWeekCompletedCalls || defaultPaceCheckInput.weeklyGoalCalls)),
  };
}

export function normalizePaceCheckSettings(settings: PaceCheckSettings): PaceCheckSettings {
  return {
    ...defaultPaceCheckSettings,
    ...settings,
    defaultWeeklyGoalCalls: Math.max(1, clampWholeNumber(settings.defaultWeeklyGoalCalls)),
    sleepWarningHours: clampOneDecimal(settings.sleepWarningHours, 1, 24),
    riskConditionSafetyMessage: cleanMessage(settings.riskConditionSafetyMessage, defaultPaceCheckSettings.riskConditionSafetyMessage),
    skippedMealMessage: cleanMessage(settings.skippedMealMessage, defaultPaceCheckSettings.skippedMealMessage),
    dayRoutineMessage: cleanMessage(settings.dayRoutineMessage, defaultPaceCheckSettings.dayRoutineMessage),
    nightRoutineMessage: cleanMessage(settings.nightRoutineMessage, defaultPaceCheckSettings.nightRoutineMessage),
    musicModeSafetyNote: cleanMessage(settings.musicModeSafetyNote, defaultPaceCheckSettings.musicModeSafetyNote),
  };
}

export function createPaceSettingsSignature(settings: PaceCheckSettings): string {
  const normalized = normalizePaceCheckSettings(settings);
  return [
    normalized.defaultWeeklyGoalCalls,
    normalized.sleepWarningHours,
    normalized.riskConditionSafetyMessage,
    normalized.skippedMealMessage,
    normalized.dayRoutineMessage,
    normalized.nightRoutineMessage,
    normalized.musicModeSafetyNote,
  ].join("|");
}

export function normalizePaceCheckInput(input: PaceCheckInput): PaceCheckInput {
  return {
    ...input,
    todayCompletedCalls: clampWholeNumber(input.todayCompletedCalls),
    sleepHours: clampOneDecimal(input.sleepHours, 0, 24),
    weeklyGoalCalls: Math.max(1, clampWholeNumber(input.weeklyGoalCalls)),
  };
}

export function getLastWeekPace(metric: RiderMetric, latestWeekOrders: OrderRecord[] = []): LastWeekPace {
  const completedCalls = Math.max(0, metric.completedCount || latestWeekOrders.filter((order) => order.status === "완료").length);
  const activeDaysFromOrders = countOrderActiveDays(latestWeekOrders);
  const activeDays = Math.max(0, metric.activeDays || activeDaysFromOrders);
  const averageDailyCalls = completedCalls > 0 && activeDays > 0 ? roundOneDecimal(completedCalls / activeDays) : null;

  return {
    completedCalls,
    activeDays,
    averageDailyCalls,
    hasEnoughDateData: completedCalls > 0 && activeDays > 0,
  };
}

export function calculateGoalProgress(input: PaceCheckInput): GoalProgress {
  const normalized = normalizePaceCheckInput(input);
  const additionalCallsNeeded = Math.max(normalized.weeklyGoalCalls - normalized.todayCompletedCalls, 0);

  if (additionalCallsNeeded === 0) {
    return {
      additionalCallsNeeded,
      recommendedPaceText: "오늘 입력 기준으로 주간 목표에 닿았습니다.",
      nextAction: "컨디션을 확인하고 무리하지 않는 선에서 마무리하세요.",
    };
  }

  if (additionalCallsNeeded <= 5) {
    return {
      additionalCallsNeeded,
      recommendedPaceText: "작은 목표만 남았습니다.",
      nextAction: "쉬는 시간을 확보한 뒤 남은 목표를 한 묶음으로 정리하세요.",
    };
  }

  return {
    additionalCallsNeeded,
    recommendedPaceText: `${additionalCallsNeeded}건을 2~3개 묶음으로 나눠 보세요.`,
    nextAction: "식사와 휴식 상태를 먼저 확인하고 다음 구간 목표를 작게 잡으세요.",
  };
}

export function buildPaceRecommendation(
  input: PaceCheckInput,
  lastWeekPace: LastWeekPace,
  settings: PaceCheckSettings = defaultPaceCheckSettings,
): PaceRecommendation {
  const normalized = normalizePaceCheckInput(input);
  const normalizedSettings = normalizePaceCheckSettings(settings);

  if (normalized.condition === "risk") {
    return {
      title: "안전 우선",
      message: normalizedSettings.riskConditionSafetyMessage,
      tone: "danger",
    };
  }

  if (normalized.sleepHours < normalizedSettings.sleepWarningHours) {
    return {
      title: "수면 부족 주의",
      message: `수면이 ${normalizedSettings.sleepWarningHours}시간 미만입니다. 목표를 낮추고 먼저 쉬세요.`,
      tone: "danger",
    };
  }

  if (normalized.mealStatus === "skipped") {
    return {
      title: "식사 먼저",
      message: normalizedSettings.skippedMealMessage,
      tone: "warn",
    };
  }

  if (normalized.restStatus === "none") {
    return {
      title: "휴식 필요",
      message: "오늘 휴식이 없습니다. 짧게 멈춘 뒤 다시 시작하세요.",
      tone: "warn",
    };
  }

  if (isBelowLastWeekPace(normalized, lastWeekPace)) {
    return {
      title: "페이스 보강",
      message: "지난주 평균보다 낮습니다. 다음 구간 목표를 작게 잡아보세요.",
      tone: "blue",
    };
  }

  return {
    title: normalized.condition === "good" ? "좋은 흐름" : "무난한 흐름",
    message: "오늘 흐름은 안정적입니다. 식사와 휴식만 놓치지 마세요.",
    tone: "good",
  };
}

export function getRoutineCoaching(
  type: RoutineType,
  settings: PaceCheckSettings = defaultPaceCheckSettings,
): RoutineCoaching {
  const normalizedSettings = normalizePaceCheckSettings(settings);
  const routine = routineCoachings[type];
  return {
    ...routine,
    title: type === "day" ? normalizedSettings.dayRoutineMessage : normalizedSettings.nightRoutineMessage,
  };
}

export function getMusicMode(
  modeId: MusicModeId,
  settings: PaceCheckSettings = defaultPaceCheckSettings,
): MusicMode {
  const normalizedSettings = normalizePaceCheckSettings(settings);
  const mode = musicModes.find((candidate) => candidate.modeId === modeId) ?? musicModes[0];
  return {
    ...mode,
    safetyNote: normalizedSettings.musicModeSafetyNote,
  };
}

function isBelowLastWeekPace(input: PaceCheckInput, lastWeekPace: LastWeekPace): boolean {
  if (!lastWeekPace.averageDailyCalls) return false;
  return input.todayCompletedCalls < Math.ceil(lastWeekPace.averageDailyCalls * 0.7);
}

function countOrderActiveDays(orders: OrderRecord[]): number {
  const dates = new Set(
    orders
      .filter((order) => order.status === "완료")
      .map((order) => order.acceptedAt.split(" ")[0])
      .filter(Boolean),
  );
  return dates.size;
}

function clampWholeNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function cleanMessage(value: string, fallback: string): string {
  const cleaned = value.trim();
  return cleaned || fallback;
}

function clampOneDecimal(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value * 10) / 10));
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
