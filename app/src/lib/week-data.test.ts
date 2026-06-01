import { describe, expect, it } from "vitest";
import { login } from "./domain";
import { parseOrderDetailRows } from "./excel-upload";
import {
  applyParsedUploadPreview,
  applyParsedUploadResult,
  buildLatestUploadedWeekData,
  buildSampleWeekData,
  cancelParsedUploadPreview,
  createWeekDataUploadState,
  getAdminDashboardSummary,
  getVisibleTopCompletedRiderMetrics,
  getWeekCoachingForRider,
  getWeekMetricForUser,
  getWeekOrdersForUser,
  setParsedUploadPreview,
} from "./week-data";

const headerRow = [
  "",
  "이름",
  "축약형 주문번호",
  "스토어명",
  "픽업지역",
  "배달지역",
  "배정시간",
  "수락시간",
  "배달시간",
  "배달소요시간",
  "피크타임",
  "배달거리(m)",
  "배달타입",
  "픽업 비용",
  "배달 비용",
  "지역 단가",
  "배달거리 할증",
  "픽업지 할증",
  "도착지 할증",
  "기상 할증",
  "기타 프로모션1",
  "기타 프로모션2",
  "기타 프로모션3",
  "기타 프로모션4",
  "정산금액",
];

function makeRows(...dataRows: unknown[][]) {
  return [[], [], [], [], [], [], headerRow, [], ...dataRows];
}

function makeReadyParseResult(orderNumber = "ORD-1") {
  return parseOrderDetailRows({
    fileName: "동구바로_대전_동구중앙_2026_05-4.xlsx",
    rows: makeRows([
      "",
      "김수환",
      orderNumber,
      "가게A",
      "대전 동구",
      "대전 중구",
      "2026-05-20 11:50",
      "2026-05-20 12:01",
      "2026-05-20 12:21",
      "00:20:00",
      "Post_Lunch",
      2100,
      0,
      1000,
      2000,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      6500,
    ]),
  });
}

describe("latest uploaded week data", () => {
  it("falls back to sample data when no upload has been applied", () => {
    const weekData = buildSampleWeekData();
    const admin = login("admin", "admin1234");
    const rider = login("rider1", "rider1234");
    const summary = getAdminDashboardSummary(weekData);

    expect(weekData.source).toBe("sample");
    expect(weekData.sourceLabel).toBe("샘플 데이터");
    expect(summary.completed).toBe(418);
    expect(summary.activeRiders).toBe(2);
    expect(getWeekOrdersForUser(weekData, admin!).length).toBe(4);
    expect(getWeekOrdersForUser(weekData, rider!).every((order) => order.riderId === "r-001")).toBe(true);
    expect(getWeekMetricForUser(weekData, rider!)?.riderId).toBe("r-001");
  });

  it("builds dashboard, coaching, and rider-scoped data from a parsed upload", () => {
    const parseResult = parseOrderDetailRows({
      fileName: "동구바로_대전_동구중앙_2026_05-4.xlsx",
      rows: makeRows(
        [
          "",
          "김수환",
          "ORD-1",
          "가게A",
          "대전 동구",
          "대전 중구",
          "2026-05-20 11:50",
          "2026-05-20 12:01",
          "2026-05-20 12:21",
          "00:20:00",
          "Post_Lunch",
          2100,
          0,
          1000,
          2000,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          6500,
        ],
        [
          "",
          "김수환",
          "ORD-2",
          "가게B",
          "대전 동구",
          "대전 대덕구",
          "2026-05-21 18:00",
          "2026-05-21 18:05",
          "2026-05-21 18:30",
          "00:25:00",
          "Post_Dinner",
          3200,
          "멀티배달5",
          1000,
          2000,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          8200,
        ],
        [
          "",
          "박태우",
          "ORD-3",
          "가게C",
          "대전 서구",
          "대전 유성구",
          "2026-05-21 12:00",
          "2026-05-21 12:04",
          "2026-05-21 12:24",
          "00:20:00",
          "Lunch_Peak",
          1500,
          "멀티배달1",
          1000,
          2000,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          7000,
        ],
        [
          "",
          "확인대상",
          "ORD-4",
          "가게D",
          "대전 동구",
          "대전 중구",
          "",
          "",
          "",
          "",
          "",
          1000,
          "",
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          3000,
        ],
      ),
    });
    const weekData = buildLatestUploadedWeekData(parseResult);
    const rider = login("rider1", "rider1234");
    const summary = getAdminDashboardSummary(weekData);

    expect(weekData.source).toBe("uploaded");
    expect(summary).toMatchObject({
      completed: 3,
      activeRiders: 2,
      issueRows: 1,
      issueCount: 3,
    });
    expect(getWeekOrdersForUser(weekData, rider!).map((order) => order.id)).toEqual(["ORD-1", "ORD-2"]);
    expect(getWeekOrdersForUser(weekData, rider!).every((order) => order.riderId === "r-001")).toBe(true);
    expect(getWeekOrdersForUser(weekData, login("pending", "pending1234")!)).toEqual([]);
    expect(getWeekMetricForUser(weekData, rider!)?.riderName).toBe("김수환");
    expect(getWeekCoachingForRider(weekData, "r-001")?.autoMessage).toContain("김수환님");
  });

  it("keeps the current week data when a parsed upload is not ready", () => {
    const readyParseResult = makeReadyParseResult();
    const uploadedWeekData = buildLatestUploadedWeekData(readyParseResult);
    const blockedParseResult = {
      ...readyParseResult,
      status: "blocked" as const,
      fileName: "동구바로_대전_동구중앙_2026_05-4_정산.xlsx",
      errorMessage: "정산/최종 파일은 업로드할 수 없습니다.",
    };

    expect(applyParsedUploadResult(uploadedWeekData, blockedParseResult)).toBe(uploadedWeekData);
    expect(applyParsedUploadResult(buildSampleWeekData(), readyParseResult).source).toBe("uploaded");
  });

  it("keeps preview data separate from the applied latest week data", () => {
    const readyParseResult = makeReadyParseResult();
    const initialState = createWeekDataUploadState();
    const previewState = setParsedUploadPreview(initialState, readyParseResult);

    expect(previewState.parsedUploadPreview).toBe(readyParseResult);
    expect(previewState.latestUploadedWeekData.source).toBe("sample");
    expect(getAdminDashboardSummary(previewState.latestUploadedWeekData).completed).toBe(418);

    const appliedState = applyParsedUploadPreview(previewState);

    expect(appliedState.parsedUploadPreview).toBeNull();
    expect(appliedState.latestUploadedWeekData.source).toBe("uploaded");
    expect(getAdminDashboardSummary(appliedState.latestUploadedWeekData).completed).toBe(1);
  });

  it("keeps applied data when a preview is canceled", () => {
    const appliedWeekData = buildLatestUploadedWeekData(makeReadyParseResult("APPLIED-1"));
    const previewParseResult = makeReadyParseResult("PREVIEW-1");
    const previewState = setParsedUploadPreview(createWeekDataUploadState(appliedWeekData), previewParseResult);
    const canceledState = cancelParsedUploadPreview(previewState);

    expect(canceledState.parsedUploadPreview).toBeNull();
    expect(canceledState.latestUploadedWeekData).toBe(appliedWeekData);
    expect(canceledState.latestUploadedWeekData.orders.map((order) => order.id)).toEqual(["APPLIED-1"]);
  });

  it("does not apply a preview that is not ready", () => {
    const appliedWeekData = buildLatestUploadedWeekData(makeReadyParseResult("APPLIED-1"));
    const blockedParseResult = {
      ...makeReadyParseResult("BLOCKED-1"),
      status: "blocked" as const,
      fileName: "동구바로_대전_동구중앙_2026_05-4_정산.xlsx",
    };
    const previewState = setParsedUploadPreview(createWeekDataUploadState(appliedWeekData), blockedParseResult);
    const appliedState = applyParsedUploadPreview(previewState);

    expect(appliedState.latestUploadedWeekData).toBe(appliedWeekData);
    expect(appliedState.parsedUploadPreview).toBe(blockedParseResult);
  });

  it("limits top completed rider metrics to three until expanded", () => {
    const metrics = [
      { riderId: "r-001", completedCount: 30 },
      { riderId: "r-002", completedCount: 28 },
      { riderId: "r-003", completedCount: 20 },
      { riderId: "r-004", completedCount: 18 },
    ];

    expect(getVisibleTopCompletedRiderMetrics(metrics, false).map((metric) => metric.riderId)).toEqual(["r-001", "r-002", "r-003"]);
    expect(getVisibleTopCompletedRiderMetrics(metrics, true).map((metric) => metric.riderId)).toEqual([
      "r-001",
      "r-002",
      "r-003",
      "r-004",
    ]);
  });
});
