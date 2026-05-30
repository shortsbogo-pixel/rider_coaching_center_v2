export const betaMode = true;
export const showTestAccounts = betaMode;

export interface BetaTestAccount {
  id: string;
  password: string;
  label: string;
  description: string;
}

export interface BetaChecklistItem {
  id: string;
  label: string;
}

export const betaNotice = {
  title: "베타 테스트 안내",
  description: "쿠팡플러스 주차별 확정 데이터와 라이더 수기 입력을 바탕으로 코칭을 확인하는 베타 앱입니다.",
  scope: "실시간 관제, 현재 위치 확인, 실시간 콜 추적 용도가 아닙니다.",
};

export const betaTestAccounts: BetaTestAccount[] = [
  {
    id: "admin",
    password: "admin1234",
    label: "관리자",
    description: "업로드, 검수, 코칭, 운영 로그, 페이스 설정 확인",
  },
  {
    id: "rider1",
    password: "rider1234",
    label: "라이더",
    description: "본인 주차 데이터와 오늘의 페이스 체크 확인",
  },
  {
    id: "pending",
    password: "pending1234",
    label: "승인대기",
    description: "승인 전 접근 제한 화면 확인",
  },
];

export const betaChecklist: BetaChecklistItem[] = [
  { id: "upload-valid-excel", label: "정상 엑셀 업로드" },
  { id: "preview-before-apply", label: "미리보기 확인" },
  { id: "apply-week-data", label: "이번 주차 데이터로 반영" },
  { id: "dashboard-change", label: "대시보드 숫자 변경 확인" },
  { id: "inspection-issues", label: "검수 이슈 확인" },
  { id: "coaching-message", label: "코칭 메시지 확인" },
  { id: "rider-own-data", label: "라이더 계정에서 본인 데이터만 확인" },
  { id: "pace-manual-input", label: "오늘의 페이스 체크 입력" },
  { id: "pace-settings", label: "관리자 페이스 설정 변경" },
  { id: "operation-log", label: "운영 로그 확인" },
  { id: "bad-file-protection", label: "잘못된 파일 선택 시 기존 데이터 유지" },
];

export const betaExcludedItems = [
  "DB 저장",
  "외부 접속 정식 배포",
  "실시간 콜 연동",
  "GPS/날씨",
  "실제 음악 재생",
  "문자 발송",
  "타 플랫폼 확장",
];

export function getVisibleTestAccounts(showAccounts: boolean = showTestAccounts): BetaTestAccount[] {
  return showAccounts ? betaTestAccounts : [];
}
