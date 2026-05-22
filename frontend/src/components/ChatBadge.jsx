import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { chatApi } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function ChatBadge() {
  const user = useAuth((s) => s.user)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setCount(0)
      return
    }
    let cancelled = false
    const fetchCount = async () => {
      try {
        const { data } = await chatApi.unreadCount()
        if (!cancelled) setCount(data.count)
      } catch (e) {}
    }
    fetchCount()
    const id = setInterval(fetchCount, 30000)
    const onChange = () => fetchCount()
    window.addEventListener('finkio:chat-changed', onChange)
    return () => {
      cancelled = true
      clearInterval(id)
      window.removeEventListener('finkio:chat-changed', onChange)
    }
  }, [user])

  if (!user) return null

  return (
    <Link
      to="/messages"
      className="p-2 rounded-xl hover:bg-fg/5 transition-colors relative"
      title="Пораки"
      aria-label="Пораки"
    >
      <MessageSquare size={18} />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 bg-accent text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center border-2 border-bg">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
