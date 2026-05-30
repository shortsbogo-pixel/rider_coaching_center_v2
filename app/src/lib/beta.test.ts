import { describe, expect, it } from "vitest";
import { betaChecklist, betaExcludedItems, betaNotice, getVisibleTestAccounts } from "./beta";

describe("beta test guidance", () => {
  it("shows beta test accounts only when enabled", () => {
    expect(getVisibleTestAccounts(true).map((account) => account.id)).toEqual(["admin", "rider1", "pending"]);
    expect(getVisibleTestAccounts(false)).toEqual([]);
  });

  it("documents the beta flow and excluded production features", () => {
    expect(betaNotice.description).toContain("쿠팡플러스");
    expect(betaNotice.scope).toContain("실시간 관제");
    expect(betaNotice.scope).toContain("아닙니다");
    expect(betaChecklist.map((item) => item.id)).toEqual([
      "upload-valid-excel",
      "preview-before-apply",
      "apply-week-data",
      "dashboard-change",
      "inspection-issues",
      "coaching-message",
      "rider-own-data",
      "pace-manual-input",
      "pace-settings",
      "operation-log",
      "bad-file-protection",
    ]);
    expect(betaExcludedItems).toContain("DB 저장");
    expect(betaExcludedItems).toContain("실시간 콜 연동");
    expect(betaExcludedItems).toContain("문자 발송");
  });
});
