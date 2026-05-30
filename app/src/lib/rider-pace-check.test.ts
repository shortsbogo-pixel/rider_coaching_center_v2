import { describe, expect, it } from "vitest";
import { riderMetrics, type OrderRecord, type RiderMetric } from "./domain";
import {
  buildPaceRecommendation,
  calculateGoalProgress,
  createDefaultPaceCheckInput,
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
