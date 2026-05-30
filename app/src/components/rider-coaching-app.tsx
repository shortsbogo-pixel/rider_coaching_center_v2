"use client";

import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileUp,
  Home,
  ListChecks,
  LockKeyhole,
  MapPinned,
  MessageSquareText,
  MoreHorizontal,
  RotateCcw,
  Settings,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  User,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import {
  adminTabs,
  coachingMessages,
  formatNumber,
  formatRate,
  formatWon,
  getAdminSummary,
  getOrdersForUser,
  getRiderMetricsForUser,
  login,
  riderMetrics,
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
const deliveryTypes: DeliveryType[] = ["단건", "멀티배달1", "멀티배달2", "멀티배달3", "확인필요"];

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
    <header className="space-y-1">
      <p className="text-[11px] font-bold uppercase text-blue-700">{eyebrow}</p>
      <h1 className="text-2xl font-black text-slate-950">{title}</h1>
      <p className="text-sm leading-5 text-slate-500">{description}</p>
    </header>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>;
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
    <div className={`min-h-24 rounded-lg border p-3 ${toneClass}`}>
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <strong className="mt-2 block text-2xl font-black">{value}</strong>
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
    <main className="min-h-dvh bg-slate-100 px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-[430px] flex-col justify-center gap-4">
        <section className="rounded-lg bg-slate-950 p-5 text-white">
          <p className="text-sm font-semibold text-teal-200">Rider Coaching Center</p>
          <h1 className="mt-3 text-3xl font-black">주간 운행 데이터를 코칭으로 바꾸는 앱</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            원천 엑셀 업로드, 관리자 코칭 관리, 라이더 본인 화면 분기를 mock data로 확인합니다.
          </p>
        </section>

        <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">아이디</span>
            <input
              className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-blue-500"
              value={id}
              onChange={(event) => setId(event.target.value)}
            />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-bold text-slate-700">비밀번호</span>
            <input
              className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-blue-500"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-blue-600 font-black text-white" type="submit">
            <LockKeyhole size={18} />
            로그인
          </button>
          {message ? <p className="mt-3 text-sm font-bold text-rose-600">{message}</p> : null}
        </form>

        <div className="grid gap-2 text-xs font-semibold text-slate-600">
          <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left" onClick={() => { setId("admin"); setPassword("admin1234"); }}>
            admin / admin1234
          </button>
          <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left" onClick={() => { setId("rider1"); setPassword("rider1234"); }}>
            rider1 / rider1234
          </button>
          <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left" onClick={() => { setId("pending"); setPassword("pending1234"); }}>
            pending / pending1234
          </button>
        </div>
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

  return (
    <main className="min-h-dvh bg-slate-100">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-slate-50 shadow-2xl">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500">{isAdmin ? "관리자" : "라이더"} 모드</p>
              <strong className="text-base font-black text-slate-950">{user.displayName}</strong>
            </div>
            <button className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </header>

        <div className="space-y-4 px-4 pb-28 pt-4">{children}</div>

        <nav className="fixed bottom-0 left-1/2 z-30 grid h-[74px] w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-slate-200 bg-white px-2 pb-2 pt-2">
          {tabs.map((tab: AppTab) => {
            const Icon = isAdmin ? adminIcons[tab.key as AdminScreen] : riderIcons[tab.key as RiderScreen];
            const selected = active === tab.key;
            return (
              <button
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-black ${
                  selected ? "bg-blue-50 text-blue-700" : "text-slate-500"
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

function AdminDashboard() {
  const summary = getAdminSummary();
  const topCompleted = Math.max(...riderMetrics.map((metric) => metric.completedCount));
  return (
    <>
      <ScreenHeader eyebrow="Admin Dashboard" title="주간 대시보드" description="5월4주차 원천 엑셀 기준 운영 현황입니다." />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="완료 콜" value={`${formatNumber(summary.completed)}건`} caption="mock 원천 데이터" tone="blue" />
        <StatTile label="운영 라이더" value={`${summary.activeRiders}명`} caption="활성 기준" tone="good" />
        <StatTile label="검수 이슈" value={`${summary.issueRows}건`} caption="확인 필요" tone="warn" />
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
          {riderMetrics.map((metric) => (
            <BarRow key={metric.riderId} label={`${metric.riderName} · ${metric.grade}`} value={metric.completedCount} max={topCompleted} />
          ))}
        </div>
      </Panel>
      <Panel>
        <h2 className="text-lg font-black">최근 업로드 요약</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">사용 파일</span><strong>동구바로_대전_동구중앙_2026_05-4.xlsx</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">기본 시트</span><strong>오더별 상세 내역서</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">파싱 상태</span><strong className="text-emerald-700">반영 가능</strong></div>
        </div>
      </Panel>
    </>
  );
}

function AdminUpload() {
  const [fileName, setFileName] = useState("동구바로_대전_동구중앙_2026_05-4.xlsx");
  const result = validateUploadFileName(fileName);

  return (
    <>
      <ScreenHeader eyebrow="Upload" title="엑셀 업로드" description="아직 실제 저장은 하지 않고, 파일명과 시트 구조를 mock 검수합니다." />
      <Panel>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">선택 파일명</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
          />
        </label>
        <div className={`mt-4 rounded-md border p-3 text-sm font-bold ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {result.message}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="h-11 rounded-md border border-slate-300 bg-white font-bold text-slate-700" onClick={() => setFileName("동구바로 2026년5월4주차 정산 최종.xlsx")}>
            제외 파일 테스트
          </button>
          <button className="h-11 rounded-md bg-blue-600 font-bold text-white" onClick={() => setFileName("동구바로_대전_동구중앙_2026_05-4.xlsx")}>
            원천 파일 테스트
          </button>
        </div>
      </Panel>
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

function AdminInspect() {
  return (
    <>
      <ScreenHeader eyebrow="Inspection" title="업로드 검수" description="저장 전 확인해야 할 데이터 품질 이슈를 주차 기준으로 정리합니다." />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="총 행 수" value="4,388행" caption="헤더 제외" tone="blue" />
        <StatTile label="정상 파싱" value="4,115행" caption="오더 후보" tone="good" />
        <StatTile label="확인필요" value="376행" caption="빈 값 포함" tone="warn" />
        <StatTile label="분석 대상" value="42명" caption="라이더 기준" />
      </div>
      <Panel>
        <h2 className="text-lg font-black">오류 / 미매칭</h2>
        <div className="mt-3 space-y-2">
          {[
            ["배달타입 확인", "0 또는 멀티배달5 값은 확인필요로 분리"],
            ["피크타임 빈 값", "구간 참여율 계산 전 검수 필요"],
            ["라이더명 매칭", "동명이인 또는 suffix 차이 확인"],
          ].map(([title, body]) => (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3" key={title}>
              <strong className="text-sm text-amber-900">{title}</strong>
              <p className="mt-1 text-xs leading-5 text-amber-800">{body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function AdminCoaching() {
  const [selectedId, setSelectedId] = useState("r-001");
  const [messages, setMessages] = useState<CoachingMessage[]>(coachingMessages);
  const selectedMetric = riderMetrics.find((metric) => metric.riderId === selectedId) ?? riderMetrics[0];
  const selectedMessage = messages.find((message) => message.riderId === selectedMetric.riderId) ?? messages[0];

  function updateMessage(patch: Partial<CoachingMessage>) {
    setMessages((current) =>
      current.map((message) => (message.riderId === selectedMessage.riderId ? { ...message, ...patch } : message)),
    );
  }

  return (
    <>
      <ScreenHeader eyebrow="Coaching" title="코칭 메시지 관리" description="자동 메시지를 수정하고 라이더 노출 여부를 관리합니다." />
      <Panel>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">라이더 선택</span>
          <select
            className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-sm font-bold"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {riderMetrics.map((metric) => (
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
        <label className="mt-4 block">
          <span className="text-sm font-bold text-slate-700">자동 메시지</span>
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-slate-50 p-3 text-sm leading-6" readOnly value={selectedMessage.autoMessage} />
        </label>
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

function AdminMore() {
  return (
    <>
      <ScreenHeader eyebrow="More" title="더보기" description="자주 쓰지 않는 설정과 계정 관리를 모았습니다." />
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
            <span>{order.durationMin ? `${order.durationMin}분` : "진행중"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiderHome({ metric, userOrders }: { metric: RiderMetric; userOrders: OrderRecord[] }) {
  const activeOrder = userOrders.find((order) => order.status === "진행중");
  return (
    <>
      <ScreenHeader eyebrow="Rider Home" title={`${metric.riderName}님, 이번 주 운행 현황`} description={`${metric.weekLabel} · 본인 데이터만 표시합니다.`} />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="완료" value={`${metric.completedCount}건`} caption={`${metric.activeDays}일 활동`} tone="blue" />
        <StatTile label="점수" value={`${metric.dispatchScore}점`} caption={metric.grade} tone="good" />
        <StatTile label="예상 정산" value={formatWon(metric.expectedSettlement)} caption="mock 합계" />
        <StatTile label="주간 거리" value={`${metric.distanceKm}km`} caption="배달거리 합계" />
      </div>
      {activeOrder ? (
        <Panel className="border-blue-200 bg-blue-50">
          <h2 className="text-lg font-black text-blue-950">현재 진행중 오더</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">{activeOrder.storeName} · {activeOrder.pickupArea} → {activeOrder.dropoffArea}</p>
        </Panel>
      ) : null}
      <Panel>
        <h2 className="text-lg font-black">최근 내 오더</h2>
        <div className="mt-3">
          <OrderList list={userOrders.slice(0, 3)} />
        </div>
      </Panel>
    </>
  );
}

function RiderOrders({ userOrders }: { userOrders: OrderRecord[] }) {
  return (
    <>
      <ScreenHeader eyebrow="My Orders" title="내오더" description="rider_id 기준 본인 오더만 표시합니다. 타 라이더 선택 UI는 없습니다." />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["전체", "Post_Dinner", "멀티", "오늘"].map((item) => (
          <span className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600" key={item}>{item}</span>
        ))}
      </div>
      <OrderList list={userOrders} />
    </>
  );
}

function RiderMap({ userOrders }: { userOrders: OrderRecord[] }) {
  return (
    <>
      <ScreenHeader eyebrow="My Map" title="내지도" description="실제 지도 API 없이 본인 픽업/도착 흐름을 mock 경로로 표시합니다." />
      <section className="relative h-72 overflow-hidden rounded-lg border border-slate-200 bg-[#e8f1ed]">
        <div className="absolute inset-x-8 top-12 h-44 rounded-[50%] border-4 border-dashed border-teal-500" />
        <div className="absolute left-10 top-16 rounded-md bg-white px-3 py-2 text-xs font-black text-teal-800 shadow">픽업</div>
        <div className="absolute right-8 top-32 rounded-md bg-white px-3 py-2 text-xs font-black text-blue-800 shadow">도착</div>
        <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-white/95 p-3 shadow">
          <strong className="text-sm text-slate-950">내 오더 지도 · {userOrders.length}건</strong>
          <p className="mt-1 text-xs text-slate-500">좌표 캐시는 MVP 이후 확장 예정입니다.</p>
        </div>
      </section>
      <OrderList list={userOrders.slice(0, 2)} />
    </>
  );
}

function RiderCoachingContent({ metric, message, preview = false }: { metric: RiderMetric; message?: CoachingMessage; preview?: boolean }) {
  const segmentMax = Math.max(...segments.map((segment) => metric.segmentCompleted[segment]));
  const deliveryMax = Math.max(...deliveryTypes.map((type) => metric.deliveryTypeCompleted[type]));
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
        <h2 className="text-lg font-black">배달타입 / 멀티</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">멀티율 {formatRate(metric.multiRate)}</p>
        <div className="mt-4 space-y-4">
          {deliveryTypes.map((type) => (
            <BarRow key={type} label={type} value={metric.deliveryTypeCompleted[type]} max={deliveryMax} />
          ))}
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

function RiderCoaching({ metric }: { metric: RiderMetric }) {
  const message = coachingMessages.find((item) => item.riderId === metric.riderId);
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
      <Panel>
        <h2 className="text-lg font-black">문의 / 공지</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">문의 042-672-0901 · 이번 주 코칭 메시지는 토요일 오전에 업데이트됩니다.</p>
      </Panel>
    </>
  );
}

function AdminScreens({ screen }: { screen: AdminScreen }) {
  if (screen === "upload") return <AdminUpload />;
  if (screen === "inspect") return <AdminInspect />;
  if (screen === "coaching") return <AdminCoaching />;
  if (screen === "more") return <AdminMore />;
  return <AdminDashboard />;
}

function RiderScreens({ screen, user }: { screen: RiderScreen; user: UserSession }) {
  const metrics = getRiderMetricsForUser(user)[0];
  const userOrders = getOrdersForUser(user);

  if (!metrics) {
    return (
      <Panel>
        <h1 className="text-xl font-black">연결된 라이더 데이터가 없습니다.</h1>
        <p className="mt-2 text-sm text-slate-500">관리자에게 계정 매핑을 확인해 주세요.</p>
      </Panel>
    );
  }

  if (screen === "orders") return <RiderOrders userOrders={userOrders} />;
  if (screen === "map") return <RiderMap userOrders={userOrders} />;
  if (screen === "coaching") return <RiderCoaching metric={metrics} />;
  if (screen === "my") return <RiderMy user={user} metric={metrics} />;
  return <RiderHome metric={metrics} userOrders={userOrders} />;
}

export function RiderCoachingApp() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [adminScreen, setAdminScreen] = useState<AdminScreen>("dashboard");
  const [riderScreen, setRiderScreen] = useState<RiderScreen>("home");

  const activeScreen = user?.role === "admin" ? adminScreen : riderScreen;
  function handleScreenChange(screen: AdminScreen | RiderScreen) {
    if (!user) return;
    if (user.role === "admin") setAdminScreen(screen as AdminScreen);
    else setRiderScreen(screen as RiderScreen);
  }

  if (!user) return <LoginScreen onLogin={setUser} />;
  if (user.accountStatus === "pending") return <PendingScreen user={user} onLogout={() => setUser(null)} />;

  return (
    <AppChrome user={user} active={activeScreen} onChange={handleScreenChange} onLogout={() => setUser(null)}>
      {user.role === "admin" ? <AdminScreens screen={adminScreen} /> : <RiderScreens screen={riderScreen} user={user} />}
    </AppChrome>
  );
}
