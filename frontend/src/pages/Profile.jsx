import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  authApi, quizzesApi, subjectsApi, mySubjectsApi, materialsApi,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  Save, History, ExternalLink, BookOpen, Plus, X, Check, Clock,
  Camera, Database, Trash2, Download, Heart, Loader2,
} from 'lucide-react'

const FILE_ICONS = {
  '.pdf': '📕', '.doc': '📘', '.docx': '📘',
  '.ppt': '📙', '.pptx': '📙', '.txt': '📄',
}

export default function Profile() {
  const user = useAuth((s) => s.user)
  const hydrate = useAuth((s) => s.hydrate)
  const [form, setForm] = useState({
    username: '', bio: '', preferred_language: 'mk',
    current_year: '', study_program: '',
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const fileInputRef = useRef(null)

  const [attempts, setAttempts] = useState([])
  const [taken, setTaken] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [myMaterials, setMyMaterials] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        bio: user.bio || '',
        preferred_language: user.preferred_language || 'mk',
        current_year: user.current_year || '',
        study_program: user.study_program || '',
      })
      setAvatarPreview(user.avatar || null)
    }
    quizzesApi.myAttempts().then((r) => {
      setAttempts(r.data.results || r.data || [])
    }).catch(() => {})
    mySubjectsApi.list().then((r) => {
      setTaken(r.data.results || r.data || [])
    }).catch(() => {})
    subjectsApi.list().then((r) => {
      setAllSubjects(r.data.results || r.data || [])
    }).catch(() => {})
    materialsApi.list().then((r) => {
      setMyMaterials(r.data.results || r.data || [])
    }).catch(() => {})
  }, [user])

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Сликата е преголема (макс. 5 MB).')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    setSavedMsg('')
    try {
      if (avatarFile) {
        // Multipart upload with all fields
        const fd = new FormData()
        fd.append('username', form.username)
        fd.append('bio', form.bio)
        fd.append('preferred_language', form.preferred_language)
        if (form.current_year) fd.append('current_year', form.current_year)
        else fd.append('current_year', '')
        fd.append('study_program', form.study_program)
        fd.append('avatar', avatarFile)
        await authApi.updateMe(fd)
        setAvatarFile(null)
      } else {
        const payload = { ...form }
        payload.current_year = form.current_year ? parseInt(form.current_year) : null
        await authApi.updateMe(payload)
      }
      setSavedMsg('Зачувано!')
      hydrate()
      setTimeout(() => setSavedMsg(''), 2500)
    } catch (e) {
      setSavedMsg(e.response?.data?.detail || 'Грешка при зачувување.')
    } finally {
      setSaving(false)
    }
  }

  const takenIds = useMemo(
    () => new Set(taken.map((t) => t.subject)),
    [taken]
  )

  const addSubject = async (subjectId, status) => {
    try {
      await mySubjectsApi.add(subjectId, status)
      const r = await mySubjectsApi.list()
      setTaken(r.data.results || r.data || [])
    } catch (e) {
      alert('Не успеа додавањето.')
    }
  }

  const removeSubject = async (id) => {
    try {
      await mySubjectsApi.remove(id)
      setTaken(taken.filter((t) => t.id !== id))
    } catch (e) {
      alert('Не успеа отстранувањето.')
    }
  }

  const toggleStatus = async (t) => {
    const newStatus = t.status === 'current' ? 'completed' : 'current'
    try {
      await mySubjectsApi.update(t.id, { status: newStatus })
      setTaken(taken.map((x) => x.id === t.id ? { ...x, status: newStatus } : x))
    } catch (e) {
      alert('Не успеа промената.')
    }
  }

  const deleteMaterial = async (id) => {
    if (!confirm('Сигурно сакаш да ја избришеш базата?')) return
    try {
      await materialsApi.delete(id)
      setMyMaterials(myMaterials.filter(m => m.id !== id))
    } catch (e) {
      alert('Не успеа бришењето.')
    }
  }

  const suggested = useMemo(() => {
    if (!form.current_year) return []
    const yearNum = parseInt(form.current_year)
    return allSubjects.filter(s =>
      s.year === yearNum &&
      s.subject_type === 'mandatory' &&
      !takenIds.has(s.id)
    )
  }, [allSubjects, form.current_year, takenIds])

  if (!user) return null

  return (
    <div className="container-app py-10 max-w-4xl">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Профил
        </p>
        <Link
          to={`/users/${user.id}`}
          className="text-xs font-mono uppercase tracking-widest text-accent hover:underline flex items-center gap-1"
        >
          Јавен профил <ExternalLink size={11} />
        </Link>
      </div>
      <h1 className="font-display text-4xl mb-2">{user.username}</h1>
      <p className="badge-soft mb-8 inline-flex">{user.role}</p>

      {/* Avatar + Settings */}
      <div className="card mb-6">
        <h2 className="font-display text-2xl mb-5">Подесувања</h2>

        {/* Avatar */}
        <div className="flex items-start gap-5 mb-6">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center border-2 border-border">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-4xl font-bold text-white">
                  {user.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-accent text-white rounded-full p-2 shadow-soft hover:scale-110 transition-transform"
              title="Промени слика"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg mb-1">Аватар</p>
            <p className="text-sm text-muted mb-2">
              JPG или PNG, макс. 5 MB
            </p>
            {avatarFile && (
              <p className="text-xs text-accent font-mono">
                Нова слика: {avatarFile.name}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Корисничко име</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Био</label>
            <textarea
              className="input min-h-[100px]"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={500}
              placeholder="Кратко за тебе - студии, интереси..."
            />
            <p className="text-xs text-subtle mt-1 text-right font-mono">
              {form.bio.length} / 500
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Тековна година</label>
              <select
                className="input"
                value={form.current_year}
                onChange={(e) => setForm({ ...form, current_year: e.target.value })}
              >
                <option value="">— Не е поставено —</option>
                <option value="1">Прва година</option>
                <option value="2">Втора година</option>
                <option value="3">Трета година</option>
                <option value="4">Четврта година</option>
              </select>
            </div>
            <div>
              <label className="label">Програма / Смер</label>
              <input
                className="input"
                value={form.study_program}
                onChange={(e) => setForm({ ...form, study_program: e.target.value })}
                placeholder="на пр. Софтверско инженерство"
                maxLength={100}
              />
            </div>
          </div>

          <div>
            <label className="label">Е-маил</label>
            <input className="input" value={user.email} disabled />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Зачувувам…' : 'Зачувај'}
            </button>
            {savedMsg && <span className="text-sm text-accent font-medium">{savedMsg}</span>}
          </div>
        </div>
      </div>

      {/* My uploaded materials (Бази) */}
      <div className="card mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <Database size={20} /> Мои бази
          </h2>
          <Link to="/upload" className="text-sm text-accent hover:underline flex items-center gap-1">
            <Plus size={14} /> Прикачи нова
          </Link>
        </div>
        <p className="text-sm text-muted mb-5">
          Учебни материјали што си ги прикачил. По default се јавни — секој може да ги симне.
        </p>

        {myMaterials.length === 0 ? (
          <div className="text-center py-8">
            <Database className="mx-auto mb-3 text-subtle" size={32} />
            <p className="text-sm text-muted mb-4">
              Сè уште немаш прикачено бази.
            </p>
            <Link to="/upload" className="btn-primary inline-flex">
              <Plus size={14} /> Прикачи прв материјал
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {myMaterials.map(m => (
              <MyMaterialRow
                key={m.id}
                material={m}
                onDelete={() => deleteMaterial(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Taken subjects */}
      <div className="card mb-6">
        <h2 className="font-display text-2xl mb-2 flex items-center gap-2">
          <BookOpen size={20} /> Мои предмети
        </h2>
        <p className="text-sm text-muted mb-5">
          Додај ги предметите што ги слушаш сега или што ги имаш завршено.
        </p>

        {suggested.length > 0 && (
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
              Препорачани за {form.current_year}. година ({suggested.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {suggested.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addSubject(s.id, 'current')}
                  className="badge hover:bg-accent hover:text-white hover:border-accent flex items-center gap-1 transition-colors"
                  title={`Сем. ${s.semester}`}
                >
                  <Plus size={11} /> {s.code} {s.name.length > 22 ? s.name.slice(0, 22) + '…' : s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <AddSubjectControl allSubjects={allSubjects} takenIds={takenIds} onAdd={addSubject} />

        {taken.length === 0 ? (
          <p className="text-sm text-muted italic mt-4">
            Сè уште не си додал предмети.
          </p>
        ) : (
          <div className="mt-5 space-y-2">
            {taken.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface"
              >
                <span className="text-xl shrink-0">{t.subject_icon || '📘'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted">{t.subject_code}</p>
                  <p className="font-display text-sm truncate">{t.subject_name}</p>
                  <p className="text-[10px] font-mono text-subtle">
                    Година {t.subject_year} · Сем. {t.subject_semester}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleStatus(t)}
                  className={`badge text-[10px] ${
                    t.status === 'current' ? 'badge-accent' : ''
                  }`}
                >
                  {t.status === 'current' ? <>
                    <Clock size={9} className="inline mr-1" /> Сега
                  </> : <>
                    <Check size={9} className="inline mr-1" /> Завршен
                  </>}
                </button>
                <button
                  type="button"
                  onClick={() => removeSubject(t.id)}
                  className="text-muted hover:text-accent p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="card">
        <h2 className="font-display text-2xl mb-5 flex items-center gap-2">
          <History size={20} /> Историја
        </h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted">Сè уште немаш одиграно квизови.</p>
        ) : (
          <ul className="divide-y divide-border">
            {attempts.slice(0, 10).map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.quiz_title}</p>
                  <p className="text-xs font-mono text-muted">
                    {new Date(a.started_at).toLocaleString('mk-MK')}
                  </p>
                </div>
                <span className={`badge shrink-0 ${a.score >= 70 ? 'badge-accent' : ''}`}>
                  {a.score.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MyMaterialRow({ material, onDelete }) {
  const icon = FILE_ICONS[material.extension] || '📄'
  const statusColor = {
    ready: 'badge-soft',
    extracting: 'badge',
    failed: 'badge bg-accent/20 text-accent border-accent/30',
    uploaded: 'badge',
  }[material.status] || 'badge'

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface">
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm leading-tight truncate">{material.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-mono text-subtle">
          {material.subject_code && (
            <span>{material.subject_code}</span>
          )}
          <span>{material.extension?.replace('.', '').toUpperCase()}</span>
          <span>{(material.file_size / 1024).toFixed(0)} KB</span>
          <span className="flex items-center gap-0.5">
            <Download size={9} /> {material.downloads_count}
          </span>
          <span className="flex items-center gap-0.5">
            <Heart size={9} /> {material.likes_count}
          </span>
        </div>
      </div>
      <span className={statusColor}>
        {material.status === 'ready' ? 'Подготвено' :
         material.status === 'extracting' ? 'Обработка' :
         material.status === 'failed' ? 'Неуспешно' :
         'Прикачено'}
      </span>
      {material.status === 'ready' && (
        <Link
          to={`/upload?material=${material.id}`}
          className="btn-secondary !py-1 !px-2 text-[10px]"
          title="Генерирај квиз"
        >
          Кв.
        </Link>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="text-muted hover:text-accent p-1"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function AddSubjectControl({ allSubjects, takenIds, onAdd }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')

  const filtered = useMemo(() => {
    let list = allSubjects.filter(s => !takenIds.has(s.id))
    if (year) list = list.filter(s => String(s.year) === year)
    if (semester) list = list.filter(s => String(s.semester) === semester)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q))
      )
    }
    return list.slice(0, 30)
  }, [allSubjects, takenIds, search, year, semester])

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        <Plus size={14} /> Додај друг предмет
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border p-4 bg-surface">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-xs uppercase tracking-widest">Пребарај предмет</p>
        <button
          type="button"
          onClick={() => { setOpen(false); setSearch(''); setYear(''); setSemester('') }}
          className="text-muted hover:text-accent"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <input
          type="text"
          placeholder="Барај..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input !py-2 text-sm"
          autoFocus
        />
        <select value={year} onChange={(e) => setYear(e.target.value)} className="input !py-2 text-sm">
          <option value="">Сите години</option>
          {[1,2,3,4].map(y => <option key={y} value={y}>Година {y}</option>)}
        </select>
        <select value={semester} onChange={(e) => setSemester(e.target.value)} className="input !py-2 text-sm">
          <option value="">Сите сем.</option>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Сем. {s}</option>)}
        </select>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted italic py-3 text-center">Нема резултати.</p>
        ) : filtered.map(s => (
          <div key={s.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-fg/5">
            <span className="text-base">{s.icon || '📘'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-muted">{s.code} · Год.{s.year} Сем.{s.semester}</p>
              <p className="text-sm truncate">{s.name}</p>
            </div>
            <button
              type="button"
              onClick={() => onAdd(s.id, 'current')}
              className="btn-secondary !py-1 !px-2 text-[10px]"
            >
              Сега
            </button>
            <button
              type="button"
              onClick={() => onAdd(s.id, 'completed')}
              className="btn-secondary !py-1 !px-2 text-[10px]"
            >
              Завршил
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
