import { getSignalsByEquipment, getTestPointsByEquipment, getSimilarFindings } from "@/lib/airtable";

export async function loadRightRailData(opts: { equipmentId?: string; failureMode?: string; }) {
  const { equipmentId, failureMode } = opts;
  const [signals, testpoints, similar] = await Promise.all([
    equipmentId ? getSignalsByEquipment(equipmentId) : Promise.resolve({ records: [] }),
    equipmentId ? getTestPointsByEquipment(equipmentId) : Promise.resolve({ records: [] }),
    failureMode ? getSimilarFindings(failureMode) : Promise.resolve({ records: [] })
  ]);
  return { signals: signals.records ?? [], testpoints: testpoints.records ?? [], similar: similar.records ?? [] };
}
