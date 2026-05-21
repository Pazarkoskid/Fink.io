import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy, Flame, Target, Award, TrendingUp, Crown, Medal, Shield, GraduationCap,
} from 'lucide-react'
import { analyticsApi } from '../lib/api'
import { useAuth } from '../lib/auth'

const PERIODS = [
  { key: 'all', label: 'Сите' },
  { key: 'month', label: 'Месец' },
  { key: 'week', label: 'Недела' },
]

const ROLE_TABS = [
  { key: 'student', label: 'Студенти', icon: GraduationCap },
  { key: 'instructor', label: 'Инструктори', icon: Shield },
]

export default function Leaderboard() {
  const [entries, setEntries] = useState([])
  const [myStats, setMyStats] = useState(null)
  const [period, setPeriod] = useState('all')
  const [roleTab, setRoleTab] = useState('student')
  const [loading, setLoading] = useState(true)
  const user = useAuth((s) => s.user)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      analyticsApi.leaderboard({ period, role: roleTab, limit: 10 }).catch(() => ({ data: { results: [] } })),
      user ? analyticsApi.me().catch(() => null) : null,
    ]).then(([lb, me]) => {
      setEntries(lb.data.results || lb.data || [])
      if (me) setMyStats(me.data)
      setLoading(false)
    })
  }, [period, roleTab, user])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3, 10)

  const tabLabel = ROLE_TABS.find(t => t.key === roleTab)?.label

  return (
    <div className="container-app py-10">
      <div className="text-center mb-8">
        <span className="badge mb-3 inline-block">
          <Trophy size={10} className="mr-1" /> Ранг листа
        </span>
        <h1 className="font-display text-5xl mb-3">Топ 10</h1>
        <p className="text-ink-700 max-w-xl mx-auto">
          Заработи поени со одговарање на квизови. Перфектни резултати носат бонус.
        </p>
      </div>

      {/* Role tabs */}
      <div className="flex justify-center gap-2 mb-4">
        {ROLE_TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setRoleTab(t.key)}
              className={`px-5 py-2 text-sm font-medium border-2 transition-colors flex items-center gap-2
                ${roleTab === t.key
                  ? 'bg-ink-900 text-cream border-ink-900'
                  : 'bg-cream border-ink-900 hover:bg-ink-50'}`}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Period selector */}
      <div className="flex justify-center gap-2 mb-10">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest border-2 transition
              ${period === p.key
                ? 'bg-accent text-cream border-accent'
                : 'bg-cream border-ink-900 hover:bg-ink-50'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* My stats card (only for the role you're in) */}
      {user && myStats && (
        (roleTab === 'student' && user.role === 'student') ||
        (roleTab === 'instructor' && (user.role === 'instructor' || user.role === 'admin'))
      ) && (
        <div className="card bg-ink-900 text-cream mb-10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />
          <div className="relative flex flex-wrap gap-6 items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ink-300 mb-1">
                Твојот ранг во „{tabLabel}"
              </p>
              <div className="flex items-baseline gap-3">
                <p className="font-display text-5xl font-semibold">
                  #{myStats.rank}
                </p>
                <p className="text-sm text-ink-300">
                  од {myStats.total_users || 0} активни
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <MyStat label="Поени" value={myStats.total_points} accent />
              <MyStat label="Прос. %" value={Math.round(myStats.average_score)} />
              <MyStat
                label="Серија"
                value={<>{myStats.current_streak}<Flame size={16} className="inline ml-1 text-accent" /></>}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-20 shimmer" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-16">
          <Trophy className="mx-auto mb-3 text-ink-400" size={32} />
          <p className="font-display text-xl mb-1">
            Сè уште нема резултати во оваа категорија.
          </p>
          <p className="text-sm text-ink-600 mb-4">
            {roleTab === 'student'
              ? 'Биди прв студент кој ќе одигра квиз!'
              : 'Инструкторите треба да одиграат квизови за да се појават тука.'}
          </p>
          <Link to="/search" className="btn-accent inline-flex">
            Разгледај квизови
          </Link>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {top3[1] && <PodiumCard entry={top3[1]} place={2} className="md:order-1 md:mt-8" />}
              {top3[0] && <PodiumCard entry={top3[0]} place={1} className="md:order-2" />}
              {top3[2] && <PodiumCard entry={top3[2]} place={3} className="md:order-3 md:mt-12" />}
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((e) => (
                <div key={e.user_id} className="card !py-3 flex items-center gap-4">
                  <span className="font-mono text-sm w-8 text-ink-600 shrink-0">
                    #{e.rank}
                  </span>
                  <span className="font-display text-lg flex-1 truncate">
                    {e.username}
                  </span>
                  <div className="flex items-center gap-4 font-mono text-xs text-ink-700">
                    <span title="Поени">
                      <Award size={12} className="inline mr-1" />
                      {e.total_points}
                    </span>
                    <span title="Прос. %" className="hidden sm:inline">
                      <Target size={12} className="inline mr-1" />
                      {Math.round(e.average_score)}%
                    </span>
                    <span title="Серија" className="hidden sm:inline">
                      <Flame size={12} className="inline mr-1 text-accent" />
                      {e.current_streak}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* How to earn */}
      <section className="card mt-12 bg-ink-50">
        <h3 className="font-display text-xl mb-4 flex items-center gap-2">
          <TrendingUp size={20} /> Како се добиваат поени?
        </h3>
        <ul className="space-y-2 text-sm text-ink-700">
          <li>• <strong>+1 поен</strong> за секој точен одговор</li>
          <li>• <strong>+5 поени</strong> бонус за совршен резултат (100%)</li>
          <li>• Се градат серии — одговори квиз секој ден за да расте бројката со пламенот</li>
        </ul>
      </section>
    </div>
  )
}

function MyStat({ label, value, accent }) {
  return (
    <div>
      <p className={`font-display text-2xl ${accent ? 'text-accent' : ''}`}>{value}</p>
      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-300">{label}</p>
    </div>
  )
}

function PodiumCard({ entry, place, className = '' }) {
  const colors = {
    1: { bg: 'bg-accent text-cream border-accent', icon: Crown },
    2: { bg: 'bg-ink-900 text-cream border-ink-900', icon: Medal },
    3: { bg: 'bg-ink-700 text-cream border-ink-700', icon: Medal },
  }[place]
  const Icon = colors.icon

  return (
    <div className={`card ${colors.bg} text-center ${className}`}>
      <Icon size={32} className="mx-auto mb-3" />
      <p className="font-mono text-xs uppercase tracking-widest opacity-80 mb-1">
        {place === 1 ? 'Прво место' : place === 2 ? 'Второ' : 'Трето'}
      </p>
      <h3 className="font-display text-2xl mb-2 truncate">{entry.username}</h3>
      <div className="flex justify-center gap-4 text-xs font-mono opacity-90">
        <span>{entry.total_points} поени</span>
        <span>•</span>
        <span>{Math.round(entry.average_score)}% прос.</span>
      </div>
    </div>
  )
}
