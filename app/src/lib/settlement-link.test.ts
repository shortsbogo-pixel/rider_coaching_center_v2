import { describe, expect, it } from "vitest";
import { SETTLEMENT_WEB_URL, getSettlementWebLinkState } from "./settlement-link";

describe("settlement app link settings", () => {
  it("enables the configured settlement app URL", () => {
    expect(SETTLEMENT_WEB_URL).not.toBe("");
    expect(getSettlementWebLinkState()).toEqual({
      configured: true,
      href: SETTLEMENT_WEB_URL,
      message: "정산앱 인증/권한은 정산앱에서 처리합니다.",
    });
  });

  it("keeps the settlement app link disabled when no URL is configured", () => {
    expect(getSettlementWebLinkState("")).toEqual({
      configured: false,
      href: null,
      message: "정산앱 주소 설정 전입니다.",
    });
  });

  it("enables the settlement app link for http or https URLs", () => {
    expect(getSettlementWebLinkState(" https://settlement.example.com ")).toEqual({
      configured: true,
      href: "https://settlement.example.com",
      message: "정산앱 인증/권한은 정산앱에서 처리합니다.",
    });

    expect(getSettlementWebLinkState("http://localhost:4000").configured).toBe(true);
  });

  it("rejects non-web URL values instead of opening them", () => {
    expect(getSettlementWebLinkState("javascript:alert(1)")).toEqual({
      configured: false,
      href: null,
      message: "정산앱 주소는 http 또는 https URL로 설정해야 합니다.",
    });
  });
});
