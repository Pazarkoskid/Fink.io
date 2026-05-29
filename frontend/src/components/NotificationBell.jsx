import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, Check, X, UserPlus, UserCheck, Heart, Bookmark, Inbox,
} from 'lucide-react'
import { notificationsApi } from '../lib/api'
import { useAuth } from '../lib/auth'

const TYPE_ICONS = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  quiz_saved: Bookmark,
  quiz_liked: Heart,
  material_saved: Bookmark,
  material_liked: Heart,
}

export default function NotificationBell() {
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  // Close on outside click/tap
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handler)
      document.addEventListener('touchstart', handler)
    }
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  // Poll count every 30s + listen for custom refresh events
  useEffect(() => {
    if (!user) {
      setCount(0)
      setItems([])
      return
    }
    let cancelled = false
    const fetchCount = async () => {
      try {
        const { data } = await notificationsApi.count()
        if (!cancelled) setCount(data.count)
      } catch (e) {}
    }
    fetchCount()
    const id = setInterval(fetchCount, 30000)
    const onChange = () => fetchCount()
    window.addEventListener('finkio:notifications-changed', onChange)
    return () => {
      cancelled = true
      clearInterval(id)
      window.removeEventListener('finkio:notifications-changed', onChange)
    }
  }, [user])

  // Load list when opening
  const toggleOpen = async () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    setLoading(true)
    try {
      const { data } = await notificationsApi.list()
      setItems(data.results || data || [])
    } catch (e) {}
    setLoading(false)
  }

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id)
      setItems(items.map(it => it.id === id ? { ...it, is_read: true } : it))
      setCount(Math.max(0, count - 1))
    } catch (e) {}
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setItems(items.map(it => ({ ...it, is_read: true })))
      setCount(0)
    } catch (e) {}
  }

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="p-2 rounded-xl hover:bg-fg/5 transition-colors relative"
        aria-label="Нотификации"
        title="Нотификации"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-accent text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center border-2 border-bg">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop (closes on tap) */}
          <div
            className="fixed inset-0 z-40 sm:hidden bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 rounded-2xl border border-border shadow-medium overflow-hidden animate-fade-in z-50"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              boxShadow: '0 12px 40px -8px rgb(var(--shadow) / 0.35)',
            }}
          >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="font-display text-lg">Нотификации</p>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-mono uppercase tracking-widest text-accent hover:underline"
              >
                Прочитај ги сите
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted text-sm">
                Се вчитува…
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox size={32} className="mx-auto mb-2 text-subtle" />
                <p className="text-sm text-muted">Нема нотификации.</p>
              </div>
            ) : (
              <ul>
                {items.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={() => markRead(n.id)}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </ul>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  )
}

function NotificationItem({ notification: n, onMarkRead, onClose }) {
  const Icon = TYPE_ICONS[n.type] || Bell

  const handleClick = () => {
    if (!n.is_read) onMarkRead()
    onClose()
  }

  const content = (
    <div className={`px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-fg/5 flex items-start gap-3
      ${!n.is_read ? 'bg-accent/5' : ''}`}>
      {/* Actor avatar OR icon */}
      <div className="shrink-0">
        {n.actor_avatar ? (
          <img src={n.actor_avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
        ) : n.actor_username ? (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold">
            {n.actor_username[0]?.toUpperCase()}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-fg/10 flex items-center justify-center">
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">{n.message}</p>
        <p className="text-[10px] font-mono text-subtle mt-1">
          <Icon size={9} className="inline mr-1" />
          {new Date(n.created_at).toLocaleString('mk-MK')}
        </p>
      </div>

      {!n.is_read && (
        <span className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
      )}
    </div>
  )

  if (n.url) {
    return (
      <li>
        <Link to={n.url} onClick={handleClick} className="block">
          {content}
        </Link>
      </li>
    )
  }
  return <li onClick={handleClick}>{content}</li>
}
