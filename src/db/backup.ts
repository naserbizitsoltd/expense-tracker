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
  'appSettings',
  'metadata',
] as const

type BackupTableName = (typeof BACKUP_TABLES)[number]

export interface BackupMeta {
  backupVersion: number
  exportedAt: number
  appVersion: string
  schemaVersion: number
}

export type BackupData = Record<BackupTableName, unknown[]>

export interface BackupPayload {
  meta: BackupMeta
  data: BackupData
}

function tableOf(name: BackupTableName) {
  return db.table(name)
}

/**
 * Gathers every table into a single JSON-serializable payload and
 * triggers a browser download. Read-only — never touches the database
 * beyond stamping `lastBackupAt` on success.
 */
export async function exportBackup(): Promise<string> {
  try {
    const data = {} as BackupData
    await db.transaction('r', BACKUP_TABLES.map(tableOf), async () => {
      for (const name of BACKUP_TABLES) {
        data[name] = await tableOf(name).toArray()
      }
    })

    const payload: BackupPayload = {
      meta: {
        backupVersion: BACKUP_VERSION,
        exportedAt: Date.now(),
        appVersion: 'unknown',
        schemaVersion: SCHEMA_VERSION,
      },
      data,
    }

    const json = JSON.stringify(payload, null, 2)
    const filename = `expense-tracker-backup-${formatDateForFilename(new Date())}.json`
    downloadJson(json, filename)

    // Best-effort — a failure here shouldn't undo an export the user
    // already has on disk.
    try {
      await db.metadata.update(DB_METADATA_ID, { lastBackupAt: Date.now(), updatedAt: Date.now() })
    } catch {
      // ignore
    }

    return filename
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
 * Replaces all current application data with the contents of a
 * validated backup. Runs as one Dexie transaction across every table:
 * either every table is cleared and refilled, or (on any error) none
 * of them are touched — Dexie automatically rolls back the whole
 * transaction if the callback throws.
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