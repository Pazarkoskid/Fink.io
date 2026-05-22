import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, GripVertical,
  Check, X, AlertCircle, BookOpen, Sparkles, FileText,
} from 'lucide-react'
import { quizzesApi, subjectsApi } from '../lib/api'

const QUESTION_TYPES = [
  { key: 'single',   label: 'Еден точен' },
  { key: 'multiple', label: 'Повеќе точни' },
  { key: 'essay',    label: 'Есејско' },
]

const DIFFICULTY_OPTIONS = [
  { key: 1, label: 'Лесно' },
  { key: 2, label: 'Средно' },
  { key: 3, label: 'Тешко' },
]

function emptyQuestion(type = 'single') {
  return {
    text: '',
    type,
    explanation: '',
    difficulty: 2,
    choices: type === 'essay' ? [] : [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ],
  }
}

export default function CreateQuiz() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Quiz meta
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [semester, setSemester] = useState('')
  const [difficulty, setDifficulty] = useState(2)
  const [estimatedMinutes, setEstimatedMinutes] = useState(10)

  // Questions
  const [questions, setQuestions] = useState([emptyQuestion()])

  useEffect(() => {
    subjectsApi.list().then((r) => setSubjects(r.data.results || r.data || []))
  }, [])

  const updateQuestion = (idx, patch) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, ...patch } : q))
  }

  const updateChoice = (qIdx, cIdx, patch) => {
    setQuestions(questions.map((q, i) => {
      if (i !== qIdx) return q
      return {
        ...q,
        choices: q.choices.map((c, j) => j === cIdx ? { ...c, ...patch } : c),
      }
    }))
  }

  const addChoice = (qIdx) => {
    setQuestions(questions.map((q, i) => {
      if (i !== qIdx) return q
      return { ...q, choices: [...q.choices, { text: '', is_correct: false }] }
    }))
  }

  const removeChoice = (qIdx, cIdx) => {
    setQuestions(questions.map((q, i) => {
      if (i !== qIdx) return q
      return { ...q, choices: q.choices.filter((_, j) => j !== cIdx) }
    }))
  }

  const changeType = (qIdx, newType) => {
    setQuestions(questions.map((q, i) => {
      if (i !== qIdx) return q
      // Reset choices when changing type
      let choices = q.choices
      if (newType === 'essay') choices = []
      else if (newType === 'single') {
        // Only one correct
        let foundCorrect = false
        choices = (q.choices.length ? q.choices : emptyQuestion('single').choices).map(c => {
          if (c.is_correct && !foundCorrect) {
            foundCorrect = true
            return c
          }
          return { ...c, is_correct: false }
        })
      } else if (newType === 'multiple') {
        choices = q.choices.length ? q.choices : emptyQuestion('multiple').choices
      }
      return { ...q, type: newType, choices }
    }))
  }

  const toggleCorrect = (qIdx, cIdx) => {
    const q = questions[qIdx]
    if (q.type === 'single') {
      // Only one can be correct
      updateQuestion(qIdx, {
        choices: q.choices.map((c, j) => ({ ...c, is_correct: j === cIdx })),
      })
    } else {
      updateChoice(qIdx, cIdx, { is_correct: !q.choices[cIdx].is_correct })
    }
  }

  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion()])
  }

  const removeQuestion = (idx) => {
    if (questions.length === 1) {
      alert('Квизот мора да има барем едно прашање.')
      return
    }
    setQuestions(questions.filter((_, i) => i !== idx))
  }

  const moveQuestion = (idx, dir) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= questions.length) return
    const arr = [...questions]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setQuestions(arr)
  }

  const validate = () => {
    if (!title.trim()) return 'Внеси наслов на квизот.'
    if (!semester) return 'Избери семестар.'
    if (questions.length === 0) return 'Додај барем едно прашање.'
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) return `Прашање ${i + 1}: текстот недостасува.`
      if (q.type !== 'essay') {
        if (q.choices.length < 2) {
          return `Прашање ${i + 1}: потребни се барем 2 одговори.`
        }
        if (!q.choices.some(c => c.is_correct)) {
          return `Прашање ${i + 1}: означи барем еден точен одговор.`
        }
        for (let j = 0; j < q.choices.length; j++) {
          if (!q.choices[j].text.trim()) {
            return `Прашање ${i + 1}: одговор ${j + 1} е празен.`
          }
        }
      }
    }
    return null
  }

  const save = async (publishAfter = false) => {
    const err = validate()
    if (err) {
      setError(err)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        subject: subject || null,
        difficulty,
        estimated_minutes: parseInt(estimatedMinutes) || 10,
        tags: [],
        questions: questions.map((q, i) => ({
          text: q.text,
          type: q.type,
          explanation: q.explanation || '',
          difficulty: q.difficulty || 2,
          order: i,
          choices: q.choices.map((c, j) => ({
            text: c.text,
            is_correct: !!c.is_correct,
            order: j,
          })),
        })),
      }
      const { data } = await quizzesApi.create(payload)
      if (publishAfter) {
        navigate(`/quiz/${data.id}/edit`)
      } else {
        navigate(`/quiz/${data.id}/edit`)
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Зачувувањето не успеа.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-app py-10 max-w-4xl">
      <Link
        to="/my-quizzes"
        className="inline-flex items-center gap-1 text-sm hover:text-accent mb-4"
      >
        <ArrowLeft size={14} /> Назад
      </Link>

      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Креирај квиз
        </p>
        <h1 className="font-display text-4xl mb-3">Нов квиз — мануелно</h1>
        <p className="text-muted">
          Создади квиз од нула, прашање по прашање. Сакаш AI да го направи за тебе?{' '}
          <Link to="/upload" className="text-accent hover:underline inline-flex items-center gap-1">
            <Sparkles size={12} /> Прикачи материјал
          </Link>
        </p>
      </div>

      {error && (
        <div className="card !bg-accent/10 !border-accent/30 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-accent shrink-0 mt-0.5" />
          <p className="text-sm text-accent">{error}</p>
        </div>
      )}

      {/* Quiz meta */}
      <div className="card mb-6">
        <h2 className="font-display text-2xl mb-5 flex items-center gap-2">
          <FileText size={20} /> Опште
        </h2>

        <div className="space-y-4">
          <div>
            <label className="label">Наслов *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="на пр. Основи на алгоритми — Сортирање"
              maxLength={255}
            />
          </div>

          <div>
            <label className="label">Опис (опционално)</label>
            <textarea
              className="input min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Кратко за квизот..."
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Семестар *</label>
              <select
                className="input"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option value="">— Избери —</option>
                {[1,2,3,4,5,6,7,8].map(s => (
                  <option key={s} value={s}>Семестар {s}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">Предмет (опционално)</label>
              <select
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">— Без предмет —</option>
                {subjects
                  .filter(s => !semester || String(s.semester) === semester)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Тежина</label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map(d => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDifficulty(d.key)}
                    className={`flex-1 py-2 px-3 text-sm rounded-xl border transition-colors
                      ${difficulty === d.key
                        ? 'bg-accent text-white border-accent'
                        : 'border-border hover:border-fg/30'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Времетраење (минути)</label>
              <input
                type="number"
                min="1"
                max="180"
                className="input"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-display text-2xl">
            Прашања <span className="text-muted text-base">({questions.length})</span>
          </h2>
        </div>

        {questions.map((q, idx) => (
          <QuestionEditor
            key={idx}
            index={idx}
            question={q}
            isOnly={questions.length === 1}
            onChangeText={(text) => updateQuestion(idx, { text })}
            onChangeType={(type) => changeType(idx, type)}
            onChangeExplanation={(explanation) => updateQuestion(idx, { explanation })}
            onChangeChoiceText={(cIdx, text) => updateChoice(idx, cIdx, { text })}
            onToggleCorrect={(cIdx) => toggleCorrect(idx, cIdx)}
            onAddChoice={() => addChoice(idx)}
            onRemoveChoice={(cIdx) => removeChoice(idx, cIdx)}
            onMoveUp={() => moveQuestion(idx, -1)}
            onMoveDown={() => moveQuestion(idx, 1)}
            onRemove={() => removeQuestion(idx)}
          />
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="card-hover w-full !py-4 text-center text-muted hover:text-accent flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Додај прашање
        </button>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-4 mt-8 glass-strong rounded-2xl border border-border p-4 flex items-center gap-3">
        <div className="flex-1 text-sm text-muted">
          {questions.length} прашања · {questions.filter(q => q.type !== 'essay').reduce((sum, q) => sum + q.choices.length, 0)} одговори
        </div>
        <Link to="/my-quizzes" className="btn-secondary">
          Откажи
        </Link>
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Зачувувам…' : 'Зачувај нацрт'}
        </button>
      </div>
    </div>
  )
}

function QuestionEditor({
  index, question, isOnly,
  onChangeText, onChangeType, onChangeExplanation,
  onChangeChoiceText, onToggleCorrect, onAddChoice, onRemoveChoice,
  onMoveUp, onMoveDown, onRemove,
}) {
  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            className="p-0.5 text-muted hover:text-fg"
            title="Помести нагоре"
          >▲</button>
          <span className="font-mono text-xs text-subtle text-center">{index + 1}</span>
          <button
            type="button"
            onClick={onMoveDown}
            className="p-0.5 text-muted hover:text-fg"
            title="Помести надолу"
          >▼</button>
        </div>

        <div className="flex-1 min-w-0">
          {/* Type selector */}
          <div className="flex gap-1 mb-3">
            {QUESTION_TYPES.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => onChangeType(t.key)}
                className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest rounded-lg border transition-colors
                  ${question.type === t.key
                    ? 'bg-accent text-white border-accent'
                    : 'border-border hover:border-fg/30'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Question text */}
          <textarea
            className="input min-h-[60px] !text-base"
            value={question.text}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Внеси го прашањето..."
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={isOnly}
          className="p-2 text-muted hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          title="Избриши прашање"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Choices (or essay note) */}
      {question.type === 'essay' ? (
        <div className="ml-10 p-4 rounded-xl bg-fg/5 text-sm text-muted">
          📝 Есејско прашање — корисниците ќе одговараат со текст. Нема автоматска проверка.
        </div>
      ) : (
        <div className="ml-10 space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-muted mb-2">
            {question.type === 'single' ? 'Еден точен одговор' : 'Повеќе точни можно'}
          </p>
          {question.choices.map((c, cIdx) => (
            <div key={cIdx} className="flex items-center gap-2 group">
              <button
                type="button"
                onClick={() => onToggleCorrect(cIdx)}
                className={`w-6 h-6 shrink-0 flex items-center justify-center transition-colors border-2 ${
                  question.type === 'single' ? 'rounded-full' : 'rounded-md'
                } ${
                  c.is_correct
                    ? 'bg-accent border-accent text-white'
                    : 'border-border hover:border-accent'
                }`}
                title="Означи како точен"
              >
                {c.is_correct && <Check size={14} />}
              </button>
              <input
                className="input !py-1.5 text-sm"
                value={c.text}
                onChange={(e) => onChangeChoiceText(cIdx, e.target.value)}
                placeholder={`Одговор ${cIdx + 1}`}
              />
              <button
                type="button"
                onClick={() => onRemoveChoice(cIdx)}
                disabled={question.choices.length <= 2}
                className="p-1.5 text-muted hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 transition-opacity"
                title="Отстрани"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onAddChoice}
            className="text-xs text-muted hover:text-accent flex items-center gap-1 ml-8 pt-1"
          >
            <Plus size={12} /> Додај одговор
          </button>
        </div>
      )}

      {/* Explanation */}
      <div className="ml-10 mt-3">
        <input
          className="input !py-1.5 text-sm"
          value={question.explanation}
          onChange={(e) => onChangeExplanation(e.target.value)}
          placeholder="Образложение (опционално) — се покажува по одговор"
        />
      </div>
    </div>
  )
}
