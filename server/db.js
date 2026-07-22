// ============================================================
// Persistence layer. File-backed JSON store today; the API below
// only ever calls getDb()/save(), so swapping this module for
// PostgreSQL + Prisma later requires no changes to the routes.
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { buildSeed } from './seed.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DB_FILE = join(DATA_DIR, 'db.json')

let db = null

export async function initDb() {
  if (existsSync(DB_FILE)) {
    db = JSON.parse(readFileSync(DB_FILE, 'utf-8'))
    console.log('📂 Loaded database from disk')
  } else {
    mkdirSync(DATA_DIR, { recursive: true })
    db = await buildSeed()
    save()
    console.log('🌱 Seeded a fresh database')
  }
  return db
}

export function getDb() {
  if (!db) throw new Error('DB not initialised')
  return db
}

let saveTimer = null
export function save() {
  // debounce writes so bursts of mutations don't thrash the disk
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  }, 50)
}
