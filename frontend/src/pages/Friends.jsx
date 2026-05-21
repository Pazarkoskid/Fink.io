import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, UserPlus, Check, X, Search, Loader2, Mail, Clock,
} from 'lucide-react'
import { authApi } from '../lib/api'

export default function Friends() {
  const [tab, setTab] = useState('all')  // all | received | sent | search
  const [requests, setRequests] = useState({ received: [], sent: [] })
  const [friends, setFriends] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const meR = await authApi.me()
      setMe(meR.data)
      const friendsR = await authApi.userFriends(meR.data.id)
      setFriends(friendsR.data || [])
      const reqR = await authApi.myFriendRequests()
      setRequests(reqR.data)
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const accept = async (requestId) => {
    try {
      await authApi.respondFriendRequest(requestId, 'accept')
      load()
    } catch (e) { alert('Грешка.') }
  }

  const reject = async (requestId) => {
    try {
      await authApi.respondFriendRequest(requestId, 'reject')
      load()
    } catch (e) { alert('Грешка.') }
  }

  const cancelSent = async (userId) => {
    try {
      await authApi.removeFriend(userId)
      load()
    } catch (e) { alert('Грешка.') }
  }

  const removeFriend = async (userId) => {
    if (!confirm('Сигурно? Овој корисник ќе биде отстранет од пријатели.')) return
    try {
      await authApi.removeFriend(userId)
      load()
    } catch (e) { alert('Грешка.') }
  }

  const TABS = [
    { key: 'all', label: 'Пријатели', count: friends.length, icon: Users },
    { key: 'received', label: 'Барања', count: requests.received.length, icon: Mail },
    { key: 'sent', label: 'Испратени', count: requests.sent.length, icon: Clock },
    { key: 'search', label: 'Додај нов', icon: UserPlus },
  ]

  return (
    <div className="container-app py-10 max-w-4xl">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Друштво
        </p>
        <h1 className="font-display text-4xl">Пријатели</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-2
                ${active
                  ? 'border-accent text-fg'
                  : 'border-transparent text-muted hover:text-fg'}`}
            >
              <Icon size={14} /> {t.label}
              {t.count > 0 && (
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

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="shimmer h-20" />)}
        </div>
      ) : tab === 'all' ? (
        friends.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Сè уште немаш пријатели."
            desc="Барај корисници и испрати ги барања."
            cta={() => setTab('search')}
            ctaLabel="Додај нов пријател"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {friends.map(f => (
              <FriendCard key={f.id} user={f} onRemove={() => removeFriend(f.id)} />
            ))}
          </div>
        )
      ) : tab === 'received' ? (
        requests.received.length === 0 ? (
          <EmptyState icon={Mail} title="Нема нови барања." desc="Кога некој ќе те додаде, ќе се појави тука." />
        ) : (
          <div className="space-y-3">
            {requests.received.map(r => (
              <RequestCard
                key={r.id}
                user={r.user}
                createdAt={r.created_at}
                onAccept={() => accept(r.id)}
                onReject={() => reject(r.id)}
              />
            ))}
          </div>
        )
      ) : tab === 'sent' ? (
        requests.sent.length === 0 ? (
          <EmptyState icon={Clock} title="Нема испратени барања што чекаат." />
        ) : (
          <div className="space-y-3">
            {requests.sent.map(r => (
              <RequestCard
                key={r.id}
                user={r.user}
                createdAt={r.created_at}
                sent
                onCancel={() => cancelSent(r.user.id)}
              />
            ))}
          </div>
        )
      ) : (
        <UserSearch onChanged={load} />
      )}
    </div>
  )
}

function FriendCard({ user, onRemove }) {
  return (
    <div className="card !p-4 flex items-center gap-3">
      <Link to={`/users/${user.id}`} className="shrink-0">
        <Avatar user={user} size={48} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/users/${user.id}`} className="font-display text-base hover:text-accent transition-colors block truncate">
          {user.username}
        </Link>
        {user.study_program && (
          <p className="text-xs text-muted truncate">{user.study_program}</p>
        )}
        <span className="badge-soft text-[9px] mt-0.5 inline-flex">{user.role}</span>
      </div>
      <button
        onClick={onRemove}
        className="btn-secondary !py-1 !px-2 text-[10px] shrink-0"
        title="Отстрани"
      >
        <X size={12} />
      </button>
    </div>
  )
}

function RequestCard({ user, createdAt, sent, onAccept, onReject, onCancel }) {
  return (
    <div className="card !p-4 flex items-center gap-3">
      <Link to={`/users/${user.id}`} className="shrink-0">
        <Avatar user={user} size={48} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/users/${user.id}`} className="font-display text-base hover:text-accent transition-colors block truncate">
          {user.username}
        </Link>
        <p className="text-xs text-muted">
          {sent ? 'Испратено' : 'Прати ти'}: {new Date(createdAt).toLocaleDateString('mk-MK')}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {sent ? (
          <button onClick={onCancel} className="btn-secondary !py-1.5 !px-3 text-xs">
            Откажи
          </button>
        ) : (
          <>
            <button onClick={onAccept} className="btn-primary !py-1.5 !px-3 text-xs">
              <Check size={13} /> Прифати
            </button>
            <button onClick={onReject} className="btn-secondary !py-1.5 !px-3 text-xs">
              <X size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function UserSearch({ onChanged }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [sentMap, setSentMap] = useState({})  // user_id -> true after send

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      authApi.searchUsers(query).then((r) => {
        setResults(r.data || [])
        setSearching(false)
      }).catch(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const send = async (userId) => {
    try {
      await authApi.sendFriendRequest(userId)
      setSentMap({ ...sentMap, [userId]: true })
      onChanged()
    } catch (e) {
      alert(e.response?.data?.detail || 'Грешка при испраќање.')
    }
  }

  return (
    <div>
      <div className="relative mb-5">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Барај по корисничко име или е-маил..."
          className="input !pl-11"
          autoFocus
        />
      </div>

      {query.length < 2 ? (
        <p className="text-center text-muted text-sm py-8">
          Внеси барем 2 знаци за да започне пребарувањето.
        </p>
      ) : searching ? (
        <div className="flex items-center justify-center py-8 text-muted text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Пребарувам…
        </div>
      ) : results.length === 0 ? (
        <p className="text-center text-muted text-sm py-8">
          Нема резултати за „{query}".
        </p>
      ) : (
        <div className="space-y-2">
          {results.map(u => (
            <div key={u.id} className="card !p-3 flex items-center gap-3">
              <Link to={`/users/${u.id}`} className="shrink-0">
                <Avatar user={u} size={40} />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/users/${u.id}`} className="font-medium hover:text-accent block truncate">
                  {u.username}
                </Link>
                {u.study_program && (
                  <p className="text-xs text-muted truncate">{u.study_program}</p>
                )}
              </div>
              {sentMap[u.id] ? (
                <span className="badge-soft text-[10px]">
                  <Check size={10} className="inline mr-1" /> Испратено
                </span>
              ) : (
                <button
                  onClick={() => send(u.id)}
                  className="btn-primary !py-1.5 !px-3 text-xs"
                >
                  <UserPlus size={12} /> Додај
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Avatar({ user, size = 40 }) {
  return (
    <div
      className="rounded-xl overflow-hidden bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {user.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{user.username?.[0]?.toUpperCase()}</span>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc, cta, ctaLabel }) {
  return (
    <div className="card text-center py-16">
      <Icon className="mx-auto mb-3 text-subtle" size={32} />
      <p className="font-display text-xl mb-2">{title}</p>
      {desc && <p className="text-sm text-muted mb-4">{desc}</p>}
      {cta && (
        <button onClick={cta} className="btn-primary inline-flex">
          <UserPlus size={14} /> {ctaLabel}
        </button>
      )}
    </div>
  )
}
