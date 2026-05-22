import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Edit, Eye, Plus, Trash2, Upload, Bookmark, BarChart3, Play,
  History, Heart, Search as SearchIcon, X,
} from 'lucide-react'
import { quizzesApi, subjectsApi } from '../lib/api'
import { useAuth } from '../lib/auth'

const TABS = [
  { key: 'created', label: 'Мои создадени', icon: Edit, instructor_only: true },
  { key: 'saved', label: 'Зачувани', icon: Bookmark },
  { key: 'history', label: 'Историја', icon: History },
]

const SORT_OPTIONS = [
  { key: '-likes_count', label: 'Најмногу лајкови' },
  { key: 'likes_count', label: 'Најмалку лајкови' },
  { key: '-plays_count', label: 'Најмногу играни' },
  { key: '-created_at', label: 'Најнови' },
  { key: 'created_at', label: 'Најстари' },
]

export default function MyQuizzes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isInstructor = useAuth((s) => s.isInstructor())

  // Default tab: instructor → created, student → saved
  const defaultTab = isInstructor ? 'created' : 'saved'
  const tab = searchParams.get('tab') || defaultTab

  const [quizzes, setQuizzes] = useState([])
  const [attempts, setAttempts] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')
  const [subject, setSubject] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [ordering, setOrdering] = useState('-created_at')

  // Load subjects once
  useEffect(() => {
    subjectsApi.list().then((r) =>
      setSubjects(r.data.results || r.data || [])
    ).catch(() => {})
  }, [])

  // Load quizzes for the active tab + filters
  useEffect(() => {
    setLoading(true)

    const params = {
      ordering,
    }
    if (search) params.search = search
    if (year) params.year = year
    if (semester) params.semester = semester
    if (subject) params.subject = subject
    if (statusFilter && tab === 'created') params.status = statusFilter

    if (tab === 'created') {
      quizzesApi.mine(params).then((r) => {
        setQuizzes(r.data.results || r.data || [])
        setLoading(false)
      }).catch(() => setLoading(false))
    } else if (tab === 'saved') {
      quizzesApi.saved(params).then((r) => {
        setQuizzes(r.data.results || r.data || [])
        setLoading(false)
      }).catch(() => setLoading(false))
    } else if (tab === 'history') {
      quizzesApi.myAttempts().then((r) => {
        setAttempts(r.data.results || r.data || [])
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [tab, search, year, semester, subject, statusFilter, ordering])

  const changeTab = (key) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', key)
    newParams.delete('status')
    setSearchParams(newParams)
    setStatusFilter('')
  }

  const onDelete = async (id) => {
    if (!confirm('Сигурно сакаш да го избришеш квизот?')) return
    try {
      await quizzesApi.delete(id)
      setQuizzes(quizzes.filter(q => q.id !== id))
    } catch (e) {
      alert('Не успеа бришењето.')
    }
  }

  const onUnsave = async (id) => {
    try {
      await quizzesApi.toggleSave(id)
      setQuizzes(quizzes.filter(q => q.id !== id))
    } catch (e) {
      alert('Не успеа.')
    }
  }

  const clearFilters = () => {
    setSearch(''); setYear(''); setSemester(''); setSubject(''); setStatusFilter('')
  }

  const hasFilters = search || year || semester || subject || statusFilter
  const visibleTabs = TABS.filter(t => !t.instructor_only || isInstructor)

  // Filtered subject list (cascade: year → only relevant semesters → subjects)
  const filteredSubjects = useMemo(() => {
    let list = subjects
    if (year) list = list.filter(s => String(s.year) === String(year))
    if (semester) list = list.filter(s => String(s.semester) === String(semester))
    return list
  }, [subjects, year, semester])

  return (
    <div className="container-app py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
            Колекција
          </p>
          <h1 className="font-display text-4xl">Мои квизови</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/create-quiz" className="btn-secondary">
            <Plus size={14} /> Мануелно
          </Link>
          <Link to="/upload" className="btn-primary">
            <Upload size={14} /> Прикачи материјал
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-ink-900 mb-6 overflow-x-auto">
        {visibleTabs.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-4 -mb-0.5 transition-colors whitespace-nowrap flex items-center gap-2
                ${active ? 'border-accent text-ink-900' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Filters (not shown for history) */}
      {tab !== 'history' && (
        <div className="card !p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 relative">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-600" />
              <input
                placeholder="Барај по наслов или предмет"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 !py-2 text-sm"
              />
            </div>
            <select
              value={year}
              onChange={(e) => { setYear(e.target.value); setSemester(''); setSubject('') }}
              className="input !py-2 text-sm"
            >
              <option value="">Сите години</option>
              <option value="1">Прва година</option>
              <option value="2">Втора година</option>
              <option value="3">Трета година</option>
              <option value="4">Четврта година</option>
            </select>
            <select
              value={semester}
              onChange={(e) => { setSemester(e.target.value); setSubject('') }}
              className="input !py-2 text-sm"
            >
              <option value="">Сите семестри</option>
              {[1,2,3,4,5,6,7,8].map(s => (
                <option key={s} value={s}>Семестар {s}</option>
              ))}
            </select>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input !py-2 text-sm"
            >
              <option value="">Сите предмети</option>
              {filteredSubjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="input !py-1.5 text-xs !w-auto"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>

            {tab === 'created' && (
              <div className="flex gap-1.5">
                {[
                  { key: '', label: 'Сите' },
                  { key: 'draft', label: 'Нацрти' },
                  { key: 'published', label: 'Објавени' },
                  { key: 'removed', label: 'Отстранети' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest border-2 transition
                      ${statusFilter === f.key
                        ? 'bg-ink-900 text-cream border-ink-900'
                        : 'bg-cream border-ink-900 hover:bg-ink-50'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-ink-600 hover:text-accent ml-auto flex items-center gap-1"
              >
                <X size={12} /> Исчисти филтри
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-24 shimmer" />)}
        </div>
      ) : tab === 'history' ? (
        <HistoryList attempts={attempts} />
      ) : quizzes.length === 0 ? (
        <EmptyState tab={tab} isInstructor={isInstructor} hasFilters={hasFilters} />
      ) : (
        <div className="space-y-3">
          {quizzes.map(q => (
            <QuizRow
              key={q.id}
              quiz={q}
              tab={tab}
              onDelete={() => onDelete(q.id)}
              onUnsave={() => onUnsave(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuizRow({ quiz, tab, onDelete, onUnsave }) {
  return (
    <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {tab === 'created' && (
            <span className={`badge ${
              quiz.status === 'published'
                ? 'bg-ink-900 text-cream border-ink-900'
                : quiz.status === 'removed'
                ? 'bg-accent text-cream border-accent'
                : 'bg-cream'
            }`}>
              {quiz.status === 'published' ? 'Објавен' : quiz.status === 'removed' ? 'Отстранет' : 'Нацрт'}
            </span>
          )}
          {tab === 'saved' && quiz.author_username && (
            <span className="badge">од {quiz.author_username}</span>
          )}
          {quiz.subject_name && (
            <span className="badge font-mono text-[9px]">
              {quiz.subject_name.length > 20 ? quiz.subject_name.slice(0, 20) + '…' : quiz.subject_name}
            </span>
          )}
          {quiz.semester && (
            <span className="badge">Сем. {quiz.semester}</span>
          )}
          {quiz.ai_generated && <span className="badge bg-accent text-cream border-accent">AI</span>}
        </div>
        <h3 className="font-display text-xl mb-1">{quiz.title}</h3>
        <p className="text-xs font-mono text-ink-600">
          {quiz.questions_count || 0} прашања · {quiz.plays_count} играња ·{' '}
          <Heart size={10} className="inline" /> {quiz.likes_count} · {quiz.subject_name || '—'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {quiz.status === 'published' && (
          <Link
            to={`/quiz/${quiz.id}/play`}
            className="btn-accent p-2 text-xs"
            title="Играј"
          >
            <Play size={14} />
          </Link>
        )}
        <Link to={`/quiz/${quiz.id}`} className="btn-secondary p-2" title="Преглед">
          <Eye size={16} />
        </Link>

        {tab === 'created' && (
          <>
            <Link to={`/quiz/${quiz.id}/edit`} className="btn-secondary p-2" title="Уреди">
              <Edit size={16} />
            </Link>
            {quiz.status === 'published' && (
              <Link
                to={`/quiz/${quiz.id}/analytics`}
                className="btn-secondary p-2"
                title="Статистика"
              >
                <BarChart3 size={16} />
              </Link>
            )}
            <button
              onClick={onDelete}
              className="btn-secondary p-2 hover:bg-accent hover:text-cream hover:border-accent"
              title="Избриши"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}

        {tab === 'saved' && (
          <button
            onClick={onUnsave}
            className="btn-secondary p-2 hover:bg-accent hover:text-cream hover:border-accent"
            title="Отстрани од зачувани"
          >
            <Bookmark size={16} fill="currentColor" />
          </button>
        )}
      </div>
    </div>
  )
}

function HistoryList({ attempts }) {
  if (attempts.length === 0) {
    return (
      <div className="card text-center py-16">
        <History className="mx-auto mb-3 text-ink-400" size={32} />
        <p className="font-display text-2xl mb-2">Сè уште не си играл квиз.</p>
        <p className="text-sm text-ink-600 mb-4">Поминатите квизови ќе се појават тука.</p>
        <Link to="/search" className="btn-accent inline-flex">Разгледај квизови</Link>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {attempts.map(a => {
        const scoreColor = a.score >= 70 ? 'text-green-700'
                         : a.score >= 50 ? 'text-ink-700'
                         : 'text-accent'
        return (
          <Link
            key={a.id}
            to={`/quiz/${a.quiz}`}
            className="card card-hover flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg truncate">{a.quiz_title}</h3>
              <p className="text-xs font-mono text-ink-600 mt-1">
                {new Date(a.started_at).toLocaleString('mk-MK')}
                {' · '}
                {a.points_earned} / {a.points_total} поени
              </p>
            </div>
            <p className={`font-display text-3xl font-semibold ${scoreColor}`}>
              {Math.round(a.score)}%
            </p>
          </Link>
        )
      })}
    </div>
  )
}

function EmptyState({ tab, isInstructor, hasFilters }) {
  if (hasFilters) {
    return (
      <div className="card text-center py-16">
        <SearchIcon className="mx-auto mb-3 text-ink-400" size={32} />
        <p className="font-display text-2xl mb-2">Нема резултати.</p>
        <p className="text-sm text-ink-600">Обиди се да ги исчистиш филтрите.</p>
      </div>
    )
  }

  if (tab === 'created') {
    return (
      <div className="card text-center py-16">
        <Plus className="mx-auto mb-3 text-ink-400" size={32} />
        <p className="font-display text-2xl mb-2">Сè уште немаш создадено квизови.</p>
        <p className="text-sm text-ink-600 mb-5">
          {isInstructor
            ? 'Прикачи учебен материјал и Fink.io ќе генерира квалитетни прашања.'
            : 'Стани инструктор за да можеш да создаваш квизови.'}
        </p>
        {isInstructor && (
          <Link to="/upload" className="btn-accent inline-flex">
            <Upload size={14} /> Прикачи материјал
          </Link>
        )}
      </div>
    )
  }

  if (tab === 'saved') {
    return (
      <div className="card text-center py-16">
        <Bookmark className="mx-auto mb-3 text-ink-400" size={32} />
        <p className="font-display text-2xl mb-2">Нема зачувани квизови.</p>
        <p className="text-sm text-ink-600 mb-5">
          Кога ќе најдеш добар квиз од колега, стегни „Зачувај" — ќе се појави тука за полесно да го најдеш и да го вежбаш пак.
        </p>
        <Link to="/search" className="btn-accent inline-flex">Разгледај квизови</Link>
      </div>
    )
  }
  return null
}
