/**
 * Chat WebSocket hook with reconnect + presence support.
 *
 * Callbacks:
 *   - onMessage: new incoming message from someone else
 *   - onMessageConfirmed: server confirms my sent message (returns real id + temp_id)
 *   - onTyping: typing indicator
 *   - onPresence: friend went online/offline
 *   - onConnected: initial connected event (includes online_friends list)
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { tokenStore } from './api'

function getWsBase() {
  if (typeof window === 'undefined') return ''
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  const base = apiUrl.replace(/\/api\/?$/, '')
  return base.replace(/^http/, 'ws')
}

export function useChatSocket(callbacks = {}) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const shouldReconnectRef = useRef(true)
  const callbacksRef = useRef(callbacks)

  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  const connect = useCallback(() => {
    const token = tokenStore.getAccess()
    if (!token) return

    const wsBase = getWsBase()
    const url = `${wsBase}/ws/chat/?token=${encodeURIComponent(token)}`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          switch (data.type) {
            case 'connected':
              callbacksRef.current.onConnected?.(data)
              break
            case 'message':
              callbacksRef.current.onMessage?.(data.message)
              break
            case 'message_confirmed':
              callbacksRef.current.onMessageConfirmed?.(data.message)
              break
            case 'typing':
              callbacksRef.current.onTyping?.(data)
              break
            case 'presence':
              callbacksRef.current.onPresence?.(data)
              break
            case 'error':
              console.warn('Chat error:', data.message)
              break
          }
        } catch (err) {
          console.warn('WS parse error', err)
        }
      }

      ws.onclose = (e) => {
        setConnected(false)
        wsRef.current = null

        if (shouldReconnectRef.current && e.code !== 4001) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000,
          )
          reconnectAttemptsRef.current += 1
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => {}
    } catch (err) {
      console.error('WS connection failed', err)
    }
  }, [])

  useEffect(() => {
    shouldReconnectRef.current = true
    connect()
    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  return { connected, send }
}
