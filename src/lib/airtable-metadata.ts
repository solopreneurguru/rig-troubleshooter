import { withDeadline } from "./withDeadline";

type FieldMap = Record<string, unknown>;

const FIELD_CACHE: Record<string, Set<string>> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_TIMESTAMPS: Record<string, number> = {};

/**
 * Safely convert unknown value to a field map object
 */
const toFieldMap = (v: unknown): FieldMap =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as FieldMap) : {};

/**
 * Get all field names for a table, with caching
 */
export async function getTableFields(base: any, tableName: string): Promise<Set<string>> {
  const now = Date.now();
  const cacheKey = `${tableName}`;
  const cached = FIELD_CACHE[cacheKey];
  const timestamp = CACHE_TIMESTAMPS[cacheKey] || 0;

  if (cached && (now - timestamp) < CACHE_TTL) {
    return cached;
  }

  try {
    const table = base(tableName);
    const fields = await withDeadline(
      table.fields(),
      6000,
      'table-fields'
    );
    
    const fieldNames = new Set(Object.keys(toFieldMap(fields)));
    FIELD_CACHE[cacheKey] = fieldNames;
    CACHE_TIMESTAMPS[cacheKey] = now;
    return fieldNames;
  } catch (e) {
    // On error, return cached if available (even if expired)
    if (cached) return cached;
    throw e;
  }
}

/**
 * Filter an object to only include keys that exist as fields in the table
 */
export async function setIfExists(
  base: any,
  tableName: string,
  draft: Record<string, any>
): Promise<Record<string, any>> {
  try {
    const fields = await getTableFields(base, tableName);
    const filtered: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(draft)) {
      if (fields.has(key)) {
        filtered[key] = value;
      }
    }
    
    return filtered;
  } catch (e) {
    // If we can't get fields, return original (best effort)
    return { ...draft };
  }
}