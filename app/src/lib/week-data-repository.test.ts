import { describe, expect, it } from "vitest";
import { buildSampleWeekData } from "./week-data";
import {
  createStoredWeekDataRecord,
  InMemoryWeekDataRepository,
  type StoredWeekDataRecord,
  type WeekDataRepository,
} from "./week-data-repository";

describe("week data repository", () => {
  it("builds a normalized storage record without raw workbook objects", () => {
    const weekData = buildSampleWeekData();
    const record = createStoredWeekDataRecord(weekData, "2026-05-30T00:00:00.000Z");

    expect(record).toMatchObject({
      weekCode: "2026_05-4",
      weekLabel: "2026년 5월 4주차",
      uploadedAt: "2026-05-30T00:00:00.000Z",
      sourceFileName: "샘플 데이터",
    });
    expect(record.inspectionSummary).toMatchObject({
      totalRows: 4,
      validOrderCount: 4,
      issueRows: 0,
      issueCount: 0,
      headerFound: true,
      missingHeaders: [],
    });
    expect(record.normalizedOrders.length).toBe(4);
    expect(record.riderWeeklySummaries.length).toBe(2);
    expect(record.adminVisibilitySettings).toEqual(
      weekData.coachingMessages.map((message) => ({
        riderId: message.riderId,
        riderName: message.riderName,
        visibleToRider: message.visibleToRider,
        updatedAt: message.updatedAt,
      })),
    );
    expect("parseResult" in record).toBe(false);
    expect("file" in record).toBe(false);
  });

  it("saves, loads, and clears the latest week data in memory", async () => {
    const repository: WeekDataRepository = new InMemoryWeekDataRepository();
    const record = createStoredWeekDataRecord(buildSampleWeekData(), "2026-05-30T00:00:00.000Z");

    expect(await repository.loadLatestWeekData()).toBeNull();

    await repository.saveLatestWeekData(record);
    const loadedRecord = await repository.loadLatestWeekData();

    expect(loadedRecord).toEqual(record);

    await repository.clearLatestWeekData();
    expect(await repository.loadLatestWeekData()).toBeNull();
  });

  it("returns defensive copies from the in-memory adapter", async () => {
    const repository = new InMemoryWeekDataRepository();
    const record = createStoredWeekDataRecord(buildSampleWeekData(), "2026-05-30T00:00:00.000Z");

    await repository.saveLatestWeekData(record);
    const loadedRecord = (await repository.loadLatestWeekData()) as StoredWeekDataRecord;
    loadedRecord.weekCode = "mutated";
    loadedRecord.normalizedOrders[0].storeName = "changed";

    expect((await repository.loadLatestWeekData())?.weekCode).toBe("2026_05-4");
    expect((await repository.loadLatestWeekData())?.normalizedOrders[0].storeName).not.toBe("changed");
  });
});
