import { describe, expect, it } from "vitest";
import {
  adminTabs,
  getLatestWeekOrdersForUser,
  getOrdersForUser,
  getRiderMetricsForUser,
  login,
  riderTabs,
  validateUploadFileName,
} from "./domain";

describe("mock auth and role scope", () => {
  it("routes admin, rider, and pending users into the correct first view", () => {
    expect(login("admin", "admin1234")?.homeView).toBe("admin:dashboard");
    expect(login("rider1", "rider1234")?.homeView).toBe("rider:home");
    expect(login("pending", "pending1234")?.homeView).toBe("pending");
  });

  it("returns only the signed-in rider data for rider accounts", () => {
    const rider = login("rider1", "rider1234");

    expect(rider?.riderId).toBe("r-001");
    expect(getOrdersForUser(rider!).every((order) => order.riderId === "r-001")).toBe(true);
    expect(getRiderMetricsForUser(rider!).map((metric) => metric.riderId)).toEqual(["r-001"]);
  });

  it("returns rider order history for the latest uploaded week only", () => {
    const rider = login("rider1", "rider1234");
    const weeklyOrderHistory = getLatestWeekOrdersForUser(rider!);

    expect(weeklyOrderHistory.every((order) => order.riderId === "r-001")).toBe(true);
    expect(new Set(weeklyOrderHistory.map((order) => order.weekCode))).toEqual(new Set(["2026_05-4"]));
  });

  it("keeps bottom tab IA fixed for admin and rider roles", () => {
    expect(adminTabs.map((tab) => tab.label)).toEqual(["대시보드", "업로드", "검수", "코칭", "더보기"]);
    expect(riderTabs.map((tab) => tab.label)).toEqual(["내현황", "내오더", "내지도", "내코칭", "MY"]);
  });
});

describe("upload filename guard", () => {
  it("accepts only the source workbook pattern and rejects settlement final files", () => {
    expect(validateUploadFileName("동구바로_대전_동구중앙_2026_05-4.xlsx").ok).toBe(true);
    expect(validateUploadFileName("동구바로 2026년5월4주차 정산 최종.xlsx").ok).toBe(false);
    expect(validateUploadFileName("동구바로_대전_동구중앙_2026_05-4_정산.xlsx").ok).toBe(false);
  });
});
