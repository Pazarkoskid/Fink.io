import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Check, X, HelpCircle, Trophy, RotateCcw, Home } from 'lucide-react'

export default function QuizResult() {
  const { id } = useParams()
  const [result, setResult] = useState(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(`fink_result_${id}`)
    if (raw) {
      try { setResult(JSON.parse(raw)) } catch {}
    }
  }, [id])

  if (!result) {
    return (
      <div className="container-app py-16 text-center">
        <p className="font-display text-2xl mb-4">Нема резултат за прикажување.</p>
        <Link to="/" className="btn-primary">
          <Home size={16} /> Назад на почетна
        </Link>
      </div>
    )
  }

  const { attempt, results, elapsed_ms } = result
  const score = Math.round(attempt.score || 0)
  const elapsedMin = Math.floor((elapsed_ms || 0) / 60000)
  const elapsedSec = Math.floor(((elapsed_ms || 0) % 60000) / 1000)

  const scoreLabel = score >= 90 ? 'Одлично!' :
                     score >= 70 ? 'Многу добро!' :
                     score >= 50 ? 'Солидно.' : 'Има простор за подобрување.'
  const scoreColor = score >= 70 ? 'text-accent' : 'text-fg'

  return (
    <div className="container-app py-12">
      <div className="max-w-3xl mx-auto">
        {/* Score banner */}
        <div className="card mb-8 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          <Trophy className={`mx-auto mb-4 ${scoreColor}`} size={48} />
          <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
            Твојот резултат
          </p>
          <p className={`font-display text-7xl font-semibold mb-2 ${scoreColor}`}>
            {score}%
          </p>
          <p className="text-fg mb-4">{scoreLabel}</p>
          <div className="flex justify-center gap-6 font-mono text-xs text-muted">
            <span>{attempt.points_earned} / {attempt.points_total} поени</span>
            <span>•</span>
            <span>{elapsedMin}мин {elapsedSec}сек</span>
          </div>
        </div>

        {/* Question by question */}
        <p className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
          Детален преглед
        </p>
        <div className="space-y-4 mb-8">
          {results.map((r, i) => {
            const isCorrect = r.is_correct === true
            const isWrong = r.is_correct === false
            const isUngraded = r.is_correct === null

            return (
              <div key={r.question_id} className="card">
                <div className="flex items-start gap-3 mb-3">
                  <span className={`shrink-0 w-8 h-8 border-2 flex items-center justify-center font-mono text-xs
                    ${isCorrect ? 'border-green-700 bg-green-700 text-white'
                      : isWrong ? 'border-accent bg-accent text-white'
                      : 'border-border bg-ink-700 text-white'}`}>
                    {isCorrect ? <Check size={14} /> : isWrong ? <X size={14} /> : <HelpCircle size={14} />}
                  </span>
                  <div className="flex-1">
                    <p className="font-mono text-xs text-muted mb-1">
                      Прашање {i + 1}
                    </p>
                    <h3 className="font-display text-lg mb-3">{r.question_text}</h3>
                  </div>
                </div>

                {/* Show options for single/multiple, text for essay */}
                {r.type !== 'essay' ? (
                  <div className="ml-11 space-y-2 mb-3">
                    {/* Display all choices with checkmark/X to show what was selected vs correct */}
                    {r.all_choices && r.all_choices.length > 0 && (
                      <div className="space-y-1.5">
                        {r.all_choices.map((choice, idx) => {
                          const label = String.fromCharCode(1040 + idx) // А, Б, В, Г, Д ...
                          const wasSelected = r.user_choice_ids.includes(choice.id)
                          const isAnswerCorrect = choice.is_correct
                          return (
                            <div
                              key={choice.id}
                              className={`flex items-start gap-2 p-2 rounded text-sm border ${
                                isAnswerCorrect
                                  ? 'bg-green-700/10 border-green-700/40'
                                  : wasSelected
                                  ? 'bg-accent/10 border-accent/40'
                                  : 'border-border bg-surface'
                              }`}
                            >
                              <span className={`font-mono text-xs font-semibold shrink-0 mt-0.5 ${
                                isAnswerCorrect ? 'text-green-700' : wasSelected ? 'text-accent' : 'text-muted'
                              }`}>
                                {label})
                              </span>
                              <span className={`flex-1 ${isAnswerCorrect ? 'text-fg font-medium' : 'text-fg'}`}>
                                {choice.text}
                              </span>
                              <span className="shrink-0 text-xs font-mono">
                                {isAnswerCorrect && wasSelected && <span className="text-green-700">✓ точно</span>}
                                {isAnswerCorrect && !wasSelected && <span className="text-green-700">✓ точен одговор</span>}
                                {!isAnswerCorrect && wasSelected && <span className="text-accent">✗ твој одговор</span>}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ml-11 mb-3">
                    <p className="text-xs font-mono text-muted mb-1">Твој одговор:</p>
                    <p className="text-sm bg-surface border border-border p-3 italic">
                      {r.user_text || '— празно —'}
                    </p>
                    <p className="text-xs font-mono text-muted mt-2">
                      Есејските прашања не се автоматски бодувани.
                    </p>
                  </div>
                )}

                {r.explanation && (
                  <div className="ml-11 mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted mb-1">
                      Објаснување
                    </p>
                    <p className="text-sm text-fg">{r.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to={`/quiz/${id}/play`} className="btn-accent">
            <RotateCcw size={16} /> Обиди се повторно
          </Link>
          <Link to={`/quiz/${id}`} className="btn-secondary">
            Назад на квизот
          </Link>
          <Link to="/" className="btn-secondary">
            <Home size={16} /> Почетна
          </Link>
        </div>
      </div>
    </div>
  )
}
