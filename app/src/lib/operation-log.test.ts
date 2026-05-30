import { describe, expect, it } from "vitest";
import { parseOrderDetailRows } from "./excel-upload";
import { buildLatestUploadedWeekData } from "./week-data";
import {
  createOperationLogFromFileName,
  createOperationLogFromPaceSettingsUpdate,
  createOperationLogFromParseResult,
  createOperationLogFromWeekData,
  findLastAppliedLog,
  sortOperationLogsNewestFirst,
} from "./operation-log";

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

function makeReadyParseResult() {
  return parseOrderDetailRows({
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
        "확인대상",
        "ORD-2",
        "가게B",
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
}

describe("operation logs", () => {
  it("creates upload_applied logs with normalized summary only", () => {
    const parseResult = makeReadyParseResult();
    const weekData = buildLatestUploadedWeekData(parseResult);
    const log = createOperationLogFromWeekData({
      type: "upload_applied",
      weekData,
      createdAt: "2026-05-30T10:00:00.000Z",
    });

    expect(log).toMatchObject({
      type: "upload_applied",
      weekCode: "2026_05-4",
      weekLabel: "5월4주차",
      sourceFileName: "동구바로_대전_동구중앙_2026_05-4.xlsx",
      actor: "admin",
      summary: {
        totalRows: 2,
        validOrderCount: 1,
        issueRows: 1,
        issueCount: 3,
        riderCount: 1,
      },
    });
    expect(JSON.stringify(log)).not.toContain("ArrayBuffer");
    expect(Object.keys(log)).not.toContain("file");
    expect(Object.keys(log)).not.toContain("fileObject");
    expect(Object.keys(log)).not.toContain("arrayBuffer");
  });

  it("creates cancellation and rejected logs while preserving metadata shape", () => {
    const parseResult = makeReadyParseResult();
    const cancelledLog = createOperationLogFromParseResult({
      type: "upload_cancelled",
      parseResult,
      createdAt: "2026-05-30T10:01:00.000Z",
    });
    const rejectedLog = createOperationLogFromFileName({
      type: "upload_rejected",
      sourceFileName: "정산 최종.xlsx",
      createdAt: "2026-05-30T10:02:00.000Z",
    });
    const sheetMissingLog = createOperationLogFromFileName({
      type: "sheet_missing",
      sourceFileName: parseResult.fileName,
      createdAt: "2026-05-30T10:03:00.000Z",
    });

    expect(cancelledLog.type).toBe("upload_cancelled");
    expect(cancelledLog.summary.validOrderCount).toBe(1);
    expect(sheetMissingLog.weekCode).toBe(parseResult.weekCode);
    expect(sheetMissingLog.weekLabel).toBe(parseResult.weekLabel);
    expect(rejectedLog).toMatchObject({
      type: "upload_rejected",
      weekCode: null,
      weekLabel: null,
      sourceFileName: "정산 최종.xlsx",
      summary: {
        totalRows: 0,
        validOrderCount: 0,
        issueRows: 0,
        issueCount: 0,
        riderCount: 0,
      },
    });
  });

  it("sorts logs newest-first and finds the latest applied log", () => {
    const parseResult = makeReadyParseResult();
    const previewLog = createOperationLogFromParseResult({
      type: "upload_preview_created",
      parseResult,
      createdAt: "2026-05-30T10:00:00.000Z",
    });
    const appliedLog = createOperationLogFromParseResult({
      type: "upload_applied",
      parseResult,
      createdAt: "2026-05-30T10:01:00.000Z",
    });
    const laterRejectedLog = createOperationLogFromFileName({
      type: "upload_rejected",
      sourceFileName: "정산 최종.xlsx",
      createdAt: "2026-05-30T10:02:00.000Z",
    });

    expect(sortOperationLogsNewestFirst([previewLog, laterRejectedLog, appliedLog]).map((log) => log.type)).toEqual([
      "upload_rejected",
      "upload_applied",
      "upload_preview_created",
    ]);
    expect(findLastAppliedLog([previewLog, laterRejectedLog, appliedLog])).toEqual(appliedLog);
  });

  it("creates pace settings update logs without source workbook or rider data", () => {
    const log = createOperationLogFromPaceSettingsUpdate("2026-05-30T10:04:00.000Z");

    expect(log).toMatchObject({
      type: "pace_settings_updated",
      weekCode: null,
      weekLabel: null,
      sourceFileName: "페이스 체크 설정",
      actor: "admin",
      summary: {
        totalRows: 0,
        validOrderCount: 0,
        issueRows: 0,
        issueCount: 0,
        riderCount: 0,
      },
    });
    expect(JSON.stringify(log)).not.toContain(".xlsx");
    expect(JSON.stringify(log)).not.toContain("riderId");
  });
});
