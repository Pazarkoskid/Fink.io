import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  User as UserIcon, GraduationCap, Shield, Crown, Users,
  Trophy, Flame, Target, Award, BookOpen, Calendar, ArrowLeft,
  Lock, Clock, Check, Database, Download, Heart, FileText,
  UserPlus, UserCheck, UserMinus, X, Loader2, Bookmark,
  MessageSquare,
} from 'lucide-react'
import { authApi, materialsApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import QuizCard from '../components/QuizCard'

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

const TIER_COLORS = {
  bronze: 'bg-orange-100 dark:bg-orange-900/30 border-orange-700/30 text-orange-900 dark:text-orange-200',
  silver: 'bg-fg/5 border-border text-fg',
  gold: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-700/30 text-yellow-900 dark:text-yellow-200',
  diamond: 'bg-accent/15 border-accent/40 text-accent',
}

const FILE_ICONS = {
  '.pdf': '📕', '.doc': '📘', '.docx': '📘',
  '.ppt': '📙', '.pptx': '📙', '.txt': '📄',
}

const COLLECTION_TABS = [
  { key: 'created_quizzes',    label: 'Создадени квизови',  icon: BookOpen },
  { key: 'saved_quizzes',      label: 'Зачувани квизови',   icon: Bookmark },
  { key: 'uploaded_materials', label: 'Прикачени бази',     icon: Database },
  { key: 'saved_materials',    label: 'Зачувани бази',      icon: Bookmark },
]

export default function UserProfile() {
  const { id } = useParams()
  const me = useAuth((s) => s.user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAllBadges, setShowAllBadges] = useState(false)
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [activeTab, setActiveTab] = useState('created_quizzes')
  const [friendActionLoading, setFriendActionLoading] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    authApi.publicProfile(id)
      .then((r) => {
        setData(r.data)
        setLoading(false)
      })
      .catch((e) => {
        setError(
          e.response?.status === 404
            ? 'Корисникот не е пронајден.'
            : 'Грешка при вчитување.'
        )
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [id])

  if (loading) {
    return (
      <div className="container-app py-10 max-w-5xl">
        <div className="shimmer h-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-28" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-app py-20 text-center">
        <p className="font-display text-2xl mb-3">{error}</p>
        <Link to="/leaderboard" className="btn-primary inline-flex">
          <ArrowLeft size={14} /> Назад
        </Link>
      </div>
    )
  }

  const {
    user, stats, badges,
    created_quizzes, created_count,
    saved_quizzes, saved_quizzes_count,
    uploaded_materials, uploaded_materials_count,
    saved_materials, saved_materials_count,
    taken_subjects, taken_count,
    friends, friends_count, friendship_status,
  } = data

  const Icon = ROLE_ICONS[user.role] || UserIcon
  const unlockedBadges = badges.filter(b => b.unlocked)
  const lockedBadges = badges.filter(b => !b.unlocked)

  const yearLabel = user.current_year
    ? ['', 'Прва година', 'Втора година', 'Трета година', 'Четврта година'][user.current_year]
    : null

  // Friend actions
  const sendRequest = async () => {
    setFriendActionLoading(true)
    try {
      await authApi.sendFriendRequest(user.id)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Грешка.')
    } finally {
      setFriendActionLoading(false)
    }
  }

  const removeFriend = async () => {
    const msg = friendship_status === 'friends'
      ? 'Отстрани од пријатели?'
      : friendship_status === 'pending_sent'
      ? 'Откажи испратеното барање?'
      : 'Отстрани?'
    if (!confirm(msg)) return
    setFriendActionLoading(true)
    try {
      await authApi.removeFriend(user.id)
      load()
    } catch (e) {
      alert('Грешка.')
    } finally {
      setFriendActionLoading(false)
    }
  }

  // Pick collection content
  const collectionContent = {
    created_quizzes:    { items: created_quizzes,    count: created_count,           type: 'quiz' },
    saved_quizzes:      { items: saved_quizzes,      count: saved_quizzes_count,     type: 'quiz' },
    uploaded_materials: { items: uploaded_materials, count: uploaded_materials_count, type: 'material' },
    saved_materials:    { items: saved_materials,    count: saved_materials_count,    type: 'material' },
  }
  const current = collectionContent[activeTab]

  return (
    <div className="container-app py-10 max-w-5xl">
      <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm hover:text-accent mb-4">
        <ArrowLeft size={14} /> Назад
      </Link>

      {/* Header */}
      <div className="card-dark mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-5xl font-bold text-white">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge-accent flex items-center gap-1">
                <Icon size={10} /> {ROLE_LABELS[user.role] || user.role}
              </span>
              {yearLabel && (
                <span className="badge bg-white/10 border-white/20 text-white">
                  {yearLabel}
                </span>
              )}
              {stats.rank && stats.rank <= 100 && (
                <span className="badge bg-white text-ink-900 border-white">
                  <Trophy size={10} className="inline mr-1" /> #{stats.rank}
                </span>
              )}
            </div>

            <h1 className="font-display text-4xl font-semibold mb-1 text-white">{user.username}</h1>

            {user.status_label && (
              <p className="text-sm font-medium text-accent mb-1">
                {user.status_emoji && <span className="mr-1">{user.status_emoji}</span>}
                {user.status_label}
              </p>
            )}

            {user.study_program && (
              <p className="text-sm text-white/80 mb-2">
                <BookOpen size={12} className="inline mr-1" /> {user.study_program}
              </p>
            )}

            {user.bio && (
              <p className="text-white/85 mt-2 max-w-2xl">{user.bio}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs font-mono text-white/70 flex-wrap">
              <span>
                <Calendar size={11} className="inline mr-1" />
                Член од {new Date(user.created_at).toLocaleDateString('mk-MK', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setShowFriendsModal(true)}
                className="hover:text-white transition-colors"
              >
                <Users size={11} className="inline mr-1" />
                <span className="text-white font-bold">{friends_count}</span> пријатели
              </button>
            </div>
          </div>

          {/* Friend + chat action buttons */}
          {me && me.id !== user.id && (
            <div className="shrink-0 flex flex-col gap-2">
              <FriendButton
                status={friendship_status}
                loading={friendActionLoading}
                onSend={sendRequest}
                onRemove={removeFriend}
              />
              {friendship_status === 'friends' && (
                <Link
                  to={`/messages?with=${user.id}`}
                  className="btn-secondary !bg-white/10 !text-white !border-white/20 hover:!bg-accent hover:!border-accent"
                >
                  <MessageSquare size={14} /> Порака
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatBox icon={Award} label="Поени" value={stats.total_points} accent />
        <StatBox icon={Target} label="Прос. скор" value={`${Math.round(stats.average_score || 0)}%`} />
        <StatBox icon={BookOpen} label="Играни" value={stats.total_attempts} />
        <StatBox icon={Flame} label="Серија" value={stats.longest_streak} suffix=" д." />
      </div>

      {/* Badges */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl">Беџови</h2>
          <button
            onClick={() => setShowAllBadges(!showAllBadges)}
            className="text-xs font-mono uppercase tracking-widest text-muted hover:text-accent"
          >
            {unlockedBadges.length} / {badges.length}{' '}
            {showAllBadges ? '· сокриј' : '· види ги сите'}
          </button>
        </div>

        {unlockedBadges.length === 0 && !showAllBadges ? (
          <div className="card text-center py-8 text-muted text-sm">
            Сè уште нема освоени беџови.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {unlockedBadges.map(b => <BadgeCard key={b.key} badge={b} />)}
            {showAllBadges && lockedBadges.map(b => <BadgeCard key={b.key} badge={b} locked />)}
          </div>
        )}
      </section>

      {/* Friends preview */}
      {friends_count > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl flex items-center gap-2">
              <Users size={22} /> Пријатели
            </h2>
            <button
              onClick={() => setShowFriendsModal(true)}
              className="text-xs font-mono uppercase tracking-widest text-accent hover:underline"
            >
              Види ги сите ({friends_count})
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {friends.slice(0, 6).map(f => (
              <Link
                key={f.id}
                to={`/users/${f.id}`}
                className="card !p-3 text-center hover:border-accent transition-colors"
              >
                <div className="w-12 h-12 mx-auto rounded-xl overflow-hidden bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold mb-2">
                  {f.avatar ? (
                    <img src={f.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{f.username?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <p className="text-xs truncate font-medium">{f.username}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Taken subjects */}
      {taken_subjects.length > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl">Слушнал предмети</h2>
            <p className="text-xs font-mono text-muted uppercase tracking-widest">
              {taken_count} вкупно
            </p>
          </div>
          <SubjectGrouping subjects={taken_subjects} />
        </section>
      )}

      {/* Collections tabs */}
      <section className="mb-10">
        <h2 className="font-display text-2xl mb-4">Колекции</h2>
        <div className="flex border-b border-border mb-5 overflow-x-auto">
          {COLLECTION_TABS.map(t => {
            const Icon = t.icon
            const count = collectionContent[t.key].count
            const active = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-2
                  ${active ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}
              >
                <Icon size={13} /> {t.label}
                {count > 0 && (
                  <span className={`text-[10px] font-mono rounded-full px-1.5 py-0.5 ${
                    active ? 'bg-accent text-white' : 'bg-fg/10 text-muted'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {current.items.length === 0 ? (
          <div className="card text-center py-10 text-muted text-sm">
            {activeTab === 'created_quizzes' && 'Нема создадени квизови.'}
            {activeTab === 'saved_quizzes' && 'Нема зачувани квизови.'}
            {activeTab === 'uploaded_materials' && 'Нема прикачени бази.'}
            {activeTab === 'saved_materials' && 'Нема зачувани бази.'}
          </div>
        ) : current.type === 'quiz' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {current.items.map(q => <QuizCard key={q.id} quiz={q} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {current.items.map(m => <MaterialCard key={m.id} material={m} />)}
          </div>
        )}
      </section>

      {/* Friends modal */}
      {showFriendsModal && (
        <FriendsModal
          userId={user.id}
          username={user.username}
          onClose={() => setShowFriendsModal(false)}
        />
      )}
    </div>
  )
}

function FriendButton({ status, loading, onSend, onRemove }) {
  if (status === 'self') return null
  if (loading) {
    return (
      <button className="btn-secondary" disabled>
        <Loader2 size={14} className="animate-spin" />
      </button>
    )
  }
  if (status === 'friends') {
    return (
      <button onClick={onRemove} className="btn-secondary !bg-white/10 !text-white !border-white/20 hover:!bg-accent hover:!border-accent">
        <UserCheck size={14} /> Пријател
      </button>
    )
  }
  if (status === 'pending_sent') {
    return (
      <button onClick={onRemove} className="btn-secondary !bg-white/10 !text-white !border-white/20">
        <Clock size={14} /> Испратено
      </button>
    )
  }
  if (status === 'pending_received') {
    return (
      <button onClick={onSend} className="btn-primary">
        <Check size={14} /> Прифати
      </button>
    )
  }
  return (
    <button onClick={onSend} className="btn-primary">
      <UserPlus size={14} /> Додај пријател
    </button>
  )
}

function FriendsModal({ userId, username, onClose }) {
  const [friends, setFriends] = useState(null)

  useEffect(() => {
    authApi.userFriends(userId).then((r) => setFriends(r.data || []))
  }, [userId])

  return (
    <div className="fixed inset-0 bg-ink-900/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl border border-border max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'rgb(var(--surface))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Пријатели на</p>
            <h2 className="font-display text-2xl">{username}</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-fg p-1">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!friends ? (
            <div className="text-center py-8 text-muted">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" />
              Се вчитува…
            </div>
          ) : friends.length === 0 ? (
            <p className="text-center py-8 text-muted text-sm">Нема пријатели.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {friends.map(f => (
                <Link
                  key={f.id}
                  to={`/users/${f.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-fg/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold shrink-0">
                    {f.avatar ? (
                      <img src={f.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{f.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{f.username}</p>
                    {f.study_program && (
                      <p className="text-xs text-muted truncate">{f.study_program}</p>
                    )}
                  </div>
                  <span className="badge-soft text-[9px] shrink-0">{f.role}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MaterialCard({ material }) {
  const icon = FILE_ICONS[material.extension] || '📄'
  const handleDownload = async (e) => {
    e.preventDefault()
    try {
      const { data } = await materialsApi.download(material.id)
      const a = document.createElement('a')
      a.href = data.url
      a.download = data.filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      alert('Грешка.')
    }
  }

  return (
    <div className="card !p-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1">
            {material.subject_name && (
              <span className="badge text-[9px]">
                {material.subject_name.length > 22 ? material.subject_name.slice(0, 22) + '…' : material.subject_name}
              </span>
            )}
            <span className="badge text-[9px]">
              {material.extension?.replace('.', '').toUpperCase()}
            </span>
          </div>
          <p className="font-display text-sm leading-tight line-clamp-2 mb-2">
            {material.title}
          </p>
          <div className="flex items-center gap-3 text-[10px] font-mono text-subtle mb-3">
            <span className="flex items-center gap-1">
              <Heart size={9} /> {material.likes_count}
            </span>
            <span className="flex items-center gap-1">
              <Download size={9} /> {material.downloads_count}
            </span>
            <span className="flex items-center gap-1">
              <FileText size={9} /> {(material.file_size / 1024).toFixed(0)} KB
            </span>
          </div>
          <button
            onClick={handleDownload}
            className="btn-secondary !py-1 !px-2 text-[10px] w-full"
          >
            <Download size={11} /> Симни
          </button>
        </div>
      </div>
    </div>
  )
}

function SubjectGrouping({ subjects }) {
  const current = subjects.filter(s => s.status === 'current')
  const completed = subjects.filter(s => s.status === 'completed')

  return (
    <div className="space-y-5">
      {current.length > 0 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent mb-2 flex items-center gap-1">
            <Clock size={11} /> Тековно ({current.length})
          </p>
          <SubjectList subjects={current} />
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2 flex items-center gap-1">
            <Check size={11} /> Завршил ({completed.length})
          </p>
          <SubjectList subjects={completed} />
        </div>
      )}
    </div>
  )
}

function SubjectList({ subjects }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
      {subjects.map(s => (
        <Link
          key={s.id}
          to={`/search?subject=${s.subject || s.id}`}
          className="card-hover !p-3 flex items-center gap-3"
        >
          <span className="text-xl shrink-0">{s.subject_icon || '📘'}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm leading-tight truncate">
              {s.subject_name || s.name}
            </p>
            <p className="text-[10px] font-mono text-subtle mt-0.5">
              Год. {s.subject_year} · Сем. {s.subject_semester}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, suffix = '', accent }) {
  return (
    <div className={`card ${accent ? 'card-accent' : ''}`}>
      <Icon size={18} className={`mb-2 ${accent ? 'text-white' : 'text-accent'}`} />
      <p className={`font-display text-3xl font-semibold ${accent ? 'text-white' : ''}`}>{value}{suffix}</p>
      <p className={`text-[10px] font-mono uppercase tracking-widest mt-1 ${accent ? 'text-white/80' : 'text-muted'}`}>
        {label}
      </p>
    </div>
  )
}

function BadgeCard({ badge, locked }) {
  const tierClass = TIER_COLORS[badge.tier] || TIER_COLORS.bronze
  return (
    <div
      className={`card !p-3 text-center transition-all ${locked ? 'opacity-50 grayscale' : tierClass}`}
      title={badge.description}
    >
      <div className="text-3xl mb-1 relative">
        {badge.icon}
        {locked && <Lock size={12} className="absolute top-0 right-0 text-muted" />}
      </div>
      <p className="font-display text-xs leading-tight mb-0.5">{badge.label}</p>
      <p className="text-[9px] font-mono uppercase tracking-widest opacity-70">{badge.tier}</p>
      {locked && badge.progress !== undefined && (
        <div className="mt-1.5 h-1 bg-fg/10 rounded-full overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${badge.progress}%` }} />
        </div>
      )}
    </div>
  )
}
