import cors from 'cors'
import express from 'express'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataFile = path.join(__dirname, 'data', 'store.json')
const distDir = path.join(__dirname, '..', 'dist')
const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

const readStore = async () => {
  const raw = await fs.readFile(dataFile, 'utf8')
  return JSON.parse(raw)
}

const writeStore = async (data) => {
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2))
}

const createId = (prefix) => `${prefix}-${Date.now()}`

app.get('/api/health', (_, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body ?? {}

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, and role are required.' })
  }

  const store = await readStore()
  const user = store.users.find(
    (item) =>
      item.email.toLowerCase() === String(email).toLowerCase() &&
      item.password === password &&
      item.role === role,
  )

  if (!user) {
    return res.status(401).json({ message: 'Invalid login credentials.' })
  }

  return res.json({
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
  })
})

app.get('/api/projects', async (_, res) => {
  const store = await readStore()
  res.json(store.projects)
})

app.post('/api/projects', async (req, res) => {
  const { name, service, status, progress } = req.body ?? {}

  if (!name || !service || !status) {
    return res.status(400).json({ message: 'Name, service, and status are required.' })
  }

  const store = await readStore()
  const project = {
    id: createId('project'),
    name,
    service,
    status,
    progress: Number.isFinite(progress) ? progress : 0,
  }

  store.projects.unshift(project)
  await writeStore(store)
  res.status(201).json(project)
})

app.get('/api/updates', async (_, res) => {
  const store = await readStore()
  res.json(store.updates)
})

app.post('/api/updates', async (req, res) => {
  const { title, detail } = req.body ?? {}

  if (!title || !detail) {
    return res.status(400).json({ message: 'Title and detail are required.' })
  }

  const store = await readStore()
  const update = {
    id: createId('update'),
    title,
    detail,
    time: 'Just now',
  }

  store.updates.unshift(update)
  await writeStore(store)
  res.status(201).json(update)
})

app.get('/api/documents', async (_, res) => {
  const store = await readStore()
  res.json(store.documents)
})

app.post('/api/documents', async (req, res) => {
  const { name, type, status } = req.body ?? {}

  if (!name || !type || !status) {
    return res.status(400).json({ message: 'Name, type, and status are required.' })
  }

  const store = await readStore()
  const document = {
    id: createId('document'),
    name,
    type,
    status,
  }

  store.documents.unshift(document)
  await writeStore(store)
  res.status(201).json(document)
})

app.get('/api/approvals', async (_, res) => {
  const store = await readStore()
  res.json(store.approvals)
})

app.patch('/api/approvals/:id', async (req, res) => {
  const { id } = req.params
  const { status } = req.body ?? {}

  if (!status) {
    return res.status(400).json({ message: 'Status is required.' })
  }

  const store = await readStore()
  const approval = store.approvals.find((item) => item.id === id)

  if (!approval) {
    return res.status(404).json({ message: 'Approval not found.' })
  }

  approval.status = status
  await writeStore(store)
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
