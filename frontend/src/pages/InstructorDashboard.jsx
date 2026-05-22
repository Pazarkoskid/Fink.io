import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload, Plus, FileText, BookOpen, BarChart3, ArrowRight,
  RefreshCw, Trophy, Heart, Play, Edit, Eye, Database, History,
} from 'lucide-react'
import { quizzesApi, materialsApi } from '../lib/api'

export default function InstructorDashboard() {
  const [quizzes, setQuizzes] = useState([])
  const [materials, setMaterials] = useState([])
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const load = () => {
    setLoading(true)
    Promise.all([
      quizzesApi.mine({ page_size: 200, ordering: '-created_at' }).catch(() => ({ data: { results: [] } })),
      materialsApi.list().catch(() => ({ data: { results: [] } })),
      quizzesApi.myAttempts().catch(() => ({ data: { results: [] } })),
    ]).then(([q, m, a]) => {
      setQuizzes(q.data.results || q.data || [])
      setMaterials(m.data.results || m.data || [])
      setAttempts(a.data.results || a.data || [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const drafts = useMemo(() => quizzes.filter(q => q.status === 'draft'), [quizzes])
  const published = useMemo(() => quizzes.filter(q => q.status === 'published'), [quizzes])

  const stats = {
    quizzes: quizzes.length,
    published: published.length,
    drafts: drafts.length,
    totalPlays: quizzes.reduce((s, q) => s + (q.plays_count || 0), 0),
    totalLikes: quizzes.reduce((s, q) => s + (q.likes_count || 0), 0),
    materials: materials.length,
    attempts: attempts.length,
  }

  const TABS = [
    { key: 'overview',  label: 'Преглед',      icon: BarChart3 },
    { key: 'drafts',    label: 'Нацрти',       icon: FileText, count: stats.drafts },
    { key: 'published', label: 'Објавени',     icon: BookOpen, count: stats.published },
    { key: 'games',     label: 'Мои игри',     icon: History,  count: stats.attempts },
    { key: 'materials', label: 'Материјали',   icon: Database, count: stats.materials },
  ]

  return (
    <div className="container-app py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted mb-1">
            Инструктор
          </p>
          <h1 className="font-display text-4xl">Командна табла</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="btn-secondary"
            title="Освежи"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link to="/upload" className="btn-primary">
            <Upload size={14} /> Прикачи материјал
          </Link>
        </div>
      </div>

      {/* Stats - clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Објавени"
          value={stats.published}
          icon={BookOpen}
          accent
          onClick={() => setActiveTab('published')}
        />
        <StatCard
          label="Нацрти"
          value={stats.drafts}
          icon={FileText}
          onClick={() => setActiveTab('drafts')}
        />
        <StatCard
          label="Мои игри"
          value={stats.attempts}
          icon={History}
          onClick={() => setActiveTab('games')}
        />
        <StatCard
          label="Лајкови"
          value={stats.totalLikes}
          icon={Heart}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-5 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-2
                ${active ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}
            >
              <Icon size={13} /> {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-[10px] font-mono rounded-full px-1.5 py-0.5 ${
                  active ? 'bg-accent text-white' : 'bg-fg/10 text-muted'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="shimmer h-20" />)}
        </div>
      ) : activeTab === 'overview' ? (
        <OverviewPanel quizzes={quizzes} materials={materials} attempts={attempts} stats={stats} />
      ) : activeTab === 'drafts' ? (
        drafts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Нема нацрти."
            desc="Прикачи материјал и генерирај квиз - тие ќе се појават како нацрти."
            ctaLabel="Прикачи материјал"
            ctaTo="/upload"
          />
        ) : (
          <div className="space-y-3">
            {drafts.map(q => <QuizRow key={q.id} quiz={q} />)}
          </div>
        )
      ) : activeTab === 'published' ? (
        published.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Сè уште немаш објавени квизови."
            desc="Кога ќе објавиш квиз, ќе се појави тука."
            ctaLabel="Види нацрти"
            ctaTo="#"
            onClick={() => setActiveTab('drafts')}
          />
        ) : (
          <div className="space-y-3">
            {published.map(q => <QuizRow key={q.id} quiz={q} />)}
          </div>
        )
      ) : activeTab === 'games' ? (
        attempts.length === 0 ? (
          <EmptyState
            icon={History}
            title="Сè уште не си играл квиз."
            desc="Сите квизови што ќе ги играш ќе се прикажуваат тука со резултат."
            ctaLabel="Разгледај квизови"
            ctaTo="/search"
          />
        ) : (
          <div className="space-y-3">
            {attempts.map(a => <AttemptRow key={a.id} attempt={a} />)}
          </div>
        )
      ) : activeTab === 'materials' ? (
        materials.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Нема прикачени материјали."
            ctaLabel="Прикачи нов"
            ctaTo="/upload"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {materials.map(m => <MaterialRow key={m.id} material={m} />)}
          </div>
        )
      ) : null}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, accent, onClick }) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component
      onClick={onClick}
      className={`card ${accent ? 'card-accent' : ''} ${onClick ? 'card-hover w-full text-left' : ''}`}
    >
      <Icon size={20} className={`mb-3 ${accent ? 'text-white' : 'text-accent'}`} />
      <p className={`font-display text-3xl font-semibold ${accent ? 'text-white' : ''}`}>
        {value}
      </p>
      <p className={`text-xs font-mono uppercase tracking-widest mt-1 ${accent ? 'text-white/80' : 'text-muted'}`}>
        {label}
      </p>
    </Component>
  )
}

function OverviewPanel({ quizzes, materials, attempts, stats }) {
  const topQuizzes = [...quizzes].sort((a, b) => b.likes_count - a.likes_count).slice(0, 5)
  return (
    <div className="space-y-8">
      {/* Best quizzes */}
      {topQuizzes.length > 0 && (
        <section>
          <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
            <Trophy size={20} /> Најпопуларни мои квизови
          </h2>
          <div className="space-y-2">
            {topQuizzes.map(q => <QuizRow key={q.id} quiz={q} />)}
          </div>
        </section>
      )}

      {/* Recent attempts */}
      {attempts.length > 0 && (
        <section>
          <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
            <History size={20} /> Последни игри
          </h2>
          <div className="space-y-2">
            {attempts.slice(0, 5).map(a => <AttemptRow key={a.id} attempt={a} />)}
          </div>
        </section>
      )}

      {stats.quizzes === 0 && stats.materials === 0 && (
        <div className="card text-center py-12">
          <Upload className="mx-auto mb-3 text-subtle" size={32} />
          <p className="font-display text-xl mb-2">Започни тука</p>
          <p className="text-sm text-muted mb-5">
            Прикачи учебен материјал и AI ќе генерира квалитетен квиз.
          </p>
          <Link to="/upload" className="btn-primary inline-flex">
            <Upload size={14} /> Прикачи прв материјал
          </Link>
        </div>
      )}
    </div>
  )
}

function QuizRow({ quiz }) {
  return (
    <div className="card !py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {quiz.status === 'draft' && <span className="badge">Нацрт</span>}
          {quiz.status === 'published' && <span className="badge-accent">Објавен</span>}
          {quiz.ai_generated && <span className="badge-soft">AI</span>}
          {quiz.subject_name && (
            <span className="badge text-[9px]">
              {quiz.subject_name.length > 22 ? quiz.subject_name.slice(0, 22) + '…' : quiz.subject_name}
            </span>
          )}
        </div>
        <h3 className="font-display text-base truncate">{quiz.title}</h3>
        <p className="text-xs font-mono text-muted">
          {quiz.questions_count || 0} прашања · {quiz.plays_count} игри ·{' '}
          <Heart size={9} className="inline" /> {quiz.likes_count}
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        {quiz.status === 'published' && (
          <Link to={`/quiz/${quiz.id}/play`} className="btn-primary !py-1.5 !px-2 text-xs">
            <Play size={12} />
          </Link>
        )}
        <Link to={`/quiz/${quiz.id}`} className="btn-secondary !py-1.5 !px-2 text-xs">
          <Eye size={12} />
        </Link>
        <Link to={`/quiz/${quiz.id}/edit`} className="btn-secondary !py-1.5 !px-2 text-xs">
          <Edit size={12} />
        </Link>
        {quiz.status === 'published' && (
          <Link to={`/quiz/${quiz.id}/analytics`} className="btn-secondary !py-1.5 !px-2 text-xs">
            <BarChart3 size={12} />
          </Link>
        )}
      </div>
    </div>
  )
}

function AttemptRow({ attempt }) {
  const scoreColor = attempt.score >= 70 ? 'text-green-600 dark:text-green-400'
                   : attempt.score >= 50 ? 'text-fg'
                   : 'text-accent'
  return (
    <Link
      to={`/quiz/${attempt.quiz}`}
      className="card-hover !py-3 flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-base truncate">{attempt.quiz_title}</h3>
        <p className="text-xs font-mono text-muted mt-1">
          {new Date(attempt.started_at).toLocaleString('mk-MK')} ·{' '}
          {attempt.points_earned} / {attempt.points_total} поени
        </p>
      </div>
      <p className={`font-display text-2xl font-semibold ${scoreColor}`}>
        {Math.round(attempt.score)}%
      </p>
    </Link>
  )
}

function MaterialRow({ material }) {
  return (
    <Link
      to={`/upload?material=${material.id}`}
      className="card-hover !py-3 flex items-center gap-3"
    >
      <FileText size={20} className="text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{material.title}</p>
        <p className="text-[10px] font-mono text-muted">
          {material.extension} • {(material.file_size / 1024).toFixed(0)} KB • {material.status}
        </p>
      </div>
      {material.status === 'ready' && <ArrowRight size={14} className="text-muted" />}
    </Link>
  )
}

function EmptyState({ icon: Icon, title, desc, ctaLabel, ctaTo, onClick }) {
  return (
    <div className="card text-center py-12">
      <Icon className="mx-auto mb-3 text-subtle" size={32} />
      <p className="font-display text-xl mb-2">{title}</p>
      {desc && <p className="text-sm text-muted mb-5">{desc}</p>}
      {ctaLabel && (onClick ? (
        <button onClick={onClick} className="btn-primary inline-flex">{ctaLabel}</button>
      ) : (
        <Link to={ctaTo} className="btn-primary inline-flex">{ctaLabel}</Link>
      ))}
    </div>
  )
}
