export type DbUserRole = "admin" | "rider";
export type DbAccountStatus = "active" | "pending" | "inactive";
export type DbUploadWeekStatus = "preview" | "applied" | "cancelled" | "rejected" | "failed";
export type DbPaceCondition = "good" | "normal" | "tired" | "risk";
export type DbMealStatus = "done" | "not_yet" | "skipped";
export type DbRestStatus = "enough" | "short" | "none";
export type DbOperationLogType =
  | "upload_preview_created"
  | "upload_applied"
  | "upload_cancelled"
  | "upload_rejected"
  | "sheet_missing"
  | "parse_failed"
  | "pace_settings_updated";

export interface DbUserAccount {
  id: string;
  loginId: string;
  role: DbUserRole;
  accountStatus: DbAccountStatus;
  riderId: string | null;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbUploadWeek {
  id: string;
  weekCode: string;
  weekLabel: string;
  sourceFileName: string;
  uploadedAt: string;
  uploadedBy: string;
  appliedAt: string | null;
  status: DbUploadWeekStatus;
  totalRows: number;
  validOrderCount: number;
  issueRows: number;
  issueCount: number;
}

export interface DbNormalizedOrder {
  id: string;
  weekId: string;
  weekCode: string;
  riderId: string;
  riderName: string;
  orderNo: string;
  deliveryType: string;
  peakTime: string;
  pickupArea: string;
  dropoffArea: string;
  completedAt: string | null;
  distanceM: number;
  settlementAmount: number;
  createdAt: string;
}

export interface DbRiderWeeklySummary {
  id: string;
  weekId: string;
  weekCode: string;
  riderId: string;
  riderName: string;
  completedCount: number;
  activeDays: number;
  multiRate: number;
  postLunchRate: number;
  postDinnerRate: number;
  dispatchScore: number;
  createdAt: string;
}

export interface DbCoachingMessage {
  id: string;
  weekId: string;
  riderId: string;
  riderName: string;
  autoMessage: string;
  customMessage: string;
  visibleToRider: boolean;
  internalMemo: string;
  updatedBy: string;
  updatedAt: string;
}

export interface DbPaceCheckEntry {
  id: string;
  riderId: string;
  entryDate: string;
  weekCode: string;
  todayCompletedCalls: number;
  todayStartTime: string | null;
  condition: DbPaceCondition;
  mealStatus: DbMealStatus;
  sleepHours: number;
  restStatus: DbRestStatus;
  weeklyGoalCalls: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbOperationLogSummary {
  totalRows: number;
  validOrderCount: number;
  issueRows: number;
  issueCount: number;
  riderCount: number;
}

export interface DbOperationLog {
  id: string;
  type: DbOperationLogType;
  weekId: string | null;
  weekCode: string | null;
  weekLabel: string | null;
  sourceFileName: string | null;
  actorUserId: string;
  summary: DbOperationLogSummary;
  createdAt: string;
}

export interface DbPaceCheckSettings {
  id: string;
  defaultWeeklyGoalCalls: number;
  sleepWarningHours: number;
  riskConditionSafetyMessage: string;
  skippedMealMessage: string;
  dayRoutineMessage: string;
  nightRoutineMessage: string;
  musicModeSafetyNote: string;
  updatedBy: string;
  updatedAt: string;
}

export interface DbSchemaDraft {
  users: DbUserAccount;
  uploadWeeks: DbUploadWeek;
  normalizedOrders: DbNormalizedOrder;
  riderWeeklySummaries: DbRiderWeeklySummary;
  coachingMessages: DbCoachingMessage;
  paceCheckEntries: DbPaceCheckEntry;
  operationLogs: DbOperationLog;
  paceCheckSettings: DbPaceCheckSettings;
}
