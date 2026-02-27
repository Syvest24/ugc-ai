#!/usr/bin/env node

// Database Backup Script
//
// Creates a timestamped backup of the SQLite database.
// For PostgreSQL, use pg_dump instead (see docs/POSTGRESQL_MIGRATION.md).
//
// Usage:
//   node scripts/backup-db.mjs
//   node scripts/backup-db.mjs --dir /path/to/backups
//
// Recommended: Run via cron for automated backups
//   0 */6 * * *  cd /path/to/ugc-ai && node scripts/backup-db.mjs

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const DB_PATH = join(PROJECT_ROOT, 'dev.db')
const DEFAULT_BACKUP_DIR = join(PROJECT_ROOT, 'backups')
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '10', 10)

// Parse CLI args
const args = process.argv.slice(2)
const dirFlagIndex = args.indexOf('--dir')
const backupDir = dirFlagIndex !== -1 && args[dirFlagIndex + 1]
  ? resolve(args[dirFlagIndex + 1])
  : DEFAULT_BACKUP_DIR

function main() {
  // Check DB exists
  if (!existsSync(DB_PATH)) {
    console.error(`❌ Database not found at ${DB_PATH}`)
    console.error('   If using PostgreSQL, use pg_dump instead.')
    process.exit(1)
  }

  // Create backup directory
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }

  // Create timestamped backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const backupName = `ugcforge-backup-${timestamp}.db`
  const backupPath = join(backupDir, backupName)

  try {
    copyFileSync(DB_PATH, backupPath)
    const sizeKB = Math.round(statSync(backupPath).size / 1024)
    console.log(`✅ Backup created: ${backupPath} (${sizeKB} KB)`)
  } catch (error) {
    console.error(`❌ Backup failed:`, error.message)
    process.exit(1)
  }

  // Also backup WAL file if it exists (important for SQLite)
  const walPath = DB_PATH + '-wal'
  if (existsSync(walPath)) {
    try {
      copyFileSync(walPath, backupPath + '-wal')
      console.log(`   WAL file also backed up`)
    } catch {
      console.warn(`   ⚠️ WAL file backup failed (non-critical)`)
    }
  }

  // Rotate old backups (keep MAX_BACKUPS most recent)
  rotateBackups()
}

function rotateBackups() {
  const files = readdirSync(backupDir)
    .filter(f => f.startsWith('ugcforge-backup-') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: join(backupDir, f),
      mtime: statSync(join(backupDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime) // newest first

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS)
    for (const file of toDelete) {
      try {
        unlinkSync(file.path)
        // Also remove WAL if exists
        const walPath = file.path + '-wal'
        if (existsSync(walPath)) unlinkSync(walPath)
        console.log(`   🗑️  Rotated old backup: ${file.name}`)
      } catch {
        console.warn(`   ⚠️ Could not delete old backup: ${file.name}`)
      }
    }
  }
}

main()
