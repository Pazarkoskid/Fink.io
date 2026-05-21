import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function RequireAuth({ role }) {
  const user = useAuth((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role === 'instructor' && !(user.role === 'instructor' || user.role === 'admin')) {
    return <Forbidden role="инструктор" />
  }
  if (role === 'moderator' && !(user.role === 'moderator' || user.role === 'admin')) {
    return <Forbidden role="модератор" />
  }
  if (role === 'admin' && user.role !== 'admin') {
    return <Forbidden role="администратор" />
  }

  return <Outlet />
}

function Forbidden({ role }) {
  return (
    <div className="container-app py-20 text-center">
      <h1 className="font-display text-4xl mb-3">Немате пристап</h1>
      <p className="text-ink-700 mb-6">Оваа страница е достапна само за корисници со улога <span className="font-mono uppercase">{role}</span>.</p>
    </div>
  )
}
