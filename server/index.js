import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { database } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.join(__dirname, '..', 'dist')
const app = express()
const port = process.env.PORT || 4000
const jwtSecret = process.env.JWT_SECRET || 'house-tracking-dev-secret'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using a development fallback secret.')
}

app.use(cors())
app.use(express.json())

const createId = (prefix) => `${prefix}-${Date.now()}`

const issueToken = (user) =>
  jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    jwtSecret,
    { expiresIn: '7d' },
  )

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required.' })
    return
  }

  const token = authHeader.slice(7)

  try {
    req.user = jwt.verify(token, jwtSecret)
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body ?? {}

  if (!email || !password || !role) {
    res.status(400).json({ message: 'Email, password, and role are required.' })
    return
  }

  const user = database
    .prepare('SELECT id, role, email, name, password_hash FROM users WHERE email = ? AND role = ?')
    .get(String(email).toLowerCase(), role)

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ message: 'Invalid login credentials.' })
    return
  }

  const token = issueToken(user)

  res.json({
    token,
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
  })
})

app.get('/api/projects', requireAuth, (_, res) => {
  const projects = database
    .prepare('SELECT id, name, service, status, progress FROM projects ORDER BY rowid DESC')
    .all()
  res.json(projects)
})

app.post('/api/projects', requireAuth, (req, res) => {
  const { name, service, status, progress } = req.body ?? {}

  if (!name || !service || !status) {
    res.status(400).json({ message: 'Name, service, and status are required.' })
    return
  }

  const project = {
    id: createId('project'),
    name,
    service,
    status,
    progress: Number.isFinite(progress) ? progress : 0,
  }

  database
    .prepare('INSERT INTO projects (id, name, service, status, progress) VALUES (?, ?, ?, ?, ?)')
    .run(project.id, project.name, project.service, project.status, project.progress)

  res.status(201).json(project)
})

app.get('/api/updates', requireAuth, (_, res) => {
  const updates = database
    .prepare('SELECT id, title, detail, time FROM updates ORDER BY rowid DESC')
    .all()
  res.json(updates)
})

app.post('/api/updates', requireAuth, (req, res) => {
  const { title, detail } = req.body ?? {}

  if (!title || !detail) {
    res.status(400).json({ message: 'Title and detail are required.' })
    return
  }

  const update = {
    id: createId('update'),
    title,
    detail,
    time: 'Just now',
  }

  database
    .prepare('INSERT INTO updates (id, title, detail, time) VALUES (?, ?, ?, ?)')
    .run(update.id, update.title, update.detail, update.time)

  res.status(201).json(update)
})

app.get('/api/documents', requireAuth, (_, res) => {
  const documents = database
    .prepare('SELECT id, name, type, status FROM documents ORDER BY rowid DESC')
    .all()
  res.json(documents)
})

app.post('/api/documents', requireAuth, (req, res) => {
  const { name, type, status } = req.body ?? {}

  if (!name || !type || !status) {
    res.status(400).json({ message: 'Name, type, and status are required.' })
    return
  }

  const document = {
    id: createId('document'),
    name,
    type,
    status,
  }

  database
    .prepare('INSERT INTO documents (id, name, type, status) VALUES (?, ?, ?, ?)')
    .run(document.id, document.name, document.type, document.status)

  res.status(201).json(document)
})

app.get('/api/approvals', requireAuth, (_, res) => {
  const approvals = database
    .prepare('SELECT id, item, owner, due, status FROM approvals ORDER BY rowid DESC')
    .all()
  res.json(approvals)
})

app.patch('/api/approvals/:id', requireAuth, (req, res) => {
  const { id } = req.params
  const { status } = req.body ?? {}

  if (!status) {
    res.status(400).json({ message: 'Status is required.' })
    return
  }

  const result = database
    .prepare('UPDATE approvals SET status = ? WHERE id = ?')
    .run(status, id)

  if (result.changes === 0) {
    res.status(404).json({ message: 'Approval not found.' })
    return
  }

  const approval = database
    .prepare('SELECT id, item, owner, due, status FROM approvals WHERE id = ?')
    .get(id)

  res.json(approval)
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distDir))

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      next()
      return
    }

    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((error, _, res, __) => {
  console.error(error)
  res.status(500).json({ message: 'Internal server error.' })
})

app.listen(port, () => {
  console.log(`House Tracking API running on http://localhost:${port}`)
})
