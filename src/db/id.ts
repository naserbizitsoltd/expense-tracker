// Central place for entity ID generation. Every table uses a UUID v4
// (via the Web Crypto API) as its primary key — unique, stable, safe
// to carry through JSON export/import for backup & restore, and never
// dependent on array position or insertion order.
export function generateId(): string {
  return crypto.randomUUID()
}

// Fixed ids for the two singleton rows (one row per table, always
// looked up by this id instead of listed/queried).
export const APP_SETTINGS_ID = 'app-settings'
export const DB_METADATA_ID = 'db-metadata'