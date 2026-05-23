import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Play, Heart, Flag, Share2, Clock, BookOpen, Edit, ArrowLeft, X, Bookmark } from 'lucide-react'
import { quizzesApi, moderationApi } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    quizzesApi.detail(id).then((r) => {
      setQuiz(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const toggleLike = async () => {
    if (!user) { navigate('/login'); return }
    const { data } = await quizzesApi.toggleLike(id)
    setQuiz({ ...quiz, liked: data.liked, likes_count: data.likes_count })
  }

  const toggleSave = async () => {
    if (!user) { navigate('/login'); return }
    const { data } = await quizzesApi.toggleSave(id)
    setQuiz({ ...quiz, saved: data.saved })
  }

  const share = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: quiz.title, url })
    } else {
      navigator.clipboard.writeText(url)
      alert('Линкот е копиран!')
    }
  }

  if (loading) return <div className="container-app py-20 text-center font-mono">Се вчитува…</div>
  if (!quiz) return <div className="container-app py-20 text-center font-display text-2xl">Квизот не е пронајден.</div>

  const isAuthor = user && quiz.author === user.id
  const difficulty = ['', 'Лесно', 'Средно', 'Тешко'][quiz.difficulty] || 'Средно'

  return (
    <div className="container-app py-10 max-w-5xl">
      <Link to="/search" className="inline-flex items-center gap-1 text-sm hover:text-accent mb-4">
        <ArrowLeft size={14} /> Назад на сите квизови
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Main */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {quiz.subject_name && (
              <span className="badge bg-accent text-white">{quiz.subject_name}</span>
            )}
            {quiz.ai_generated && (
              <span className="badge bg-accent text-white">AI генериран</span>
            )}
            {quiz.tags?.slice(0, 5).map((t) => (
              <span key={t} className="badge">{t}</span>
            ))}
          </div>

          <h1 className="font-display text-4xl md:text-5xl mb-3 leading-tight">{quiz.title}</h1>

          {quiz.description && (
            <p className="text-lg text-fg mb-6 leading-relaxed">{quiz.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm font-mono uppercase tracking-wider text-muted mb-8 pb-6 border-b-2 border-border">
            <span>од <Link to={`/users/${quiz.author}`} className="text-fg font-medium normal-case">{quiz.author_username}</Link></span>
            <span className="flex items-center gap-1"><BookOpen size={14} /> {quiz.questions_count} прашања</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {quiz.estimated_minutes} мин</span>
            <span>{difficulty}</span>
          </div>

          {/* Preview questions */}
          <h2 className="font-display text-2xl mb-4">Преглед на квизот</h2>
          {quiz.questions?.length > 0 ? (
            <div className="space-y-3">
              {quiz.questions.slice(0, 3).map((q, i) => (
                <div key={q.id || i} className="card">
                  <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
                    Прашање {i + 1}
                  </p>
                  <p className="font-medium mb-3">{q.text}</p>
                  {q.choices?.length > 0 && (
                    <ul className="space-y-1.5 text-sm text-fg">
                      {q.choices.map((c, j) => (
                        <li key={j} className="flex items-center gap-2">
                          <span className="w-5 h-5 border border-ink-300 inline-flex items-center justify-center text-xs">
                            {String.fromCharCode(0x0410 + j)}
                          </span>
                          {c.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {quiz.questions.length > 3 && (
                <p className="text-center text-sm font-mono text-muted py-3">
                  + уште {quiz.questions.length - 3} прашања
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Квизот сè уште нема прашања.</p>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="card-dark text-white sticky top-20">
            <p className="font-mono text-xs uppercase tracking-widest text-accent mb-2">
              Започни сега
            </p>
            <div className="flex items-end gap-2 mb-4">
              <span className="font-display text-5xl leading-none">{quiz.questions_count}</span>
              <span className="font-mono text-xs uppercase mb-2">прашања</span>
            </div>
            <Link to={`/quiz/${id}/play`} className="btn-accent w-full mb-3">
              <Play size={16} /> Започни квиз
            </Link>

            <div className="grid grid-cols-4 gap-1 text-xs">
              <button onClick={toggleLike} className="flex flex-col items-center gap-1 py-2 hover:bg-ink-800">
                <Heart size={18} className={quiz.liked ? 'fill-accent text-accent' : ''} />
                <span>{quiz.likes_count}</span>
              </button>
              <button onClick={toggleSave} className="flex flex-col items-center gap-1 py-2 hover:bg-ink-800">
                <Bookmark size={18} className={quiz.saved ? 'fill-accent text-accent' : ''} />
                <span>{quiz.saved ? 'Зачуван' : 'Зачувај'}</span>
              </button>
              <button onClick={share} className="flex flex-col items-center gap-1 py-2 hover:bg-ink-800">
                <Share2 size={18} />
                <span>Сподели</span>
              </button>
              <button onClick={() => setReportOpen(true)} className="flex flex-col items-center gap-1 py-2 hover:bg-ink-800">
                <Flag size={18} />
                <span>Пријави</span>
              </button>
            </div>

            {isAuthor && (
              <Link to={`/quiz/${id}/edit`} className="btn-secondary w-full mt-3">
                <Edit size={14} /> Уреди
              </Link>
            )}
          </div>

          <div className="card text-xs font-mono">
            <p className="uppercase tracking-widest text-muted mb-2">Информации</p>
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt>Создаден:</dt><dd>{new Date(quiz.created_at).toLocaleDateString('mk-MK')}</dd></div>
              {quiz.published_at && (
                <div className="flex justify-between"><dt>Објавен:</dt><dd>{new Date(quiz.published_at).toLocaleDateString('mk-MK')}</dd></div>
              )}
              <div className="flex justify-between"><dt>Играни:</dt><dd>{quiz.plays_count}×</dd></div>
            </dl>
          </div>
        </aside>
      </div>

      {reportOpen && (
        <ReportModal quizId={quiz.id} onClose={() => setReportOpen(false)} />
      )}
    </div>
  )
}

function ReportModal({ quizId, onClose }) {
  const [reason, setReason] = useState('wrong_answer')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const user = useAuth((s) => s.user)
  const navigate = useNavigate()

  const submit = async () => {
    if (!user) { navigate('/login'); return }
    setSubmitting(true)
    try {
      await moderationApi.fileReport({ quiz: quizId, reason, description })
      setDone(true)
    } catch (e) {
      alert('Пријавата не успеа.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-fg/60 z-50 flex items-center justify-center p-4">
      <div className="bg-bg border-2 border-border max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl">Пријави квиз</h3>
          <button onClick={onClose} className="p-1 hover:text-accent"><X size={18} /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <p className="font-display text-xl mb-2">Пријавата е примена.</p>
            <p className="text-sm text-muted mb-4">Модераторите ќе ја разгледаат.</p>
            <button onClick={onClose} className="btn-primary">Затвори</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Тип проблем</label>
              <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="wrong_answer">Грешен точен одговор</option>
                <option value="unclear">Нејасно прашање</option>
                <option value="off_topic">Не е поврзано со материјалот</option>
                <option value="offensive">Навредлива содржина</option>
                <option value="copyright">Прекршување авторски права</option>
                <option value="other">Друго</option>
              </select>
            </div>
            <div>
              <label className="label">Опис</label>
              <textarea
                className="input min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опиши го проблемот накратко…"
                required
              />
            </div>
            <button onClick={submit} disabled={submitting || !description} className="btn-accent w-full">
              {submitting ? 'Се испраќа…' : 'Испрати пријава'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
