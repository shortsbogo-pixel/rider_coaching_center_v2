export type Role = "admin" | "rider";
export type AccountStatus = "active" | "pending" | "inactive";
export type ViewKey = "admin:dashboard" | "rider:home" | "pending";
export type AdminScreen = "dashboard" | "upload" | "inspect" | "coaching" | "more";
export type RiderScreen = "home" | "orders" | "map" | "coaching" | "my";
export type SegmentKey = "Breakfast" | "Lunch_Peak" | "Post_Lunch" | "Dinner_Peak" | "Post_Dinner";
export type DeliveryType = "단건" | "멀티배달1" | "멀티배달2" | "멀티배달3" | "확인필요";

export interface UserSession {
  id: string;
  role: Role;
  accountStatus: AccountStatus;
  displayName: string;
  riderId?: string;
  homeView: ViewKey;
}

export interface AppTab {
  key: AdminScreen | RiderScreen;
  label: string;
}

export interface RiderMetric {
  riderId: string;
  riderName: string;
  weekLabel: string;
  completedCount: number;
  activeDays: number;
  dispatchScore: number;
  grade: string;
  expectedSettlement: number;
  distanceKm: number;
  multiRate: number;
  postLunchRate: number;
  postDinnerRate: number;
  strongSegment: SegmentKey;
  weakSegment: SegmentKey;
  segmentCompleted: Record<SegmentKey, number>;
  deliveryTypeCompleted: Record<DeliveryType, number>;
  weekdayCompleted: Record<string, number>;
  coachingPoints: string[];
  actionItems: string[];
  mission: string;
}

export interface OrderRecord {
  id: string;
  riderId: string;
  riderName: string;
  storeName: string;
  pickupArea: string;
  dropoffArea: string;
  acceptedAt: string;
  completedAt: string;
  durationMin: number;
  timeSegment: SegmentKey;
  deliveryType: DeliveryType;
  status: "완료" | "진행중" | "취소";
  settlementAmount: number;
}

export interface CoachingMessage {
  riderId: string;
  riderName: string;
  weekLabel: string;
  autoMessage: string;
  customMessage: string;
  visibleToRider: boolean;
  internalMemo: string;
  updatedAt: string;
}

interface TestUser extends UserSession {
  password: string;
}

export const adminTabs: AppTab[] = [
  { key: "dashboard", label: "대시보드" },
  { key: "upload", label: "업로드" },
  { key: "inspect", label: "검수" },
  { key: "coaching", label: "코칭" },
  { key: "more", label: "더보기" },
];

export const riderTabs: AppTab[] = [
  { key: "home", label: "내현황" },
  { key: "orders", label: "내오더" },
  { key: "map", label: "내지도" },
  { key: "coaching", label: "내코칭" },
  { key: "my", label: "MY" },
];

export const segmentLabels: Record<SegmentKey, string> = {
  Breakfast: "아침",
  Lunch_Peak: "점심 피크",
  Post_Lunch: "점심 이후",
  Dinner_Peak: "저녁 피크",
  Post_Dinner: "저녁 이후",
};

const testUsers: TestUser[] = [
  {
    id: "admin",
    password: "admin1234",
    role: "admin",
    accountStatus: "active",
    displayName: "관리자",
    homeView: "admin:dashboard",
  },
  {
    id: "rider1",
    password: "rider1234",
    role: "rider",
    accountStatus: "active",
    displayName: "김수환",
    riderId: "r-001",
    homeView: "rider:home",
  },
  {
    id: "pending",
    password: "pending1234",
    role: "rider",
    accountStatus: "pending",
    displayName: "승인대기 라이더",
    riderId: "r-003",
    homeView: "pending",
  },
];

export const riderMetrics: RiderMetric[] = [
  {
    riderId: "r-001",
    riderName: "김수환",
    weekLabel: "2026년 5월 4주차",
    completedCount: 116,
    activeDays: 5,
    dispatchScore: 61,
    grade: "허용",
    expectedSettlement: 428000,
    distanceKm: 497.6,
    multiRate: 0.81,
    postLunchRate: 0.12,
    postDinnerRate: 0.71,
    strongSegment: "Post_Dinner",
    weakSegment: "Post_Lunch",
    segmentCompleted: {
      Breakfast: 11,
      Lunch_Peak: 24,
      Post_Lunch: 14,
      Dinner_Peak: 25,
      Post_Dinner: 42,
    },
    deliveryTypeCompleted: {
      단건: 22,
      멀티배달1: 38,
      멀티배달2: 34,
      멀티배달3: 17,
      확인필요: 5,
    },
    weekdayCompleted: {
      수: 19,
      목: 21,
      금: 25,
      토: 28,
      일: 23,
      월: 0,
      화: 0,
    },
    coachingPoints: ["Post_Dinner 유지력이 강점입니다.", "Post_Lunch 구간 참여가 낮아 보강 여지가 있습니다."],
    actionItems: ["14:00~16:30 구간에서 2~3콜 추가 목표", "디너 피크 이후 짧게라도 대기 유지"],
    mission: "이번 주는 Post_Lunch 2콜 추가와 Post_Dinner 유지가 핵심입니다.",
  },
  {
    riderId: "r-002",
    riderName: "박태우",
    weekLabel: "2026년 5월 4주차",
    completedCount: 302,
    activeDays: 6,
    dispatchScore: 88,
    grade: "에이스",
    expectedSettlement: 1221047,
    distanceKm: 903.4,
    multiRate: 0.67,
    postLunchRate: 0.22,
    postDinnerRate: 0.34,
    strongSegment: "Dinner_Peak",
    weakSegment: "Breakfast",
    segmentCompleted: {
      Breakfast: 24,
      Lunch_Peak: 74,
      Post_Lunch: 66,
      Dinner_Peak: 84,
      Post_Dinner: 54,
    },
    deliveryTypeCompleted: {
      단건: 99,
      멀티배달1: 86,
      멀티배달2: 70,
      멀티배달3: 39,
      확인필요: 8,
    },
    weekdayCompleted: {
      수: 41,
      목: 49,
      금: 54,
      토: 66,
      일: 52,
      월: 40,
      화: 0,
    },
    coachingPoints: ["완료건수와 멀티 수행이 모두 안정적입니다.", "아침 구간은 선택적으로만 보강하면 됩니다."],
    actionItems: ["현재 피크타임 패턴 유지", "월요일 활동 공백을 줄이면 상위권 유지 가능"],
    mission: "강한 피크타임 패턴을 유지하고 월요일 공백만 줄여보세요.",
  },
];

export const orders: OrderRecord[] = [
  {
    id: "ORD-10482",
    riderId: "r-001",
    riderName: "김수환",
    storeName: "한찜두찜 대전동구점",
    pickupArea: "대전광역시 동구 매봉로",
    dropoffArea: "대전 대덕구 중리동",
    acceptedAt: "05/24 18:12",
    completedAt: "05/24 18:36",
    durationMin: 24,
    timeSegment: "Post_Dinner",
    deliveryType: "멀티배달2",
    status: "완료",
    settlementAmount: 5800,
  },
  {
    id: "ORD-10496",
    riderId: "r-001",
    riderName: "김수환",
    storeName: "GS25 대전꿈돌이점",
    pickupArea: "대전 동구 중앙로",
    dropoffArea: "대전 동구 용전동",
    acceptedAt: "05/25 14:08",
    completedAt: "05/25 14:27",
    durationMin: 19,
    timeSegment: "Post_Lunch",
    deliveryType: "단건",
    status: "완료",
    settlementAmount: 4200,
  },
  {
    id: "ORD-10503",
    riderId: "r-001",
    riderName: "김수환",
    storeName: "동구분식",
    pickupArea: "대전 동구 가양동",
    dropoffArea: "대전 동구 삼성동",
    acceptedAt: "05/26 12:16",
    completedAt: "진행중",
    durationMin: 0,
    timeSegment: "Lunch_Peak",
    deliveryType: "멀티배달1",
    status: "진행중",
    settlementAmount: 0,
  },
  {
    id: "ORD-20411",
    riderId: "r-002",
    riderName: "박태우",
    storeName: "대전중앙버거",
    pickupArea: "대전 동구 원동",
    dropoffArea: "대전 동구 신흥동",
    acceptedAt: "05/24 19:40",
    completedAt: "05/24 20:01",
    durationMin: 21,
    timeSegment: "Dinner_Peak",
    deliveryType: "멀티배달1",
    status: "완료",
    settlementAmount: 6100,
  },
];

export const coachingMessages: CoachingMessage[] = [
  {
    riderId: "r-001",
    riderName: "김수환",
    weekLabel: "2026년 5월 4주차",
    autoMessage:
      "김수환님의 배차 친화 점수는 61점이며 현재 등급은 허용입니다. Post_Dinner 참여율은 강점이고, Post_Lunch 참여는 보강이 필요합니다.",
    customMessage:
      "이번 주는 저녁 이후 흐름이 좋았습니다. 14:00~16:30 구간에서 2~3콜만 더 붙이면 완료건수와 점수가 같이 올라갈 가능성이 큽니다.",
    visibleToRider: true,
    internalMemo: "포스트런치 참여율이 낮음. 다음 주 14:00~16:30 구간 안내 필요.",
    updatedAt: "2026-05-30 02:20",
  },
  {
    riderId: "r-002",
    riderName: "박태우",
    weekLabel: "2026년 5월 4주차",
    autoMessage:
      "박태우님의 배차 친화 점수는 88점이며 현재 등급은 에이스입니다. 피크타임 처리와 멀티 수행이 안정적입니다.",
    customMessage: "현재 패턴을 유지하되 월요일 활동 공백만 줄이면 다음 주에도 상위권 유지가 가능합니다.",
    visibleToRider: false,
    internalMemo: "상위권 유지. 메시지는 내부 검토 후 노출.",
    updatedAt: "2026-05-30 02:22",
  },
];

export function login(id: string, password: string): UserSession | null {
  const found = testUsers.find((user) => user.id === id && user.password === password);
  if (!found) return null;
  return {
    id: found.id,
    role: found.role,
    accountStatus: found.accountStatus,
    displayName: found.displayName,
    riderId: found.riderId,
    homeView: found.homeView,
  };
}

export function getOrdersForUser(user: UserSession): OrderRecord[] {
  if (user.accountStatus !== "active") return [];
  if (user.role === "admin") return orders;
  return orders.filter((order) => order.riderId === user.riderId);
}

export function getRiderMetricsForUser(user: UserSession): RiderMetric[] {
  if (user.accountStatus !== "active") return [];
  if (user.role === "admin") return riderMetrics;
  return riderMetrics.filter((metric) => metric.riderId === user.riderId);
}

export function getCoachingForRider(riderId: string) {
  return coachingMessages.find((message) => message.riderId === riderId);
}

export function validateUploadFileName(fileName: string) {
  if (/정산|최종/.test(fileName)) {
    return { ok: false, message: "정산 또는 최종 파일은 업로드 대상이 아닙니다." };
  }

  const ok = /^동구바로_대전_동구중앙_\d{4}_\d{2}-\d+\.xlsx$/u.test(fileName);
  return {
    ok,
    message: ok ? "원천 엑셀 파일명 규칙과 일치합니다." : "동구바로_대전_동구중앙_YYYY_MM-W.xlsx 형식만 허용됩니다.",
  };
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatWon(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function getAdminSummary() {
  const completed = riderMetrics.reduce((sum, metric) => sum + metric.completedCount, 0);
  const activeRiders = riderMetrics.length;
  const visibleMessages = coachingMessages.filter((message) => message.visibleToRider).length;
  const issueRows = 17;
  return { completed, activeRiders, visibleMessages, issueRows };
}
