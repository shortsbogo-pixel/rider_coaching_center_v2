import { describe, expect, it } from "vitest";
import type { OrderRecord } from "./domain";
import { getRiderMapPositionRecommendations } from "./rider-map-recommendation";

function makeOrder(patch: Partial<OrderRecord>): OrderRecord {
  return {
    id: patch.id ?? "ORD-1",
    weekCode: patch.weekCode ?? "2026_05-4",
    weekLabel: patch.weekLabel ?? "2026 05-4",
    riderId: patch.riderId ?? "r-001",
    riderName: patch.riderName ?? "Rider One",
    storeName: patch.storeName ?? "Store",
    pickupArea: patch.pickupArea ?? "Yongjeon",
    dropoffArea: patch.dropoffArea ?? "Jungang",
    acceptedAt: patch.acceptedAt ?? "2026-05-24 18:10",
    completedAt: patch.completedAt ?? "2026-05-24 18:35",
    durationMin: patch.durationMin ?? 25,
    timeSegment: patch.timeSegment ?? "Post_Dinner",
    deliveryType: patch.deliveryType ?? "단건",
    status: patch.status ?? "완료",
    settlementAmount: patch.settlementAmount ?? 5000,
  };
}

describe("rider map position recommendations", () => {
  it("returns the signed-in rider's latest week pickup area top 3 only", () => {
    const result = getRiderMapPositionRecommendations(
      [
        makeOrder({ id: "A-1", riderId: "r-001", pickupArea: "A" }),
        makeOrder({ id: "A-2", riderId: "r-001", pickupArea: "A" }),
        makeOrder({ id: "B-1", riderId: "r-001", pickupArea: "B" }),
        makeOrder({ id: "C-1", riderId: "r-001", pickupArea: "C" }),
        makeOrder({ id: "D-1", riderId: "r-001", pickupArea: "D" }),
        makeOrder({ id: "X-1", riderId: "r-002", pickupArea: "Other rider busy area" }),
        makeOrder({ id: "X-2", riderId: "r-002", pickupArea: "Other rider busy area" }),
        makeOrder({ id: "OLD-1", weekCode: "2026_05-3", riderId: "r-001", pickupArea: "Old area" }),
      ],
      "r-001",
    );

    expect(result.recommendations.map((recommendation) => [recommendation.rank, recommendation.pickupArea, recommendation.completedCount])).toEqual([
      [1, "A", 2],
      [2, "B", 1],
      [3, "C", 1],
    ]);
  });

  it("returns an empty state when the signed-in rider has no completed latest week orders", () => {
    const result = getRiderMapPositionRecommendations(
      [
        makeOrder({ id: "A-1", riderId: "r-001", status: "취소" }),
        makeOrder({ id: "B-1", riderId: "r-002", pickupArea: "Other rider area" }),
      ],
      "r-001",
    );

    expect(result.recommendations).toEqual([]);
    expect(result.totalCompletedCount).toBe(0);
  });
});
