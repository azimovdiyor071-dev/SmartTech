// Chooses the storage backend at startup:
//   DATABASE_URL set  → PostgreSQL
//   otherwise         → file store (zero-config)
// The rest of the app only imports from here, so switching is transparent.
import * as fileRepo from './fileRepo.js'
import * as pgRepo from './pgRepo.js'

const usePg = Boolean(process.env.DATABASE_URL)
const repo = usePg ? pgRepo : fileRepo

export const backendLabel = repo.label
export const isPostgres = usePg

export default repo
