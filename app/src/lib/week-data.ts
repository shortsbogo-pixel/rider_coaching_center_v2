import {
  coachingMessages,
  latestUploadedWeek,
  orders,
  riderMetrics,
  segmentLabels,
  type CoachingMessage,
  type DeliveryType,
  type OrderRecord,
  type RiderMetric,
  type SegmentKey,
  type UserSession,
} from "./domain";
import type { OrderDetailParseResult, ParsedOrderPreview } from "./excel-upload";

export type WeekDataSource = "sample" | "uploaded";

export interface LatestUploadedWeekData {
  source: WeekDataSource;
  sourceLabel: string;
  weekCode: string;
  weekLabel: string;
  fileName: string;
  orders: OrderRecord[];
  metrics: RiderMetric[];
  coachingMessages: CoachingMessage[];
  parseResult: OrderDetailParseResult | null;
}

export interface AdminDashboardSummary {
  completed: number;
  activeRiders: number;
  issueRows: number;
  issueCount: number;
  visibleMessages: number;
}

const segmentKeys: SegmentKey[] = ["Breakfast", "Lunch_Peak", "Post_Lunch", "Dinner_Peak", "Post_Dinner"];
const knownRiderProfiles = [
  { riderId: "r-001", name: "김수환" },
  { riderId: "r-002", name: "박태우" },
];

export function buildSampleWeekData(): LatestUploadedWeekData {
  return {
    source: "sample",
    sourceLabel: "샘플 데이터",
    weekCode: latestUploadedWeek.weekCode,
    weekLabel: latestUploadedWeek.weekLabel,
    fileName: "샘플 데이터",
    orders,
    metrics: riderMetrics,
    coachingMessages,
    parseResult: null,
  };
}

export function buildLatestUploadedWeekData(parseResult: OrderDetailParseResult): LatestUploadedWeekData {
  const riderIdMap = assignRiderIds(parseResult.riderSummaries.map((summary) => summary.riderName));
  const convertedOrders = parseResult.parsedOrders.map((order) => toOrderRecord(order, parseResult, riderIdMap));
  const metrics = buildMetrics(parseResult, convertedOrders, riderIdMap);
  const messages = metrics.map((metric) => buildCoachingMessage(metric, parseResult.weekLabel ?? ""));

  return {
    source: "uploaded",
    sourceLabel: "업로드 데이터",
    weekCode: parseResult.weekCode ?? "",
    weekLabel: parseResult.weekLabel ?? "",
    fileName: parseResult.fileName,
    orders: convertedOrders,
    metrics,
    coachingMessages: messages,
    parseResult,
  };
}

export function applyParsedUploadResult(
  currentWeekData: LatestUploadedWeekData,
  parseResult: OrderDetailParseResult,
): LatestUploadedWeekData {
  if (parseResult.status !== "ready") return currentWeekData;
  return buildLatestUploadedWeekData(parseResult);
}

export function getAdminDashboardSummary(weekData: LatestUploadedWeekData): AdminDashboardSummary {
  const issueRows = weekData.parseResult ? new Set(weekData.parseResult.issues.map((issue) => issue.rowNumber)).size : 0;
  return {
    completed: weekData.metrics.reduce((sum, metric) => sum + metric.completedCount, 0),
    activeRiders: weekData.metrics.length,
    issueRows,
    issueCount: weekData.parseResult?.issueCount ?? 0,
    visibleMessages: weekData.coachingMessages.filter((message) => message.visibleToRider).length,
  };
}

export function getWeekOrdersForUser(weekData: LatestUploadedWeekData, user: UserSession): OrderRecord[] {
  if (user.accountStatus !== "active") return [];
  if (user.role === "admin") return weekData.orders;
  return weekData.orders.filter((order) => order.riderId === user.riderId);
}

export function getWeekMetricsForUser(weekData: LatestUploadedWeekData, user: UserSession): RiderMetric[] {
  if (user.accountStatus !== "active") return [];
  if (user.role === "admin") return weekData.metrics;
  return weekData.metrics.filter((metric) => metric.riderId === user.riderId);
}

export function getWeekMetricForUser(weekData: LatestUploadedWeekData, user: UserSession): RiderMetric | undefined {
  return getWeekMetricsForUser(weekData, user)[0];
}

export function getWeekCoachingForRider(weekData: LatestUploadedWeekData, riderId: string): CoachingMessage | undefined {
  return weekData.coachingMessages.find((message) => message.riderId === riderId);
}

function assignRiderIds(riderNames: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const usedIds = new Set<string>();
  const uniqueNames = Array.from(new Set(riderNames));

  uniqueNames.forEach((riderName) => {
    const profile = knownRiderProfiles.find((candidate) => riderName.includes(candidate.name));
    if (profile && !usedIds.has(profile.riderId)) {
      map.set(riderName, profile.riderId);
      usedIds.add(profile.riderId);
    }
  });

  uniqueNames.forEach((riderName, index) => {
    if (map.has(riderName)) return;
    const profile = knownRiderProfiles.find((candidate) => !usedIds.has(candidate.riderId));
    const riderId = profile?.riderId ?? `upload-rider-${String(index + 1).padStart(3, "0")}`;
    map.set(riderName, riderId);
    usedIds.add(riderId);
  });

  return map;
}

function toOrderRecord(
  order: ParsedOrderPreview,
  parseResult: OrderDetailParseResult,
  riderIdMap: Map<string, string>,
): OrderRecord {
  return {
    id: order.orderNumber,
    weekCode: parseResult.weekCode ?? "",
    weekLabel: parseResult.weekLabel ?? "",
    riderId: riderIdMap.get(order.riderName) ?? order.riderName,
    riderName: order.riderName,
    storeName: order.storeName || "스토어명 미기재",
    pickupArea: order.pickupArea || "픽업지역 미기재",
    dropoffArea: order.dropoffArea || "배달지역 미기재",
    acceptedAt: formatCellDate(order.acceptedAt),
    completedAt: formatCellDate(order.completedAt),
    durationMin: parseDurationMinutes(order.durationValue),
    timeSegment: toSegmentKey(order.peakTime) ?? "Post_Lunch",
    deliveryType: toDeliveryType(order),
    status: "완료",
    settlementAmount: parseNumeric(order.settlementAmount),
  };
}

function buildMetrics(
  parseResult: OrderDetailParseResult,
  convertedOrders: OrderRecord[],
  riderIdMap: Map<string, string>,
): RiderMetric[] {
  return parseResult.riderSummaries.map((summary) => {
    const riderOrders = convertedOrders.filter((order) => order.riderName === summary.riderName);
    const segmentCompleted = createSegmentCount();
    const deliveryTypeCompleted = createDeliveryTypeCount();
    const weekdayCompleted: Record<string, number> = {};

    riderOrders.forEach((order) => {
      segmentCompleted[order.timeSegment] += 1;
      deliveryTypeCompleted[order.deliveryType] += 1;
      const weekday = getKoreanWeekday(order.acceptedAt);
      weekdayCompleted[weekday] = (weekdayCompleted[weekday] ?? 0) + 1;
    });

    const completedCount = riderOrders.length;
    const activeDays = new Set(riderOrders.map((order) => getDatePart(order.acceptedAt)).filter(Boolean)).size || summary.activeDays;
    const expectedSettlement = riderOrders.reduce((sum, order) => sum + order.settlementAmount, 0);
    const distanceKm = parseResult.parsedOrders
      .filter((order) => order.riderName === summary.riderName)
      .reduce((sum, order) => sum + parseNumeric(order.distanceM) / 1000, 0);
    const strongSegment = findSegment(segmentCompleted, "max");
    const weakSegment = findSegment(segmentCompleted, "min");
    const dispatchScore = calculateDispatchScore(completedCount, activeDays, summary.multiRate, summary.postLunchRate, summary.postDinnerRate);

    return {
      riderId: riderIdMap.get(summary.riderName) ?? summary.riderName,
      riderName: summary.riderName,
      weekLabel: parseResult.weekLabel ?? "",
      completedCount,
      activeDays,
      dispatchScore,
      grade: gradeFromScore(dispatchScore),
      expectedSettlement,
      distanceKm: Math.round(distanceKm * 10) / 10,
      multiRate: summary.multiRate,
      postLunchRate: summary.postLunchRate,
      postDinnerRate: summary.postDinnerRate,
      strongSegment,
      weakSegment,
      segmentCompleted,
      deliveryTypeCompleted,
      weekdayCompleted: fillWeekdayCounts(weekdayCompleted),
      coachingPoints: [
        `${segmentLabels[strongSegment]} 구간 수행이 가장 많습니다.`,
        `${segmentLabels[weakSegment]} 구간은 보강 여지가 있습니다.`,
      ],
      actionItems: [
        `${segmentLabels[weakSegment]} 구간에서 1~2건 추가 목표`,
        "강한 구간의 운행 패턴은 유지",
      ],
      mission: `${segmentLabels[weakSegment]} 구간 보강과 ${segmentLabels[strongSegment]} 구간 유지가 이번 주 핵심입니다.`,
    };
  });
}

function buildCoachingMessage(metric: RiderMetric, weekLabel: string): CoachingMessage {
  const autoMessage = `${metric.riderName}님의 배차 친화 점수는 ${metric.dispatchScore}점이며 이번 주 등급은 ${metric.grade}입니다. ${metric.strongSegment} 참여는 강점이고, ${metric.weakSegment} 구간은 보강 후보입니다.`;
  return {
    riderId: metric.riderId,
    riderName: metric.riderName,
    weekLabel,
    autoMessage,
    customMessage: autoMessage,
    visibleToRider: true,
    internalMemo: "업로드 데이터에서 생성된 코칭 초안입니다.",
    updatedAt: "브라우저 세션",
  };
}

function createSegmentCount(): Record<SegmentKey, number> {
  return {
    Breakfast: 0,
    Lunch_Peak: 0,
    Post_Lunch: 0,
    Dinner_Peak: 0,
    Post_Dinner: 0,
  };
}

function createDeliveryTypeCount(): Record<DeliveryType, number> {
  return {
    단건: 0,
    멀티배달1: 0,
    멀티배달2: 0,
    멀티배달3: 0,
    멀티배달4: 0,
    멀티배달5: 0,
    확인필요: 0,
  };
}

function toSegmentKey(value: string): SegmentKey | null {
  return segmentKeys.includes(value as SegmentKey) ? (value as SegmentKey) : null;
}

function toDeliveryType(order: ParsedOrderPreview): DeliveryType {
  const raw = String(order.rawDeliveryType ?? "").trim();
  if (order.deliveryType === "단건배달") return "단건";
  if (/^멀티배달[1-5]$/u.test(raw)) return raw as DeliveryType;
  if (order.deliveryType === "멀티배달") return "멀티배달1";
  return "확인필요";
}

function parseNumeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDurationMinutes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 0 && value < 1) return Math.round(value * 24 * 60);
    return Math.round(value);
  }

  const text = String(value ?? "").trim();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/u.exec(text);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  return hours * 60 + minutes + Math.round(seconds / 60);
}

function formatCellDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hour = String(value.getHours()).padStart(2, "0");
    const minute = String(value.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hour}:${minute}`;
  }
  return String(value ?? "").trim();
}

function getDatePart(value: string): string {
  return value.split(" ")[0] ?? "";
}

function getKoreanWeekday(value: string): string {
  const datePart = getDatePart(value);
  const [month, day] = datePart.split("/").map(Number);
  if (!month || !day) return "기타";
  const date = new Date(2026, month - 1, day);
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
}

function fillWeekdayCounts(input: Record<string, number>): Record<string, number> {
  return {
    수: input["수"] ?? 0,
    목: input["목"] ?? 0,
    금: input["금"] ?? 0,
    토: input["토"] ?? 0,
    일: input["일"] ?? 0,
    월: input["월"] ?? 0,
    화: input["화"] ?? 0,
  };
}

function findSegment(segmentCompleted: Record<SegmentKey, number>, mode: "max" | "min"): SegmentKey {
  return segmentKeys.reduce((selected, segment) => {
    if (mode === "max") return segmentCompleted[segment] > segmentCompleted[selected] ? segment : selected;
    return segmentCompleted[segment] < segmentCompleted[selected] ? segment : selected;
  }, segmentKeys[0]);
}

function calculateDispatchScore(
  completedCount: number,
  activeDays: number,
  multiRate: number,
  postLunchRate: number,
  postDinnerRate: number,
): number {
  const score = completedCount * 0.18 + activeDays * 5 + multiRate * 30 + postLunchRate * 10 + postDinnerRate * 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gradeFromScore(score: number): string {
  if (score >= 85) return "에이스";
  if (score >= 60) return "허용";
  return "보강";
}
