// Centralized database error handling. Every repository routes Dexie /
// IndexedDB errors through toAppDbError() so raw browser error names
// and messages never reach the UI — components only ever see a stable
// AppDbError with a user-safe message.

export type DbErrorCode =
  | 'UNAVAILABLE' // IndexedDB not available (private mode, unsupported browser)
  | 'QUOTA_EXCEEDED' // device storage full
  | 'CONSTRAINT' // duplicate id / unique constraint violation
  | 'INVALID_DATA' // data failed validation before it reached Dexie
  | 'NOT_FOUND' // record not found
  | 'MIGRATION_FAILED' // version upgrade failed
  | 'UNKNOWN'

export class AppDbError extends Error {
  code: DbErrorCode
  cause?: unknown

  constructor(code: DbErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AppDbError'
    this.code = code
    this.cause = cause
  }
}

const USER_MESSAGES: Record<DbErrorCode, string> = {
  UNAVAILABLE: 'Local storage is unavailable on this device or browser.',
  QUOTA_EXCEEDED: 'Your device is out of storage space.',
  CONSTRAINT: 'This record already exists.',
  INVALID_DATA: 'The data provided is invalid.',
  NOT_FOUND: 'The requested record was not found.',
  MIGRATION_FAILED: 'The app database could not be updated. Your existing data is safe and untouched.',
  UNKNOWN: 'Something went wrong while accessing local storage.',
}

export function toAppDbError(error: unknown): AppDbError {
  if (error instanceof AppDbError) return error

  if (error instanceof Error) {
    const name = error.name

    if (name === 'QuotaExceededError') {
      return new AppDbError('QUOTA_EXCEEDED', USER_MESSAGES.QUOTA_EXCEEDED, error)
    }
    if (name === 'ConstraintError') {
      return new AppDbError('CONSTRAINT', USER_MESSAGES.CONSTRAINT, error)
    }
    if (name === 'NotFoundError') {
      return new AppDbError('NOT_FOUND', USER_MESSAGES.NOT_FOUND, error)
    }
    if (name === 'UpgradeError' || name === 'VersionError') {
      return new AppDbError('MIGRATION_FAILED', USER_MESSAGES.MIGRATION_FAILED, error)
    }
    if (name === 'InvalidStateError' || name === 'OpenFailedError') {
      return new AppDbError('UNAVAILABLE', USER_MESSAGES.UNAVAILABLE, error)
    }
  }

  return new AppDbError('UNKNOWN', USER_MESSAGES.UNKNOWN, error)
}

export function getUserMessage(error: unknown): string {
  return toAppDbError(error).message
}