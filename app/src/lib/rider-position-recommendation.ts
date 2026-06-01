export type PositionWeekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "unknown";

export type PositionTimeSlot =
  | "morning"
  | "lunch_peak"
  | "post_lunch"
  | "dinner_peak"
  | "post_dinner"
  | "late_night"
  | "unknown";

export type DropoffPrecision = "dong";

export interface PositionRecommendationInput {
  weekCode: string;
  riderId?: string;
  riderName?: string;
  pickupName?: string;
  pickupAddress?: string;
  pickupArea?: string | null;
  dropoffRegion?: string | null;
  dropoffDong?: string | null;
  dropoffPrecision?: DropoffPrecision;
  completedAt?: string | Date | null;
  assignedAt?: string | Date | null;
  peakTime?: string | null;
  deliveryType?: string | null;
  orderNo: string;
}

export interface PositionRecommendationFilters {
  weekCode?: string;
  weekday?: PositionWeekday;
  timeSlot?: PositionTimeSlot;
  riderId?: string;
  topN?: number;
}

export interface PickupAreaStat {
  pickupArea: string;
  completedCount: number;
  riderCount: number;
  dropoffDongs: string[];
  dropoffPrecision: DropoffPrecision;
  timeSlots: PositionTimeSlot[];
  weekdays: PositionWeekday[];
  deliveryTypes: string[];
}

export interface TimeSlotRecommendation extends PickupAreaStat {
  rank: number;
  reason: string;
}

export interface RiderPositionContext {
  riderId: string;
  riderName?: string;
  matchedOrderCount: number;
}

export interface PositionRecommendationResult {
  weekCode?: string;
  weekday?: PositionWeekday;
  timeSlot?: PositionTimeSlot;
  riderContext?: RiderPositionContext;
  recommendations: TimeSlotRecommendation[];
  totalCompletedCount: number;
  fallbackUsed: boolean;
  reason: string;
}

type MutablePickupAreaStat = PickupAreaStat & {
  riderIds: Set<string>;
};

const WEEKDAYS: PositionWeekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DEFAULT_TOP_N = 5;
const UNKNOWN_PICKUP_AREA = "미지정 픽업권역";
const TIME_SLOT_REASON = "선택 주차 같은 시간대 픽업이 많았던 권역입니다.";
const RIDER_HISTORY_REASON = "본인 수행 이력이 있는 픽업 밀집 권역입니다.";
const FALLBACK_REASON = "데이터가 부족해 전체 픽업 상위 권역을 참고합니다.";

export function getWeekdayFromDate(value: string | Date | null | undefined): PositionWeekday {
  if (!value) {
    return "unknown";
  }

  if (value instanceof Date) {
    const day = value.getDay();
    return WEEKDAYS[day] ?? "unknown";
  }

  const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {
    return "unknown";
  }

  const [, year, month, day] = dateMatch;
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const weekday = parsedDate.getUTCDay();

  return WEEKDAYS[weekday] ?? "unknown";
}

export function getTimeSlotFromDate(
  value: string | Date | null | undefined,
  peakTime?: string | null,
): PositionTimeSlot {
  const peakTimeSlot = normalizePeakTime(peakTime);
  if (peakTimeSlot) {
    return peakTimeSlot;
  }

  const hour = getHourFromDateValue(value);
  if (hour === null) {
    return "unknown";
  }

  if (hour >= 5 && hour <= 10) {
    return "morning";
  }

  if (hour >= 11 && hour <= 13) {
    return "lunch_peak";
  }

  if (hour >= 14 && hour <= 16) {
    return "post_lunch";
  }

  if (hour >= 17 && hour <= 19) {
    return "dinner_peak";
  }

  if (hour >= 20 && hour <= 22) {
    return "post_dinner";
  }

  if (hour >= 23 || hour <= 4) {
    return "late_night";
  }

  return "unknown";
}

export function normalizePickupArea(value: string | null | undefined): string {
  const normalizedValue = value?.replace(/\s+/g, " ").trim();
  return normalizedValue || UNKNOWN_PICKUP_AREA;
}

export function summarizePickupAreas(
  orders: PositionRecommendationInput[],
  filters: PositionRecommendationFilters = {},
): PickupAreaStat[] {
  const areaStats = new Map<string, MutablePickupAreaStat>();

  for (const order of orders) {
    if (!matchesFilters(order, filters)) {
      continue;
    }

    const pickupArea = normalizePickupArea(order.pickupArea);
    const weekday = getOrderWeekday(order);
    const timeSlot = getOrderTimeSlot(order);
    const existingStat = areaStats.get(pickupArea);
    const stat =
      existingStat ??
      ({
        pickupArea,
        completedCount: 0,
        riderCount: 0,
        riderIds: new Set<string>(),
        dropoffDongs: [],
        dropoffPrecision: "dong",
        timeSlots: [],
        weekdays: [],
        deliveryTypes: [],
      } satisfies MutablePickupAreaStat);

    stat.completedCount += 1;

    if (order.riderId) {
      stat.riderIds.add(order.riderId);
      stat.riderCount = stat.riderIds.size;
    }

    appendUnique(stat.dropoffDongs, normalizeOptionalText(order.dropoffDong));
    appendUnique(stat.timeSlots, timeSlot);
    appendUnique(stat.weekdays, weekday);
    appendUnique(stat.deliveryTypes, normalizeOptionalText(order.deliveryType));

    areaStats.set(pickupArea, stat);
  }

  return Array.from(areaStats.values())
    .map((stat) => ({
      pickupArea: stat.pickupArea,
      completedCount: stat.completedCount,
      riderCount: stat.riderCount,
      dropoffDongs: stat.dropoffDongs,
      dropoffPrecision: stat.dropoffPrecision,
      timeSlots: stat.timeSlots,
      weekdays: stat.weekdays,
      deliveryTypes: stat.deliveryTypes,
    }))
    .sort((first, second) => {
      if (second.completedCount !== first.completedCount) {
        return second.completedCount - first.completedCount;
      }

      return first.pickupArea.localeCompare(second.pickupArea, "ko-KR");
    })
    .slice(0, getTopN(filters.topN));
}

export function getTopPickupAreasByWeek(
  orders: PositionRecommendationInput[],
  weekCode?: string,
  topN = 5,
): PickupAreaStat[] {
  return summarizePickupAreas(orders, { weekCode, topN });
}

export function recommendPickupAreasByTimeSlot(
  orders: PositionRecommendationInput[],
  filters: PositionRecommendationFilters = {},
): PositionRecommendationResult {
  const primaryStats = summarizePickupAreas(orders, filters);
  const fallbackUsed = primaryStats.length === 0;
  const stats = fallbackUsed ? summarizePickupAreas(orders, buildBroadFallbackFilters(filters)) : primaryStats;
  const reason = fallbackUsed ? FALLBACK_REASON : TIME_SLOT_REASON;

  return buildRecommendationResult({
    filters,
    stats,
    reason,
    fallbackUsed,
  });
}

export function recommendPickupAreasForRider(
  orders: PositionRecommendationInput[],
  filters: PositionRecommendationFilters & { riderId: string },
): PositionRecommendationResult {
  const riderStats = summarizePickupAreas(orders, filters);
  const riderContext = buildRiderContext(orders, filters);

  if (riderStats.length > 0) {
    return buildRecommendationResult({
      filters,
      stats: riderStats,
      reason: RIDER_HISTORY_REASON,
      fallbackUsed: false,
      riderContext,
    });
  }

  const scopedFallbackFilters = buildScopedFallbackFilters({ ...filters, riderId: undefined });
  const scopedFallbackStats = summarizePickupAreas(orders, scopedFallbackFilters);
  const fallbackStats =
    scopedFallbackStats.length > 0
      ? scopedFallbackStats
      : summarizePickupAreas(orders, buildBroadFallbackFilters(filters));

  return buildRecommendationResult({
    filters,
    stats: fallbackStats,
    reason: FALLBACK_REASON,
    fallbackUsed: true,
    riderContext,
  });
}

function normalizePeakTime(value: string | null | undefined): PositionTimeSlot | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const peakTimeMap: Record<string, PositionTimeSlot> = {
    am: "morning",
    breakfast: "morning",
    morning: "morning",
    lunch: "lunch_peak",
    lunch_peak: "lunch_peak",
    peak_lunch: "lunch_peak",
    post_lunch: "post_lunch",
    postlunch: "post_lunch",
    dinner: "dinner_peak",
    dinner_peak: "dinner_peak",
    peak_dinner: "dinner_peak",
    post_dinner: "post_dinner",
    postdinner: "post_dinner",
    late_night: "late_night",
    latenight: "late_night",
    night: "late_night",
  };

  return peakTimeMap[normalizedValue] ?? null;
}

function getHourFromDateValue(value: string | Date | null | undefined): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const hour = value.getHours();
    return Number.isNaN(hour) ? null : hour;
  }

  const hourMatch = value.match(/[T\s](\d{1,2}):/);
  if (!hourMatch) {
    return null;
  }

  const hour = Number(hourMatch[1]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return null;
  }

  return hour;
}

function matchesFilters(order: PositionRecommendationInput, filters: PositionRecommendationFilters): boolean {
  if (filters.weekCode && order.weekCode !== filters.weekCode) {
    return false;
  }

  if (filters.riderId && order.riderId !== filters.riderId) {
    return false;
  }

  if (filters.weekday && getOrderWeekday(order) !== filters.weekday) {
    return false;
  }

  if (filters.timeSlot && getOrderTimeSlot(order) !== filters.timeSlot) {
    return false;
  }

  return true;
}

function getOrderWeekday(order: PositionRecommendationInput): PositionWeekday {
  return getWeekdayFromDate(order.completedAt ?? order.assignedAt);
}

function getOrderTimeSlot(order: PositionRecommendationInput): PositionTimeSlot {
  return getTimeSlotFromDate(order.completedAt ?? order.assignedAt, order.peakTime);
}

function appendUnique<T>(items: T[], value: T | null): void {
  if (!value || items.includes(value)) {
    return;
  }

  items.push(value);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalizedValue = value?.replace(/\s+/g, " ").trim();
  return normalizedValue || null;
}

function getTopN(value: number | undefined): number {
  if (!value || value < 1) {
    return DEFAULT_TOP_N;
  }

  return Math.floor(value);
}

function buildScopedFallbackFilters(filters: PositionRecommendationFilters): PositionRecommendationFilters {
  return {
    weekCode: filters.weekCode,
    weekday: filters.weekday,
    timeSlot: filters.timeSlot,
    topN: filters.topN,
  };
}

function buildBroadFallbackFilters(filters: PositionRecommendationFilters): PositionRecommendationFilters {
  return {
    weekCode: filters.weekCode,
    topN: filters.topN,
  };
}

function buildRiderContext(
  orders: PositionRecommendationInput[],
  filters: PositionRecommendationFilters & { riderId: string },
): RiderPositionContext {
  const riderOrders = orders.filter(
    (order) => order.riderId === filters.riderId && (!filters.weekCode || order.weekCode === filters.weekCode),
  );
  const riderName = riderOrders.find((order) => order.riderName)?.riderName;

  return {
    riderId: filters.riderId,
    riderName,
    matchedOrderCount: riderOrders.length,
  };
}

function buildRecommendationResult({
  filters,
  stats,
  reason,
  fallbackUsed,
  riderContext,
}: {
  filters: PositionRecommendationFilters;
  stats: PickupAreaStat[];
  reason: string;
  fallbackUsed: boolean;
  riderContext?: RiderPositionContext;
}): PositionRecommendationResult {
  return {
    weekCode: filters.weekCode,
    weekday: filters.weekday,
    timeSlot: filters.timeSlot,
    riderContext,
    recommendations: stats.map((stat, index) => ({
      ...stat,
      rank: index + 1,
      reason,
    })),
    totalCompletedCount: stats.reduce((total, stat) => total + stat.completedCount, 0),
    fallbackUsed,
    reason,
  };
}
