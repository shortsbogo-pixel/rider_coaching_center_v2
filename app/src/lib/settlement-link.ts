export const SETTLEMENT_WEB_URL = "https://ridersettle-fmyozrbw.manus.space/";

export interface SettlementWebLinkState {
  configured: boolean;
  href: string | null;
  message: string;
}

export function getSettlementWebLinkState(url: string = SETTLEMENT_WEB_URL): SettlementWebLinkState {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return {
      configured: false,
      href: null,
      message: "정산앱 주소 설정 전입니다.",
    };
  }

  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return {
      configured: false,
      href: null,
      message: "정산앱 주소는 http 또는 https URL로 설정해야 합니다.",
    };
  }

  return {
    configured: true,
    href: trimmedUrl,
    message: "정산앱 인증/권한은 정산앱에서 처리합니다.",
  };
}
