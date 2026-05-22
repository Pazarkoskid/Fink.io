import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, Filter, X, FileText, Download, Heart, User, Calendar,
  Database as DatabaseIcon, Loader2,
} from 'lucide-react'
import { materialsApi, subjectsApi } from '../lib/api'
import { useAuth } from '../lib/auth'

const SORT_OPTIONS = [
  { key: '-likes_count', label: 'Најмногу лајкови' },
  { key: '-downloads_count', label: 'Најмногу симнувања' },
  { key: '-created_at', label: 'Најнови' },
  { key: 'created_at', label: 'Најстари' },
]

const FILE_ICONS = {
  '.pdf': '📕',
  '.doc': '📘',
  '.docx': '📘',
  '.ppt': '📙',
  '.pptx': '📙',
  '.txt': '📄',
}

export default function Databases() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [materials, setMaterials] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [subject, setSubject] = useState(searchParams.get('subject') || '')
  const [year, setYear] = useState(searchParams.get('year') || '')
  const [semester, setSemester] = useState(searchParams.get('semester') || '')
  const [extension, setExtension] = useState(searchParams.get('extension') || '')
  const [ordering, setOrdering] = useState(searchParams.get('ordering') || '-likes_count')

  useEffect(() => {
    subjectsApi.list().then((r) => setSubjects(r.data.results || r.data || []))
  }, [])

  const filteredSubjects = useMemo(() => {
    let list = subjects
    if (year) list = list.filter(s => String(s.year) === String(year))
    if (semester) list = list.filter(s => String(s.semester) === String(semester))
    return list
  }, [subjects, year, semester])

  useEffect(() => {
    const params = { ordering }
    if (query) params.search = query
    if (subject) params.subject = subject
    if (year) params.year = year
    if (semester) params.semester = semester
    if (extension) params.extension = extension

    const urlParams = {}
    if (query) urlParams.q = query
    if (subject) urlParams.subject = subject
    if (year) urlParams.year = year
    if (semester) urlParams.semester = semester
    if (extension) urlParams.extension = extension
    if (ordering !== '-likes_count') urlParams.ordering = ordering
    setSearchParams(urlParams, { replace: true })

    setLoading(true)
    materialsApi.publicList(params).then((r) => {
      setMaterials(r.data.results || r.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [query, subject, year, semester, extension, ordering])

  const clearFilters = () => {
    setQuery(''); setSubject(''); setYear(''); setSemester('')
    setExtension(''); setOrdering('-likes_count')
  }

  const hasFilters = query || subject || year || semester || extension

  return (
    <div className="container-app py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <span className="badge-soft mb-3 inline-flex">
          <DatabaseIcon size={11} className="mr-1" /> Каталог
        </span>
        <h1 className="font-display text-5xl mb-3">Бази на знаење</h1>
        <p className="text-muted max-w-2xl mx-auto">
          Сите јавно споделени учебни материјали од заедницата. Симни ги,
          лајкни ги или генерирај квизови од нив.
        </p>
      </div>

      {/* Search bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Барај по наслов, опис, предмет или автор..."
            className="input !pl-12 !py-3 !text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Filters */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted">
            <span className="flex items-center gap-1.5"><Filter size={12} /> Филтри</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-accent hover:underline flex items-center gap-1 normal-case font-sans"
              >
                <X size={11} /> Исчисти
              </button>
            )}
          </div>

          <div>
            <label className="label">Сортирај</label>
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="input !py-2 text-sm"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Година</label>
            <div className="grid grid-cols-2 gap-1">
              <FilterPill active={year === ''} onClick={() => { setYear(''); setSemester(''); setSubject('') }}>Сите</FilterPill>
              {[1,2,3,4].map(y => (
                <FilterPill
                  key={y}
                  active={year === String(y)}
                  onClick={() => { setYear(String(y)); setSemester(''); setSubject('') }}
                >
                  {y}. год.
                </FilterPill>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Семестар</label>
            <select
              value={semester}
              onChange={(e) => { setSemester(e.target.value); setSubject('') }}
              className="input !py-2 text-sm"
            >
              <option value="">Сите семестри</option>
              {[1,2,3,4,5,6,7,8].map(s => (
                <option key={s} value={s}>Семестар {s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Предмет</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input !py-2 text-sm"
            >
              <option value="">Сите предмети</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] font-mono text-subtle mt-1">
              {filteredSubjects.length} предмети
            </p>
          </div>

          <div>
            <label className="label">Тип</label>
            <div className="space-y-1">
              {[
                ['', 'Сите'],
                ['.pdf', 'PDF'],
                ['.docx', 'Word (DOCX)'],
                ['.pptx', 'PowerPoint'],
                ['.txt', 'Текст'],
              ].map(([val, label]) => (
                <FilterPill
                  key={val}
                  active={extension === val}
                  onClick={() => setExtension(val)}
                  block
                >
                  {label}
                </FilterPill>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="shimmer h-44" />)}
            </div>
          ) : materials.length === 0 ? (
            <div className="card text-center py-16">
              <DatabaseIcon className="mx-auto mb-3 text-subtle" size={32} />
              <p className="font-display text-xl mb-1">Нема резултати.</p>
              <p className="text-sm text-muted">
                {hasFilters
                  ? 'Обиди се да ги исчистиш филтрите.'
                  : 'Сè уште нема јавни бази. Биди прв.'}
              </p>
            </div>
          ) : (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
                {materials.length} бази
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map(m => <DatabaseCard key={m.id} material={m} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DatabaseCard({ material }) {
  const [downloading, setDownloading] = useState(false)
  const [liked, setLiked] = useState(material.liked)
  const [likes, setLikes] = useState(material.likes_count)
  const [downloads, setDownloads] = useState(material.downloads_count)
  const user = useAuth((s) => s.user)
  const fileIcon = FILE_ICONS[material.extension] || '📄'

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { data } = await materialsApi.download(material.id)
      setDownloads(data.downloads_count)
      // Trigger browser download
      const a = document.createElement('a')
      a.href = data.url
      a.download = data.filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      alert('Не успеа симнувањето.')
    } finally {
      setDownloading(false)
    }
  }

  const toggleLike = async () => {
    if (!user) {
      alert('Најави се за да лајкнеш.')
      return
    }
    try {
      const { data } = await materialsApi.toggleLike(material.id)
      setLiked(data.liked)
      setLikes(data.likes_count)
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="card-hover group">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-4xl shrink-0">{fileIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1">
            {material.subject_name && (
              <span className="badge text-[9px]">
                {material.subject_name.length > 24 ? material.subject_name.slice(0, 24) + '…' : material.subject_name}
              </span>
            )}
            {material.semester && (
              <span className="badge text-[9px]">Сем. {material.semester}</span>
            )}
            <span className="badge text-[9px]">
              {material.extension?.replace('.', '').toUpperCase()}
            </span>
          </div>
          <h3 className="font-display text-lg leading-tight mb-1 group-hover:text-accent transition-colors line-clamp-2">
            {material.title}
          </h3>
          {material.subject_name && (
            <p className="text-xs text-muted truncate">{material.subject_name}</p>
          )}
        </div>
      </div>

      {material.description && (
        <p className="text-sm text-muted line-clamp-2 mb-4">{material.description}</p>
      )}

      <div className="flex items-center gap-3 mb-4 text-xs font-mono text-subtle">
        <span className="flex items-center gap-1">
          <FileText size={11} /> {(material.file_size / 1024).toFixed(0)} KB
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {new Date(material.created_at).toLocaleDateString('mk-MK')}
        </span>
      </div>

      {/* Uploader */}
      <Link
        to={`/users/${material.uploaded_by}`}
        className="flex items-center gap-2 text-xs text-muted mb-4 hover:text-accent transition-colors"
      >
        {material.uploaded_by_avatar ? (
          <img
            src={material.uploaded_by_avatar}
            alt=""
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white text-[10px] font-bold">
            {material.uploaded_by_username?.[0]?.toUpperCase()}
          </div>
        )}
        <span>од <strong>{material.uploaded_by_username}</strong></span>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-primary !py-1.5 !px-3 text-xs flex-1"
        >
          {downloading
            ? <Loader2 size={13} className="animate-spin" />
            : <Download size={13} />}
          <span>{downloading ? 'Се симнува…' : 'Симни'}</span>
        </button>
        <button
          onClick={toggleLike}
          className="btn-secondary !py-1.5 !px-3 text-xs"
        >
          <Heart size={13} className={liked ? 'fill-accent text-accent' : ''} />
          <span>{likes}</span>
        </button>
        <div className="flex items-center gap-1 text-xs font-mono text-subtle px-2">
          <Download size={11} />
          <span>{downloads}</span>
        </div>
      </div>
    </div>
  )
}

function FilterPill({ active, onClick, children, block }) {
  return (
    <button
      onClick={onClick}
      className={`${block ? 'block w-full text-left ' : ''}px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded-lg border transition-colors
        ${active
          ? 'bg-accent text-white border-accent'
          : 'border-border hover:border-fg/30 hover:bg-fg/5'}`}
    >
      {children}
    </button>
  )
}
