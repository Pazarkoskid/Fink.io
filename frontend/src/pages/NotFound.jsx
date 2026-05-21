import { Link } from 'react-router-dom'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container-app py-20 text-center">
      <p className="font-display text-[10rem] leading-none font-semibold text-accent">404</p>
      <h1 className="font-display text-3xl mb-3">Страницата не е пронајдена.</h1>
      <p className="text-ink-700 mb-8 max-w-md mx-auto">
        Можеби линкот е истечен, или страницата била преместена.
        Врати се на почетна или пребарувај квизови.
      </p>
      <div className="flex gap-3 justify-center">
        <Link to="/" className="btn-primary">
          <Home size={16} /> Почетна
        </Link>
        <Link to="/search" className="btn-secondary">
          <Search size={16} /> Пребарај
        </Link>
      </div>
    </div>
  )
}
