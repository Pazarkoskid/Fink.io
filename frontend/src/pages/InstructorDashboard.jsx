import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Plus, FileText, BookOpen, BarChart3, ArrowRight, Sparkles, RefreshCw } from 'lucide-react'
import { quizzesApi, materialsApi } from '../lib/api'

export default function InstructorDashboard() {
  const [quizzes, setQuizzes] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      quizzesApi.mine({ page_size: 200, ordering: '-created_at' }).catch(() => ({ data: { results: [] } })),
      materialsApi.list().catch(() => ({ data: { results: [] } })),
    ]).then(([q, m]) => {
      setQuizzes(q.data.results || q.data || [])
      setMaterials(m.data.results || m.data || [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const stats = {
    quizzes: quizzes.length,
    published: quizzes.filter(q => q.status === 'published').length,
    drafts: quizzes.filter(q => q.status === 'draft').length,
    totalPlays: quizzes.reduce((s, q) => s + (q.plays_count || 0), 0),
    totalLikes: quizzes.reduce((s, q) => s + (q.likes_count || 0), 0),
    materials: materials.length,
  }

  return (
    <div className="container-app py-10">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-1">
            Инструктор
          </p>
          <h1 className="font-display text-4xl">Командна табла</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="btn-secondary"
            title="Освежи статистики"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link to="/upload" className="btn-accent">
            <Upload size={16} /> Прикачи нов материјал
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Вкупно квизови" value={stats.quizzes} icon={BookOpen} />
        <StatCard label="Објавени" value={stats.published} icon={BookOpen} accent />
        <StatCard label="Нацрти" value={stats.drafts} icon={FileText} />
        <StatCard label="Игри" value={stats.totalPlays} icon={BarChart3} />
      </div>

      {/* Recent materials */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl">Мои материјали</h2>
          <Link to="/upload" className="text-sm font-medium hover:text-accent flex items-center gap-1">
            Прикачи нов <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => <div key={i} className="card h-20 shimmer" />)}
          </div>
        ) : materials.length === 0 ? (
          <div className="card text-center py-8">
            <FileText className="mx-auto mb-3 text-ink-400" size={28} />
            <p className="text-ink-700">Сè уште немаш прикачено материјали.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.slice(0, 6).map(m => (
              <div key={m.id} className="card flex items-center gap-4">
                <FileText size={24} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.title}</p>
                  <p className="text-xs font-mono text-ink-600">
                    {m.extension} • {(m.file_size / 1024).toFixed(0)} KB • {m.status}
                  </p>
                </div>
                {m.status === 'ready' && (
                  <Link to={`/upload?material=${m.id}`} className="btn-secondary text-xs">
                    Генерирај <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My quizzes */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl">Мои квизови</h2>
          <Link to="/my-quizzes" className="text-sm font-medium hover:text-accent flex items-center gap-1">
            Види ги сите <ArrowRight size={14} />
          </Link>
        </div>
        {quizzes.length === 0 ? (
          <div className="card text-center py-8">
            <BookOpen className="mx-auto mb-3 text-ink-400" size={28} />
            <p className="text-ink-700 mb-3">Сè уште немаш квизови.</p>
            <Link to="/upload" className="btn-primary inline-flex">
              <Plus size={16} /> Создај прв квиз
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.slice(0, 5).map(q => (
              <Link key={q.id} to={`/quiz/${q.id}/edit`} className="card-hover flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${q.status === 'published' ? 'bg-accent text-cream border-accent' : ''}`}>
                      {q.status === 'published' ? 'Објавен' : q.status === 'draft' ? 'Нацрт' : 'Отстранет'}
                    </span>
                    {q.ai_generated && <span className="badge">AI</span>}
                  </div>
                  <h3 className="font-display text-lg">{q.title}</h3>
                  <p className="text-xs font-mono text-ink-600">
                    {q.questions_count} прашања • {q.plays_count} игри • {q.likes_count} лајкови
                  </p>
                </div>
                <ArrowRight size={20} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className={`card ${accent ? 'bg-accent text-cream border-accent' : ''}`}>
      <Icon size={20} className={accent ? 'mb-3' : 'mb-3 text-accent'} />
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className={`text-xs font-mono uppercase tracking-widest mt-1 ${accent ? '' : 'text-ink-600'}`}>
        {label}
      </p>
    </div>
  )
}
