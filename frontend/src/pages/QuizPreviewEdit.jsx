import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus, Trash2, Save, Send, ArrowLeft, Loader2, Eye, BarChart3 } from 'lucide-react'
import { quizzesApi } from '../lib/api'

export default function QuizPreviewEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(new Set())
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await quizzesApi.detail(id)
      setQuiz(data)
      // expand first question by default
      if (data.questions?.length) setExpanded(new Set([0]))
    } catch (e) {
      setError('Не може да се вчита квизот.')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (i) => {
    const next = new Set(expanded)
    next.has(i) ? next.delete(i) : next.add(i)
    setExpanded(next)
  }

  const updateField = (field, value) => {
    setQuiz({ ...quiz, [field]: value })
  }

  const updateQuestion = (idx, field, value) => {
    const qs = [...quiz.questions]
    qs[idx] = { ...qs[idx], [field]: value }
    setQuiz({ ...quiz, questions: qs })
  }

  const updateChoice = (qIdx, cIdx, field, value) => {
    const qs = [...quiz.questions]
    const choices = [...(qs[qIdx].choices || [])]
    choices[cIdx] = { ...choices[cIdx], [field]: value }
    // single-answer: only one correct
    if (field === 'is_correct' && value && qs[qIdx].type === 'single') {
      choices.forEach((c, i) => {
        if (i !== cIdx) c.is_correct = false
      })
    }
    qs[qIdx] = { ...qs[qIdx], choices }
    setQuiz({ ...quiz, questions: qs })
  }

  const addChoice = (qIdx) => {
    const qs = [...quiz.questions]
    qs[qIdx] = {
      ...qs[qIdx],
      choices: [...(qs[qIdx].choices || []), { text: '', is_correct: false }],
    }
    setQuiz({ ...quiz, questions: qs })
  }

  const removeChoice = (qIdx, cIdx) => {
    const qs = [...quiz.questions]
    qs[qIdx] = {
      ...qs[qIdx],
      choices: qs[qIdx].choices.filter((_, i) => i !== cIdx),
    }
    setQuiz({ ...quiz, questions: qs })
  }

  const removeQuestion = (idx) => {
    if (!confirm('Избриши го ова прашање?')) return
    setQuiz({
      ...quiz,
      questions: quiz.questions.filter((_, i) => i !== idx),
    })
  }

  const addQuestion = () => {
    setQuiz({
      ...quiz,
      questions: [
        ...quiz.questions,
        {
          text: 'Ново прашање',
          type: 'single',
          explanation: '',
          difficulty: 2,
          choices: [
            { text: 'Опција A', is_correct: true },
            { text: 'Опција Б', is_correct: false },
          ],
        },
      ],
    })
    setExpanded(new Set([...expanded, quiz.questions.length]))
  }

  const buildPayload = (q) => ({
    title: q.title,
    description: q.description,
    subject: q.subject,
    difficulty: q.difficulty,
    tags: q.tags,
    estimated_minutes: q.estimated_minutes,
    visibility: q.visibility,
    questions: q.questions.map((qq, i) => ({
      text: qq.text,
      type: qq.type,
      explanation: qq.explanation || '',
      difficulty: qq.difficulty || 2,
      order: i,
      choices: (qq.choices || []).map((c, j) => ({
        text: c.text,
        is_correct: !!c.is_correct,
        order: j,
      })),
    })),
  })

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const { data } = await quizzesApi.update(id, buildPayload(quiz))
      setQuiz(data)
    } catch (e) {
      setError('Зачувувањето не успеа.')
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    setVisibilityModalOpen(true)
  }

  const confirmPublish = async (visibility) => {
    setVisibilityModalOpen(false)
    setPublishing(true)
    setError('')
    try {
      const payload = buildPayload(quiz)
      payload.visibility = visibility
      await quizzesApi.update(id, payload)
      await quizzesApi.publish(id)
      navigate(`/quiz/${id}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Објавувањето не успеа.')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return <div className="container-app py-20 text-center font-mono uppercase text-sm">Се вчитува…</div>
  }
  if (!quiz) return null

  return (
    <div className="container-app py-10 max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm hover:text-accent mb-4 bg-transparent border-0 cursor-pointer"
      >
        <ArrowLeft size={14} /> Назад
      </button>

      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-600">
          Уредување · {quiz.status === 'draft' ? 'Нацрт' : 'Објавен'}
        </p>
        {quiz.ai_generated && (
          <span className="badge bg-accent text-cream">AI генериран</span>
        )}
      </div>

      <input
        className="w-full font-display text-4xl bg-transparent border-0 border-b-2 border-ink-200 focus:border-accent focus:outline-none py-2 mb-3"
        value={quiz.title}
        onChange={(e) => updateField('title', e.target.value)}
      />

      <textarea
        className="w-full bg-transparent border-0 focus:outline-none py-1 mb-6 text-ink-700 resize-none"
        value={quiz.description || ''}
        onChange={(e) => updateField('description', e.target.value)}
        placeholder="Краток опис на квизот…"
        rows={2}
      />

      {/* Summary bar */}
      <div className="card flex flex-wrap gap-4 mb-6 text-xs font-mono uppercase tracking-wider">
        <span><strong>{quiz.questions.length}</strong> прашања</span>
        <span><strong>{quiz.estimated_minutes}</strong> мин</span>
        <span>Тежина: <strong>{['', 'Лесно', 'Средно', 'Тешко'][quiz.difficulty]}</strong></span>
        <span>Видливост: <strong>{quiz.visibility}</strong></span>
      </div>

      {/* Questions */}
      <div className="space-y-3 mb-6">
        {quiz.questions.map((q, qIdx) => (
          <div key={qIdx} className="card !p-0 overflow-hidden">
            <button
              onClick={() => toggleExpand(qIdx)}
              className="w-full flex items-center justify-between gap-3 p-4 hover:bg-ink-100 text-left"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="font-mono text-xs text-ink-600 mt-1">
                  Q{String(qIdx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{q.text}</p>
                  <p className="text-xs font-mono text-ink-600 mt-0.5 uppercase tracking-wider">
                    {q.type === 'single' ? 'Еден точен' : q.type === 'multiple' ? 'Повеќе точни' : 'Есејско'}
                    {q.choices?.length > 0 && ` · ${q.choices.length} опции`}
                  </p>
                </div>
              </div>
              {expanded.has(qIdx) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expanded.has(qIdx) && (
              <div className="p-4 pt-0 border-t-2 border-ink-200 space-y-4">
                <div>
                  <label className="label">Текст на прашањето</label>
                  <textarea
                    className="input"
                    value={q.text}
                    onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Тип</label>
                    <select
                      className="input"
                      value={q.type}
                      onChange={(e) => updateQuestion(qIdx, 'type', e.target.value)}
                    >
                      <option value="single">Еден точен</option>
                      <option value="multiple">Повеќе точни</option>
                      <option value="essay">Есејско</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Тежина</label>
                    <select
                      className="input"
                      value={q.difficulty || 2}
                      onChange={(e) => updateQuestion(qIdx, 'difficulty', parseInt(e.target.value))}
                    >
                      <option value="1">Лесно</option>
                      <option value="2">Средно</option>
                      <option value="3">Тешко</option>
                    </select>
                  </div>
                </div>

                {q.type !== 'essay' && (
                  <div>
                    <label className="label">Опции (означи ги точните)</label>
                    <div className="space-y-2">
                      {(q.choices || []).map((c, cIdx) => (
                        <div key={cIdx} className="flex items-start gap-2">
                          <button
                            onClick={() => updateChoice(qIdx, cIdx, 'is_correct', !c.is_correct)}
                            className={`mt-0.5 w-6 h-6 shrink-0 border-2 border-ink-900 flex items-center justify-center ${
                              c.is_correct ? 'bg-accent text-cream' : 'bg-cream'
                            }`}
                          >
                            {c.is_correct && '✓'}
                          </button>
                          <input
                            className="input"
                            value={c.text}
                            onChange={(e) => updateChoice(qIdx, cIdx, 'text', e.target.value)}
                            placeholder={`Опција ${String.fromCharCode(0x0410 + cIdx)}`}
                          />
                          <button
                            onClick={() => removeChoice(qIdx, cIdx)}
                            className="p-2 hover:text-accent"
                            title="Избриши опција"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addChoice(qIdx)} className="btn-ghost text-sm">
                        <Plus size={14} /> Додај опција
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Објаснување (зошто е точен одговорот)</label>
                  <textarea
                    className="input min-h-[60px]"
                    value={q.explanation || ''}
                    onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                    placeholder="Кратко објаснување за повратна информација…"
                  />
                </div>

                <button
                  onClick={() => removeQuestion(qIdx)}
                  className="text-sm text-ink-600 hover:text-accent flex items-center gap-1"
                >
                  <Trash2 size={14} /> Избриши прашање
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addQuestion} className="btn-secondary w-full mb-6">
        <Plus size={16} /> Додај прашање
      </button>

      {error && (
        <div className="bg-accent/10 border-2 border-accent px-4 py-2 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-cream/95 backdrop-blur-sm border-2 border-ink-900 p-3">
        <button onClick={save} disabled={saving} className="btn-secondary flex-1">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Зачувај нацрт
        </button>
        <Link to={`/quiz/${id}`} className="btn-secondary flex-1 justify-center">
          <Eye size={16} /> Преглед
        </Link>
        {quiz?.status === 'published' && (
          <Link to={`/quiz/${id}/analytics`} className="btn-secondary flex-1 justify-center">
            <BarChart3 size={16} /> Статистика
          </Link>
        )}
        <button onClick={publish} disabled={publishing} className="btn-accent flex-1">
          {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Објави
        </button>
      </div>

      {visibilityModalOpen && (
        <VisibilityModal
          current={quiz.visibility || 'public'}
          onConfirm={confirmPublish}
          onClose={() => setVisibilityModalOpen(false)}
        />
      )}
    </div>
  )
}

function VisibilityModal({ current, onConfirm, onClose }) {
  const [choice, setChoice] = useState(current)

  const options = [
    {
      key: 'public',
      label: 'Јавно',
      icon: '🌐',
      desc: 'Сите можат да го најдат и играат. Се појавува во пребарувањето и ранг листата.',
    },
    {
      key: 'unlisted',
      label: 'Само со линк',
      icon: '🔗',
      desc: 'Видлив само за оние со директен линк. Не се појавува во пребарувањето.',
    },
    {
      key: 'private',
      label: 'Приватно',
      icon: '🔒',
      desc: 'Само ти можеш да го видиш. Корисно за тестирање пред објавување.',
    },
  ]

  return (
    <div className="fixed inset-0 bg-ink-900/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-cream border-2 border-ink-900 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-2">
          Објавување
        </p>
        <h2 className="font-display text-2xl mb-1">Кој може да го види?</h2>
        <p className="text-sm text-ink-600 mb-5">
          Можеш да ја смениш видливоста и подоцна од уредувачот.
        </p>

        <div className="space-y-2 mb-5">
          {options.map(o => (
            <button
              key={o.key}
              type="button"
              onClick={() => setChoice(o.key)}
              className={`w-full text-left p-4 border-2 transition-colors flex items-start gap-3
                ${choice === o.key
                  ? 'border-accent bg-accent/10'
                  : 'border-ink-900 hover:bg-ink-50'}`}
            >
              <span className="text-2xl shrink-0">{o.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg">{o.label}</p>
                <p className="text-xs text-ink-700 mt-1">{o.desc}</p>
              </div>
              <div className={`shrink-0 w-5 h-5 border-2 rounded-full mt-1 ${choice === o.key ? 'border-accent bg-accent' : 'border-ink-900'}`} />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Откажи</button>
          <button onClick={() => onConfirm(choice)} className="btn-accent flex-1">
            <Send size={14} /> Објави
          </button>
        </div>
      </div>
    </div>
  )
}
