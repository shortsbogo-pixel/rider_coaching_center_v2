import type { OrderRecord } from "./domain";
import {
  recommendPickupAreasForRider,
  type PositionRecommendationInput,
  type TimeSlotRecommendation,
} from "./rider-position-recommendation";

export interface RiderMapPositionRecommendation {
  rank: number;
  pickupArea: string;
  completedCount: number;
  reason: string;
}

export interface RiderMapPositionRecommendationResult {
  weekCode?: string;
  recommendations: RiderMapPositionRecommendation[];
  totalCompletedCount: number;
}

const TOP_RECOMMENDATION_LIMIT = 3;
const RIDER_MAP_REASON = "선택 주차 본인 완료 콜이 많은 픽업권역입니다.";

export function getRiderMapPositionRecommendations(
  latestWeekOrders: OrderRecord[],
  riderId: string | undefined,
): RiderMapPositionRecommendationResult {
  if (!riderId) {
    return createEmptyResult();
  }

  const riderWeekCode = latestWeekOrders.find((order) => order.riderId === riderId)?.weekCode;
  if (!riderWeekCode) {
    return createEmptyResult();
  }

  const riderCompletedOrders = latestWeekOrders.filter(
    (order) => order.riderId === riderId && order.weekCode === riderWeekCode && order.status === "완료",
  );

  if (riderCompletedOrders.length === 0) {
    return createEmptyResult(riderWeekCode);
  }

  const result = recommendPickupAreasForRider(riderCompletedOrders.map(toPositionRecommendationInput), {
    weekCode: riderWeekCode,
    riderId,
    topN: TOP_RECOMMENDATION_LIMIT,
  });

  return {
    weekCode: riderWeekCode,
    recommendations: result.recommendations.slice(0, TOP_RECOMMENDATION_LIMIT).map(toRiderMapRecommendation),
    totalCompletedCount: result.totalCompletedCount,
  };
}

function toPositionRecommendationInput(order: OrderRecord): PositionRecommendationInput {
  return {
    weekCode: order.weekCode,
    riderId: order.riderId,
    riderName: order.riderName,
    pickupName: order.storeName,
    pickupArea: order.pickupArea,
    dropoffDong: order.dropoffArea,
    completedAt: order.completedAt,
    assignedAt: order.acceptedAt,
    peakTime: order.timeSegment,
    deliveryType: order.deliveryType,
    orderNo: order.id,
  };
}

function toRiderMapRecommendation(recommendation: TimeSlotRecommendation): RiderMapPositionRecommendation {
  return {
    rank: recommendation.rank,
    pickupArea: recommendation.pickupArea,
    completedCount: recommendation.completedCount,
    reason: RIDER_MAP_REASON,
  };
}

function createEmptyResult(weekCode?: string): RiderMapPositionRecommendationResult {
  return {
    weekCode,
    recommendations: [],
    totalCompletedCount: 0,
  };
}
