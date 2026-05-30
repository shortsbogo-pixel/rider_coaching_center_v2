import { extractWeekFromFileName, type OrderDetailParseResult } from "./excel-upload";
import type { LatestUploadedWeekData } from "./week-data";

export type OperationLogType =
  | "upload_preview_created"
  | "upload_applied"
  | "upload_cancelled"
  | "upload_rejected"
  | "sheet_missing"
  | "parse_failed"
  | "pace_settings_updated";

export interface OperationLogSummary {
  totalRows: number;
  validOrderCount: number;
  issueRows: number;
  issueCount: number;
  riderCount: number;
}

export interface OperationLogEntry {
  id: string;
  type: OperationLogType;
  weekCode: string | null;
  weekLabel: string | null;
  sourceFileName: string;
  createdAt: string;
  actor: "admin";
  summary: OperationLogSummary;
}

export function createOperationLogFromParseResult({
  type,
  parseResult,
  createdAt = new Date().toISOString(),
}: {
  type: OperationLogType;
  parseResult: OrderDetailParseResult;
  createdAt?: string;
}): OperationLogEntry {
  return {
    id: createOperationLogId(type, parseResult.fileName, createdAt),
    type,
    weekCode: parseResult.weekCode,
    weekLabel: parseResult.weekLabel,
    sourceFileName: parseResult.fileName,
    createdAt,
    actor: "admin",
    summary: createSummaryFromParseResult(parseResult),
  };
}

export function createOperationLogFromFileName({
  type,
  sourceFileName,
  createdAt = new Date().toISOString(),
}: {
  type: OperationLogType;
  sourceFileName: string;
  createdAt?: string;
}): OperationLogEntry {
  const weekInfo = extractWeekFromFileName(sourceFileName);

  return {
    id: createOperationLogId(type, sourceFileName, createdAt),
    type,
    weekCode: weekInfo?.weekCode ?? null,
    weekLabel: weekInfo?.weekLabel ?? null,
    sourceFileName,
    createdAt,
    actor: "admin",
    summary: createEmptySummary(),
  };
}

export function createOperationLogFromWeekData({
  type,
  weekData,
  createdAt = new Date().toISOString(),
}: {
  type: OperationLogType;
  weekData: LatestUploadedWeekData;
  createdAt?: string;
}): OperationLogEntry {
  const parseResult = weekData.parseResult;
  const summary = parseResult
    ? createSummaryFromParseResult(parseResult)
    : {
        totalRows: weekData.orders.length,
        validOrderCount: weekData.orders.length,
        issueRows: 0,
        issueCount: 0,
        riderCount: weekData.metrics.length,
      };

  return {
    id: createOperationLogId(type, weekData.fileName, createdAt),
    type,
    weekCode: weekData.weekCode,
    weekLabel: weekData.weekLabel,
    sourceFileName: weekData.fileName,
    createdAt,
    actor: "admin",
    summary,
  };
}

export function createOperationLogFromPaceSettingsUpdate(createdAt = new Date().toISOString()): OperationLogEntry {
  const sourceFileName = "페이스 체크 설정";
  return {
    id: createOperationLogId("pace_settings_updated", sourceFileName, createdAt),
    type: "pace_settings_updated",
    weekCode: null,
    weekLabel: null,
    sourceFileName,
    createdAt,
    actor: "admin",
    summary: createEmptySummary(),
  };
}

export function sortOperationLogsNewestFirst(logs: OperationLogEntry[]): OperationLogEntry[] {
  return [...logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

export function findLastAppliedLog(logs: OperationLogEntry[]): OperationLogEntry | null {
  return sortOperationLogsNewestFirst(logs).find((log) => log.type === "upload_applied") ?? null;
}

function createSummaryFromParseResult(parseResult: OrderDetailParseResult): OperationLogSummary {
  return {
    totalRows: parseResult.totalRows,
    validOrderCount: parseResult.validOrderCount,
    issueRows: new Set(parseResult.issues.map((issue) => issue.rowNumber)).size,
    issueCount: parseResult.issueCount,
    riderCount: parseResult.riderSummaries.length,
  };
}

function createEmptySummary(): OperationLogSummary {
  return {
    totalRows: 0,
    validOrderCount: 0,
    issueRows: 0,
    issueCount: 0,
    riderCount: 0,
  };
}

function createOperationLogId(type: OperationLogType, sourceFileName: string, createdAt: string): string {
  const base = `${createdAt}-${type}-${sourceFileName}`;
  let hash = 0;

  for (let index = 0; index < base.length; index += 1) {
    hash = (hash * 31 + base.charCodeAt(index)) >>> 0;
  }

  return `op-${hash.toString(36)}`;
}
