import type { OrderRecord } from "./domain";
import {
  getConfidenceLevel,
  getConfidenceLevelLabel,
  recommendPickupAreasForRider,
  type ConfidenceLevel,
  type PositionRecommendationInput,
  type TimeSlotRecommendation,
} from "./rider-position-recommendation";

export interface RiderMapPositionRecommendation {
  rank: number;
  pickupArea: string;
  completedCount: number;
  reason: string;
  confidenceLevel: ConfidenceLevel;
  confidenceLabel: string;
}

export interface RiderMapPositionRecommendationResult {
  weekCode?: string;
  recommendations: RiderMapPositionRecommendation[];
  totalCompletedCount: number;
}

const TOP_RECOMMENDATION_LIMIT = 3;

function buildRiderReason(completedCount: number): string {
  if (completedCount >= 6) {
    return "지난 업로드 주차 기준, 내가 픽업을 많이 수행한 권역입니다.";
  }
  return "선택 주차에 내가 픽업을 많이 수행한 권역에서 참고용 데이터를 완료 콜 수가 많지 않기 때문에 참고용으로만 확인하세요.";
}

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
  const confidenceLevel = getConfidenceLevel(recommendation.completedCount);
  return {
    rank: recommendation.rank,
    pickupArea: recommendation.pickupArea,
    completedCount: recommendation.completedCount,
    reason: buildRiderReason(recommendation.completedCount),
    confidenceLevel,
    confidenceLabel: getConfidenceLevelLabel(confidenceLevel),
  };
}

function createEmptyResult(weekCode?: string): RiderMapPositionRecommendationResult {
  return {
    weekCode,
    recommendations: [],
    totalCompletedCount: 0,
  };
}
