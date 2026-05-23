import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, Send, AlertTriangle } from 'lucide-react'
import { quizzesApi } from '../lib/api'

export default function QuizPlay() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [startTime] = useState(() => Date.now())

  useEffect(() => {
    quizzesApi.play(id)
      .then(({ data }) => {
        setQuiz(data)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.response?.data?.detail || 'Квизот не може да се вчита.')
        setLoading(false)
      })
  }, [id])

  const questions = quiz?.questions || []
  const current = questions[idx]
  const total = questions.length
  const answered = useMemo(
    () => Object.keys(answers).filter(k => {
      const a = answers[k]
      return (a.choice_ids && a.choice_ids.length) || (a.text && a.text.trim())
    }).length,
    [answers]
  )
  const progress = total ? (answered / total) * 100 : 0

  const setChoice = (questionId, choiceId, type) => {
    setAnswers(prev => {
      const current = prev[questionId] || { choice_ids: [], text: '' }
      let next = [...current.choice_ids]
      if (type === 'single') {
        next = [choiceId]
      } else {
        if (next.includes(choiceId)) {
          next = next.filter(x => x !== choiceId)
        } else {
          next.push(choiceId)
        }
      }
      return { ...prev, [questionId]: { ...current, choice_ids: next } }
    })
  }

  const setText = (questionId, text) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || { choice_ids: [] }), text },
    }))
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const { data } = await quizzesApi.submit(id, answers)
      // Stash result for the result page
      sessionStorage.setItem(`fink_result_${id}`, JSON.stringify({
        ...data,
        elapsed_ms: Date.now() - startTime,
      }))
      navigate(`/quiz/${id}/result`)
    } catch (e) {
      alert('Не успеа да се испрати квизот. Обиди се повторно.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container-app py-16">
        <div className="card h-96 shimmer" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-app py-16 text-center">
        <AlertTriangle className="mx-auto mb-3 text-accent" size={32} />
        <h1 className="font-display text-2xl mb-2">Грешка</h1>
        <p className="text-fg mb-6">{error}</p>
        <Link to="/" className="btn-primary">Назад на почетна</Link>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="container-app py-16 text-center">
        <p className="font-display text-2xl">Овој квиз нема прашања.</p>
      </div>
    )
  }

  const userAnswer = answers[current.id] || { choice_ids: [], text: '' }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top progress bar */}
      <div className="sticky top-16 z-30 bg-bg border-b-2 border-border">
        <div className="container-app py-3 flex items-center gap-4">
          <p className="font-mono text-xs uppercase tracking-widest">
            Прашање {idx + 1} / {total}
          </p>
          <div className="flex-1 h-2 bg-surface border border-border">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-mono text-xs text-muted">
            <Clock size={12} className="inline mr-1" />
            {Math.floor((Date.now() - startTime) / 60000)}мин
          </p>
        </div>
      </div>

      <div className="container-app py-10 flex-1">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
            {quiz.title}
          </p>

          <div className="card mb-6 relative">
            <span className="badge absolute -top-3 left-6 bg-bg">
              {current.type === 'single' && 'Еден точен'}
              {current.type === 'multiple' && 'Повеќе точни'}
              {current.type === 'essay' && 'Есејско'}
            </span>

            <h2 className="font-display text-2xl md:text-3xl mb-8 leading-tight">
              {current.text}
            </h2>

            {current.type === 'essay' ? (
              <textarea
                value={userAnswer.text}
                onChange={(e) => setText(current.id, e.target.value)}
                placeholder="Внеси го твојот одговор тука..."
                className="input min-h-[160px] resize-y"
              />
            ) : (
              <div className="space-y-3">
                {current.choices.map((c, i) => {
                  const selected = userAnswer.choice_ids.includes(c.id)
                  const letter = String.fromCharCode(1040 + i) // А, Б, В, Г, Д (Cyrillic)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChoice(current.id, c.id, current.type)}
                      className={`w-full text-left flex items-start gap-4 p-4 border-2 transition-all
                        ${selected
                          ? 'border-accent bg-accent/10 text-fg'
                          : 'border-border bg-bg hover:bg-surface'}`}
                    >
                      <span className={`shrink-0 w-8 h-8 border-2 flex items-center justify-center font-mono text-sm
                        ${selected ? 'border-accent bg-accent text-white' : 'border-border'}`}>
                        {letter}
                      </span>
                      <span className="flex-1 pt-1">{c.text}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setIdx(Math.max(0, idx - 1))}
              disabled={idx === 0}
              className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} /> Претходно
            </button>

            <div className="flex flex-wrap gap-1.5 max-w-md justify-center">
              {questions.map((q, i) => {
                const isAnswered = answers[q.id]
                  && ((answers[q.id].choice_ids && answers[q.id].choice_ids.length)
                      || (answers[q.id].text && answers[q.id].text.trim()))
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setIdx(i)}
                    className={`w-8 h-8 border-2 font-mono text-xs
                      ${i === idx ? 'border-accent bg-accent text-white'
                        : isAnswered ? 'border-border bg-accent text-white'
                        : 'border-border bg-bg'}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>

            {idx < total - 1 ? (
              <button
                type="button"
                onClick={() => setIdx(idx + 1)}
                className="btn-primary"
              >
                Следно <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="btn-accent disabled:opacity-50"
              >
                {submitting ? 'Се испраќа...' : <>Заврши <Send size={16} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
