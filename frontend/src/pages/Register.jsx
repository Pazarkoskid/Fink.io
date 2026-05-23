import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User as UserIcon, GraduationCap } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    role: 'student',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const register = useAuth((s) => s.register)
  const navigate = useNavigate()

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-app py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
            Регистрација
          </p>
          <h1 className="font-display text-4xl">Создај профил</h1>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label">Корисничко име</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={form.username}
                onChange={update('username')}
                className="input pl-10"
                required
                minLength={3}
              />
            </div>
          </div>

          <div>
            <label className="label">E-mail</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Лозинка</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                className="input pl-10"
                required
                minLength={8}
              />
            </div>
          </div>

          <div>
            <label className="label">Потврди лозинка</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                value={form.password_confirm}
                onChange={update('password_confirm')}
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Улога</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'student', label: 'Студент' },
                { value: 'instructor', label: 'Инструктор' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: opt.value })}
                  className={`px-3 py-2.5 text-sm border-2 transition-colors ${
                    form.role === opt.value
                      ? 'bg-accent text-white border-accent'
                      : 'bg-bg border-border hover:bg-surface'
                  }`}
                >
                  <GraduationCap size={14} className="inline mr-1.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-accent/10 border-2 border-accent text-fg px-4 py-2 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Се регистрирам…' : 'Регистрирај се'}
          </button>

          <div className="text-center text-sm text-fg">
            Веќе имаш профил?{' '}
            <Link to="/login" className="text-accent font-medium hover:underline">
              Најави се
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
