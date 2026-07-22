// Loads server/.env before anything reads process.env.
// Imported first in index.js so DATABASE_URL is available when the
// repo layer picks its backend.
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })
