import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, Sparkles, Upload, ArrowRight, BookOpen, Zap, Trophy,
  Heart, Users, Play,
} from 'lucide-react'
import { quizzesApi, subjectsApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import QuizCard from '../components/QuizCard'

export default function Home() {
  const [subjects, setSubjects] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const user = useAuth((s) => s.user)
  const isInstructor = useAuth((s) => s.isInstructor())
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      subjectsApi.list().catch(() => ({ data: { results: [] } })),
      quizzesApi.list({ ordering: '-likes_count' }).catch(() => ({ data: { results: [] } })),
    ]).then(([s, q]) => {
      setSubjects(s.data.results || s.data || [])
      setQuizzes((q.data.results || q.data || []).slice(0, 6))
      setLoading(false)
    })
  }, [])

  const onSearch = (e) => {
    e.preventDefault()
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  const subjectsByYear = subjects.reduce((acc, s) => {
    if (!s.year) return acc
    if (!acc[s.year]) acc[s.year] = []
    acc[s.year].push(s)
    return acc
  }, {})

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-accent-soft/30 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container-app pt-20 pb-16 lg:pt-28 lg:pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-accent/20 mb-6 animate-fade-in">
              <Sparkles size={12} className="text-accent" />
              <span className="text-xs font-medium">Прашања што ти ги дава самиот материјал</span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.05] mb-6 animate-slide-up">
              Учи без напор<span className="text-accent">.</span>
              <br />
              <span className="text-gradient">Учи паметно.</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Прикачи учебен материјал. AI генерира квалитетни квизови на македонски јазик.
              Сподели, играј и учи со колегите.
            </p>

            <form onSubmit={onSearch} className="max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Барај квиз, предмет, тема..."
                  className="input !pl-14 !pr-32 !py-4 !text-base !rounded-2xl shadow-soft"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary !py-2"
                >
                  Барај <ArrowRight size={14} />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {isInstructor ? (
                <Link to="/upload" className="btn-primary">
                  <Upload size={16} /> Прикачи материјал
                </Link>
              ) : !user && (
                <>
                  <Link to="/register" className="btn-primary">
                    <Zap size={16} /> Започни бесплатно
                  </Link>
                  <Link to="/search" className="btn-secondary">
                    <BookOpen size={16} /> Разгледај
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container-app py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            icon={Upload}
            title="Прикачи материјал"
            desc="PDF, DOCX, PPTX — ги претвараме во квиз прашања за минута."
          />
          <FeatureCard
            icon={Sparkles}
            title="AI генерација"
            desc="Квалитетни прашања на македонски, со точни одговори и објаснувања."
            accent
          />
          <FeatureCard
            icon={Trophy}
            title="Натпреварувај се"
            desc="Заработи поени, беџови и качи се на ранг листата."
          />
        </div>
      </section>

      {/* POPULAR QUIZZES */}
      {!loading && quizzes.length > 0 && (
        <section className="container-app py-12">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
                Тренди
              </p>
              <h2 className="font-display text-3xl sm:text-4xl">Најпопуларни квизови</h2>
            </div>
            <Link
              to="/search?ordering=-likes_count"
              className="text-sm text-accent hover:underline flex items-center gap-1"
            >
              Сите <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {quizzes.map((q) => (
              <QuizCard key={q.id} quiz={q} />
            ))}
          </div>
        </section>
      )}

      {/* BROWSE BY YEAR */}
      {!loading && Object.keys(subjectsByYear).length > 0 && (
        <section className="container-app py-12">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
                Каталог
              </p>
              <h2 className="font-display text-3xl sm:text-4xl">Истражи по година</h2>
            </div>
            <Link
              to="/search"
              className="text-sm text-accent hover:underline flex items-center gap-1"
            >
              Сите предмети <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(year => {
              const yearSubjects = subjectsByYear[year] || []
              if (yearSubjects.length === 0) return null
              const yearLabel = ['', 'Прва', 'Втора', 'Трета', 'Четврта'][year]
              return (
                <Link
                  key={year}
                  to={`/search?year=${year}`}
                  className="card-hover group"
                >
                  <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
                    Година
                  </p>
                  <p className="font-display text-4xl font-semibold mb-3 group-hover:text-accent transition-colors">
                    {yearLabel}
                  </p>
                  <p className="text-sm text-muted mb-4">
                    {yearSubjects.length} предмети
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {yearSubjects.slice(0, 3).map(s => (
                      <span key={s.id} className="badge text-[9px]">
                        {s.icon} {s.name.length > 18 ? s.name.slice(0, 18) + '…' : s.name}
                      </span>
                    ))}
                    {yearSubjects.length > 3 && (
                      <span className="badge text-[9px] text-muted">
                        +{yearSubjects.length - 3} уште
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      {!user && (
        <section className="container-app py-16">
          <div className="card-dark text-center !py-16">
            <Sparkles size={36} className="mx-auto mb-4 text-accent" />
            <h2 className="font-display text-4xl mb-3">Спремен/а да започнеш?</h2>
            <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
              Слободна регистрација. Без обврски. Започни за помалку од минута.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn-primary !text-base !py-3 !px-7">
                <Zap size={18} /> Регистрирај се
              </Link>
              <Link to="/search" className="btn-secondary !text-base !py-3 !px-7 !text-white !border-white/20 hover:!bg-white/10">
                <Play size={18} /> Игра без регистрација
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

function FeatureCard({ icon: Icon, title, desc, accent }) {
  return (
    <div className={`card ${accent ? 'card-accent !p-7' : '!p-7'}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4
        ${accent ? 'bg-white/15' : 'bg-accent/10'}`}>
        <Icon size={22} className={accent ? 'text-white' : 'text-accent'} />
      </div>
      <h3 className={`font-display text-2xl mb-2 ${accent ? '' : ''}`}>{title}</h3>
      <p className={accent ? 'text-white/85' : 'text-muted'}>{desc}</p>
    </div>
  )
}
