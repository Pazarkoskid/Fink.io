import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Send, Loader2, ArrowLeft, MessageSquare, Circle,
} from 'lucide-react'
import { chatApi } from '../lib/api'
import { useChatSocket } from '../lib/chatSocket'
import { useAuth } from '../lib/auth'

export default function Messages() {
  const me = useAuth((s) => s.user)
  const [searchParams] = useSearchParams()
  const startWithUserId = searchParams.get('with')

  const [conversations, setConversations] = useState([])
  const [selectedConvId, setSelectedConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [typingFrom, setTypingFrom] = useState(null)
  const [onlineFriends, setOnlineFriends] = useState(new Set())

  const typingTimerRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Keep refs in sync so callbacks see latest values
  const selectedConvIdRef = useRef(selectedConvId)
  useEffect(() => { selectedConvIdRef.current = selectedConvId }, [selectedConvId])

  const refreshConversations = useCallback(async () => {
    try {
      const { data } = await chatApi.conversations()
      setConversations(data || [])
    } catch (e) {}
    setLoadingConvs(false)
  }, [])

  // Initial load
  useEffect(() => {
    refreshConversations()
    chatApi.onlineFriends().then(({ data }) => {
      setOnlineFriends(new Set(data.online || []))
    }).catch(() => {})
  }, [refreshConversations])

  // Auto-start chat from ?with=
  useEffect(() => {
    if (!startWithUserId) return
    chatApi.startConversation(parseInt(startWithUserId))
      .then(({ data }) => {
        setSelectedConvId(data.id)
        refreshConversations()
      })
      .catch((e) => {
        if (e.response?.status === 403) {
          alert('Може да испратиш порака само на пријател.')
        }
      })
  }, [startWithUserId, refreshConversations])

  // === WebSocket callbacks ===

  const onConnected = useCallback((data) => {
    if (data.online_friends) {
      setOnlineFriends(new Set(data.online_friends))
    }
  }, [])

  const onPresence = useCallback((data) => {
    setOnlineFriends((prev) => {
      const next = new Set(prev)
      if (data.online) next.add(data.user_id)
      else next.delete(data.user_id)
      return next
    })
  }, [])

  // Incoming from someone else → add to UI if conversation open
  const onMessage = useCallback((msg) => {
    if (selectedConvIdRef.current === msg.conversation) {
      setMessages((prev) => [...prev, msg])
      chatApi.markRead(msg.conversation).catch(() => {})
    }
    refreshConversations()
    window.dispatchEvent(new CustomEvent('finkio:chat-changed'))
  }, [refreshConversations])

  // My own message confirmed by server → replace optimistic with real
  const onMessageConfirmed = useCallback((msg) => {
    setMessages((prev) => {
      // If we have a temp message with matching temp_id, replace it
      if (msg.temp_id) {
        const idx = prev.findIndex((m) => m.temp_id === msg.temp_id)
        if (idx !== -1) {
          const next = [...prev]
          next[idx] = msg
          return next
        }
      }
      // Otherwise (e.g. sent from another tab), append if not already there
      if (prev.some((m) => m.id === msg.id)) return prev
      if (selectedConvIdRef.current !== msg.conversation) return prev
      return [...prev, msg]
    })
    refreshConversations()
  }, [refreshConversations])

  const onTyping = useCallback((data) => {
    if (selectedConvIdRef.current !== data.conversation_id) return
    setTypingFrom(data.user_id)
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => setTypingFrom(null), 3000)
  }, [])

  const { connected, send: wsSend } = useChatSocket({
    onConnected,
    onMessage,
    onMessageConfirmed,
    onTyping,
    onPresence,
  })

  // Load messages when switching conversation
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    chatApi.messages(selectedConvId)
      .then(({ data }) => {
        setMessages(data || [])
        setLoadingMessages(false)
        chatApi.markRead(selectedConvId).catch(() => {})
        refreshConversations()
        window.dispatchEvent(new CustomEvent('finkio:chat-changed'))
      })
      .catch(() => setLoadingMessages(false))
  }, [selectedConvId, refreshConversations])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingFrom])

  const selectedConv = conversations.find((c) => c.id === selectedConvId)
  const otherIsOnline =
    selectedConv?.other_user && onlineFriends.has(selectedConv.other_user.id)

  const handleSend = () => {
    const text = draft.trim()
    if (!text || !selectedConvId) return

    // Optimistic UI: add a temp message immediately
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const optimistic = {
      id: tempId,
      temp_id: tempId,
      conversation: selectedConvId,
      body: text,
      sender: me.id,
      sender_username: me.username,
      sender_avatar: me.avatar,
      created_at: new Date().toISOString(),
      pending: true,
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft('')

    const sent = wsSend({
      type: 'send_message',
      conversation_id: selectedConvId,
      body: text,
      temp_id: tempId,
    })
    if (!sent) {
      // mark as failed
      setMessages((prev) =>
        prev.map((m) => (m.temp_id === tempId ? { ...m, failed: true, pending: false } : m))
      )
      alert('Конекцијата е прекината. Обиди се повторно.')
    }
  }

  const handleTyping = (e) => {
    setDraft(e.target.value)
    if (selectedConvId) {
      wsSend({ type: 'typing', conversation_id: selectedConvId })
    }
  }

  return (
    <div className="container-app py-6">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Чат
          </p>
          <h1 className="font-display text-3xl">Пораки</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted">
          <Circle
            size={8}
            className={connected ? 'fill-green-500 text-green-500' : 'fill-accent text-accent'}
          />
          {connected ? 'Поврзан' : 'Се поврзува…'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[500px]">
        {/* Sidebar */}
        <aside className={`card !p-0 overflow-y-auto ${selectedConvId ? 'hidden md:block' : ''}`}>
          {loadingConvs ? (
            <div className="p-8 text-center text-sm text-muted">
              <Loader2 size={18} className="animate-spin mx-auto mb-2" />
              Се вчитува…
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare size={32} className="mx-auto mb-3 text-subtle" />
              <p className="font-display text-lg mb-2">Сè уште нема разговори.</p>
              <p className="text-xs text-muted mb-4">
                Оди на профил на пријател и кликни „Порака".
              </p>
              <Link to="/friends" className="btn-primary inline-flex !py-1.5 !px-3 text-xs">
                Кон пријатели
              </Link>
            </div>
          ) : (
            <ul>
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  active={selectedConvId === conv.id}
                  online={conv.other_user && onlineFriends.has(conv.other_user.id)}
                  onClick={() => setSelectedConvId(conv.id)}
                />
              ))}
            </ul>
          )}
        </aside>

        {/* Main chat */}
        <div className={`card !p-0 flex flex-col overflow-hidden ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
          {!selectedConvId ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare size={40} className="mx-auto mb-3 text-subtle" />
                <p className="font-display text-lg mb-1">Избери разговор</p>
                <p className="text-sm text-muted">
                  Од листата лево, или почни нов од профил на пријател.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <button
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden text-muted hover:text-fg"
                >
                  <ArrowLeft size={18} />
                </button>
                {selectedConv?.other_user && (
                  <Link
                    to={`/users/${selectedConv.other_user.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                  >
                    <div className="relative">
                      <Avatar user={selectedConv.other_user} size={40} />
                      {otherIsOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-bg" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate flex items-center gap-2">
                        {selectedConv.other_user.username}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {otherIsOnline ? (
                          <span className="text-green-600 dark:text-green-400">● Онлајн</span>
                        ) : selectedConv.other_user.status_label ? (
                          <>
                            {selectedConv.other_user.status_emoji}{' '}
                            {selectedConv.other_user.status_label}
                          </>
                        ) : (
                          'Офлајн'
                        )}
                      </p>
                    </div>
                  </Link>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingMessages ? (
                  <div className="text-center py-8 text-sm text-muted">
                    <Loader2 size={18} className="animate-spin mx-auto" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-muted py-8">
                    Сè уште нема пораки. Биди прв 👋
                  </p>
                ) : (
                  messages.map((m, i) => {
                    const isMe = m.sender === me?.id
                    const prev = messages[i - 1]
                    const showAvatar = !isMe && (!prev || prev.sender !== m.sender)
                    return (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        isMe={isMe}
                        showAvatar={showAvatar}
                      />
                    )
                  })
                )}
                {typingFrom && (
                  <div className="flex items-center gap-2 text-xs text-muted italic px-2">
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse"></span>
                      <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                    </span>
                    {selectedConv?.other_user?.username} пишува…
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose */}
              <div className="border-t border-border p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={handleTyping}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Напиши порака…"
                  className="input !py-2 flex-1"
                  maxLength={4000}
                  disabled={!connected}
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || !connected}
                  className="btn-primary !py-2 !px-3 shrink-0"
                  title="Испрати"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ConversationItem({ conv, active, online, onClick }) {
  if (!conv.other_user) return null
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 border-b border-border transition-colors flex items-center gap-3
          ${active ? 'bg-accent/10' : 'hover:bg-fg/5'}`}
      >
        <div className="relative">
          <Avatar user={conv.other_user} size={44} />
          {online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-bg" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className={`font-medium truncate ${active ? 'text-accent' : ''}`}>
              {conv.other_user.username}
            </p>
            {conv.last_message_at && (
              <p className="text-[10px] font-mono text-subtle shrink-0">
                {formatRelative(conv.last_message_at)}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted truncate">
              {conv.last_message_preview || 'Без пораки'}
            </p>
            {conv.unread_count > 0 && (
              <span className="bg-accent text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0">
                {conv.unread_count}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  )
}

function MessageBubble({ message, isMe, showAvatar }) {
  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 shrink-0 ${!showAvatar && !isMe ? 'invisible' : ''}`}>
        {!isMe && showAvatar && (
          <Avatar
            user={{ avatar: message.sender_avatar, username: message.sender_username }}
            size={32}
          />
        )}
      </div>
      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words
            ${isMe
              ? `bg-gradient-to-br from-accent to-accent-dark text-white rounded-br-md
                 ${message.pending ? 'opacity-70' : ''}
                 ${message.failed ? 'opacity-60 grayscale' : ''}`
              : 'bg-fg/5 text-fg rounded-bl-md'}`}
        >
          {message.body}
        </div>
        <p className="text-[10px] font-mono text-subtle mt-0.5 px-2">
          {message.failed
            ? 'Неуспешно'
            : message.pending
            ? 'Се испраќа…'
            : new Date(message.created_at).toLocaleTimeString('mk-MK', {
                hour: '2-digit',
                minute: '2-digit',
              })}
        </p>
      </div>
    </div>
  )
}

function Avatar({ user, size = 40 }) {
  return (
    <div
      className="rounded-xl overflow-hidden bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{user?.username?.[0]?.toUpperCase() || '?'}</span>
      )}
    </div>
  )
}

function formatRelative(dateStr) {
  const d = new Date(dateStr)
  const now = Date.now()
  const diffMin = Math.round((now - d.getTime()) / 60000)
  if (diffMin < 1) return 'сега'
  if (diffMin < 60) return `${diffMin}м`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}ч`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}д`
  return d.toLocaleDateString('mk-MK', { month: 'short', day: 'numeric' })
}
