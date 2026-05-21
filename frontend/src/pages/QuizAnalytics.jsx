import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  BarChart3, Users, Heart, Target, Check, TrendingUp, TrendingDown,
  ArrowLeft, AlertTriangle,
} from 'lucide-react'
import { analyticsApi } from '../lib/api'

export default function QuizAnalytics() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    analyticsApi.quiz(id)
      .then(({ data }) => { setData(data); setLoading(false) })
      .catch((e) => {
        setError(e.response?.status === 403
          ? 'Само авторот на квизот може да ги види овие статистики.'
          : 'Не успеа да се вчита статистиката.')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="container-app py-10">
        <div className="card h-96 shimmer" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-app py-16 text-center">
        <AlertTriangle className="mx-auto mb-3 text-accent" size={32} />
        <p className="font-display text-2xl mb-2">Не може да се вчита</p>
        <p className="text-ink-700 mb-6">{error}</p>
        <Link to="/my-quizzes" className="btn-primary">
          <ArrowLeft size={16} /> Назад
        </Link>
      </div>
    )
  }

  const maxBucket = Math.max(...(data.score_distribution || [1]))

  return (
    <div className="container-app py-10 max-w-5xl">
      <Link to={`/quiz/${id}/edit`} className="inline-flex items-center gap-1 text-sm hover:text-accent mb-4">
        <ArrowLeft size={14} /> Назад на квизот
      </Link>

      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-1">
          Статистика
        </p>
        <h1 className="font-display text-4xl">{data.quiz_title}</h1>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <KPI label="Игри" value={data.plays_count} icon={BarChart3} />
        <KPI label="Уникатни играчи" value={data.unique_players} icon={Users} />
        <KPI label="Лајкови" value={data.likes_count} icon={Heart} />
        <KPI
          label="Просечен скор"
          value={`${data.average_score}%`}
          icon={Target}
          accent={data.average_score >= 70}
        />
      </div>

      {/* Completion rate */}
      <div className="card mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-2">
          Стапка на завршување
        </p>
        <div className="flex items-baseline gap-3 mb-3">
          <p className="font-display text-4xl">{data.completion_rate}%</p>
          <p className="text-sm text-ink-600">од играчите го завршуваат целиот квиз</p>
        </div>
        <div className="h-3 bg-ink-100 border border-ink-900">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${data.completion_rate}%` }}
          />
        </div>
      </div>

      {/* Score distribution */}
      <div className="card mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-4">
          Распоред на резултати
        </p>
        {data.plays_count === 0 ? (
          <p className="text-ink-600 text-sm">Сè уште нема одиграни квизови.</p>
        ) : (
          <div className="grid grid-cols-11 gap-1 items-end h-40">
            {data.score_distribution.map((count, i) => {
              const height = maxBucket ? (count / maxBucket) * 100 : 0
              const isPeak = count > 0 && count === maxBucket
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="text-[10px] font-mono text-ink-600">
                    {count > 0 ? count : ''}
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full transition-all border border-ink-900 ${isPeak ? 'bg-accent' : 'bg-ink-900'}`}
                      style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-ink-600">
                    {i === 10 ? '100' : `${i * 10}`}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-ink-600 mt-3 font-mono text-center">
          Скор % (по интервали од 10)
        </p>
      </div>

      {/* Hardest / easiest */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {data.hardest_question && (
          <div className="card border-accent">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={18} className="text-accent" />
              <p className="font-mono text-xs uppercase tracking-widest">Најтешко прашање</p>
            </div>
            <p className="font-display text-lg mb-3">
              {data.hardest_question.text}{data.hardest_question.text.length >= 100 && '...'}
            </p>
            <div className="flex gap-4 text-xs font-mono">
              <span className="text-accent">
                {Math.round(data.hardest_question.accuracy)}% точност
              </span>
              <span className="text-ink-600">
                {data.hardest_question.answered_count} одговори
              </span>
            </div>
          </div>
        )}
        {data.easiest_question && (
          <div className="card border-green-700">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-green-700" />
              <p className="font-mono text-xs uppercase tracking-widest">Најлесно прашање</p>
            </div>
            <p className="font-display text-lg mb-3">
              {data.easiest_question.text}{data.easiest_question.text.length >= 100 && '...'}
            </p>
            <div className="flex gap-4 text-xs font-mono">
              <span className="text-green-700">
                {Math.round(data.easiest_question.accuracy)}% точност
              </span>
              <span className="text-ink-600">
                {data.easiest_question.answered_count} одговори
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Per-question table */}
      <div className="card">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-4">
          Сите прашања
        </p>
        <div className="space-y-2">
          {(data.questions_stats || []).map((q, i) => (
            <div key={q.question_id} className="flex items-center gap-3 py-2 border-b border-ink-100 last:border-0">
              <span className="font-mono text-xs text-ink-600 w-6">{i + 1}.</span>
              <span className="flex-1 text-sm truncate">{q.text}</span>
              <span className="badge">{q.type}</span>
              {q.accuracy !== null ? (
                <span className={`font-mono text-xs ${q.accuracy >= 70 ? 'text-green-700' : q.accuracy >= 40 ? 'text-ink-700' : 'text-accent'}`}>
                  {Math.round(q.accuracy)}%
                </span>
              ) : (
                <span className="font-mono text-xs text-ink-500">—</span>
              )}
              <span className="font-mono text-xs text-ink-500 w-12 text-right">
                ({q.answered_count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, icon: Icon, accent }) {
  return (
    <div className={`card ${accent ? 'bg-accent text-cream border-accent' : ''}`}>
      <Icon size={20} className={`mb-3 ${accent ? '' : 'text-accent'}`} />
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className={`text-[10px] font-mono uppercase tracking-widest mt-1 ${accent ? '' : 'text-ink-600'}`}>
        {label}
      </p>
    </div>
  )
}
