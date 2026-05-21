import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Filter, X } from 'lucide-react'
import { quizzesApi, subjectsApi } from '../lib/api'
import QuizCard from '../components/QuizCard'

const SORT_OPTIONS = [
  { key: '-likes_count', label: 'Најмногу лајкови' },
  { key: 'likes_count', label: 'Најмалку лајкови' },
  { key: '-plays_count', label: 'Најмногу играни' },
  { key: '-created_at', label: 'Најнови' },
  { key: 'created_at', label: 'Најстари' },
]

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [quizzes, setQuizzes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [subject, setSubject] = useState(searchParams.get('subject') || '')
  const [year, setYear] = useState(searchParams.get('year') || '')
  const [semester, setSemester] = useState(searchParams.get('semester') || '')
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || '')
  const [ordering, setOrdering] = useState(searchParams.get('ordering') || '-likes_count')

  // Load subjects (cached)
  useEffect(() => {
    subjectsApi.list().then((r) => setSubjects(r.data.results || r.data || []))
  }, [])

  // Subjects filtered by current year/semester selection
  const filteredSubjects = useMemo(() => {
    let list = subjects
    if (year) list = list.filter(s => String(s.year) === String(year))
    if (semester) list = list.filter(s => String(s.semester) === String(semester))
    return list
  }, [subjects, year, semester])

  // Sync URL params + fetch
  useEffect(() => {
    const params = { ordering }
    if (query) params.search = query
    if (subject) params.subject = subject
    if (year) params.year = year
    if (semester) params.semester = semester
    if (difficulty) params.difficulty = difficulty

    // Update URL
    const urlParams = {}
    if (query) urlParams.q = query
    if (subject) urlParams.subject = subject
    if (year) urlParams.year = year
    if (semester) urlParams.semester = semester
    if (difficulty) urlParams.difficulty = difficulty
    if (ordering !== '-likes_count') urlParams.ordering = ordering
    setSearchParams(urlParams, { replace: true })

    setLoading(true)
    quizzesApi.list(params).then((r) => {
      setQuizzes(r.data.results || r.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [query, subject, year, semester, difficulty, ordering])

  const clearFilters = () => {
    setQuery(''); setSubject(''); setYear(''); setSemester('')
    setDifficulty(''); setOrdering('-likes_count')
  }

  const hasFilters = query || subject || year || semester || difficulty

  return (
    <div className="container-app py-10">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-2">
          Пребарување
        </p>
        <h1 className="font-display text-4xl mb-6">Сите квизови</h1>

        <div className="relative max-w-3xl">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-600" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Барај квиз по наслов, опис, предмет или автор…"
            className="input pl-11 h-12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Filters sidebar */}
        <aside className="space-y-5">
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-ink-700">
            <span className="flex items-center gap-1.5"><Filter size={12} /> Филтри</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-accent hover:underline flex items-center gap-1 normal-case font-sans"
              >
                <X size={11} /> Исчисти
              </button>
            )}
          </div>

          <div>
            <label className="label">Сортирај</label>
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="input !py-2 text-sm"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Година</label>
            <div className="grid grid-cols-2 gap-1">
              <FilterButton active={year === ''} onClick={() => { setYear(''); setSemester(''); setSubject('') }}>Сите</FilterButton>
              {[1,2,3,4].map(y => (
                <FilterButton
                  key={y}
                  active={year === String(y)}
                  onClick={() => { setYear(String(y)); setSemester(''); setSubject('') }}
                >
                  {y === 1 ? 'Прва' : y === 2 ? 'Втора' : y === 3 ? 'Трета' : 'Четврта'}
                </FilterButton>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Семестар</label>
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
          </div>

          <div>
            <label className="label">Предмет</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input !py-2 text-sm"
            >
              <option value="">Сите предмети</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `${s.code} — ` : ''}{s.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] font-mono text-ink-500 mt-1">
              {filteredSubjects.length} предмети
            </p>
          </div>

          <div>
            <label className="label">Тежина</label>
            <div className="space-y-1">
              {[
                ['', 'Сите'],
                ['1', 'Лесно'],
                ['2', 'Средно'],
                ['3', 'Тешко'],
              ].map(([val, label]) => (
                <FilterButton
                  key={val}
                  active={difficulty === val}
                  onClick={() => setDifficulty(val)}
                  block
                >
                  {label}
                </FilterButton>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[...Array(6)].map((_, i) => <div key={i} className="card h-48 shimmer" />)}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="card text-center py-16">
              <SearchIcon className="mx-auto mb-3 text-ink-400" size={32} />
              <p className="font-display text-xl mb-1">Нема резултати.</p>
              <p className="text-sm text-ink-600">
                {hasFilters
                  ? 'Обиди се да ги исчистиш филтрите или со други клучни зборови.'
                  : 'Сè уште нема објавени квизови. Биди прв.'}
              </p>
            </div>
          ) : (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-4">
                {quizzes.length} резултати
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {quizzes.map((q) => <QuizCard key={q.id} quiz={q} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterButton({ active, onClick, children, block }) {
  return (
    <button
      onClick={onClick}
      className={`${block ? 'block w-full text-left ' : ''}px-3 py-1.5 text-xs font-mono uppercase tracking-widest border-2 transition-colors
        ${active
          ? 'bg-ink-900 text-cream border-ink-900'
          : 'bg-cream border-ink-900 hover:bg-ink-50'}`}
    >
      {children}
    </button>
  )
}
