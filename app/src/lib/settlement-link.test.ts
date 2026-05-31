import { describe, expect, it } from "vitest";
import { SETTLEMENT_WEB_URL, getSettlementWebLinkState } from "./settlement-link";

describe("settlement web link settings", () => {
  it("keeps the settlement web link disabled when no URL is configured", () => {
    expect(SETTLEMENT_WEB_URL).toBe("");
    expect(getSettlementWebLinkState()).toEqual({
      configured: false,
      href: null,
      message: "정산웹 주소 설정 전입니다.",
    });
  });

  it("enables the settlement web link for http or https URLs", () => {
    expect(getSettlementWebLinkState(" https://settlement.example.com ")).toEqual({
      configured: true,
      href: "https://settlement.example.com",
      message: "정산웹 인증/권한은 정산웹에서 처리합니다.",
    });

    expect(getSettlementWebLinkState("http://localhost:4000").configured).toBe(true);
  });

  it("rejects non-web URL values instead of opening them", () => {
    expect(getSettlementWebLinkState("javascript:alert(1)")).toEqual({
      configured: false,
      href: null,
      message: "정산웹 주소는 http 또는 https URL로 설정해야 합니다.",
    });
  });
});
