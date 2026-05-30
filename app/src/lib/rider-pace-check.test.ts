import { describe, expect, it } from "vitest";
import { riderMetrics, type OrderRecord, type RiderMetric } from "./domain";
import {
  buildPaceRecommendation,
  calculateGoalProgress,
  createDefaultPaceCheckInput,
  defaultPaceCheckSettings,
  getLastWeekPace,
  getMusicMode,
  getRoutineCoaching,
  type PaceCheckInput,
} from "./rider-pace-check";

const baseMetric: RiderMetric = riderMetrics[0];

function makeInput(overrides: Partial<PaceCheckInput> = {}): PaceCheckInput {
  return {
    ...createDefaultPaceCheckInput(baseMetric.completedCount),
    ...overrides,
  };
}

describe("rider pace check", () => {
  it("calculates additional calls needed from manual today calls and weekly goal", () => {
    const progress = calculateGoalProgress(makeInput({ todayCompletedCalls: 18, weeklyGoalCalls: 70 }));

    expect(progress.additionalCallsNeeded).toBe(52);
    expect(progress.recommendedPaceText).toContain("52건");
  });

  it("returns safety-centered recommendation for low sleep and tired condition", () => {
    const recommendation = buildPaceRecommendation(
      makeInput({ condition: "tired", sleepHours: 4.5, todayCompletedCalls: 20 }),
      getLastWeekPace(baseMetric),
    );

    expect(recommendation.tone).toBe("danger");
    expect(recommendation.title).toBe("수면 부족 주의");
    expect(recommendation.message).toContain("목표를 낮추고");
  });

  it("uses default pace settings for goal and coaching messages", () => {
    const input = createDefaultPaceCheckInput(baseMetric.completedCount);
    const riskRecommendation = buildPaceRecommendation(
      makeInput({ condition: "risk", sleepHours: 7 }),
      getLastWeekPace(baseMetric),
    );
    const skippedMealRecommendation = buildPaceRecommendation(
      makeInput({ mealStatus: "skipped", sleepHours: 7, todayCompletedCalls: 20 }),
      getLastWeekPace(baseMetric),
    );

    expect(input.weeklyGoalCalls).toBe(defaultPaceCheckSettings.defaultWeeklyGoalCalls);
    expect(riskRecommendation.message).toBe(defaultPaceCheckSettings.riskConditionSafetyMessage);
    expect(skippedMealRecommendation.message).toBe(defaultPaceCheckSettings.skippedMealMessage);
  });

  it("changes sleep warning condition when admin threshold changes", () => {
    const relaxedSettings = {
      ...defaultPaceCheckSettings,
      sleepWarningHours: 4,
    };
    const stricterSettings = {
      ...defaultPaceCheckSettings,
      sleepWarningHours: 6,
    };
    const input = makeInput({ condition: "tired", sleepHours: 4.5, todayCompletedCalls: 20 });

    expect(buildPaceRecommendation(input, getLastWeekPace(baseMetric), relaxedSettings).title).not.toBe("수면 부족 주의");
    expect(buildPaceRecommendation(input, getLastWeekPace(baseMetric), stricterSettings).title).toBe("수면 부족 주의");
    expect(buildPaceRecommendation(input, getLastWeekPace(baseMetric), stricterSettings).message).toContain("6시간");
  });

  it("prioritizes risk condition over call pace", () => {
    const recommendation = buildPaceRecommendation(
      makeInput({ condition: "risk", sleepHours: 7, todayCompletedCalls: 80 }),
      getLastWeekPace(baseMetric),
    );

    expect(recommendation.tone).toBe("danger");
    expect(recommendation.title).toBe("안전 우선");
  });

  it("changes routine coaching by day and night type", () => {
    expect(getRoutineCoaching("day").label).toBe("주간형");
    expect(getRoutineCoaching("night").label).toBe("야간형");
    expect(getRoutineCoaching("day").title).not.toBe(getRoutineCoaching("night").title);
  });

  it("uses admin routine and music safety messages", () => {
    const settings = {
      ...defaultPaceCheckSettings,
      dayRoutineMessage: "점심 전 식사 체크",
      nightRoutineMessage: "마감 전 수면 준비",
      musicModeSafetyNote: "정차 후만 선택하세요.",
    };

    expect(getRoutineCoaching("day", settings).title).toBe("점심 전 식사 체크");
    expect(getRoutineCoaching("night", settings).title).toBe("마감 전 수면 준비");
    expect(getMusicMode("call_tempo", settings).safetyNote).toBe("정차 후만 선택하세요.");
  });

  it("changes music guidance by selected mode without external links", () => {
    const callTempo = getMusicMode("call_tempo");
    const sleepWinddown = getMusicMode("sleep_winddown");

    expect(callTempo.label).toBe("콜 수행 템포 모드");
    expect(sleepWinddown.label).toBe("수면 유도 모드");
    expect(callTempo.description).not.toBe(sleepWinddown.description);
    expect(callTempo.futureExternalUrl).toBeNull();
    expect(sleepWinddown.futureExternalUrl).toBeNull();
  });

  it("keeps pace data usable when last week data is sparse", () => {
    const sparseMetric: RiderMetric = {
      ...baseMetric,
      completedCount: 0,
      activeDays: 0,
    };
    const sparseOrders: OrderRecord[] = [];
    const pace = getLastWeekPace(sparseMetric, sparseOrders);
    const recommendation = buildPaceRecommendation(makeInput({ todayCompletedCalls: 0 }), pace);

    expect(pace.averageDailyCalls).toBeNull();
    expect(pace.hasEnoughDateData).toBe(false);
    expect(recommendation.message.length).toBeGreaterThan(0);
  });
});
