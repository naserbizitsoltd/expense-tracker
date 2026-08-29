// Backup & Restore — dumps every user-data table to a single JSON file
// and restores from one. No encryption, no server, no partial writes:
// restore runs inside one Dexie transaction across every table so it
// either fully replaces the data or leaves the existing database
// completely untouched.
import { db, SCHEMA_VERSION } from './schema'
import { toAppDbError, AppDbError } from './errors'
import { DB_METADATA_ID } from './id'

// Bump only if the shape of BackupPayload itself changes (new table,
// renamed collection, etc). Restoring a file with a newer version than
// this app understands is rejected rather than guessed at.
export const BACKUP_VERSION = 1

// Every user-data table, in the order they're safest to restore in
// (referenced entities before the records that point at them). Kept as
// an explicit list — rather than db.tables.map(...) — so a future
// schema table is never silently included/excluded without a decision.
//
// NOTE: `reconciliations` (AccountReconciliation) exists in the schema
// but is NOT in this list — it isn't currently backed up. Flagging
// this rather than silently fixing it, since adding it changes what a
// restore replaces; see the message at the end of this response.
const BACKUP_TABLES = [
  'accounts',
  'categories',
  'creditCards',
  'debitCards',
  'goals',
  'loans',
  'dps',
  'fdrs',
  'budgets',
  'recurringTransactions',
  'transactions',
  'ledgerEntries',
  'loanRepayments',
  'dpsContributions',
  'dpsPayouts',
  'fdrPayouts',
  'goalTransactions',
  'notificationLog',
  'appSettings',
  'metadata',
] as const

export type BackupTableName = (typeof BACKUP_TABLES)[number]

// Friendly labels for the tables worth surfacing to the user in export/
// restore summaries. Tables not listed here (categories, debitCards,
// recurringTransactions, ledgerEntries, contribution/payout rows,
// notificationLog, appSettings, metadata) are still backed up and
// counted in full, they're just internal/derived and not worth a line
// of their own in the summary UI.
export const BACKUP_TABLE_LABELS: Partial<Record<BackupTableName, string>> = {
  accounts: 'Accounts',
  transactions: 'Transactions',
  loans: 'Loans',
  dps: 'DPS',
  fdrs: 'FDR',
  goals: 'Goals',
  budgets: 'Budgets',
  creditCards: 'Credit Cards',
}

// The subset of BACKUP_TABLES shown as headline rows in the export/
// restore summary UI, in display order.
export const BACKUP_SUMMARY_TABLES: BackupTableName[] = [
  'accounts',
  'transactions',
  'loans',
  'dps',
  'fdrs',
  'goals',
  'budgets',
  'creditCards',
]

export type BackupCounts = Record<BackupTableName, number>

export interface BackupMeta {
  backupVersion: number
  exportedAt: number
  appVersion: string
  schemaVersion: number
  // Added alongside verification support. Optional so backup files
  // exported before this feature existed still pass validation —
  // they simply can't be checksum-verified or count-compared.
  counts?: BackupCounts
  checksum?: string
}

export type BackupData = Record<BackupTableName, unknown[]>

export interface BackupPayload {
  meta: BackupMeta
  data: BackupData
}

export interface BackupVerificationIssue {
  severity: 'error' | 'warning'
  table?: BackupTableName
  message: string
}

export interface BackupVerificationResult {
  // No 'error'-severity issues. A result can still be `ok` while
  // carrying 'warning' issues (e.g. a newly-added live table this
  // backup format doesn't know about yet).
  ok: boolean
  // true/false when a checksum was present to check against, null when
  // there was nothing to compare (e.g. an older backup with no stored
  // checksum).
  checksumValid: boolean | null
  issues: BackupVerificationIssue[]
}

export interface BackupExportResult {
  filename: string
  exportedAt: number
  counts: BackupCounts
  checksum: string
  verification: BackupVerificationResult
}

export interface BackupPreview {
  meta: BackupMeta
  counts: BackupCounts
  verification: BackupVerificationResult
}

function tableOf(name: BackupTableName) {
  return db.table(name)
}

function computeCounts(data: BackupData): BackupCounts {
  const counts = {} as BackupCounts
  for (const name of BACKUP_TABLES) {
    counts[name] = data[name]?.length ?? 0
  }
  return counts
}

// SHA-256 over the table data only (never the meta block, which would
// otherwise have to contain its own checksum). Tables are hashed in
// the fixed BACKUP_TABLES order so the digest only depends on content,
// not on incidental JSON key ordering from the meta object.
async function computeChecksum(data: BackupData): Promise<string> {
  const canonical = JSON.stringify(BACKUP_TABLES.map((name) => data[name] ?? []))
  const bytes = new TextEncoder().encode(canonical)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Structural + integrity verification that never throws. Used both
 * right after an export (self-check against the counts we just read
 * from the DB) and before a restore (checking a file the user picked,
 * with no expected counts to compare against). Reports every problem
 * it finds rather than stopping at the first one.
 */
async function verifyBackup(payload: BackupPayload, expectedCounts?: BackupCounts): Promise<BackupVerificationResult> {
  const issues: BackupVerificationIssue[] = []

  for (const name of BACKUP_TABLES) {
    const collection = payload.data[name]
    if (!Array.isArray(collection)) {
      issues.push({ severity: 'error', table: name, message: `The "${name}" section is missing or malformed.` })
      continue
    }
    const invalidCount = collection.filter(
      (record) => !record || typeof record !== 'object' || typeof (record as { id?: unknown }).id !== 'string'
    ).length
    if (invalidCount > 0) {
      issues.push({
        severity: 'error',
        table: name,
        message: `${invalidCount} record(s) in "${name}" are missing a valid id.`,
      })
    }
  }

  // Guard against a live table that isn't covered by BACKUP_TABLES at
  // all (e.g. a new feature's table added to the schema but never
  // wired into the backup list) — this is how data gets "accidentally
  // omitted" from every future backup without anyone noticing.
  const knownTables = new Set<string>(BACKUP_TABLES)
  for (const table of db.tables) {
    if (!knownTables.has(table.name)) {
      issues.push({
        severity: 'warning',
        message: `The "${table.name}" table exists in the database but isn't included in backups yet.`,
      })
    }
  }

  if (expectedCounts) {
    for (const name of BACKUP_TABLES) {
      const actual = payload.data[name]?.length ?? 0
      const expected = expectedCounts[name] ?? 0
      if (actual !== expected) {
        issues.push({
          severity: 'error',
          table: name,
          message: `Expected ${expected} record(s) in "${name}" but found ${actual}.`,
        })
      }
    }
  }

  let checksumValid: boolean | null = null
  if (payload.meta.checksum) {
    const recomputed = await computeChecksum(payload.data)
    checksumValid = recomputed === payload.meta.checksum
    if (!checksumValid) {
      issues.push({
        severity: 'error',
        message: 'The checksum does not match the backup contents — the file may be corrupted or was edited.',
      })
    }
  }

  return {
    ok: checksumValid !== false && issues.every((issue) => issue.severity !== 'error'),
    checksumValid,
    issues,
  }
}

/**
 * Gathers every table into a single JSON-serializable payload, verifies
 * it (structure, ids, checksum round-trip, no omitted tables), and
 * triggers a browser download. Read-only against the database beyond
 * stamping `lastBackupAt` on success — a failed verification still
 * downloads the file (it's already correct data, just flagged) but is
 * reported back so the UI can warn instead of claiming success.
 */
export async function exportBackup(): Promise<BackupExportResult> {
  try {
    const data = {} as BackupData
    await db.transaction('r', BACKUP_TABLES.map(tableOf), async () => {
      for (const name of BACKUP_TABLES) {
        data[name] = await tableOf(name).toArray()
      }
    })

    const counts = computeCounts(data)
    const checksum = await computeChecksum(data)
    const exportedAt = Date.now()

    const payload: BackupPayload = {
      meta: {
        backupVersion: BACKUP_VERSION,
        exportedAt,
        appVersion: 'unknown',
        schemaVersion: SCHEMA_VERSION,
        counts,
        checksum,
      },
      data,
    }

    const json = JSON.stringify(payload, null, 2)

    // Round-trip through JSON once more before calling it verified —
    // this is what would catch a value that doesn't survive
    // JSON.stringify/parse cleanly (rather than trusting the in-memory
    // object we already have).
    let verification: BackupVerificationResult
    try {
      const reparsed = JSON.parse(json) as BackupPayload
      verification = await verifyBackup(reparsed, counts)
    } catch {
      verification = {
        ok: false,
        checksumValid: false,
        issues: [{ severity: 'error', message: 'The backup failed to round-trip through JSON after export.' }],
      }
    }

    const filename = `expense-tracker-backup-${formatDateForFilename(new Date())}.json`
    downloadJson(json, filename)

    // Best-effort — a failure here shouldn't undo an export the user
    // already has on disk.
    try {
      await db.metadata.update(DB_METADATA_ID, { lastBackupAt: exportedAt, updatedAt: Date.now() })
    } catch {
      // ignore
    }

    return { filename, exportedAt, counts, checksum, verification }
  } catch (error) {
    throw toAppDbError(error)
  }
}

function formatDateForFilename(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Reads and validates a backup file without touching the database.
 * Throws AppDbError('INVALID_DATA', <reason>) on any structural
 * problem — callers should show that message and stop, never call
 * restoreBackup with an unvalidated payload.
 */
export async function readAndValidateBackupFile(file: File): Promise<BackupPayload> {
  let text: string
  try {
    text = await file.text()
  } catch (error) {
    throw new AppDbError('INVALID_DATA', 'Could not read the selected file.', error)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new AppDbError('INVALID_DATA', 'This file is not valid JSON.', error)
  }

  return validateBackupPayload(parsed)
}

function validateBackupPayload(parsed: unknown): BackupPayload {
  if (!parsed || typeof parsed !== 'object') {
    throw new AppDbError('INVALID_DATA', 'This does not look like a backup file.')
  }
  const obj = parsed as Record<string, unknown>

  const meta = obj.meta as Partial<BackupMeta> | undefined
  if (!meta || typeof meta !== 'object') {
    throw new AppDbError('INVALID_DATA', 'This backup file is missing its metadata.')
  }
  if (typeof meta.backupVersion !== 'number') {
    throw new AppDbError('INVALID_DATA', 'This backup file is missing a backup version.')
  }
  if (meta.backupVersion > BACKUP_VERSION) {
    throw new AppDbError(
      'INVALID_DATA',
      'This backup was made with a newer version of the app and cannot be restored here.'
    )
  }

  const data = obj.data as Partial<BackupData> | undefined
  if (!data || typeof data !== 'object') {
    throw new AppDbError('INVALID_DATA', 'This backup file has no data to restore.')
  }

  for (const name of BACKUP_TABLES) {
    const collection = (data as Record<string, unknown>)[name]
    if (collection === undefined) {
      // Older/partial backups may lack a table added later — treat as empty
      // rather than rejecting the whole file.
      ;(data as Record<string, unknown>)[name] = []
      continue
    }
    if (!Array.isArray(collection)) {
      throw new AppDbError('INVALID_DATA', `The "${name}" section of this backup is malformed.`)
    }
    for (const record of collection) {
      if (!record || typeof record !== 'object' || typeof (record as { id?: unknown }).id !== 'string') {
        throw new AppDbError('INVALID_DATA', `The "${name}" section of this backup contains an invalid record.`)
      }
    }
  }

  return { meta: meta as BackupMeta, data: data as BackupData }
}

/**
 * Structurally-validates a backup file and returns a preview — counts
 * per table plus a non-throwing verification report (checksum match,
 * any warnings) — so the UI can show the user exactly what a restore
 * would replace their data with before they confirm anything.
 */
export async function previewBackup(file: File): Promise<{ payload: BackupPayload; preview: BackupPreview }> {
  const payload = await readAndValidateBackupFile(file)
  const counts = payload.meta.counts ?? computeCounts(payload.data)
  const verification = await verifyBackup(payload)
  return { payload, preview: { meta: payload.meta, counts, verification } }
}

/**
 * Replaces all current application data with the contents of a
 * validated backup. Runs as one Dexie transaction across every table:
 * either every table is cleared and refilled, or (on any error) none
 * of them are touched — Dexie automatically rolls back the whole
 * transaction if the callback throws, so a failed restore never leaves
 * the database partially overwritten.
 */
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  try {
    await db.transaction('rw', BACKUP_TABLES.map(tableOf), async () => {
      for (const name of BACKUP_TABLES) {
        const table = tableOf(name)
        await table.clear()
        const records = payload.data[name]
        if (records.length > 0) {
          await table.bulkAdd(records as never[])
        }
      }

      // The live schema/migration state belongs to this install, not the
      // backup — keep it, only restore the backup timestamp.
      await db.metadata.update(DB_METADATA_ID, {
        schemaVersion: SCHEMA_VERSION,
        lastBackupAt: payload.meta.exportedAt,
        updatedAt: Date.now(),
      })
    })
  } catch (error) {
    throw toAppDbError(error)
  }
}