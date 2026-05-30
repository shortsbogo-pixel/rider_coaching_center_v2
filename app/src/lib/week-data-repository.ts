import type { CoachingMessage, OrderRecord, RiderMetric } from "./domain";
import type { IssueSummary, UploadIssueType } from "./excel-upload";
import { getAdminDashboardSummary, type LatestUploadedWeekData } from "./week-data";

export interface StoredInspectionSummary {
  totalRows: number;
  validOrderCount: number;
  issueRows: number;
  issueCount: number;
  issueSummary: IssueSummary;
  headerFound: boolean;
  missingHeaders: string[];
}

export interface StoredAdminVisibilitySetting {
  riderId: string;
  riderName: string;
  visibleToRider: boolean;
  updatedAt: string;
}

export interface StoredWeekDataRecord {
  weekCode: string;
  weekLabel: string;
  uploadedAt: string;
  sourceFileName: string;
  inspectionSummary: StoredInspectionSummary;
  normalizedOrders: OrderRecord[];
  riderWeeklySummaries: RiderMetric[];
  coachingMessages: CoachingMessage[];
  adminVisibilitySettings: StoredAdminVisibilitySetting[];
}

export interface WeekDataRepository {
  loadLatestWeekData(): Promise<StoredWeekDataRecord | null>;
  saveLatestWeekData(record: StoredWeekDataRecord): Promise<void>;
  clearLatestWeekData(): Promise<void>;
}

export class InMemoryWeekDataRepository implements WeekDataRepository {
  private latestWeekData: StoredWeekDataRecord | null = null;

  async loadLatestWeekData(): Promise<StoredWeekDataRecord | null> {
    return this.latestWeekData ? cloneRecord(this.latestWeekData) : null;
  }

  async saveLatestWeekData(record: StoredWeekDataRecord): Promise<void> {
    this.latestWeekData = cloneRecord(record);
  }

  async clearLatestWeekData(): Promise<void> {
    this.latestWeekData = null;
  }
}

export function createStoredWeekDataRecord(
  weekData: LatestUploadedWeekData,
  uploadedAt = new Date().toISOString(),
): StoredWeekDataRecord {
  const dashboardSummary = getAdminDashboardSummary(weekData);
  const parseResult = weekData.parseResult;

  return {
    weekCode: weekData.weekCode,
    weekLabel: weekData.weekLabel,
    uploadedAt,
    sourceFileName: weekData.fileName,
    inspectionSummary: {
      totalRows: parseResult?.totalRows ?? weekData.orders.length,
      validOrderCount: parseResult?.validOrderCount ?? weekData.orders.length,
      issueRows: dashboardSummary.issueRows,
      issueCount: dashboardSummary.issueCount,
      issueSummary: parseResult?.issueSummary ?? createEmptyIssueSummary(),
      headerFound: parseResult?.headerFound ?? true,
      missingHeaders: parseResult?.missingHeaders ?? [],
    },
    normalizedOrders: weekData.orders,
    riderWeeklySummaries: weekData.metrics,
    coachingMessages: weekData.coachingMessages,
    adminVisibilitySettings: weekData.coachingMessages.map((message) => ({
      riderId: message.riderId,
      riderName: message.riderName,
      visibleToRider: message.visibleToRider,
      updatedAt: message.updatedAt,
    })),
  };
}

function createEmptyIssueSummary(): IssueSummary {
  const issueTypes: UploadIssueType[] = [
    "delivery_type_missing",
    "delivery_type_unknown",
    "peak_time_missing",
    "rider_name_missing",
    "order_number_missing",
    "time_value_missing",
  ];

  return issueTypes.reduce<IssueSummary>((summary, type) => {
    summary[type] = 0;
    return summary;
  }, {} as IssueSummary);
}

function cloneRecord(record: StoredWeekDataRecord): StoredWeekDataRecord {
  return JSON.parse(JSON.stringify(record)) as StoredWeekDataRecord;
}
