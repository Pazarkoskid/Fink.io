import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, X, Eye, Shield } from 'lucide-react'
import { moderationApi } from '../lib/api'

const REASON_LABELS = {
  wrong_answer: 'Грешен точен одговор',
  unclear: 'Нејасно прашање',
  off_topic: 'Не е поврзано со материјалот',
  offensive: 'Навредлива содржина',
  copyright: 'Авторски права',
  other: 'Друго',
}

export default function ModeratorQueue() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [actioning, setActioning] = useState(null)

  const load = () => {
    setLoading(true)
    moderationApi.queue({ status: filter })
      .then(({ data }) => {
        setReports(data.results || data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(load, [filter])

  const handleAction = async (reportId, action) => {
    setActioning(reportId)
    try {
      await moderationApi.action(reportId, { action, note: '' })
      load()
    } catch (e) {
      alert('Акцијата не успеа.')
    } finally {
      setActioning(null)
    }
  }

  return (
    <div className="container-app py-10">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-1 flex items-center gap-2">
            <Shield size={12} /> Модератор
          </p>
          <h1 className="font-display text-4xl">Редица за пријави</h1>
        </div>

        <div className="flex gap-2">
          {['open', 'reviewing', 'resolved', 'dismissed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest border-2 transition
                ${filter === s ? 'bg-ink-900 text-cream border-ink-900' : 'bg-cream border-ink-900 hover:bg-ink-50'}`}
            >
              {s === 'open' && 'Отворени'}
              {s === 'reviewing' && 'Преглед'}
              {s === 'resolved' && 'Решени'}
              {s === 'dismissed' && 'Отфрлени'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-32 shimmer" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-12">
          <Check className="mx-auto mb-3 text-accent" size={32} />
          <p className="font-display text-xl mb-1">Нема пријави во оваа категорија.</p>
          <p className="text-sm text-ink-600">Се е чисто.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle size={20} className="text-accent shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-accent text-cream border-accent">
                      {REASON_LABELS[r.reason] || r.reason}
                    </span>
                    <span className="badge">#{r.id}</span>
                  </div>
                  <Link to={`/quiz/${r.quiz}`} className="font-display text-lg hover:text-accent">
                    {r.quiz_title}
                  </Link>
                  <p className="text-xs font-mono text-ink-600 mt-1">
                    Пријавено од {r.reporter_username || 'непознат'} • {new Date(r.created_at).toLocaleString('mk-MK')}
                  </p>
                </div>
              </div>

              <p className="text-sm text-ink-700 mb-4 pl-8">
                {r.description}
              </p>

              {filter === 'open' || filter === 'reviewing' ? (
                <div className="flex flex-wrap gap-2 pl-8">
                  <Link
                    to={`/quiz/${r.quiz}`}
                    className="btn-secondary text-xs"
                  >
                    <Eye size={14} /> Прегледај квиз
                  </Link>
                  <button
                    onClick={() => handleAction(r.id, 'remove_quiz')}
                    disabled={actioning === r.id}
                    className="btn text-xs bg-accent text-cream border-accent hover:bg-ink-900 hover:border-ink-900"
                  >
                    <X size={14} /> Отстрани квиз
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'resolve')}
                    disabled={actioning === r.id}
                    className="btn-secondary text-xs"
                  >
                    <Check size={14} /> Реши
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'dismiss')}
                    disabled={actioning === r.id}
                    className="btn-ghost text-xs"
                  >
                    Отфрли
                  </button>
                </div>
              ) : (
                <p className="text-xs font-mono text-ink-600 pl-8">
                  Обработено од {r.handled_by_username || '—'}
                  {r.moderator_note && <> • {r.moderator_note}</>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
