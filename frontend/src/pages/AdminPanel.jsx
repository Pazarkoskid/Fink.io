import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, BookOpen, Sparkles, BarChart3, TrendingUp, FileText, AlertTriangle,
  Shield, Crown, GraduationCap, User as UserIcon, Search, ChevronDown,
} from 'lucide-react'
import { analyticsApi, adminApi } from '../lib/api'

const ROLE_LABELS = {
  student: 'Студент',
  instructor: 'Инструктор',
  moderator: 'Модератор',
  admin: 'Администратор',
}
const ROLE_ICONS = {
  student: UserIcon,
  instructor: GraduationCap,
  moderator: Shield,
  admin: Crown,
}

export default function AdminPanel() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="container-app py-10">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted mb-1 flex items-center gap-2">
            <Crown size={12} /> Администратор
          </p>
          <h1 className="font-display text-4xl">Контролна табла</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-border mb-8">
        {[
          { key: 'overview', label: 'Преглед' },
          { key: 'users', label: 'Корисници' },
          { key: 'activity', label: 'Активност' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-4 -mb-0.5 transition-colors
              ${tab === t.key
                ? 'border-accent text-fg'
                : 'border-transparent text-muted hover:text-fg'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'activity' && <ActivityTab />}
    </div>
  )
}

// =========================
//   OVERVIEW TAB
// =========================

function OverviewTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.platform()
      .then(({ data }) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="card h-28 shimmer" />)}
      </div>
    )
  }

  if (!stats) {
    return <div className="card text-center py-12 text-muted">Нема податоци.</div>
  }

  return (
    <div className="space-y-8">
      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BigStat
          label="Корисници"
          value={stats.total_users}
          delta={stats.new_users_7d}
          icon={Users}
        />
        <BigStat
          label="Квизови"
          value={stats.total_quizzes}
          delta={stats.quizzes_created_7d}
          icon={BookOpen}
          accent
        />
        <BigStat
          label="AI квизови"
          value={stats.ai_generated_quizzes}
          subtitle={`${stats.total_quizzes ? Math.round(stats.ai_generated_quizzes / stats.total_quizzes * 100) : 0}% од вкупно`}
          icon={Sparkles}
        />
        <BigStat
          label="Игри"
          value={stats.total_attempts}
          delta={stats.attempts_7d}
          icon={BarChart3}
        />
      </div>

      {/* Secondary stats + alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <Target size={20} className="text-accent mb-2" />
          <p className="font-display text-3xl">{stats.average_score}%</p>
          <p className="text-xs font-mono uppercase tracking-widest text-muted mt-1">
            Просечен скор на платформа
          </p>
        </div>

        <div className="card">
          <FileText size={20} className="text-accent mb-2" />
          <p className="font-display text-3xl">{stats.total_materials}</p>
          <p className="text-xs font-mono uppercase tracking-widest text-muted mt-1">
            Прикачени материјали
          </p>
        </div>

        <Link
          to="/moderation"
          className={`card-hover ${stats.open_reports > 0 ? 'bg-accent text-white border-accent' : ''}`}
        >
          <AlertTriangle size={20} className={`mb-2 ${stats.open_reports > 0 ? '' : 'text-accent'}`} />
          <p className="font-display text-3xl">{stats.open_reports}</p>
          <p className={`text-xs font-mono uppercase tracking-widest mt-1 ${stats.open_reports > 0 ? '' : 'text-muted'}`}>
            Отворени пријави {stats.open_reports > 0 && '→'}
          </p>
        </Link>
      </div>

      {/* Users by role */}
      <div className="card">
        <p className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
          Корисници по улога
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(stats.users_by_role || {}).map(([role, count]) => {
            const Icon = ROLE_ICONS[role] || UserIcon
            return (
              <div key={role} className="flex items-center gap-3 p-3 border-2 border-border">
                <Icon size={24} className={role === 'admin' ? 'text-accent' : 'text-fg'} />
                <div>
                  <p className="font-display text-2xl">{count}</p>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                    {ROLE_LABELS[role] || role}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Daily activity sparkline */}
      <ActivityChart data={stats.daily_activity} />
    </div>
  )
}

function BigStat({ label, value, delta, subtitle, icon: Icon, accent }) {
  return (
    <div className={`card ${accent ? 'bg-accent text-white border-accent' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <Icon size={20} className={accent ? '' : 'text-accent'} />
        {delta !== undefined && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${accent ? 'border-cream' : 'border-border'}`}>
            +{delta} / 7д
          </span>
        )}
      </div>
      <p className="font-display text-4xl font-semibold">{value}</p>
      <p className={`text-[10px] font-mono uppercase tracking-widest mt-1 ${accent ? '' : 'text-muted'}`}>
        {label}
      </p>
      {subtitle && (
        <p className={`text-xs mt-1 ${accent ? 'text-white/80' : 'text-muted'}`}>{subtitle}</p>
      )}
    </div>
  )
}

function ActivityChart({ data }) {
  if (!data || data.length === 0) return null
  const maxAttempts = Math.max(1, ...data.map(d => d.attempts))

  return (
    <div className="card">
      <p className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
        Активност (14 дена)
      </p>
      <div className="flex items-end gap-1 h-32 mb-2">
        {data.map((d, i) => {
          const h = (d.attempts / maxAttempts) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div
                className="w-full bg-fg border border-border hover:bg-accent hover:border-accent transition-colors"
                style={{ height: `${h}%`, minHeight: '2px' }}
                title={`${d.date}: ${d.attempts} игри`}
              />
              <div className="absolute -top-8 hidden group-hover:block bg-accent text-white text-[10px] px-2 py-1 whitespace-nowrap font-mono">
                {d.attempts} игри
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-subtle">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}

// =========================
//   USERS TAB
// =========================

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    adminApi.listUsers(filter ? { role: filter } : {})
      .then(({ data }) => {
        setUsers(data.results || data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(load, [filter])

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Промени улога во „${ROLE_LABELS[newRole]}"?`)) return
    try {
      await adminApi.updateRole(userId, newRole)
      load()
    } catch (e) {
      alert('Не успеа промената.')
    }
  }

  const filtered = users.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase())
      || u.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Барај по email или корисничко име"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: '', label: 'Сите' },
            { key: 'student', label: 'Студенти' },
            { key: 'instructor', label: 'Инструктори' },
            { key: 'moderator', label: 'Модератори' },
            { key: 'admin', label: 'Админи' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 text-xs font-mono uppercase tracking-widest border-2 transition
                ${filter === f.key
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg border-border hover:bg-surface'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-16 shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-muted">
          Нема корисници по овие критериуми.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const Icon = ROLE_ICONS[u.role] || UserIcon
            return (
              <div key={u.id} className="card !py-3 flex items-center gap-4">
                <Icon size={20} className={u.role === 'admin' ? 'text-accent shrink-0' : 'text-fg shrink-0'} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.username}</p>
                  <p className="text-xs font-mono text-muted truncate">{u.email}</p>
                </div>
                <RoleSelect
                  current={u.role}
                  onChange={(r) => handleRoleChange(u.id, r)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RoleSelect({ current, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="badge bg-bg hover:bg-surface flex items-center gap-1"
      >
        {ROLE_LABELS[current]}
        <ChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-bg border-2 border-border shadow-hard min-w-[140px]">
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-surface ${current === key ? 'bg-accent text-white' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// =========================
//   ACTIVITY TAB
// =========================

function ActivityTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.platform()
      .then(({ data }) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return <div className="card h-96 shimmer" />
  }

  const data = stats.daily_activity || []
  const maxValue = Math.max(1,
    ...data.map(d => Math.max(d.attempts, d.new_users * 3, d.new_quizzes * 3))
  )

  return (
    <div className="space-y-8">
      <div className="card">
        <p className="font-mono text-xs uppercase tracking-widest text-muted mb-6">
          Дневна активност (последни 14 дена)
        </p>

        <div className="flex gap-6 text-xs font-mono mb-4">
          <Legend color="bg-accent" label="Игри" />
          <Legend color="bg-accent" label="Нови корисници" />
          <Legend color="bg-ink-500" label="Нови квизови" />
        </div>

        <div className="space-y-3">
          {data.map((d, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <span className="text-[10px] font-mono text-muted">
                {new Date(d.date).toLocaleDateString('mk-MK', { day: '2-digit', month: 'short' })}
              </span>
              <div className="space-y-0.5">
                <Bar value={d.attempts} max={maxValue} color="bg-accent" />
                <Bar value={d.new_users} max={maxValue} color="bg-accent" />
                <Bar value={d.new_quizzes} max={maxValue} color="bg-ink-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Bar({ value, max, color }) {
  const w = (value / max) * 100
  return (
    <div className="flex items-center gap-2 h-4">
      <div
        className={`${color} border border-border h-3`}
        style={{ width: `${w}%`, minWidth: value > 0 ? '4px' : '0' }}
      />
      <span className="text-[10px] font-mono text-muted">{value}</span>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 ${color} border border-border`} />
      <span>{label}</span>
    </div>
  )
}

function Target(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
