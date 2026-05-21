import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UploadCloud, FileText, Sparkles, Loader2, ChevronRight } from 'lucide-react'
import { materialsApi, quizzesApi, subjectsApi } from '../lib/api'

const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt'

export default function Upload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1) // 1=upload, 2=configure, 3=generating

  // Step 1
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [semester, setSemester] = useState('')
  const [subjects, setSubjects] = useState([])
  const [uploadingMsg, setUploadingMsg] = useState('')
  const [error, setError] = useState('')

  // Step 2
  const [material, setMaterial] = useState(null)
  const [numQuestions, setNumQuestions] = useState(10)
  const [nQuizzes, setNQuizzes] = useState(1)
  const [difficulty, setDifficulty] = useState(2)
  const [questionTypes, setQuestionTypes] = useState(['single'])
  const [extra, setExtra] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    subjectsApi.list().then((r) => setSubjects(r.data.results || r.data || []))
  }, [])

  // If user came in with ?material=<id>, load it and skip to step 2
  useEffect(() => {
    const materialId = searchParams.get('material')
    if (!materialId) return
    materialsApi.detail(materialId).then(({ data }) => {
      if (data.status === 'ready' && data.has_text) {
        setMaterial(data)
        setStep(2)
      } else if (data.status === 'failed') {
        setError(`Материјалот не може да се користи: ${data.extraction_error || 'непознат проблем'}`)
      }
    }).catch(() => {
      setError('Не може да се вчита материјалот.')
    })
  }, [searchParams])

  const onFilePick = (f) => {
    if (!f) return
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const upload = async (e) => {
    e.preventDefault()
    setError('')
    if (!file) { setError('Избери датотека.'); return }
    if (!semester) { setError('Избери семестар.'); return }
    setUploadingMsg('Прикачувам и извлекувам текст…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title)
      if (subject) fd.append('subject', subject)
      if (semester) fd.append('semester', semester)
      const { data } = await materialsApi.upload(fd)
      if (data.status === 'failed') {
        setError(`Извлекувањето на текст не успеа: ${data.extraction_error || 'непознат проблем'}`)
        setUploadingMsg('')
        return
      }
      setMaterial(data)
      setStep(2)
    } catch (e) {
      const err = e.response?.data
      let msg = 'Грешка при прикачување.'
      if (err && typeof err === 'object') {
        msg = Object.values(err).flat().join(' ') || msg
      }
      setError(msg)
    } finally {
      setUploadingMsg('')
    }
  }

  const toggleType = (t) => {
    setQuestionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  const generate = async () => {
    if (questionTypes.length === 0) {
      setError('Избери барем еден тип прашање.')
      return
    }
    setError('')
    setStep(3)
    try {
      const { data } = await quizzesApi.generate({
        material_id: material.id,
        num_questions: numQuestions,
        n_quizzes: nQuizzes,
        question_types: questionTypes,
        difficulty,
        extra_instructions: extra,
      })
      if (!data || data.length === 0) {
        navigate('/my-quizzes')
        return
      }
      // If multiple quizzes, take the user to My Quizzes so they see all drafts
      if (data.length > 1) {
        navigate('/my-quizzes?tab=created&status=draft')
      } else {
        // Single quiz - go straight to edit
        navigate(`/quiz/${data[0].id}/edit`)
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Генерацијата не успеа.')
      setStep(2)
    }
  }

  return (
    <div className="container-app py-10 max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-600 mb-2">
        Создавање квиз
      </p>
      <h1 className="font-display text-4xl mb-8">Прикачи материјал</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-10 font-mono text-xs uppercase tracking-widest">
        <Step n={1} active={step === 1} done={step > 1}>Прикачи</Step>
        <ChevronRight size={14} className="text-ink-400" />
        <Step n={2} active={step === 2} done={step > 2}>Конфигурирај</Step>
        <ChevronRight size={14} className="text-ink-400" />
        <Step n={3} active={step === 3} done={false}>Генерирај</Step>
      </div>

      {/* STEP 1 — Upload */}
      {step === 1 && (
        <form onSubmit={upload} className="space-y-5">
          <div>
            <label className="label">Датотека</label>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                onFilePick(e.dataTransfer.files[0])
              }}
              className={`block border-2 border-dashed cursor-pointer p-10 text-center transition-colors ${
                dragOver ? 'border-accent bg-accent/5' : 'border-ink-900 hover:bg-ink-100'
              }`}
            >
              <input
                type="file"
                accept={ACCEPT}
                onChange={(e) => onFilePick(e.target.files[0])}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3 text-left">
                  <FileText size={28} className="text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs font-mono text-ink-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud size={36} className="mx-auto mb-3 text-ink-600" />
                  <p className="font-medium mb-1">Влечи и пушти датотека овде</p>
                  <p className="text-xs font-mono text-ink-600">
                    или кликни за да избереш · PDF, DOC, DOCX, PPT, PPTX, TXT · макс. 50MB
                  </p>
                </>
              )}
            </label>
          </div>

          <div>
            <label className="label">Наслов</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="на пр. Поглавје 3 — Алгоритми за сортирање"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Предмет</label>
              <select
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">— Без предмет —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Семестар (задолжително)</label>
              <select
                className="input"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
              >
                <option value="">— Избери —</option>
                <option value="1">1 — Прв (I год.)</option>
                <option value="2">2 — Втор (I год.)</option>
                <option value="3">3 — Трет (II год.)</option>
                <option value="4">4 — Четврти (II год.)</option>
                <option value="5">5 — Петти (III год.)</option>
                <option value="6">6 — Шести (III год.)</option>
                <option value="7">7 — Седми (IV год.)</option>
                <option value="8">8 — Осми (IV год.)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-accent/10 border-2 border-accent px-4 py-2 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || !!uploadingMsg}
            className="btn-primary w-full"
          >
            {uploadingMsg ? (
              <><Loader2 size={16} className="animate-spin" /> {uploadingMsg}</>
            ) : (
              <>Прикачи и продолжи <ChevronRight size={16} /></>
            )}
          </button>
        </form>
      )}

      {/* STEP 2 — Configure AI */}
      {step === 2 && material && (
        <div className="space-y-6">
          <div className="card bg-ink-900 text-cream">
            <p className="font-mono text-xs uppercase tracking-widest text-accent mb-2">
              Прикачен материјал
            </p>
            <h3 className="font-display text-2xl mb-1">{material.title}</h3>
            <p className="text-xs font-mono text-ink-200">
              {material.extension} · {(material.file_size / 1024).toFixed(0)} KB · Текст извлечен
            </p>
          </div>

          <div className="card">
            <h3 className="font-display text-xl mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              AI конфигурација
            </h3>

            <div className="space-y-5">
              <div>
                <label className="label">
                  Број на прашања: <span className="text-accent font-bold">{numQuestions}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-xs font-mono text-ink-600 mt-1">
                  <span>3</span>
                  <span>30</span>
                </div>
              </div>

              <div>
                <label className="label">
                  Раздели база на {nQuizzes} квиз{nQuizzes > 1 ? 'а' : ''}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={nQuizzes}
                  onChange={(e) => setNQuizzes(parseInt(e.target.value))}
                  className="w-full accent-accent"
                />
                <p className="text-xs font-mono text-ink-600 mt-1">
                  {nQuizzes === 1
                    ? 'Сите прашања во еден квиз.'
                    : `Прашањата ќе се поделат рамномерно меѓу ${nQuizzes} квиза.`}
                </p>
              </div>

              <div>
                <label className="label">Типови прашања</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'single', l: 'Еден точен' },
                    { v: 'multiple', l: 'Повеќе точни' },
                    { v: 'essay', l: 'Есејско' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => toggleType(opt.v)}
                      className={`px-3 py-2.5 text-sm border-2 transition-colors ${
                        questionTypes.includes(opt.v)
                          ? 'bg-ink-900 text-cream border-ink-900'
                          : 'bg-cream border-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Тежина</label>
                <div className="grid grid-cols-3 gap-2">
                  {[[1, 'Лесно'], [2, 'Средно'], [3, 'Тешко']].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDifficulty(v)}
                      className={`px-3 py-2.5 text-sm border-2 transition-colors ${
                        difficulty === v
                          ? 'bg-accent text-cream border-accent'
                          : 'bg-cream border-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Дополнителни инструкции (опционално)</label>
                <textarea
                  className="input min-h-[80px]"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="на пр. фокусирај се на дефиниции; избегни датуми; пиши кратко…"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-accent/10 border-2 border-accent px-4 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary">
              ← Назад
            </button>
            <button onClick={generate} className="btn-accent flex-1">
              <Sparkles size={16} /> Генерирај квиз
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Generating */}
      {step === 3 && (
        <div className="card text-center py-16">
          <Loader2 size={48} className="mx-auto mb-5 animate-spin text-accent" />
          <h3 className="font-display text-2xl mb-2">AI генерира прашања…</h3>
          <p className="text-sm text-ink-600 max-w-md mx-auto">
            Ова може да трае 10–60 секунди во зависност од големината на материјалот.
            Потоа ќе можеш да ги прегледаш и уредиш.
          </p>
        </div>
      )}
    </div>
  )
}

function Step({ n, active, done, children }) {
  return (
    <div className={`flex items-center gap-2 ${
      active ? 'text-accent' : done ? 'text-ink-900' : 'text-ink-400'
    }`}>
      <span className={`w-6 h-6 flex items-center justify-center border-2 text-xs ${
        active ? 'bg-accent text-cream border-accent'
              : done ? 'bg-ink-900 text-cream border-ink-900'
              : 'border-ink-400'
      }`}>
        {n}
      </span>
      <span>{children}</span>
    </div>
  )
}
