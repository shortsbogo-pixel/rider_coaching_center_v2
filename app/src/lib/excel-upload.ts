export const ORDER_DETAIL_SHEET_NAME = "오더별 상세 내역서";
export const ORDER_HEADER_ROW_INDEX = 6;
export const ORDER_DATA_START_INDEX = 8;

export type NormalizedDeliveryType = "단건배달" | "멀티배달";
export type UploadStatus = "ready" | "blocked" | "error";

export type UploadIssueType =
  | "delivery_type_missing"
  | "delivery_type_unknown"
  | "peak_time_missing"
  | "rider_name_missing"
  | "order_number_missing"
  | "time_value_missing";

export interface WeekInfo {
  weekCode: string;
  weekLabel: string;
}

export interface UploadIssue {
  rowNumber: number;
  type: UploadIssueType;
  field: string;
  message: string;
  riderName?: string;
  orderNumber?: string;
}

export interface ParsedOrderPreview {
  rowNumber: number;
  riderName: string;
  orderNumber: string;
  storeName: string;
  pickupArea: string;
  dropoffArea: string;
  assignedAt: unknown;
  acceptedAt: unknown;
  completedAt: unknown;
  durationValue: unknown;
  peakTime: string;
  distanceM: unknown;
  deliveryType: NormalizedDeliveryType;
  rawDeliveryType: unknown;
  settlementAmount: unknown;
}

export interface RiderUploadSummary {
  riderName: string;
  completedCount: number;
  activeDays: number;
  multiRate: number;
  postLunchRate: number;
  postDinnerRate: number;
}

export type IssueSummary = Record<UploadIssueType, number>;

export interface OrderDetailParseResult {
  status: UploadStatus;
  fileName: string;
  weekCode: string | null;
  weekLabel: string | null;
  headerFound: boolean;
  missingHeaders: string[];
  totalRows: number;
  validOrderCount: number;
  issueCount: number;
  issueSummary: IssueSummary;
  issues: UploadIssue[];
  parsedOrders: ParsedOrderPreview[];
  riderSummaries: RiderUploadSummary[];
  errorMessage?: string;
}

type SheetCell = unknown;
type SheetRow = SheetCell[];

const requiredHeaders = [
  "이름",
  "축약형 주문번호",
  "스토어명",
  "배정시간",
  "수락시간",
  "배달시간",
  "배달소요시간",
  "피크타임",
  "배달타입",
];

const timeHeaders = ["배정시간", "수락시간", "배달시간", "배달소요시간"];

function createIssueSummary(): IssueSummary {
  return {
    delivery_type_missing: 0,
    delivery_type_unknown: 0,
    peak_time_missing: 0,
    rider_name_missing: 0,
    order_number_missing: 0,
    time_value_missing: 0,
  };
}

function cleanText(value: SheetCell): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isBlankCell(value: SheetCell): boolean {
  return cleanText(value) === "";
}

function isBlankOrderRow(row: SheetRow): boolean {
  return row.slice(1, 25).every(isBlankCell);
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function extractWeekFromFileName(fileName: string): WeekInfo | null {
  const match = /^동구바로_대전_동구중앙_(\d{4})_(\d{2})-(\d+)\.xlsx$/u.exec(fileName);
  if (!match) return null;

  const [, year, month, week] = match;
  return {
    weekCode: `${year}_${month}-${week}`,
    weekLabel: `${toNumber(month)}월${toNumber(week)}주차`,
  };
}

export function normalizeDeliveryType(value: SheetCell): {
  normalized: NormalizedDeliveryType | null;
  issueType?: "delivery_type_missing" | "delivery_type_unknown";
  message?: string;
} {
  const text = cleanText(value);

  if (!text) {
    return {
      normalized: null,
      issueType: "delivery_type_missing",
      message: "배달타입이 비어 있습니다.",
    };
  }

  if (text === "0" || text === "단건" || text === "단건배달") {
    return { normalized: "단건배달" };
  }

  if (text === "멀티배달" || /^멀티배달[1-5]$/u.test(text)) {
    return { normalized: "멀티배달" };
  }

  return {
    normalized: null,
    issueType: "delivery_type_unknown",
    message: `알 수 없는 배달타입입니다: ${text}`,
  };
}

function createHeaderMap(headerRow: SheetRow | undefined) {
  const map = new Map<string, number>();
  const headerCells = headerRow ?? [];
  headerCells.slice(1, 25).forEach((cell, offset) => {
    const name = cleanText(cell);
    if (name) map.set(name, offset + 1);
  });
  return map;
}

function getCell(row: SheetRow, headerMap: Map<string, number>, headerName: string) {
  const columnIndex = headerMap.get(headerName);
  if (columnIndex === undefined) return "";
  return row[columnIndex];
}

function addIssue(
  issues: UploadIssue[],
  issueSummary: IssueSummary,
  issue: UploadIssue,
) {
  issues.push(issue);
  issueSummary[issue.type] += 1;
}

function getDateKey(value: SheetCell): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && value > 25569) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }

  const text = cleanText(value);
  const ymd = /(\d{4})[-/.년\s]+(\d{1,2})[-/.월\s]+(\d{1,2})/u.exec(text);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }

  const md = /(^|\D)(\d{1,2})[-/.](\d{1,2})(\D|$)/u.exec(text);
  if (md) {
    return `${md[2].padStart(2, "0")}-${md[3].padStart(2, "0")}`;
  }

  return null;
}

function buildRiderSummaries(orders: ParsedOrderPreview[]): RiderUploadSummary[] {
  const grouped = new Map<
    string,
    {
      completedCount: number;
      activeDays: Set<string>;
      multiCount: number;
      postLunchCount: number;
      postDinnerCount: number;
    }
  >();

  orders.forEach((order) => {
    const current =
      grouped.get(order.riderName) ??
      {
        completedCount: 0,
        activeDays: new Set<string>(),
        multiCount: 0,
        postLunchCount: 0,
        postDinnerCount: 0,
      };

    current.completedCount += 1;
    if (order.deliveryType === "멀티배달") current.multiCount += 1;
    if (order.peakTime === "Post_Lunch") current.postLunchCount += 1;
    if (order.peakTime === "Post_Dinner") current.postDinnerCount += 1;

    const dateKey = getDateKey(order.acceptedAt) ?? getDateKey(order.completedAt);
    if (dateKey) current.activeDays.add(dateKey);

    grouped.set(order.riderName, current);
  });

  return Array.from(grouped.entries())
    .map(([riderName, summary]) => ({
      riderName,
      completedCount: summary.completedCount,
      activeDays: summary.activeDays.size,
      multiRate: summary.completedCount ? summary.multiCount / summary.completedCount : 0,
      postLunchRate: summary.completedCount ? summary.postLunchCount / summary.completedCount : 0,
      postDinnerRate: summary.completedCount ? summary.postDinnerCount / summary.completedCount : 0,
    }))
    .sort((a, b) => b.completedCount - a.completedCount || a.riderName.localeCompare(b.riderName, "ko"));
}

export function parseOrderDetailRows(input: {
  fileName: string;
  rows: SheetRow[];
}): OrderDetailParseResult {
  const { fileName, rows } = input;
  const weekInfo = extractWeekFromFileName(fileName);
  const issueSummary = createIssueSummary();
  const issues: UploadIssue[] = [];

  const baseResult = {
    fileName,
    weekCode: weekInfo?.weekCode ?? null,
    weekLabel: weekInfo?.weekLabel ?? null,
    totalRows: 0,
    validOrderCount: 0,
    issueCount: 0,
    issueSummary,
    issues,
    parsedOrders: [],
    riderSummaries: [],
  };

  if (!weekInfo) {
    return {
      ...baseResult,
      status: "blocked",
      headerFound: false,
      missingHeaders: requiredHeaders,
      errorMessage: "파일명에서 주차 코드를 추출할 수 없습니다.",
    };
  }

  const headerMap = createHeaderMap(rows[ORDER_HEADER_ROW_INDEX]);
  const missingHeaders = requiredHeaders.filter((header) => !headerMap.has(header));

  if (missingHeaders.length > 0) {
    return {
      ...baseResult,
      status: "error",
      headerFound: false,
      missingHeaders,
      errorMessage: `필수 헤더를 찾을 수 없습니다: ${missingHeaders.join(", ")}`,
    };
  }

  const parsedOrders: ParsedOrderPreview[] = [];

  rows.slice(ORDER_DATA_START_INDEX).forEach((row, rowOffset) => {
    if (isBlankOrderRow(row)) return;

    const rowNumber = ORDER_DATA_START_INDEX + rowOffset + 1;
    const riderName = cleanText(getCell(row, headerMap, "이름"));
    const orderNumber = cleanText(getCell(row, headerMap, "축약형 주문번호"));
    const storeName = cleanText(getCell(row, headerMap, "스토어명"));
    const pickupArea = cleanText(getCell(row, headerMap, "픽업지역"));
    const dropoffArea = cleanText(getCell(row, headerMap, "배달지역"));
    const peakTime = cleanText(getCell(row, headerMap, "피크타임"));
    const rawDeliveryType = getCell(row, headerMap, "배달타입");
    const deliveryType = normalizeDeliveryType(rawDeliveryType);
    const missingTimeValue = timeHeaders.some((header) => isBlankCell(getCell(row, headerMap, header)));
    const beforeIssueCount = issues.length;

    if (!riderName) {
      addIssue(issues, issueSummary, {
        rowNumber,
        type: "rider_name_missing",
        field: "이름",
        message: "라이더 이름이 비어 있습니다.",
        orderNumber,
      });
    }

    if (!orderNumber) {
      addIssue(issues, issueSummary, {
        rowNumber,
        type: "order_number_missing",
        field: "축약형 주문번호",
        message: "주문번호가 비어 있습니다.",
        riderName,
      });
    }

    if (!peakTime) {
      addIssue(issues, issueSummary, {
        rowNumber,
        type: "peak_time_missing",
        field: "피크타임",
        message: "피크타임이 비어 있습니다.",
        riderName,
        orderNumber,
      });
    }

    if (deliveryType.issueType) {
      addIssue(issues, issueSummary, {
        rowNumber,
        type: deliveryType.issueType,
        field: "배달타입",
        message: deliveryType.message ?? "배달타입을 확인해야 합니다.",
        riderName,
        orderNumber,
      });
    }

    if (missingTimeValue) {
      addIssue(issues, issueSummary, {
        rowNumber,
        type: "time_value_missing",
        field: "배정/수락/배달/소요시간",
        message: "필수 시간값 중 비어 있는 값이 있습니다.",
        riderName,
        orderNumber,
      });
    }

    if (issues.length === beforeIssueCount && deliveryType.normalized) {
      parsedOrders.push({
        rowNumber,
        riderName,
        orderNumber,
        storeName,
        pickupArea,
        dropoffArea,
        assignedAt: getCell(row, headerMap, "배정시간"),
        acceptedAt: getCell(row, headerMap, "수락시간"),
        completedAt: getCell(row, headerMap, "배달시간"),
        durationValue: getCell(row, headerMap, "배달소요시간"),
        peakTime,
        distanceM: getCell(row, headerMap, "배달거리(m)"),
        deliveryType: deliveryType.normalized,
        rawDeliveryType,
        settlementAmount: getCell(row, headerMap, "정산금액"),
      });
    }
  });

  return {
    ...baseResult,
    status: "ready",
    headerFound: true,
    missingHeaders,
    totalRows: rows.slice(ORDER_DATA_START_INDEX).filter((row) => !isBlankOrderRow(row)).length,
    validOrderCount: parsedOrders.length,
    issueCount: issues.length,
    issueSummary,
    issues,
    parsedOrders,
    riderSummaries: buildRiderSummaries(parsedOrders),
  };
}
