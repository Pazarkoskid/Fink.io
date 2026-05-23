import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
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
            Најава
          </p>
          <h1 className="font-display text-4xl">Добредојде назад</h1>
        </div>

        <form onSubmit={onSubmit} className="card space-y-5">
          <div>
            <label className="label">E-mail</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ime@finki.ukim.mk"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-accent/10 border-2 border-accent text-fg px-4 py-2 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Се најавувам…' : 'Најави се'}
          </button>

          <div className="text-center text-sm text-fg">
            Немаш профил?{' '}
            <Link to="/register" className="text-accent font-medium hover:underline">
              Регистрирај се
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
