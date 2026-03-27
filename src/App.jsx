import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { trackEvent, trackPageView } from './analytics.js'

const services = [
  { title: 'Architecture', description: 'Shape concepts, plans, and approvals from idea to final drawings.' },
  { title: 'Structural', description: 'Track engineering reviews, safety checks, and technical sign-offs.' },
  { title: 'Interior', description: 'Manage room concepts, materials, and finish progress with clarity.' },
]

const heroUpdates = [
  'Blueprint revision uploaded by Architecture team',
  'Customer approved the interior moodboard',
  'Structural inspection marked as completed',
]

const customerActivity = [
  { title: 'Approval needed', text: 'Ground floor layout is waiting for your approval by 6 PM.' },
  { title: 'New upload', text: 'Interior team shared a revised kitchen material sheet.' },
  { title: 'Upcoming visit', text: 'Site walkthrough scheduled for March 28 at 11:00 AM.' },
]

const providerTasks = [
  { title: 'Finalize staircase layout', client: 'Lakeview Villa', due: 'Today', priority: 'High' },
  { title: 'Upload beam revision notes', client: 'Skyline House', due: 'Tomorrow', priority: 'Medium' },
  { title: 'Review living room palette', client: 'Palm Residency', due: 'Friday', priority: 'Low' },
]

const providerMetrics = [
  { label: 'Assigned projects', value: '12' },
  { label: 'Pending uploads', value: '05' },
  { label: 'Client meetings', value: '03' },
]

const providerPipeline = [
  { stage: 'New Leads', count: '04' },
  { stage: 'In Delivery', count: '09' },
  { stage: 'Awaiting Approval', count: '06' },
]

const quickPages = [
  { title: 'Project Details', description: 'Milestones, service ownership, and progress view.', path: '/projects/details' },
  { title: 'Updates', description: 'Timeline of field notes and project progress.', path: '/updates' },
  { title: 'Documents', description: 'Drawings, files, and material sheet tracking.', path: '/documents' },
  { title: 'Approvals', description: 'Pending decisions and approval handling.', path: '/approvals' },
]

const milestones = [
  { title: 'Concept Planning', owner: 'Architecture', status: 'Completed', date: 'March 15' },
  { title: 'Structural Analysis', owner: 'Structural', status: 'In Progress', date: 'March 27' },
  { title: 'Interior Material Finalization', owner: 'Interior', status: 'Upcoming', date: 'April 03' },
]

const getStoredSession = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = localStorage.getItem('houseTrackingSession')
    return raw ? JSON.parse(raw) : null
  } catch {
    localStorage.removeItem('houseTrackingSession')
    return null
  }
}

const setStoredSession = (session) => {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem('houseTrackingSession', JSON.stringify(session))
}

const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem('houseTrackingSession')
}

const fetchJson = async (url, options = {}) => {
  const session = getStoredSession()
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Request failed.')
  return data
}

function App() {
  const location = useLocation()
  const [session, setSession] = useState(() => getStoredSession())
  const [projects, setProjects] = useState([])
  const [timeline, setTimeline] = useState([])
  const [documents, setDocuments] = useState([])
  const [approvals, setApprovals] = useState([])
  const [projectNotice, setProjectNotice] = useState('')
  const [documentNotice, setDocumentNotice] = useState('')
  const [approvalNotice, setApprovalNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!session?.token) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      try {
        const [projectsData, updatesData, documentsData, approvalsData] = await Promise.all([
          fetchJson('/api/projects'),
          fetchJson('/api/updates'),
          fetchJson('/api/documents'),
          fetchJson('/api/approvals'),
        ])
        setProjects(projectsData)
        setTimeline(updatesData)
        setDocuments(documentsData)
        setApprovals(approvalsData)
      } catch (error) {
        if (error.message === 'Invalid or expired token.' || error.message === 'Authentication required.') {
          clearStoredSession()
          setSession(null)
        }
        setLoadError(error.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [session?.token])

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  const addProject = async (project) => {
    const created = await fetchJson('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    })
    setProjects((current) => [created, ...current])
    setProjectNotice(`${created.name} was added successfully.`)
    trackEvent('project_created', {
      service_type: created.service,
      project_status: created.status,
    })
  }

  const addTimelineEntry = async (entry) => {
    const created = await fetchJson('/api/updates', {
      method: 'POST',
      body: JSON.stringify(entry),
    })
    setTimeline((current) => [created, ...current])
    trackEvent('project_update_added', {
      update_title: created.title,
    })
  }

  const addDocument = async (document) => {
    const created = await fetchJson('/api/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    })
    setDocuments((current) => [created, ...current])
    setDocumentNotice(`${created.name} was added to documents.`)
    trackEvent('document_added', {
      document_type: created.type,
      document_status: created.status,
    })
  }

  const updateApprovalStatus = async (id, itemName, status) => {
    const updated = await fetchJson(`/api/approvals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    setApprovals((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    setApprovalNotice(`${itemName} is now marked as ${status}.`)
    trackEvent('approval_status_changed', {
      approval_item: itemName,
      approval_status: status,
    })
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login/customer" element={<AuthPage role="customer" dashboardLink="/dashboard/customer" onLoginSuccess={setSession} />} />
      <Route path="/login/provider" element={<AuthPage role="provider" dashboardLink="/dashboard/provider" onLoginSuccess={setSession} />} />
      <Route path="/dashboard/customer" element={<ProtectedRoute session={session} redirectPath="/login/customer"><CustomerDashboard projects={projects} notice={projectNotice} isLoading={isLoading} loadError={loadError} onCreateProject={addProject} /></ProtectedRoute>} />
      <Route path="/dashboard/provider" element={<ProtectedRoute session={session} redirectPath="/login/provider"><ProviderDashboard isLoading={isLoading} loadError={loadError} /></ProtectedRoute>} />
      <Route path="/projects/details" element={<ProtectedRoute session={session} redirectPath="/login/customer"><ProjectDetailsPage projects={projects} isLoading={isLoading} loadError={loadError} /></ProtectedRoute>} />
      <Route path="/updates" element={<ProtectedRoute session={session} redirectPath="/login/provider"><UpdatesPage timeline={timeline} isLoading={isLoading} loadError={loadError} onAddUpdate={addTimelineEntry} /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute session={session} redirectPath="/login/customer"><DocumentsPage documents={documents} notice={documentNotice} isLoading={isLoading} loadError={loadError} onAddDocument={addDocument} /></ProtectedRoute>} />
      <Route path="/approvals" element={<ProtectedRoute session={session} redirectPath="/login/provider"><ApprovalsPage approvals={approvals} notice={approvalNotice} isLoading={isLoading} loadError={loadError} onUpdateStatus={updateApprovalStatus} /></ProtectedRoute>} />
    </Routes>
  )
}

function HomePage() {
  return (
    <main className="app-shell">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">House Tracking Platform</p>
          <h1>One place to track every home project from concept to completion.</h1>
          <p className="hero-text">House Tracking helps customers and service providers stay aligned across Architecture, Structural, and Interior work with focused dashboards and clean status updates.</p>
          <div className="hero-actions">
            <NavLink className="primary-action" to="/login/customer">Customer Login</NavLink>
            <NavLink className="secondary-action" to="/login/provider">Provider Login</NavLink>
          </div>
          <div className="hero-stats">
            <article><strong>03</strong><span>Specialized services</span></article>
            <article><strong>24/7</strong><span>Project visibility</span></article>
            <article><strong>2</strong><span>User portals</span></article>
          </div>
        </div>
        <div className="hero-panel">
          <div className="panel-card project-glance">
            <div className="panel-topline"><span className="dot" />Live Project Snapshot</div>
            <h2>Modern duplex build</h2>
            <p>Customer, architect, engineer, and interior team all see the same progress.</p>
            <div className="mini-timeline">
              <div><span>Planning</span><strong>Completed</strong></div>
              <div><span>Structural review</span><strong>In progress</strong></div>
              <div><span>Interior handoff</span><strong>Upcoming</strong></div>
            </div>
          </div>
          <div className="panel-card activity-card">
            <div className="panel-topline">Recent Updates</div>
            <ul>{heroUpdates.map((update) => <li key={update}>{update}</li>)}</ul>
          </div>
        </div>
      </section>
      
      <section className="services-section">
        <div className="section-heading">
          <p className="eyebrow">Core Services</p>
          <h2>Built for the three teams that shape a house project.</h2>
        </div>
        <div className="services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <span className="service-tag">{service.title}</span>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function AuthPage({ role, dashboardLink, onLoginSuccess }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', code: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  const title =
    role === 'customer'
      ? 'Track every milestone of your home project.'
      : 'Stay organized across every client and handoff.'

  const subtitle =
    role === 'customer'
      ? 'Access live progress, approvals, documents, and coordination updates in one clean dashboard.'
      : 'Manage active assignments, pending uploads, team coordination, and delivery priorities from one workspace.'

  const highlights =
    role === 'customer'
      ? ['Live service progress', 'Approval and action timeline', 'Project files and checkpoints']
      : ['Daily work queue', 'Drawing and revision access', 'Clear overview of deadlines']

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.email.trim()) nextErrors.email = 'Email is required.'
    else if (!form.email.includes('@')) nextErrors.email = 'Enter a valid email.'

    if (!form.password.trim()) nextErrors.password = 'Password is required.'
    else if (form.password.length < 6) nextErrors.password = 'Minimum 6 characters required.'

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    try {
      setErrors({})
      setSubmitError('')
      const response = await fetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password, role }),
      })
      const nextSession = { token: response.token, user: response.user }
      setStoredSession(nextSession)
      onLoginSuccess(nextSession)
      trackEvent('login_success', {
        login_role: role,
      })
      navigate(dashboardLink)
    } catch (error) {
      setSubmitError(error.message)
      trackEvent('login_failed', {
        login_role: role,
      })
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel auth-showcase">
        <NavLink className="back-link" to="/">Back to Home</NavLink>
        <p className="eyebrow">{role === 'customer' ? 'Customer Access' : 'Service Provider Access'}</p>
        <h1>{title}</h1>
        <p className="hero-text">{subtitle}</p>
        <div className="auth-highlights">
          {highlights.map((highlight) => (
            <article key={highlight}>
              <span className="highlight-icon" />
              <p>{highlight}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="auth-panel auth-form-panel">
        <div className="auth-form-header">
          <span className="card-label">{role === 'customer' ? 'Customer Login' : 'Provider Login'}</span>
          <h2>Welcome back</h2>
          <p>Use `customer@housetracking.com / customer123` or `provider@housetracking.com / provider123`.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email address
            <input name="email" value={form.email} onChange={handleChange} placeholder="Enter email" />
            {errors.email ? <small className="form-error">{errors.email}</small> : null}
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Enter password" />
            {errors.password ? <small className="form-error">{errors.password}</small> : null}
          </label>
          <label>
            Project ID / Team Code
            <input name="code" value={form.code} onChange={handleChange} placeholder="Optional access code" />
          </label>
          {submitError ? <div className="form-error">{submitError}</div> : null}
          <button className="primary-action form-action" type="submit">Open Dashboard</button>
        </form>
      </section>
    </main>
  )
}

function CustomerDashboard({ projects, notice, isLoading, loadError, onCreateProject }) {
  const [form, setForm] = useState({ name: '', service: 'Architecture', status: 'Planning', progress: '25' })
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const progress = Number(form.progress)
      await onCreateProject({
        name: form.name.trim() || 'New House Project',
        service: form.service,
        status: form.status.trim() || 'Planning',
        progress: Number.isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress)),
      })
      setForm({ name: '', service: 'Architecture', status: 'Planning', progress: '25' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar mode="customer" />
      <main className="dashboard-main">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Customer Dashboard</p>
            <h1>Track every update without chasing the team.</h1>
            <p className="hero-text">Keep an eye on approvals, project health, and incoming design updates across your active house services.</p>
          </div>
          <div className="metric-strip">
            <article><strong>{String(projects.length).padStart(2, '0')}</strong><span>Tracked projects</span></article>
            <article><strong>07</strong><span>Pending approvals</span></article>
            <article><strong>92%</strong><span>On-time milestones</span></article>
          </div>
        </section>
        <QuickLinks />
        {notice ? <div className="notice-banner">{notice}</div> : null}
        {loadError ? <div className="form-error">{loadError}</div> : null}
        <section className="content-grid">
          <article className="dashboard-card">
            <div className="dashboard-header">
              <div><span className="card-label">Projects</span><h3>Current project status</h3></div>
            </div>
            {isLoading ? <div className="empty-state">Loading projects...</div> : (
              <div className="project-list">
                {projects.map((project) => (
                  <div className="project-item" key={project.id}>
                    <div className="project-item-top">
                      <div><strong>{project.name}</strong><span>{project.service}</span></div>
                      <em>{project.status}</em>
                    </div>
                    <div className="progress-row">
                      <div className="progress-bar"><span style={{ width: `${project.progress}%` }} /></div>
                      <b>{project.progress}%</b>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
          <article className="dashboard-card">
            <div className="dashboard-header">
              <div><span className="card-label">Create Project</span><h3>Add a new house project</h3></div>
            </div>
            <form className="interactive-form" onSubmit={handleSubmit}>
              <label>Project name<input name="name" value={form.name} onChange={handleChange} placeholder="Enter project name" /></label>
              <label>Service<select name="service" value={form.service} onChange={handleChange}><option>Architecture</option><option>Structural</option><option>Interior</option></select></label>
              <label>Current stage<input name="status" value={form.status} onChange={handleChange} placeholder="Planning / Review / Handoff" /></label>
              <label>Progress %<input name="progress" type="number" min="0" max="100" value={form.progress} onChange={handleChange} /></label>
              <button className="primary-action form-action" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create Project'}</button>
            </form>
          </article>
        </section>
        <section className="content-grid single-column">
          <article className="dashboard-card">
            <div className="dashboard-header">
              <div><span className="card-label">Recent Activity</span><h3>What needs your attention</h3></div>
            </div>
            <div className="info-stack">
              {customerActivity.map((item) => (
                <div className="info-card" key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

function ProviderDashboard({ isLoading, loadError }) {
  return (
    <div className="dashboard-shell">
      <DashboardSidebar mode="provider" />
      <main className="dashboard-main">
        <section className="dashboard-hero provider-hero">
          <div>
            <p className="eyebrow">Service Provider Dashboard</p>
            <h1>Run architecture, structural, and interior work with focus.</h1>
            <p className="hero-text">See your queue, upcoming deadlines, and delivery pipeline in a clear, action-first interface.</p>
          </div>
          <div className="metric-strip">
            {providerMetrics.map((metric) => (
              <article key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></article>
            ))}
          </div>
        </section>
        <QuickLinks />
        {loadError ? <div className="form-error">{loadError}</div> : null}
        <section className="content-grid">
          <article className="dashboard-card provider-dashboard">
            <div className="dashboard-header">
              <div><span className="card-label">Task Queue</span><h3>Today&apos;s priorities</h3></div>
            </div>
            {isLoading ? <div className="empty-state">Loading workspace...</div> : (
              <div className="task-list">
                {providerTasks.map((task) => (
                  <div className="task-item" key={task.title}>
                    <div><strong>{task.title}</strong><span>{task.client}</span></div>
                    <div className="task-meta"><em>{task.due}</em><b>{task.priority}</b></div>
                  </div>
                ))}
              </div>
            )}
          </article>
          <article className="dashboard-card provider-dashboard">
            <div className="dashboard-header">
              <div><span className="card-label">Delivery Pipeline</span><h3>Project movement at a glance</h3></div>
            </div>
            <div className="info-stack">
              {providerPipeline.map((item) => (
                <div className="info-card" key={item.stage}>
                  <strong>{item.stage}</strong>
                  <p>{item.count} projects in this stage</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

function ProjectDetailsPage({ projects, isLoading, loadError }) {
  return (
    <WorkspacePage mode="customer" title="Project details and service ownership" subtitle="Service-wise progress, team ownership, and milestone visibility." badge="Project Details">
      {loadError ? <div className="form-error">{loadError}</div> : null}
      <section className="content-grid">
        <article className="dashboard-card">
          <div className="dashboard-header">
            <div><span className="card-label">Milestones</span><h3>Current delivery stages</h3></div>
          </div>
          <div className="info-stack">
            {milestones.map((milestone) => (
              <div className="info-card" key={milestone.title}>
                <strong>{milestone.title}</strong>
                <p>{milestone.owner}</p>
                <div className="meta-row"><span>{milestone.status}</span><span>{milestone.date}</span></div>
              </div>
            ))}
          </div>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-header">
            <div><span className="card-label">Service Summary</span><h3>What each team is handling</h3></div>
          </div>
          {isLoading ? <div className="empty-state">Loading project details...</div> : (
            <div className="project-list">
              {projects.map((project) => (
                <div className="project-item" key={project.id}>
                  <div className="project-item-top">
                    <div><strong>{project.name}</strong><span>{project.service}</span></div>
                    <em>{project.status}</em>
                  </div>
                  <div className="progress-row">
                    <div className="progress-bar"><span style={{ width: `${project.progress}%` }} /></div>
                    <b>{project.progress}%</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </WorkspacePage>
  )
}

function UpdatesPage({ timeline, isLoading, loadError, onAddUpdate }) {
  const [form, setForm] = useState({ title: '', detail: '' })
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onAddUpdate({
        title: form.title.trim() || 'New project update',
        detail: form.detail.trim() || 'A fresh update was added to the timeline.',
      })
      setForm({ title: '', detail: '' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <WorkspacePage mode="provider" title="Project update timeline" subtitle="A shared activity stream for field notes, design changes, and construction progress." badge="Updates">
      {loadError ? <div className="form-error">{loadError}</div> : null}
      <section className="content-grid">
        <article className="dashboard-card provider-dashboard">
          <div className="dashboard-header">
            <div><span className="card-label">Add Update</span><h3>Push a fresh status note</h3></div>
          </div>
          <form className="interactive-form" onSubmit={handleSubmit}>
            <label>Update title<input name="title" value={form.title} onChange={handleChange} placeholder="Inspection completed" /></label>
            <label>Details<textarea name="detail" value={form.detail} onChange={handleChange} placeholder="Describe what changed in the project." /></label>
            <button className="primary-action form-action" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Add Update'}</button>
          </form>
        </article>
        <article className="dashboard-card provider-dashboard">
          <div className="dashboard-header">
            <div><span className="card-label">Live Feed</span><h3>Latest updates across all services</h3></div>
          </div>
          {isLoading ? <div className="empty-state">Loading updates...</div> : (
            <div className="timeline-list">
              {timeline.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </WorkspacePage>
  )
}

function DocumentsPage({ documents, notice, isLoading, loadError, onAddDocument }) {
  const [form, setForm] = useState({ name: '', type: 'Architecture', status: 'Latest Version' })
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onAddDocument({
        name: form.name.trim() || 'Untitled Document.pdf',
        type: form.type,
        status: form.status,
      })
      setForm({ name: '', type: 'Architecture', status: 'Latest Version' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <WorkspacePage mode="customer" title="Documents and file tracking" subtitle="A central page for project files, versions, and approval state." badge="Documents">
      {notice ? <div className="notice-banner">{notice}</div> : null}
      {loadError ? <div className="form-error">{loadError}</div> : null}
      <section className="content-grid">
        <article className="dashboard-card">
          <div className="dashboard-header">
            <div><span className="card-label">Upload Entry</span><h3>Add a document record</h3></div>
          </div>
          <form className="interactive-form" onSubmit={handleSubmit}>
            <label>File name<input name="name" value={form.name} onChange={handleChange} placeholder="Enter file name" /></label>
            <label>Service type<select name="type" value={form.type} onChange={handleChange}><option>Architecture</option><option>Structural</option><option>Interior</option></select></label>
            <label>File status<select name="status" value={form.status} onChange={handleChange}><option>Latest Version</option><option>Pending Review</option><option>Approved</option></select></label>
            <button className="primary-action form-action" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Add Document'}</button>
          </form>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-header">
            <div><span className="card-label">Files</span><h3>Uploaded project documents</h3></div>
          </div>
          {isLoading ? <div className="empty-state">Loading documents...</div> : (
            <div className="document-table">
              {documents.map((file) => (
                <div className="document-row" key={file.id}>
                  <div><strong>{file.name}</strong><span>{file.type}</span></div>
                  <em>{file.status}</em>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </WorkspacePage>
  )
}

function ApprovalsPage({ approvals, notice, isLoading, loadError, onUpdateStatus }) {
  const [pendingId, setPendingId] = useState('')

  const handleAction = async (approval, status) => {
    setPendingId(approval.id)
    try {
      await onUpdateStatus(approval.id, approval.item, status)
    } finally {
      setPendingId('')
    }
  }

  return (
    <WorkspacePage mode="provider" title="Approvals and decision tracking" subtitle="A focused place to manage submissions, due dates, and pending confirmations." badge="Approvals">
      {notice ? <div className="notice-banner">{notice}</div> : null}
      {loadError ? <div className="form-error">{loadError}</div> : null}
      <section className="content-grid single-column">
        <article className="dashboard-card provider-dashboard">
          <div className="dashboard-header">
            <div><span className="card-label">Approvals</span><h3>Open decisions and responses</h3></div>
          </div>
          {isLoading ? <div className="empty-state">Loading approvals...</div> : (
            <div className="approval-list">
              {approvals.map((approval) => (
                <div className="approval-item approval-item-rich" key={approval.id}>
                  <div><strong>{approval.item}</strong><span>{approval.owner}</span></div>
                  <div className="approval-actions">
                    <div className="task-meta"><em>{approval.due}</em><b>{approval.status}</b></div>
                    <div className="button-row">
                      <button className="action-button approve" type="button" disabled={pendingId === approval.id} onClick={() => handleAction(approval, 'Approved')}>Approve</button>
                      <button className="action-button reject" type="button" disabled={pendingId === approval.id} onClick={() => handleAction(approval, 'Rejected')}>Reject</button>
                      <button className="action-button revise" type="button" disabled={pendingId === approval.id} onClick={() => handleAction(approval, 'Request Changes')}>Request Changes</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </WorkspacePage>
  )
}

function WorkspacePage({ mode, title, subtitle, badge, children }) {
  return (
    <div className="dashboard-shell">
      <DashboardSidebar mode={mode} />
      <main className="dashboard-main">
        <section className={`dashboard-hero ${mode === 'provider' ? 'provider-hero' : ''}`}>
          <div><p className="eyebrow">{badge}</p><h1>{title}</h1><p className="hero-text">{subtitle}</p></div>
        </section>
        <QuickLinks compact />
        {children}
      </main>
    </div>
  )
}

function ProtectedRoute({ session, redirectPath, children }) {
  if (!session?.token) {
    return <Navigate to={redirectPath} replace />
  }

  return children
}

function QuickLinks({ compact = false }) {
  return (
    <section className={`page-links-grid ${compact ? 'compact-grid' : ''}`}>
      {quickPages.map((page) => (
        <NavLink className="page-link-card" key={page.title} to={page.path}>
          <span className="card-label">Navigate</span>
          <strong>{page.title}</strong>
          <p>{page.description}</p>
        </NavLink>
      ))}
    </section>
  )
}

function DashboardSidebar({ mode }) {
  const isProvider = mode === 'provider'

  return (
    <aside className={`dashboard-sidebar ${isProvider ? 'provider-side' : ''}`}>
      <div>
        <p className="eyebrow">House Tracking</p>
        <h2>{isProvider ? 'Provider Space' : 'Customer Space'}</h2>
        <nav className="sidebar-nav">
          <NavLink to={isProvider ? '/dashboard/provider' : '/dashboard/customer'}>Dashboard</NavLink>
          <NavLink to="/projects/details">Project Details</NavLink>
          <NavLink to="/updates">Updates</NavLink>
          <NavLink to="/documents">Documents</NavLink>
          <NavLink to="/approvals">Approvals</NavLink>
        </nav>
      </div>
      <NavLink className="secondary-action sidebar-home" to="/">Back to Home</NavLink>
    </aside>
  )
}

export default App
