import { describe, expect, it } from "vitest";
import {
  getTimeSlotFromDate,
  getWeekdayFromDate,
  normalizePickupArea,
  recommendPickupAreasByTimeSlot,
  recommendPickupAreasForRider,
  summarizePickupAreas,
  type PositionRecommendationInput,
} from "./rider-position-recommendation";

const sampleOrders: PositionRecommendationInput[] = [
  {
    weekCode: "2026_05-4",
    riderId: "r-001",
    riderName: "Rider One",
    pickupName: "Store A",
    pickupAddress: "대전 동구 용전동 1",
    pickupArea: " 용전동 ",
    dropoffRegion: "대전 동구",
    dropoffDong: "중앙동",
    completedAt: "2026-06-01T20:20:00+09:00",
    assignedAt: "2026-06-01T20:00:00+09:00",
    peakTime: "Post_Dinner",
    deliveryType: "단건배달",
    orderNo: "ORD-001",
  },
  {
    weekCode: "2026_05-4",
    riderId: "r-001",
    riderName: "Rider One",
    pickupName: "Store B",
    pickupAddress: "대전 동구 용전동 2",
    pickupArea: "용전동",
    dropoffRegion: "대전 동구",
    dropoffDong: "홍도동",
    completedAt: "2026-06-01T20:45:00+09:00",
    assignedAt: "2026-06-01T20:25:00+09:00",
    peakTime: "Post_Dinner",
    deliveryType: "멀티배달1",
    orderNo: "ORD-002",
  },
  {
    weekCode: "2026_05-4",
    riderId: "r-002",
    riderName: "Rider Two",
    pickupName: "Store C",
    pickupAddress: "대전 동구 가양동 1",
    pickupArea: "가양동",
    dropoffRegion: "대전 동구",
    dropoffDong: "성남동",
    completedAt: "2026-06-01T12:20:00+09:00",
    assignedAt: "2026-06-01T12:00:00+09:00",
    peakTime: "Lunch_Peak",
    deliveryType: "단건배달",
    orderNo: "ORD-003",
  },
  {
    weekCode: "2026_05-4",
    riderId: "r-002",
    riderName: "Rider Two",
    pickupName: "Store D",
    pickupAddress: "대전 동구 홍도동 1",
    pickupArea: "홍도동",
    dropoffRegion: "대전 동구",
    dropoffDong: "가양동",
    completedAt: "2026-06-02T20:20:00+09:00",
    assignedAt: "2026-06-02T20:00:00+09:00",
    peakTime: "Post_Dinner",
    deliveryType: "단건배달",
    orderNo: "ORD-004",
  },
  {
    weekCode: "2026_05-3",
    riderId: "r-001",
    riderName: "Rider One",
    pickupName: "Store E",
    pickupAddress: "대전 동구 판암동 1",
    pickupArea: "판암동",
    dropoffRegion: "대전 동구",
    dropoffDong: "용운동",
    completedAt: "2026-05-26T20:20:00+09:00",
    assignedAt: "2026-05-26T20:00:00+09:00",
    peakTime: "Post_Dinner",
    deliveryType: "단건배달",
    orderNo: "ORD-005",
  },
];

describe("rider position recommendation", () => {
  it("summarizes completed calls by normalized pickup area", () => {
    expect(normalizePickupArea(" 용전동 ")).toBe("용전동");

    const stats = summarizePickupAreas(sampleOrders, { weekCode: "2026_05-4", topN: 3 });

    expect(stats.map((stat) => [stat.pickupArea, stat.completedCount])).toEqual([
      ["용전동", 2],
      ["가양동", 1],
      ["홍도동", 1],
    ]);
  });

  it("filters pickup area summaries by weekday", () => {
    expect(getWeekdayFromDate("2026-06-01T12:00:00+09:00")).toBe("monday");

    const stats = summarizePickupAreas(sampleOrders, { weekCode: "2026_05-4", weekday: "tuesday" });

    expect(stats.map((stat) => stat.pickupArea)).toEqual(["홍도동"]);
  });

  it("uses peak time first and filters recommendations by time slot", () => {
    expect(getTimeSlotFromDate("2026-06-01T09:00:00+09:00", "Post_Dinner")).toBe("post_dinner");
    expect(getTimeSlotFromDate("2026-06-01T12:10:00+09:00")).toBe("lunch_peak");

    const result = recommendPickupAreasByTimeSlot(sampleOrders, {
      weekCode: "2026_05-4",
      weekday: "monday",
      timeSlot: "post_dinner",
      topN: 3,
    });

    expect(result.recommendations.map((recommendation) => recommendation.pickupArea)).toEqual(["용전동"]);
    expect(result.reason).toBe("선택 주차 같은 시간대 픽업이 많았던 권역입니다.");
    expect(result.fallbackUsed).toBe(false);
  });

  it("returns rider-scoped recommendation when rider has matching history", () => {
    const result = recommendPickupAreasForRider(sampleOrders, {
      weekCode: "2026_05-4",
      riderId: "r-001",
      weekday: "monday",
      timeSlot: "post_dinner",
      topN: 3,
    });

    expect(result.riderContext).toMatchObject({ riderId: "r-001", riderName: "Rider One" });
    expect(result.recommendations.map((recommendation) => [recommendation.pickupArea, recommendation.completedCount])).toEqual([
      ["용전동", 2],
    ]);
    expect(result.reason).toBe("본인 수행 이력이 있는 픽업 밀집 권역입니다.");
  });

  it("falls back to overall pickup areas when rider data is insufficient", () => {
    const result = recommendPickupAreasForRider(sampleOrders, {
      weekCode: "2026_05-4",
      riderId: "r-999",
      weekday: "monday",
      timeSlot: "post_dinner",
      topN: 3,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.reason).toBe("데이터가 부족해 전체 픽업 상위 권역을 참고합니다.");
    expect(result.recommendations.map((recommendation) => recommendation.pickupArea)).toEqual(["용전동"]);
  });

  it("keeps dropoff data at dong precision and exposes no realtime location fields", () => {
    const result = recommendPickupAreasByTimeSlot(sampleOrders, {
      weekCode: "2026_05-4",
      timeSlot: "post_dinner",
      topN: 1,
    });
    const recommendation = result.recommendations[0];

    expect(recommendation.dropoffPrecision).toBe("dong");
    expect(recommendation.dropoffDongs).toEqual(["중앙동", "홍도동"]);
    expect(Object.hasOwn(recommendation, "dropoffAddress")).toBe(false);

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("gps");
    expect(serialized).not.toContain("latitude");
    expect(serialized).not.toContain("longitude");
    expect(serialized).not.toContain("currentlocation");
  });
});
