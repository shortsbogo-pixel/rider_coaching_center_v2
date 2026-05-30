import { describe, expect, it } from "vitest";
import {
  extractWeekFromFileName,
  normalizeDeliveryType,
  parseOrderDetailRows,
} from "./excel-upload";

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
  return [
    [],
    [],
    [],
    [],
    [],
    [],
    headerRow,
    [],
    ...dataRows,
  ];
}

describe("excel upload parsing", () => {
  it("extracts the internal week code and screen week label from allowed filenames", () => {
    expect(extractWeekFromFileName("동구바로_대전_동구중앙_2026_05-4.xlsx")).toEqual({
      weekCode: "2026_05-4",
      weekLabel: "5월4주차",
    });
  });

  it("normalizes single and multi delivery type values without flagging 멀티배달5", () => {
    expect(normalizeDeliveryType(0)).toEqual({ normalized: "단건배달" });
    expect(normalizeDeliveryType("0")).toEqual({ normalized: "단건배달" });
    expect(normalizeDeliveryType("멀티배달5")).toEqual({ normalized: "멀티배달" });
    expect(normalizeDeliveryType("")).toEqual({
      normalized: null,
      issueType: "delivery_type_missing",
      message: "배달타입이 비어 있습니다.",
    });
  });

  it("excludes blank rows and reports required field issues", () => {
    const rows = makeRows(
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
      new Array(25).fill(""),
      [
        "",
        "",
        "ORD-2",
        "가게B",
        "대전 동구",
        "대전 대덕구",
        "",
        "",
        "",
        "",
        "",
        1800,
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
        5000,
      ],
    );

    const result = parseOrderDetailRows({
      fileName: "동구바로_대전_동구중앙_2026_05-4.xlsx",
      rows,
    });

    expect(result.status).toBe("ready");
    expect(result.totalRows).toBe(2);
    expect(result.validOrderCount).toBe(1);
    expect(result.issueSummary).toMatchObject({
      delivery_type_missing: 0,
      peak_time_missing: 1,
      rider_name_missing: 1,
      order_number_missing: 0,
      time_value_missing: 1,
    });
    expect(result.riderSummaries).toEqual([
      {
        riderName: "김수환",
        completedCount: 1,
        activeDays: 1,
        multiRate: 0,
        postLunchRate: 1,
        postDinnerRate: 0,
      },
    ]);
  });
});
