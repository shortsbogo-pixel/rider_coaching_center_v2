"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Coffee,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  FileUp,
  Home,
  ListChecks,
  LockKeyhole,
  MapPinned,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  Music,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sun,
  Table2,
  Target,
  ToggleLeft,
  ToggleRight,
  UploadCloud,
  User,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  betaChecklist,
  betaExcludedItems,
  betaNotice,
  getVisibleTestAccounts,
} from "@/lib/beta";
import {
  adminTabs,
  formatNumber,
  formatRate,
  formatWon,
  login,
  riderTabs,
  segmentLabels,
  validateUploadFileName,
  type AdminScreen,
  type AppTab,
  type CoachingMessage,
  type DeliveryType,
  type OrderRecord,
  type RiderMetric,
  type RiderScreen,
  type SegmentKey,
  type UserSession,
} from "@/lib/domain";
import {
  ORDER_DETAIL_SHEET_NAME,
  parseOrderDetailRows,
  type OrderDetailParseResult,
  type UploadIssueType,
} from "@/lib/excel-upload";
import {
  createOperationLogFromFileName,
  createOperationLogFromPaceSettingsUpdate,
  createOperationLogFromParseResult,
  findLastAppliedLog,
  sortOperationLogsNewestFirst,
  type OperationLogEntry,
  type OperationLogType,
} from "@/lib/operation-log";
import {
  buildPaceRecommendation,
  calculateGoalProgress,
  createPaceSettingsSignature,
  createDefaultPaceCheckInput,
  defaultPaceCheckSettings,
  getLastWeekPace,
  getMusicMode,
  getRoutineCoaching,
  musicModes,
  normalizePaceCheckSettings,
  normalizePaceCheckInput,
  type MealStatus,
  type MusicModeId,
  type PaceCheckInput,
  type PaceCondition,
  type PaceCheckSettings,
  type PaceTone,
  type RestStatus,
  type RoutineType,
} from "@/lib/rider-pace-check";
import { getSettlementWebLinkState } from "@/lib/settlement-link";
import {
  applyParsedUploadPreview,
  cancelParsedUploadPreview,
  createWeekDataUploadState,
  getAdminDashboardSummary,
  getWeekCoachingForRider,
  getWeekMetricForUser,
  getWeekOrdersForUser,
  setParsedUploadPreview,
  type LatestUploadedWeekData,
} from "@/lib/week-data";

const adminIcons: Record<AdminScreen, LucideIcon> = {
  dashboard: Home,
  upload: FileUp,
  inspect: ClipboardCheck,
  coaching: MessageSquareText,
  more: MoreHorizontal,
};

const riderIcons: Record<RiderScreen, LucideIcon> = {
  home: Home,
  orders: ListChecks,
  map: MapPinned,
  coaching: BarChart3,
  my: User,
};

const segments: SegmentKey[] = ["Breakfast", "Lunch_Peak", "Post_Lunch", "Dinner_Peak", "Post_Dinner"];
const deliveryTypes: DeliveryType[] = ["단건", "멀티배달1", "멀티배달2", "멀티배달3", "멀티배달4", "멀티배달5", "확인필요"];
const multiDeliveryTypes = deliveryTypes.filter((type) => type.startsWith("멀티배달"));
const uploadIssueLabels: Record<UploadIssueType, string> = {
  delivery_type_missing: "배달타입 누락",
  delivery_type_unknown: "배달타입 확인",
  peak_time_missing: "피크타임 누락",
  rider_name_missing: "이름 누락",
  order_number_missing: "주문번호 누락",
  time_value_missing: "시간값 누락",
};
const operationLogLabels: Record<OperationLogType, string> = {
  upload_preview_created: "미리보기",
  upload_applied: "반영",
  upload_cancelled: "취소",
  upload_rejected: "차단",
  sheet_missing: "시트 누락",
  parse_failed: "파싱 실패",
  pace_settings_updated: "페이스 설정",
};
const operationLogTone: Record<OperationLogType, string> = {
  upload_preview_created: "bg-blue-50 text-blue-700",
  upload_applied: "bg-emerald-50 text-emerald-700",
  upload_cancelled: "bg-slate-100 text-slate-600",
  upload_rejected: "bg-rose-50 text-rose-700",
  sheet_missing: "bg-amber-50 text-amber-800",
  parse_failed: "bg-rose-50 text-rose-700",
  pace_settings_updated: "bg-violet-50 text-violet-700",
};
type ChoiceTone = "good" | "neutral" | "warn" | "danger" | "blue";

const conditionOptions: { value: PaceCondition; label: string; tone: ChoiceTone }[] = [
  { value: "good", label: "좋음", tone: "good" },
  { value: "normal", label: "보통", tone: "neutral" },
  { value: "tired", label: "피곤", tone: "warn" },
  { value: "risk", label: "위험", tone: "danger" },
];
const mealOptions: { value: MealStatus; label: string; tone: ChoiceTone }[] = [
  { value: "done", label: "완료", tone: "good" },
  { value: "not_yet", label: "아직", tone: "neutral" },
  { value: "skipped", label: "건너뜀", tone: "warn" },
];
const restOptions: { value: RestStatus; label: string; tone: ChoiceTone }[] = [
  { value: "enough", label: "충분", tone: "good" },
  { value: "short", label: "부족", tone: "warn" },
  { value: "none", label: "없음", tone: "danger" },
];
const routineOptions: { value: RoutineType; label: string; icon: LucideIcon }[] = [
  { value: "day", label: "주간형", icon: Sun },
  { value: "night", label: "야간형", icon: Moon },
];
const paceToneClass: Record<PaceTone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warn: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-rose-200 bg-rose-50 text-rose-950",
  blue: "border-blue-200 bg-blue-50 text-blue-950",
};
const choiceToneClass: Record<ChoiceTone, { selected: string; idle: string }> = {
  good: {
    selected: "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100",
    idle: "border-slate-200 bg-white text-slate-600",
  },
  neutral: {
    selected: "border-slate-600 bg-slate-100 text-slate-900 ring-2 ring-slate-100",
    idle: "border-slate-200 bg-white text-slate-600",
  },
  warn: {
    selected: "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-100",
    idle: "border-slate-200 bg-white text-slate-600",
  },
  danger: {
    selected: "border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-100",
    idle: "border-slate-200 bg-white text-slate-600",
  },
  blue: {
    selected: "border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-100",
    idle: "border-slate-200 bg-white text-slate-600",
  },
};
const visibleTestAccounts = getVisibleTestAccounts();

function ScreenHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="space-y-1.5">
      <p className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase text-blue-700">{eyebrow}</p>
      <h1 className="text-[1.55rem] font-black leading-tight text-slate-950">{title}</h1>
      <p className="text-sm leading-5 text-slate-500">{description}</p>
    </header>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200/90 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${className}`}>{children}</section>;
}

function BetaNoticeCard() {
  return (
    <Panel className="border-blue-200 bg-blue-50/90">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
          <AlertTriangle size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase text-blue-700">{betaNotice.title}</p>
          <h2 className="mt-1 text-lg font-black text-blue-950">쿠팡플러스 전용 코칭 베타</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-blue-950">{betaNotice.description}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-blue-800">{betaNotice.scope}</p>
        </div>
      </div>
    </Panel>
  );
}

function DataSourceNotice({ weekData }: { weekData: LatestUploadedWeekData }) {
  const isUploaded = weekData.source === "uploaded";
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-xs font-bold leading-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)] ${isUploaded ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <p>
        {isUploaded
          ? `업로드 데이터 적용 중 · ${weekData.weekLabel} · ${weekData.fileName}`
          : "샘플 데이터 표시 중 · 관리자 업로드 전까지는 화면 흐름 확인용입니다."}
      </p>
      <p className="mt-1 font-semibold opacity-90">
        {isUploaded
          ? "베타에서는 브라우저 세션만 유지됩니다. 새로고침 후 데이터가 사라지면 다시 업로드해 주세요."
          : "정상 엑셀을 업로드하고 반영하면 업로드 데이터 기준으로 바뀝니다."}
      </p>
    </div>
  );
}

function SettlementWebCard({ role }: { role: "admin" | "rider" }) {
  const linkState = getSettlementWebLinkState();
  const isAdmin = role === "admin";
  const title = isAdmin ? "정산 관리 앱" : "정산 확인";
  const buttonLabel = isAdmin ? "정산 관리 앱 열기" : "정산앱 열기";
  const descriptions = isAdmin
    ? [
        "정산 확정, 지급 상태, 상세 원장은 기존 정산앱에서 처리합니다.",
        "코칭센터는 정산앱으로 이동하는 링크만 제공합니다.",
      ]
    : [
        "정산 상세와 지급 상태는 기존 정산앱에서 확인합니다.",
        "코칭센터는 운행 데이터와 코칭 확인용입니다.",
      ];

  const actionClass =
    "mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition";

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Settlement Link</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <ExternalLink size={19} />
        </span>
      </div>
      <div className="mt-3 space-y-1">
        {descriptions.map((description) => (
          <p className="text-sm font-semibold leading-5 text-slate-600" key={description}>{description}</p>
        ))}
      </div>
      {linkState.configured && linkState.href ? (
        <a
          className={`${actionClass} bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)] active:scale-[0.99]`}
          href={linkState.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink size={17} />
          {buttonLabel}
        </a>
      ) : (
        <button
          className={`${actionClass} cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400`}
          disabled
          type="button"
        >
          <ExternalLink size={17} />
          {buttonLabel}
        </button>
      )}
      <p className={`mt-3 rounded-md px-3 py-2 text-xs font-bold leading-5 ${linkState.configured ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-900"}`}>
        {linkState.message}
        {linkState.configured ? " 새 탭 또는 새 창으로 열립니다." : ""}
      </p>
    </Panel>
  );
}

function StatTile({
  label,
  value,
  caption,
  tone = "default",
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "default" | "good" | "warn" | "blue";
}) {
  const toneClass = {
    default: "border-slate-200 bg-white text-slate-950",
    good: "border-emerald-200 bg-emerald-50 text-emerald-950",
    warn: "border-amber-200 bg-amber-50 text-amber-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
  }[tone];

  return (
    <div className={`min-h-24 rounded-lg border p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] ${toneClass}`}>
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <strong className="mt-2 block break-words text-[1.45rem] font-black leading-tight">{value}</strong>
      {caption ? <small className="mt-1 block text-xs font-semibold text-slate-500">{caption}</small> : null}
    </div>
  );
}

function BarRow({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  const width = max ? Math.max((value / max) * 100, value ? 6 : 0) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-mono text-xs text-slate-500">{detail ?? `${formatNumber(value)}건`}</span>
      </div>
      <div className="h-2 rounded-md bg-slate-100">
        <div className="h-2 rounded-md bg-teal-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: UserSession) => void }) {
  const [id, setId] = useState("admin");
  const [password, setPassword] = useState("admin1234");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = login(id.trim(), password.trim());
    if (!user) {
      setMessage("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    setMessage("");
    onLogin(user);
  }

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-[430px] flex-col justify-center gap-4">
        <section className="overflow-hidden rounded-lg bg-slate-950 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.20)]">
          <p className="text-sm font-semibold text-teal-200">Rider Coaching Center</p>
          <h1 className="mt-3 text-3xl font-black">주간 운행 데이터를 코칭으로 바꾸는 앱</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            원천 엑셀 업로드, 관리자 코칭 관리, 라이더 본인 화면 분기를 테스트 계정으로 확인합니다.
          </p>
        </section>
        <BetaNoticeCard />

        <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">아이디</span>
            <input
              className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={id}
              onChange={(event) => setId(event.target.value)}
            />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-bold text-slate-700">비밀번호</span>
            <input
              className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-blue-600 font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition active:scale-[0.99]" type="submit">
            <LockKeyhole size={18} />
            로그인
          </button>
          {message ? <p className="mt-3 text-sm font-bold text-rose-600">{message}</p> : null}
        </form>

        {visibleTestAccounts.length ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-950">베타 테스트 계정</h2>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">운영 배포 전에는 showTestAccounts 플래그로 숨길 예정입니다.</p>
              </div>
              <ShieldCheck className="shrink-0 text-blue-600" size={20} />
            </div>
            <div className="mt-3 grid gap-2">
              {visibleTestAccounts.map((account) => (
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-left"
                  key={account.id}
                  onClick={() => { setId(account.id); setPassword(account.password); }}
                >
                  <span className="block text-xs font-black text-blue-700">{account.label}</span>
                  <strong className="mt-1 block text-sm text-slate-950">{account.id} / {account.password}</strong>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{account.description}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function PendingScreen({ user, onLogout }: { user: UserSession; onLogout: () => void }) {
  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-[430px] flex-col justify-center gap-4">
        <Panel>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <ShieldCheck size={24} />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-700">승인 대기</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{user.displayName} 계정은 검토 중입니다.</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">관리자 승인 전에는 라이더 데이터와 코칭 메시지를 볼 수 없습니다.</p>
            </div>
          </div>
          <button className="mt-5 h-11 w-full rounded-md border border-slate-300 bg-white font-bold text-slate-700" onClick={onLogout}>
            로그인 화면으로
          </button>
        </Panel>
      </div>
    </main>
  );
}

function AppChrome({
  user,
  active,
  onChange,
  onLogout,
  children,
}: {
  user: UserSession;
  active: AdminScreen | RiderScreen;
  onChange: (screen: AdminScreen | RiderScreen) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const isAdmin = user.role === "admin";
  const tabs = isAdmin ? adminTabs : riderTabs;
  const roleTheme = isAdmin
    ? {
        label: "관리자",
        mode: "운영 관리",
        logo: "A",
        logoClass: "bg-gradient-to-br from-blue-600 to-violet-600",
        navClass: "bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.10)]",
      }
    : {
        label: "라이더",
        mode: "내 데이터",
        logo: "R",
        logoClass: "bg-gradient-to-br from-emerald-500 to-blue-600",
        navClass: "bg-emerald-50 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]",
      };

  return (
    <main className="min-h-dvh px-0 sm:px-3">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-[#f4f7fb] shadow-[0_26px_70px_rgba(15,23,42,0.18)]">
        <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.20)] ${roleTheme.logoClass}`}>
                {roleTheme.logo}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500">{roleTheme.label} 모드 · {roleTheme.mode}</p>
                <strong className="block truncate text-base font-black text-slate-950">{user.displayName}</strong>
              </div>
            </div>
            <button className="h-10 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm active:scale-[0.99]" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </header>

        <div className="space-y-4 px-4 pb-32 pt-4">{children}</div>

        <nav className="fixed bottom-0 left-1/2 z-30 grid h-[78px] w-full max-w-[430px] -translate-x-1/2 grid-cols-5 gap-1 border-t border-slate-200 bg-white/95 px-2 pb-3 pt-2 shadow-[0_-14px_34px_rgba(15,23,42,0.08)] backdrop-blur">
          {tabs.map((tab: AppTab) => {
            const Icon = isAdmin ? adminIcons[tab.key as AdminScreen] : riderIcons[tab.key as RiderScreen];
            const selected = active === tab.key;
            return (
              <button
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10.5px] font-black leading-none transition ${
                  selected ? roleTheme.navClass : "text-slate-500 active:bg-slate-50"
                }`}
                key={tab.key}
                onClick={() => onChange(tab.key)}
                title={tab.label}
              >
                <Icon size={19} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}

function formatLogTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminDashboard({ weekData, lastAppliedLog }: { weekData: LatestUploadedWeekData; lastAppliedLog: OperationLogEntry | null }) {
  const summary = getAdminDashboardSummary(weekData);
  const topCompleted = Math.max(...weekData.metrics.map((metric) => metric.completedCount), 1);
  return (
    <>
      <ScreenHeader eyebrow="Admin Dashboard" title="주간 대시보드" description={`${weekData.weekLabel} ${weekData.sourceLabel} 기준 운영 현황입니다.`} />
      <DataSourceNotice weekData={weekData} />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="완료 콜" value={`${formatNumber(summary.completed)}건`} caption="업로드 데이터 기준" tone="blue" />
        <StatTile label="운영 라이더" value={`${summary.activeRiders}명`} caption="활성 기준" tone="good" />
        <StatTile label="검수 이슈" value={`${summary.issueCount}건`} caption={summary.issueRows ? `${summary.issueRows}개 행, 중복 포함` : "확인 필요 없음"} tone={summary.issueCount ? "warn" : "good"} />
        <StatTile label="노출 메시지" value={`${summary.visibleMessages}건`} caption="라이더 표시 ON" />
      </div>
      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">완료 콜 수 상위 라이더</h2>
            <p className="text-sm text-slate-500">카드 클릭 전 코칭 우선순위를 확인합니다.</p>
          </div>
          <ChevronRight size={20} className="text-slate-400" />
        </div>
        <div className="space-y-4">
          {weekData.metrics.map((metric) => (
            <BarRow key={metric.riderId} label={`${metric.riderName} · ${metric.grade}`} value={metric.completedCount} max={topCompleted} />
          ))}
        </div>
      </Panel>
      <Panel>
        <h2 className="text-lg font-black">최근 업로드 요약</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-3"><span className="text-slate-500">데이터 상태</span><strong>{weekData.sourceLabel}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">사용 파일</span><strong className="text-right">{weekData.fileName}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">기준 주차</span><strong>{weekData.weekLabel}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">기본 시트</span><strong>오더별 상세 내역서</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">파싱 상태</span><strong className={weekData.source === "uploaded" ? "text-emerald-700" : "text-amber-700"}>{weekData.source === "uploaded" ? "앱 화면 적용됨" : "업로드 대기"}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">마지막 반영 파일</span><strong className="text-right">{lastAppliedLog?.sourceFileName ?? "-"}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">마지막 반영 주차</span><strong>{lastAppliedLog?.weekLabel ?? "-"}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">마지막 반영 시간</span><strong>{formatLogTime(lastAppliedLog?.createdAt)}</strong></div>
        </div>
      </Panel>
    </>
  );
}

function AdminUpload({
  weekData,
  parsedUploadPreview,
  onParsedUploadPreviewChange,
  onApplyUploadPreview,
  onCancelUploadPreview,
  onOperationLog,
}: {
  weekData: LatestUploadedWeekData;
  parsedUploadPreview: OrderDetailParseResult | null;
  onParsedUploadPreviewChange: (result: OrderDetailParseResult | null) => void;
  onApplyUploadPreview: () => void;
  onCancelUploadPreview: () => void;
  onOperationLog: (log: OperationLogEntry) => void;
}) {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [parseMessage, setParseMessage] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileNameResult = selectedFileName ? validateUploadFileName(selectedFileName) : null;
  const hasRequiredSheet = sheetNames.includes(ORDER_DETAIL_SHEET_NAME);
  const canShowSummary = parsedUploadPreview?.status === "ready";
  const issueRowCount = parsedUploadPreview ? new Set(parsedUploadPreview.issues.map((issue) => issue.rowNumber)).size : 0;

  function resetPreviewUi() {
    if (parsedUploadPreview) {
      onOperationLog(createOperationLogFromParseResult({ type: "upload_cancelled", parseResult: parsedUploadPreview }));
    }
    onCancelUploadPreview();
    setSelectedFileName("");
    setSheetNames([]);
    setParseMessage("");
    setFileInputKey((current) => current + 1);
  }

  function handleApplyPreview() {
    if (parsedUploadPreview?.status !== "ready") return;
    onApplyUploadPreview();
    onOperationLog(createOperationLogFromParseResult({ type: "upload_applied", parseResult: parsedUploadPreview }));
    setSelectedFileName("");
    setSheetNames([]);
    setParseMessage("이번 주차 데이터로 반영했습니다.");
    setFileInputKey((current) => current + 1);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    onParsedUploadPreviewChange(null);
    setParseMessage("");
    setSheetNames([]);

    if (!file) {
      setSelectedFileName("");
      return;
    }

    setSelectedFileName(file.name);
    const validation = validateUploadFileName(file.name);
    if (!validation.ok) {
      onOperationLog(createOperationLogFromFileName({ type: "upload_rejected", sourceFileName: file.name }));
      setParseMessage(`${validation.message} 기존 적용 데이터는 유지됩니다.`);
      return;
    }

    setIsParsing(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      setSheetNames(workbook.SheetNames);

      const sheet = workbook.Sheets[ORDER_DETAIL_SHEET_NAME];
      if (!sheet) {
        onOperationLog(createOperationLogFromFileName({ type: "sheet_missing", sourceFileName: file.name }));
        setParseMessage(`기본 시트 "${ORDER_DETAIL_SHEET_NAME}"를 찾을 수 없습니다. 기존 적용 데이터는 유지됩니다.`);
        return;
      }

      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        blankrows: true,
        raw: true,
      }) as unknown[][];
      const result = parseOrderDetailRows({ fileName: file.name, rows });
      onParsedUploadPreviewChange(result);
      setParseMessage(result.errorMessage ?? (result.status === "ready" ? "파싱/검수 미리보기를 생성했습니다. 아직 앱 전체에 반영되지 않았습니다." : "파싱 결과를 확인해 주세요."));
      onOperationLog(createOperationLogFromParseResult({ type: result.status === "ready" ? "upload_preview_created" : "parse_failed", parseResult: result }));
    } catch (error) {
      onOperationLog(createOperationLogFromFileName({ type: "parse_failed", sourceFileName: file.name }));
      setParseMessage(error instanceof Error ? error.message : "엑셀 파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <>
      <ScreenHeader
        eyebrow="Upload"
        title="엑셀 업로드"
        description="DB 저장 없이 브라우저에서 선택한 원천 엑셀을 파싱하고 저장 전 검수 미리보기를 확인합니다."
      />
      <DataSourceNotice weekData={weekData} />
      <Panel>
        <label className="block rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4">
          <span className="flex items-center gap-2 text-sm font-black text-blue-900">
            <UploadCloud size={18} />
            원천 엑셀 파일 선택
          </span>
          <input key={fileInputKey} className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white" type="file" accept=".xlsx" onChange={handleFileChange} />
          <span className="mt-3 block text-xs font-semibold leading-5 text-blue-900">동구바로_대전_동구중앙_YYYY_MM-W.xlsx 형식만 파싱합니다.</span>
        </label>

        <div className="mt-4 grid gap-3">
          <div className={`rounded-md border p-3 text-sm font-bold ${fileNameResult?.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : selectedFileName ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            <div className="flex items-start gap-2">
              {fileNameResult?.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <div>
                <p>파일명 검수</p>
                <p className="mt-1 text-xs font-semibold">{selectedFileName || "파일을 선택해 주세요."}</p>
                <p className="mt-1 text-xs font-semibold">{fileNameResult?.message ?? "정산/최종 파일은 제외됩니다."}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-md border p-3 text-sm font-bold ${hasRequiredSheet ? "border-emerald-200 bg-emerald-50 text-emerald-800" : sheetNames.length ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            <div className="flex items-start gap-2">
              <FileSpreadsheet size={18} />
              <div>
                <p>기본 시트 확인</p>
                <p className="mt-1 text-xs font-semibold">{sheetNames.length ? (hasRequiredSheet ? `"${ORDER_DETAIL_SHEET_NAME}" 시트를 확인했습니다.` : `"${ORDER_DETAIL_SHEET_NAME}" 시트가 없습니다.`) : "파일 선택 후 시트 목록을 확인합니다."}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-md border p-3 text-sm font-bold ${canShowSummary ? "border-emerald-200 bg-emerald-50 text-emerald-800" : parseMessage ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            <div className="flex items-start gap-2">
              <Table2 size={18} />
              <div>
                <p>파싱 상태</p>
                <p className="mt-1 text-xs font-semibold">{isParsing ? "엑셀을 읽고 있습니다." : parseMessage || "아직 파싱 결과가 없습니다."}</p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {(selectedFileName || parsedUploadPreview) ? (
        <Panel>
          <h2 className="text-lg font-black">미리보기 작업</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">파일 선택 후에는 파싱/검수 미리보기만 표시됩니다. 아래 버튼을 눌러야 관리자/라이더 화면 기준 데이터로 반영됩니다.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className={`h-11 rounded-md text-sm font-black ${canShowSummary ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}
              disabled={!canShowSummary}
              onClick={handleApplyPreview}
              type="button"
            >
              이번 주차 데이터로 반영
            </button>
            <button className="h-11 rounded-md border border-slate-300 bg-white text-sm font-bold text-slate-700" onClick={resetPreviewUi} type="button">
              미리보기 취소
            </button>
          </div>
        </Panel>
      ) : null}

      {parsedUploadPreview ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="총행수" value={`${formatNumber(parsedUploadPreview.totalRows)}행`} caption="빈 행 제외, 헤더 제외" tone="blue" />
            <StatTile label="유효 오더 후보" value={`${formatNumber(parsedUploadPreview.validOrderCount)}건`} caption="필수값 통과" tone="good" />
            <StatTile label="확인 필요 행" value={`${formatNumber(issueRowCount)}행`} caption="누락값 포함 행" tone={issueRowCount ? "warn" : "good"} />
            <StatTile label="이슈 건수" value={`${formatNumber(parsedUploadPreview.issueCount)}건`} caption="한 행의 복수 이슈 중복 포함" tone={parsedUploadPreview.issueCount ? "warn" : "good"} />
          </div>

          <Panel>
            <h2 className="text-lg font-black">업로드 결과 요약</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-slate-500">파일명</span><strong className="text-right">{parsedUploadPreview.fileName}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">내부 week_code</span><strong>{parsedUploadPreview.weekCode}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">화면 week_label</span><strong>{parsedUploadPreview.weekLabel}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">헤더 기준</span><strong>7행 · B:Y</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">저장 상태</span><strong className="text-blue-700">미저장 미리보기</strong></div>
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">이슈 건수는 한 행에서 배달타입, 피크타임, 시간값이 동시에 누락된 경우 각각 1건씩 중복 집계됩니다.</p>
          </Panel>

          <Panel>
            <h2 className="text-lg font-black">검수 이슈</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(Object.entries(uploadIssueLabels) as [UploadIssueType, string][]).map(([type, label]) => (
                <div className="rounded-md border border-slate-200 p-3" key={type}>
                  <span className="text-xs font-bold text-slate-500">{label}</span>
                  <strong className={`mt-1 block text-xl font-black ${parsedUploadPreview.issueSummary[type] ? "text-amber-700" : "text-emerald-700"}`}>{formatNumber(parsedUploadPreview.issueSummary[type])}</strong>
                </div>
              ))}
            </div>
            {parsedUploadPreview.issues.length ? (
              <div className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-1">
                {parsedUploadPreview.issues.slice(0, 20).map((issue, index) => (
                  <div className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900" key={`${issue.rowNumber}-${issue.type}-${index}`}>
                    <strong>{issue.rowNumber}행 · {uploadIssueLabels[issue.type]}</strong>
                    <p>{issue.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-bold text-emerald-700">검수 이슈가 없습니다.</p>
            )}
          </Panel>

          <Panel>
            <h2 className="text-lg font-black">라이더별 집계 미리보기</h2>
            <div className="mt-3 space-y-3">
              {parsedUploadPreview.riderSummaries.slice(0, 8).map((summary) => (
                <div className="rounded-lg border border-slate-200 p-3" key={summary.riderName}>
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-950">{summary.riderName}</strong>
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">{formatNumber(summary.completedCount)}건</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                    <span>출근횟수 {summary.activeDays}일</span>
                    <span>멀티비율 {formatRate(summary.multiRate)}</span>
                    <span>Post_Lunch {formatRate(summary.postLunchRate)}</span>
                    <span>Post_Dinner {formatRate(summary.postDinnerRate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-black">오더 파싱 미리보기</h2>
            <div className="mt-3 space-y-2">
              {parsedUploadPreview.parsedOrders.slice(0, 5).map((order) => (
                <div className="rounded-md border border-slate-200 p-3 text-xs" key={`${order.rowNumber}-${order.orderNumber}`}>
                  <div className="flex justify-between gap-3">
                    <strong className="text-slate-950">{order.riderName}</strong>
                    <span className="font-mono text-slate-500">{order.orderNumber}</span>
                  </div>
                  <p className="mt-1 text-slate-500">{order.storeName} · {order.peakTime} · {order.deliveryType}</p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : null}

      <Panel>
        <h2 className="text-lg font-black">필수 매핑 필드</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["이름", "축약형 주문번호", "픽업지역", "배달지역", "수락시간", "배달시간", "배달소요시간", "피크타임", "배달타입", "정산금액"].map((field) => (
            <span className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700" key={field}>
              {field}
            </span>
          ))}
        </div>
      </Panel>
    </>
  );
}

function AdminInspect({ weekData }: { weekData: LatestUploadedWeekData }) {
  const summary = getAdminDashboardSummary(weekData);
  const parseResult = weekData.parseResult;
  const issueSummaryEntries = parseResult
    ? (Object.entries(uploadIssueLabels) as [UploadIssueType, string][]).map(([type, label]) => ({
        title: label,
        count: parseResult.issueSummary[type],
        body: issueTypeDescription(type),
      }))
    : [
        { title: "배달타입 누락", count: 0, body: "배달타입이 비어 있으면 저장 전 확인 대상으로 분류합니다." },
        { title: "피크타임 누락", count: 0, body: "Post_Lunch, Post_Dinner 등 구간 분석에 필요한 값입니다." },
        { title: "시간값 누락", count: 0, body: "배정/수락/배달/소요시간 중 빈 값이 있으면 행 단위 검수가 필요합니다." },
        { title: "배달타입 정규화", count: 0, body: "0은 단건배달, 멀티배달1~5는 멀티배달 계열로 집계합니다." },
      ];

  return (
    <>
      <ScreenHeader eyebrow="Inspection" title="업로드 검수" description="저장 전 확인해야 할 데이터 품질 이슈를 행 단위와 이슈 단위로 나누어 봅니다." />
      <DataSourceNotice weekData={weekData} />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="총행수" value={`${formatNumber(parseResult?.totalRows ?? weekData.orders.length)}행`} caption="빈 행 제외, 헤더 제외" tone="blue" />
        <StatTile label="유효 오더 후보" value={`${formatNumber(parseResult?.validOrderCount ?? weekData.orders.length)}건`} caption="필수값 통과" tone="good" />
        <StatTile label="확인 필요 행" value={`${formatNumber(summary.issueRows)}행`} caption="누락값 포함 행" tone={summary.issueRows ? "warn" : "good"} />
        <StatTile label="이슈 건수" value={`${formatNumber(summary.issueCount)}건`} caption="복수 이슈 중복 포함" tone={summary.issueCount ? "warn" : "good"} />
      </div>
      <Panel>
        <h2 className="text-lg font-black">숫자 기준</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">확인 필요 행은 문제가 있는 오더 행 수입니다. 이슈 건수는 한 행에서 배달타입, 피크타임, 시간값이 동시에 누락되면 각각 1건씩 중복 집계합니다.</p>
      </Panel>
      <Panel>
        <h2 className="text-lg font-black">이슈 유형</h2>
        <div className="mt-3 space-y-2">
          {issueSummaryEntries.map(({ title, count, body }) => (
            <div className={`rounded-md border p-3 ${count ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`} key={title}>
              <div className="flex items-center justify-between gap-3">
                <strong className={count ? "text-sm text-amber-900" : "text-sm text-slate-700"}>{title}</strong>
                <span className={`rounded-md px-2 py-1 text-xs font-black ${count ? "bg-amber-100 text-amber-900" : "bg-white text-slate-500"}`}>{formatNumber(count)}건</span>
              </div>
              <p className={`mt-1 text-xs leading-5 ${count ? "text-amber-800" : "text-slate-500"}`}>{body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function issueTypeDescription(type: UploadIssueType) {
  const descriptions: Record<UploadIssueType, string> = {
    delivery_type_missing: "배달타입이 비어 있으면 저장 전 확인 대상으로 분류합니다.",
    delivery_type_unknown: "0은 단건배달, 멀티배달1~5는 멀티배달 계열로 집계하고 나머지는 확인 대상으로 둡니다.",
    peak_time_missing: "Post_Lunch, Post_Dinner 등 구간 분석에 필요한 값입니다.",
    rider_name_missing: "라이더별 집계와 권한 매핑에 필요한 이름 값입니다.",
    order_number_missing: "오더 중복 확인과 이력 표시 기준이 되는 주문번호 값입니다.",
    time_value_missing: "배정/수락/배달/소요시간 중 빈 값이 있으면 행 단위 검수가 필요합니다.",
  };
  return descriptions[type];
}

function AdminCoaching({ weekData }: { weekData: LatestUploadedWeekData }) {
  const [selectedId, setSelectedId] = useState(weekData.metrics[0]?.riderId ?? "");
  const [messages, setMessages] = useState<CoachingMessage[]>(weekData.coachingMessages);
  const selectedMetric = weekData.metrics.find((metric) => metric.riderId === selectedId) ?? weekData.metrics[0];
  const selectedMessage = selectedMetric
    ? messages.find((message) => message.riderId === selectedMetric.riderId) ?? messages[0]
    : undefined;

  function updateMessage(patch: Partial<CoachingMessage>) {
    if (!selectedMessage) return;
    setMessages((current) =>
      current.map((message) => (message.riderId === selectedMessage.riderId ? { ...message, ...patch } : message)),
    );
  }

  if (!selectedMetric || !selectedMessage) {
    return (
      <>
        <ScreenHeader eyebrow="Coaching" title="코칭 메시지 관리" description="자동 메시지를 수정하고 라이더 노출 여부를 관리합니다." />
        <DataSourceNotice weekData={weekData} />
        <Panel>
          <h2 className="text-lg font-black">표시할 라이더 데이터가 없습니다.</h2>
          <p className="mt-2 text-sm text-slate-500">업로드 데이터의 유효 오더 후보를 먼저 확인해 주세요.</p>
        </Panel>
      </>
    );
  }

  return (
    <>
      <ScreenHeader eyebrow="Coaching" title="코칭 메시지 관리" description="자동 메시지를 수정하고 라이더 노출 여부를 관리합니다." />
      <DataSourceNotice weekData={weekData} />
      <Panel>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">라이더 선택</span>
          <select
            className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-sm font-bold"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {weekData.metrics.map((metric) => (
              <option key={metric.riderId} value={metric.riderId}>
                {metric.riderName} · {metric.completedCount}건
              </option>
            ))}
          </select>
        </label>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">{selectedMetric.riderName}</h2>
            <p className="text-sm text-slate-500">배차 친화 점수 {selectedMetric.dispatchScore}점 · {selectedMetric.grade}</p>
          </div>
          <button
            className={`flex items-center gap-1 rounded-md px-3 py-2 text-xs font-black ${selectedMessage.visibleToRider ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
            onClick={() => updateMessage({ visibleToRider: !selectedMessage.visibleToRider })}
          >
            {selectedMessage.visibleToRider ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            노출 {selectedMessage.visibleToRider ? "ON" : "OFF"}
          </button>
        </div>
        <div className="mt-4">
          <span className="text-sm font-bold text-slate-700">자동 메시지</span>
          <div className="mt-2 min-h-40 rounded-md border border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            {selectedMessage.autoMessage}
          </div>
        </div>
        <label className="mt-3 block">
          <span className="text-sm font-bold text-slate-700">관리자 수정 메시지</span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-md border border-slate-300 p-3 text-sm leading-6 outline-none focus:border-blue-500"
            value={selectedMessage.customMessage}
            onChange={(event) => updateMessage({ customMessage: event.target.value })}
          />
        </label>
        <label className="mt-3 block">
          <span className="text-sm font-bold text-slate-700">내부 메모</span>
          <textarea
            className="mt-2 min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm leading-6 outline-none focus:border-blue-500"
            value={selectedMessage.internalMemo}
            onChange={(event) => updateMessage({ internalMemo: event.target.value })}
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white text-sm font-bold text-slate-700" onClick={() => updateMessage({ customMessage: selectedMessage.autoMessage })}>
            <RotateCcw size={16} />
            자동문구
          </button>
          <button className="flex h-11 items-center justify-center gap-2 rounded-md bg-blue-600 text-sm font-bold text-white">
            <CheckCircle2 size={16} />
            저장됨
          </button>
        </div>
      </Panel>
      <Panel className="border-teal-200 bg-teal-50">
        <div className="mb-3 flex items-center gap-2 text-teal-900">
          <Eye size={18} />
          <h2 className="text-lg font-black">라이더 화면 미리보기</h2>
        </div>
        <RiderCoachingContent metric={selectedMetric} message={selectedMessage} preview />
      </Panel>
    </>
  );
}

function AdminPaceSettingsPanel({
  paceSettings,
  onPaceSettingsChange,
  onOperationLog,
}: {
  paceSettings: PaceCheckSettings;
  onPaceSettingsChange: (settings: PaceCheckSettings) => void;
  onOperationLog: (log: OperationLogEntry) => void;
}) {
  const [draft, setDraft] = useState<PaceCheckSettings>(paceSettings);
  const normalizedDraft = normalizePaceCheckSettings(draft);

  function updateDraft(patch: Partial<PaceCheckSettings>) {
    setDraft((current) => normalizePaceCheckSettings({ ...current, ...patch }));
  }

  function handleApplySettings() {
    const normalized = normalizePaceCheckSettings(draft);
    setDraft(normalized);
    onPaceSettingsChange(normalized);
    onOperationLog(createOperationLogFromPaceSettingsUpdate());
  }

  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          <Settings size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black">페이스 체크 설정</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">쿠팡플러스 라이더 화면의 기본 목표와 안전 문구를 조정합니다.</p>
        </div>
      </div>
      <div className="mt-3 rounded-md bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
        서버 저장 전 단계입니다. 새로고침 후에는 기본 설정으로 초기화될 수 있습니다.
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">기본 주간 목표</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base font-black outline-none focus:border-violet-500"
            inputMode="numeric"
            min={1}
            type="number"
            value={normalizedDraft.defaultWeeklyGoalCalls}
            onChange={(event) => updateDraft({ defaultWeeklyGoalCalls: Number(event.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">수면 경고 기준</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base font-black outline-none focus:border-violet-500"
            inputMode="decimal"
            min={1}
            max={24}
            step={0.5}
            type="number"
            value={normalizedDraft.sleepWarningHours}
            onChange={(event) => updateDraft({ sleepWarningHours: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <SettingsTextarea
          label="위험 컨디션 안전 문구"
          value={draft.riskConditionSafetyMessage}
          onChange={(value) => updateDraft({ riskConditionSafetyMessage: value })}
        />
        <SettingsTextarea
          label="식사 건너뜀 안내 문구"
          value={draft.skippedMealMessage}
          onChange={(value) => updateDraft({ skippedMealMessage: value })}
        />
        <SettingsTextarea
          label="주간형 루틴 문구"
          value={draft.dayRoutineMessage}
          onChange={(value) => updateDraft({ dayRoutineMessage: value })}
        />
        <SettingsTextarea
          label="야간형 루틴 문구"
          value={draft.nightRoutineMessage}
          onChange={(value) => updateDraft({ nightRoutineMessage: value })}
        />
        <SettingsTextarea
          label="음악 모드 안전 문구"
          value={draft.musicModeSafetyNote}
          onChange={(value) => updateDraft({ musicModeSafetyNote: value })}
        />
      </div>

      <button
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-violet-600 text-sm font-black text-white"
        onClick={handleApplySettings}
        type="button"
      >
        <CheckCircle2 size={18} />
        페이스 체크 설정 반영
      </button>
    </Panel>
  );
}

function BetaChecklistPanel() {
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <ListChecks size={20} />
        </span>
        <div>
          <h2 className="text-lg font-black">베타 체크리스트</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">소규모 테스트에서 아래 순서대로 확인합니다.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {betaChecklist.map((item, index) => (
          <div className="flex items-center gap-3 rounded-md bg-slate-50 p-3" key={item.id}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-black text-slate-500">{index + 1}</span>
            <span className="text-sm font-bold text-slate-800">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md bg-rose-50 p-3">
        <p className="text-xs font-black text-rose-700">베타 제외 항목</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {betaExcludedItems.map((item) => (
            <span className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-rose-700" key={item}>{item}</span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function SettingsTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <textarea
        className="mt-2 min-h-20 w-full resize-none rounded-md border border-slate-300 p-3 text-sm font-semibold leading-6 outline-none focus:border-violet-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AdminMore({
  operationLogs,
  paceSettings,
  onPaceSettingsChange,
  onOperationLog,
}: {
  operationLogs: OperationLogEntry[];
  paceSettings: PaceCheckSettings;
  onPaceSettingsChange: (settings: PaceCheckSettings) => void;
  onOperationLog: (log: OperationLogEntry) => void;
}) {
  const sortedLogs = sortOperationLogsNewestFirst(operationLogs);
  return (
    <>
      <ScreenHeader eyebrow="More" title="더보기" description="자주 쓰지 않는 설정과 계정 관리를 모았습니다." />
      <BetaNoticeCard />
      <BetaChecklistPanel />
      <SettlementWebCard role="admin" />
      <AdminPaceSettingsPanel
        paceSettings={paceSettings}
        onPaceSettingsChange={onPaceSettingsChange}
        onOperationLog={onOperationLog}
      />
      <Panel>
        <div className="space-y-3">
          {[
            ["라이더 계정 관리", "활성 2 · 승인대기 1 · 비활성 0"],
            ["공지 / 문의번호", "문의 042-672-0901 · 라이더 공지 노출"],
            ["권한 설정", "관리자 전체 조회, 라이더 본인 조회"],
          ].map(([title, body]) => (
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0" key={title}>
              <div>
                <strong className="text-sm text-slate-900">{title}</strong>
                <p className="mt-1 text-xs text-slate-500">{body}</p>
              </div>
              <Settings size={18} className="text-slate-400" />
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">운영 로그</h2>
            <p className="text-sm text-slate-500">브라우저 세션 동안의 업로드 미리보기, 반영, 차단 이력입니다.</p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{sortedLogs.length}건</span>
        </div>
        <div className="mt-4 space-y-3">
          {sortedLogs.length ? (
            sortedLogs.map((log) => (
              <div className="rounded-lg border border-slate-200 p-3" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-black ${operationLogTone[log.type]}`}>
                      {operationLogLabels[log.type]}
                    </span>
                    <strong className="mt-2 block truncate text-sm text-slate-950">{log.sourceFileName}</strong>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{log.weekLabel ?? "주차 미확인"} · {formatLogTime(log.createdAt)} · {log.actor}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                  <span>총행수 {formatNumber(log.summary.totalRows)}행</span>
                  <span>유효 {formatNumber(log.summary.validOrderCount)}건</span>
                  <span>확인 필요 {formatNumber(log.summary.issueRows)}행</span>
                  <span>이슈 {formatNumber(log.summary.issueCount)}건</span>
                  <span>라이더 {formatNumber(log.summary.riderCount)}명</span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-500">아직 운영 로그가 없습니다.</p>
          )}
        </div>
      </Panel>
    </>
  );
}

function OrderList({ list }: { list: OrderRecord[] }) {
  return (
    <div className="space-y-2">
      {list.map((order) => (
        <div className="rounded-lg border border-slate-200 bg-white p-3" key={order.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <strong className="text-sm text-slate-950">{order.storeName}</strong>
              <p className="mt-1 text-xs leading-5 text-slate-500">{order.pickupArea} → {order.dropoffArea}</p>
            </div>
            <span className={`rounded-md px-2 py-1 text-[11px] font-black ${order.status === "완료" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
              {order.status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
            <span>{order.id}</span>
            <span>{segmentLabels[order.timeSegment]}</span>
            <span>{order.deliveryType}</span>
            <span>{order.durationMin ? `${order.durationMin}분` : "시간 미기재"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiderPaceCheck({
  metric,
  latestWeekOrders,
  paceSettings,
}: {
  metric: RiderMetric;
  latestWeekOrders: OrderRecord[];
  paceSettings: PaceCheckSettings;
}) {
  const settingsSignature = createPaceSettingsSignature(paceSettings);
  const storageKey = `rider-pace-check:${metric.riderId}:${latestWeekOrders[0]?.weekCode ?? metric.weekLabel}:${settingsSignature}`;
  const [paceInput, setPaceInput] = useState<PaceCheckInput>(() => readStoredPaceCheckInput(storageKey, metric.completedCount, paceSettings));
  const lastWeekPace = getLastWeekPace(metric, latestWeekOrders);
  const goalProgress = calculateGoalProgress(paceInput);
  const recommendation = buildPaceRecommendation(paceInput, lastWeekPace, paceSettings);
  const routine = getRoutineCoaching(paceInput.routineType, paceSettings);
  const selectedMusicMode = getMusicMode(paceInput.musicModeId, paceSettings);
  const conditionLabel = conditionOptions.find((option) => option.value === paceInput.condition)?.label ?? "보통";
  const mealLabel = mealOptions.find((option) => option.value === paceInput.mealStatus)?.label ?? "아직";
  const restLabel = restOptions.find((option) => option.value === paceInput.restStatus)?.label ?? "부족";

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(normalizePaceCheckInput(paceInput)));
  }, [paceInput, storageKey]);

  function updatePaceInput(patch: Partial<PaceCheckInput>) {
    setPaceInput((current) => normalizePaceCheckInput({ ...current, ...patch }));
  }

  return (
    <section className="space-y-3 pb-3">
      <ScreenHeader
        eyebrow="Pace Check"
        title="오늘의 페이스 체크"
        description="지난주 확정 데이터와 오늘 입력으로 다음 행동을 정합니다."
      />

      <Panel className={paceToneClass[recommendation.tone]}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0" size={22} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase opacity-75">다음 추천 행동</p>
            <h2 className="mt-1 text-xl font-black">{recommendation.title}</h2>
            <p className="mt-2 text-sm font-bold leading-6">{recommendation.message}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-white/70 p-3">
            <span className="text-xs font-bold opacity-75">오늘 입력</span>
            <strong className="mt-1 block text-3xl font-black">{formatNumber(paceInput.todayCompletedCalls)}건</strong>
          </div>
          <div className="rounded-md bg-white/70 p-3">
            <span className="text-xs font-bold opacity-75">추가 필요</span>
            <strong className="mt-1 block text-3xl font-black">{formatNumber(goalProgress.additionalCallsNeeded)}건</strong>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6">{goalProgress.nextAction}</p>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">오늘 수기 입력</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">이 기기 기준 임시 저장 · 서버 저장 없음</p>
          </div>
          <Clock className="text-slate-400" size={22} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">오늘 완료 콜 수</span>
            <input
              className="mt-2 h-14 w-full rounded-md border border-slate-300 px-3 text-lg font-black outline-none focus:border-blue-500"
              inputMode="numeric"
              min={0}
              type="number"
              value={paceInput.todayCompletedCalls}
              onChange={(event) => updatePaceInput({ todayCompletedCalls: Number(event.target.value) })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">운행 시작 시간</span>
            <input
              className="mt-2 h-14 w-full rounded-md border border-slate-300 px-3 text-lg font-black outline-none focus:border-blue-500"
              type="time"
              value={paceInput.todayStartTime}
              onChange={(event) => updatePaceInput({ todayStartTime: event.target.value })}
            />
          </label>
        </div>

        <div className="mt-4 space-y-4">
          <SegmentControl
            label="컨디션"
            options={conditionOptions}
            value={paceInput.condition}
            onChange={(value) => updatePaceInput({ condition: value as PaceCondition })}
          />
          <SegmentControl
            label="식사 여부"
            options={mealOptions}
            value={paceInput.mealStatus}
            onChange={(value) => updatePaceInput({ mealStatus: value as MealStatus })}
          />
          <label className="block">
            <span className="text-sm font-bold text-slate-700">수면 시간</span>
            <input
              className="mt-2 h-14 w-full rounded-md border border-slate-300 px-3 text-lg font-black outline-none focus:border-blue-500"
              inputMode="decimal"
              max={24}
              min={0}
              step={0.5}
              type="number"
              value={paceInput.sleepHours}
              onChange={(event) => updatePaceInput({ sleepHours: Number(event.target.value) })}
            />
          </label>
          <SegmentControl
            label="휴식 여부"
            options={restOptions}
            value={paceInput.restStatus}
            onChange={(value) => updatePaceInput({ restStatus: value as RestStatus })}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black">
          <span className="rounded-md bg-slate-50 px-2 py-2 text-slate-700">컨디션 {conditionLabel}</span>
          <span className="rounded-md bg-slate-50 px-2 py-2 text-slate-700">식사 {mealLabel}</span>
          <span className="rounded-md bg-slate-50 px-2 py-2 text-slate-700">휴식 {restLabel}</span>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center gap-3">
          <Target className="shrink-0 text-emerald-700" size={22} />
          <h2 className="text-lg font-black">이번 주 목표</h2>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-bold text-slate-700">이번 주 목표 콜 수</span>
          <input
            className="mt-2 h-14 w-full rounded-md border border-slate-300 px-3 text-lg font-black outline-none focus:border-blue-500"
            inputMode="numeric"
            min={1}
            type="number"
            value={paceInput.weeklyGoalCalls}
            onChange={(event) => updatePaceInput({ weeklyGoalCalls: Number(event.target.value) })}
          />
        </label>
        <div className="mt-3 rounded-md bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-950">
          {goalProgress.recommendedPaceText}
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <BarChart3 size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">지난주 기준</h2>
            <p className="mt-1 text-sm font-bold leading-5 text-blue-700">쿠팡플러스 확정 데이터</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-md bg-slate-50 p-3">
            <span className="font-bold text-slate-500">완료</span>
            <strong className="mt-1 block text-xl font-black text-slate-950">{formatNumber(lastWeekPace.completedCalls)}건</strong>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <span className="font-bold text-slate-500">활동</span>
            <strong className="mt-1 block text-xl font-black text-slate-950">{formatNumber(lastWeekPace.activeDays)}일</strong>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <span className="font-bold text-slate-500">평균</span>
            <strong className="mt-1 block text-xl font-black text-slate-950">
              {lastWeekPace.averageDailyCalls === null ? "-" : `${lastWeekPace.averageDailyCalls}`}
            </strong>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
          {lastWeekPace.hasEnoughDateData ? "활동일 평균입니다." : "페이스 기준 데이터가 부족해 완료 수 중심으로 봅니다."}
        </p>
      </Panel>

      <Panel>
        <div className="flex items-start gap-3">
          <Coffee className="mt-0.5 text-amber-700" size={22} />
          <div>
            <h2 className="text-lg font-black">주간형 / 야간형 루틴</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">오늘 리듬을 고르세요.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {routineOptions.map((option) => {
            const Icon = option.icon;
            const selected = paceInput.routineType === option.value;
            return (
              <button
                className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-2 text-sm font-black leading-tight ${selected ? "border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-600"}`}
                key={option.value}
                onClick={() => updatePaceInput({ routineType: option.value })}
                type="button"
              >
                <Icon size={17} />
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <p className="text-sm font-black text-slate-950">{routine.title}</p>
          <div className="mt-3 space-y-2">
            {routine.points.slice(0, 2).map((point) => (
              <p className="text-sm leading-5 text-slate-600" key={point}>{point}</p>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start gap-3">
          <Music className="mt-0.5 text-violet-700" size={22} />
          <div>
            <h2 className="text-lg font-black">음악 모드 추천</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">선택 UI만 제공합니다. 재생 기능은 없습니다.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {musicModes.map((mode) => {
            const selected = paceInput.musicModeId === mode.modeId;
            return (
              <button
                className={`w-full rounded-md border p-3 text-left ${selected ? "border-violet-500 bg-violet-50 text-violet-950 ring-2 ring-violet-100" : "border-slate-200 bg-white text-slate-700"}`}
                key={mode.modeId}
                onClick={() => updatePaceInput({ musicModeId: mode.modeId as MusicModeId })}
                type="button"
              >
                <span className="block text-sm font-black">{mode.label}</span>
                <span className="mt-1 block text-xs font-semibold leading-5">{mode.description}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-md bg-violet-50 p-3 text-sm leading-6 text-violet-950">
          <strong className="font-black">{selectedMusicMode.label}</strong>
          <p className="mt-1">{selectedMusicMode.safetyNote}</p>
        </div>
      </Panel>
    </section>
  );
}

function readStoredPaceCheckInput(storageKey: string, completedCount: number, paceSettings: PaceCheckSettings): PaceCheckInput {
  const fallback = createDefaultPaceCheckInput(completedCount, paceSettings);
  if (typeof window === "undefined") return fallback;

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved) as Partial<PaceCheckInput>;
    return normalizePaceCheckInput({ ...fallback, ...parsed } as PaceCheckInput);
  } catch {
    return fallback;
  }
}

function SegmentControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; tone?: ChoiceTone }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-700">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          const toneClass = choiceToneClass[option.tone ?? "blue"];
          return (
            <button
              className={`min-h-12 rounded-md border px-2 text-sm font-black leading-tight ${selected ? toneClass.selected : toneClass.idle}`}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RiderHome({
  metric,
  latestWeekOrders,
  paceSettings,
}: {
  metric: RiderMetric;
  latestWeekOrders: OrderRecord[];
  paceSettings: PaceCheckSettings;
}) {
  return (
    <>
      <ScreenHeader eyebrow="Rider Home" title={`${metric.riderName}님, 이번 주 운행 현황`} description={`${metric.weekLabel} · 최신 업로드 주차의 본인 데이터만 표시합니다.`} />
      <RiderPaceCheck
        key={`${metric.riderId}-${latestWeekOrders[0]?.weekCode ?? metric.weekLabel}-${createPaceSettingsSignature(paceSettings)}`}
        metric={metric}
        latestWeekOrders={latestWeekOrders}
        paceSettings={paceSettings}
      />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="완료" value={`${metric.completedCount}건`} caption={`${metric.activeDays}일 활동`} tone="blue" />
        <StatTile label="점수" value={`${metric.dispatchScore}점`} caption={metric.grade} tone="good" />
        <StatTile label="예상 정산" value={formatWon(metric.expectedSettlement)} caption="업로드 데이터 합계" />
        <StatTile label="주간 거리" value={`${metric.distanceKm}km`} caption="배달거리 합계" />
      </div>
      <Panel>
        <h2 className="text-lg font-black">최신 업로드 주차 운행 요약</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">관리자가 업로드한 엑셀 데이터를 기준으로 집계한 과거 운행 이력입니다.</p>
      </Panel>
      <Panel>
        <h2 className="text-lg font-black">최근 운행 내역</h2>
        <div className="mt-3">
          <OrderList list={latestWeekOrders.slice(0, 3)} />
        </div>
      </Panel>
    </>
  );
}

function RiderOrders({ latestWeekOrders }: { latestWeekOrders: OrderRecord[] }) {
  return (
    <>
      <ScreenHeader eyebrow="My Orders" title="내오더" description="최신 업로드 주차의 운행 내역입니다. 관리자가 업로드한 엑셀 데이터를 기준으로 표시됩니다." />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["전체", "Post_Dinner", "멀티", "업로드 주차"].map((item) => (
          <span className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600" key={item}>{item}</span>
        ))}
      </div>
      <OrderList list={latestWeekOrders} />
    </>
  );
}

function RiderMap({ latestWeekOrders }: { latestWeekOrders: OrderRecord[] }) {
  return (
    <>
      <ScreenHeader eyebrow="My Map" title="내지도" description="최신 업로드 주차의 픽업/배달 지역을 기준으로 표시하는 지도형 미리보기입니다." />
      <section className="relative h-72 overflow-hidden rounded-lg border border-slate-200 bg-[#e8f1ed]">
        <div className="absolute inset-x-8 top-12 h-44 rounded-[50%] border-4 border-dashed border-teal-500" />
        <div className="absolute left-10 top-16 rounded-md bg-white px-3 py-2 text-xs font-black text-teal-800 shadow">픽업</div>
        <div className="absolute right-8 top-32 rounded-md bg-white px-3 py-2 text-xs font-black text-blue-800 shadow">도착</div>
        <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-white/95 p-3 shadow">
          <strong className="text-sm text-slate-950">업로드 주차 지역 · {latestWeekOrders.length}건</strong>
          <p className="mt-1 text-xs text-slate-500">주소 텍스트와 지역 요약 기반이며 좌표 캐시는 MVP 이후 확장 예정입니다.</p>
        </div>
      </section>
      <OrderList list={latestWeekOrders.slice(0, 2)} />
    </>
  );
}

function RiderCoachingContent({ metric, message, preview = false }: { metric: RiderMetric; message?: CoachingMessage; preview?: boolean }) {
  const segmentMax = Math.max(...segments.map((segment) => metric.segmentCompleted[segment]));
  const multiCompleted = multiDeliveryTypes.reduce((sum, type) => sum + metric.deliveryTypeCompleted[type], 0);
  const singleCompleted = metric.deliveryTypeCompleted["단건"];
  const needReviewCompleted = metric.deliveryTypeCompleted["확인필요"];
  const deliveryMax = Math.max(singleCompleted, multiCompleted, needReviewCompleted);
  const weekdayMax = Math.max(...Object.values(metric.weekdayCompleted));
  const visibleMessage = message?.visibleToRider ? message.customMessage || message.autoMessage : "관리자가 아직 이번 주 코칭 메시지를 노출하지 않았습니다.";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-bold text-slate-500">배차 친화 점수</p>
          <strong className="mt-1 block text-3xl font-black text-slate-950">{metric.dispatchScore}점</strong>
          <span className="text-sm font-bold text-slate-500">{metric.grade} · {metric.completedCount}건</span>
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-teal-500 bg-teal-50 font-black text-teal-900">
          {metric.dispatchScore}
        </div>
      </div>

      <Panel>
        <h2 className="text-lg font-black">구간별 참여율</h2>
        <div className="mt-4 space-y-4">
          {segments.map((segment) => (
            <BarRow key={segment} label={segmentLabels[segment]} value={metric.segmentCompleted[segment]} max={segmentMax} />
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-black">출근 / 활동 패턴</h2>
        <div className="mt-4 space-y-4">
          {Object.entries(metric.weekdayCompleted).map(([weekday, count]) => (
            <BarRow key={weekday} label={weekday} value={count} max={weekdayMax} />
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-black">배달타입 / 멀티배달</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">멀티배달 계열 {formatNumber(multiCompleted)}건 · 멀티비율 {formatRate(metric.multiRate)}</p>
        <div className="mt-4 space-y-4">
          <BarRow label="멀티배달 계열" value={multiCompleted} max={deliveryMax} detail={`${formatNumber(multiCompleted)}건 · ${formatRate(metric.multiRate)}`} />
          <BarRow label="단건배달" value={singleCompleted} max={deliveryMax} />
          <BarRow label="확인 필요" value={needReviewCompleted} max={deliveryMax} />
        </div>
        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-500">멀티배달 세부</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {multiDeliveryTypes.map((type) => (
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600" key={type}>
                {type} {formatNumber(metric.deliveryTypeCompleted[type])}건
              </span>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-black">코칭 포인트</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {metric.coachingPoints.map((point) => (
            <span className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800" key={point}>{point}</span>
          ))}
        </div>
        <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">{metric.mission}</div>
      </Panel>

      <Panel className={preview ? "border-dashed" : ""}>
        <h2 className="text-lg font-black">라이더용 코칭 메시지</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{visibleMessage}</p>
        <p className="mt-3 text-xs font-bold text-slate-500">{message?.visibleToRider ? "관리자 노출 ON 메시지" : "노출 대기 상태"}</p>
      </Panel>
    </div>
  );
}

function RiderCoaching({ metric, message }: { metric: RiderMetric; message?: CoachingMessage }) {
  return (
    <>
      <ScreenHeader eyebrow="My Coaching" title="내코칭" description="관리자가 노출한 코칭과 내 운행 인사이트만 확인합니다." />
      <RiderCoachingContent metric={metric} message={message} />
    </>
  );
}

function RiderMy({ user, metric }: { user: UserSession; metric: RiderMetric }) {
  return (
    <>
      <ScreenHeader eyebrow="My" title="MY" description="계정 상태와 보조 정보를 확인합니다." />
      <Panel>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 font-black text-white">{metric.riderName.slice(0, 1)}</span>
          <div>
            <strong className="text-lg text-slate-950">{metric.riderName}</strong>
            <p className="text-sm text-slate-500">rider_id {user.riderId} · 승인완료</p>
          </div>
        </div>
      </Panel>
      <BetaNoticeCard />
      <SettlementWebCard role="rider" />
      <Panel>
        <h2 className="text-lg font-black">문의 / 공지</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">문의 042-672-0901 · 이번 주 코칭 메시지는 토요일 오전에 업데이트됩니다.</p>
      </Panel>
    </>
  );
}

function AdminScreens({
  screen,
  weekData,
  parsedUploadPreview,
  operationLogs,
  paceSettings,
  onParsedUploadPreviewChange,
  onApplyUploadPreview,
  onCancelUploadPreview,
  onPaceSettingsChange,
  onOperationLog,
}: {
  screen: AdminScreen;
  weekData: LatestUploadedWeekData;
  parsedUploadPreview: OrderDetailParseResult | null;
  operationLogs: OperationLogEntry[];
  paceSettings: PaceCheckSettings;
  onParsedUploadPreviewChange: (result: OrderDetailParseResult | null) => void;
  onApplyUploadPreview: () => void;
  onCancelUploadPreview: () => void;
  onPaceSettingsChange: (settings: PaceCheckSettings) => void;
  onOperationLog: (log: OperationLogEntry) => void;
}) {
  if (screen === "upload") {
    return (
      <AdminUpload
        weekData={weekData}
        parsedUploadPreview={parsedUploadPreview}
        onParsedUploadPreviewChange={onParsedUploadPreviewChange}
        onApplyUploadPreview={onApplyUploadPreview}
        onCancelUploadPreview={onCancelUploadPreview}
        onOperationLog={onOperationLog}
      />
    );
  }
  if (screen === "inspect") return <AdminInspect weekData={weekData} />;
  if (screen === "coaching") {
    return <AdminCoaching key={`${weekData.source}-${weekData.weekCode}-${weekData.fileName}`} weekData={weekData} />;
  }
  if (screen === "more") {
    return (
      <AdminMore
        operationLogs={operationLogs}
        paceSettings={paceSettings}
        onPaceSettingsChange={onPaceSettingsChange}
        onOperationLog={onOperationLog}
      />
    );
  }
  return <AdminDashboard weekData={weekData} lastAppliedLog={findLastAppliedLog(operationLogs)} />;
}

function RiderScreens({
  screen,
  user,
  weekData,
  paceSettings,
}: {
  screen: RiderScreen;
  user: UserSession;
  weekData: LatestUploadedWeekData;
  paceSettings: PaceCheckSettings;
}) {
  const metrics = getWeekMetricForUser(weekData, user);
  const latestWeekOrders = getWeekOrdersForUser(weekData, user);
  const message = metrics ? getWeekCoachingForRider(weekData, metrics.riderId) : undefined;

  if (!metrics) {
    return (
      <>
        <DataSourceNotice weekData={weekData} />
        <Panel>
          <h1 className="text-xl font-black">본인 주차 데이터가 없습니다.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">최신 업로드 주차에 이 계정의 rider_id와 매칭되는 라이더가 없을 수 있습니다.</p>
          <p className="mt-2 rounded-md bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">관리자에게 계정 매핑 또는 업로드 주차 데이터를 확인해 주세요.</p>
        </Panel>
      </>
    );
  }

  let content: React.ReactNode;
  if (screen === "orders") content = <RiderOrders latestWeekOrders={latestWeekOrders} />;
  else if (screen === "map") content = <RiderMap latestWeekOrders={latestWeekOrders} />;
  else if (screen === "coaching") content = <RiderCoaching metric={metrics} message={message} />;
  else if (screen === "my") content = <RiderMy user={user} metric={metrics} />;
  else content = <RiderHome metric={metrics} latestWeekOrders={latestWeekOrders} paceSettings={paceSettings} />;

  return (
    <>
      <DataSourceNotice weekData={weekData} />
      {content}
    </>
  );
}

export function RiderCoachingApp() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [adminScreen, setAdminScreen] = useState<AdminScreen>("dashboard");
  const [riderScreen, setRiderScreen] = useState<RiderScreen>("home");
  // 원천 엑셀에는 민감할 수 있는 운행/정산 정보가 있어 브라우저 저장소에 남기지 않는다.
  const [weekDataUploadState, setWeekDataUploadState] = useState(() => createWeekDataUploadState());
  const [operationLogs, setOperationLogs] = useState<OperationLogEntry[]>([]);
  const [paceSettings, setPaceSettings] = useState<PaceCheckSettings>(defaultPaceCheckSettings);
  const { latestUploadedWeekData, parsedUploadPreview } = weekDataUploadState;

  const activeScreen = user?.role === "admin" ? adminScreen : riderScreen;
  function handleScreenChange(screen: AdminScreen | RiderScreen) {
    if (!user) return;
    if (user.role === "admin") setAdminScreen(screen as AdminScreen);
    else setRiderScreen(screen as RiderScreen);
  }

  function handleParsedUploadPreviewChange(result: OrderDetailParseResult | null) {
    setWeekDataUploadState((current) => setParsedUploadPreview(current, result));
  }

  function handleApplyUploadPreview() {
    setWeekDataUploadState((current) => applyParsedUploadPreview(current));
  }

  function handleCancelUploadPreview() {
    setWeekDataUploadState((current) => cancelParsedUploadPreview(current));
  }

  function handleOperationLog(log: OperationLogEntry) {
    setOperationLogs((current) => [log, ...current]);
  }

  if (!user) return <LoginScreen onLogin={setUser} />;
  if (user.accountStatus === "pending") return <PendingScreen user={user} onLogout={() => setUser(null)} />;

  return (
    <AppChrome user={user} active={activeScreen} onChange={handleScreenChange} onLogout={() => setUser(null)}>
      {user.role === "admin" ? (
        <AdminScreens
          screen={adminScreen}
          weekData={latestUploadedWeekData}
          parsedUploadPreview={parsedUploadPreview}
          operationLogs={operationLogs}
          paceSettings={paceSettings}
          onParsedUploadPreviewChange={handleParsedUploadPreviewChange}
          onApplyUploadPreview={handleApplyUploadPreview}
          onCancelUploadPreview={handleCancelUploadPreview}
          onPaceSettingsChange={setPaceSettings}
          onOperationLog={handleOperationLog}
        />
      ) : (
        <RiderScreens screen={riderScreen} user={user} weekData={latestUploadedWeekData} paceSettings={paceSettings} />
      )}
    </AppChrome>
  );
}
