import bcrypt from 'bcryptjs'
import { existsSync, readFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const dbFile = path.join(dataDir, 'house-tracking.db')
const legacyStoreFile = path.join(dataDir, 'store.json')

mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(dbFile)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS updates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    time TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    item TEXT NOT NULL,
    owner TEXT NOT NULL,
    due TEXT NOT NULL,
    status TEXT NOT NULL
  );
`)

const countRow = db.prepare('SELECT COUNT(*) AS count FROM users').get()

if (countRow.count === 0 && existsSync(legacyStoreFile)) {
  const legacy = JSON.parse(readFileSync(legacyStoreFile, 'utf8'))

  const insertUser = db.prepare(
    'INSERT INTO users (id, role, email, password_hash, name) VALUES (?, ?, ?, ?, ?)',
  )
  const insertProject = db.prepare(
    'INSERT INTO projects (id, name, service, status, progress) VALUES (?, ?, ?, ?, ?)',
  )
  const insertUpdate = db.prepare(
    'INSERT INTO updates (id, title, detail, time) VALUES (?, ?, ?, ?)',
  )
  const insertDocument = db.prepare(
    'INSERT INTO documents (id, name, type, status) VALUES (?, ?, ?, ?)',
  )
  const insertApproval = db.prepare(
    'INSERT INTO approvals (id, item, owner, due, status) VALUES (?, ?, ?, ?, ?)',
  )

  db.exec('BEGIN')

  try {
    legacy.users.forEach((user) => {
      insertUser.run(
        user.id,
        user.role,
        user.email,
        bcrypt.hashSync(user.password, 10),
        user.name,
      )
    })

    legacy.projects.forEach((project) => {
      insertProject.run(
        project.id,
        project.name,
        project.service,
        project.status,
        project.progress,
      )
    })

    legacy.updates.forEach((update) => {
      insertUpdate.run(update.id, update.title, update.detail, update.time)
    })

    legacy.documents.forEach((document) => {
      insertDocument.run(document.id, document.name, document.type, document.status)
    })

    legacy.approvals.forEach((approval) => {
      insertApproval.run(
        approval.id,
        approval.item,
        approval.owner,
        approval.due,
        approval.status,
      )
    })

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export const database = db
