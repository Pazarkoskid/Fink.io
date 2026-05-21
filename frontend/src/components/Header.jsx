import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  Menu, X, User, LogOut, Upload, Shield, GraduationCap,
  Trophy, Crown, BookmarkCheck, ChevronDown, Database, Plus, Users,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { authApi } from '../lib/api'
import ThemeToggle from './ThemeToggle'
import Logo from './Logo'

const navLinks = [
  { to: '/', label: 'Почетна', end: true },
  { to: '/search', label: 'Квизови' },
  { to: '/databases', label: 'Бази' },
  { to: '/leaderboard', label: 'Ранг листа' },
  { to: '/my-quizzes', label: 'Мои', auth: true },
  { to: '/help', label: 'Поддршка' },
]

export default function Header() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const isInstructor = useAuth((s) => s.isInstructor())
  const isModerator = useAuth((s) => s.isModerator())
  const isAdmin = useAuth((s) => s.isAdmin())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [friendRequestCount, setFriendRequestCount] = useState(0)
  const menuRef = useRef(null)

  // Close user menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Poll friend request count for logged-in user
  useEffect(() => {
    if (!user) {
      setFriendRequestCount(0)
      return
    }
    let cancelled = false
    const fetch = () => {
      authApi.myFriendRequests().then((r) => {
        if (!cancelled) setFriendRequestCount(r.data.received_count || 0)
      }).catch(() => {})
    }
    fetch()
    const id = setInterval(fetch, 60000)  // refresh every minute
    return () => { cancelled = true; clearInterval(id) }
  }, [user])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    `relative px-1 py-2 text-sm font-medium transition-colors
     ${isActive
       ? 'text-fg'
       : 'text-muted hover:text-fg'}`

  return (
    <header className="sticky top-0 z-40 border-b border-border"
            style={{
              backgroundColor: 'rgb(var(--bg) / 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}>
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo size={36} />
            <span className="font-display text-2xl font-semibold tracking-tight hidden sm:inline">
              Fink<span className="text-accent">.</span>io
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => {
              if (link.auth && !user) return null
              return (
                <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {isActive && (
                        <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-accent rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle compact />

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-fg/5 transition-colors relative"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-sm shrink-0 relative">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.username?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                    {friendRequestCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-accent text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center border-2 border-bg">
                        {friendRequestCount > 9 ? '9+' : friendRequestCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {user.username}
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-2xl shadow-medium overflow-hidden animate-fade-in"
                       style={{
                         backgroundColor: 'rgb(var(--surface))',
                         boxShadow: '0 12px 40px -8px rgb(var(--shadow) / 0.35)',
                       }}>
                    <div className="p-3 border-b border-border flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{user.username?.[0]?.toUpperCase() || 'U'}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{user.username}</p>
                        <p className="text-xs text-muted truncate">{user.email}</p>
                        <span className="badge-soft mt-1 inline-flex text-[9px]">{user.role}</span>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <MenuItem to={`/users/${user.id}`} icon={User} onClick={() => setMenuOpen(false)}>
                        Јавен профил
                      </MenuItem>
                      <MenuItem to="/profile" icon={User} onClick={() => setMenuOpen(false)}>
                        Подесувања
                      </MenuItem>
                      <MenuItem
                        to="/friends"
                        icon={Users}
                        onClick={() => setMenuOpen(false)}
                        badge={friendRequestCount}
                      >
                        Пријатели
                      </MenuItem>
                      <MenuItem to="/my-quizzes" icon={BookmarkCheck} onClick={() => setMenuOpen(false)}>
                        Мои квизови
                      </MenuItem>
                      <MenuItem to="/create-quiz" icon={Plus} onClick={() => setMenuOpen(false)}>
                        Создади квиз
                      </MenuItem>
                      <MenuItem to="/upload" icon={Upload} onClick={() => setMenuOpen(false)}>
                        Прикачи материјал
                      </MenuItem>

                      {isInstructor && (
                        <>
                          <div className="divider my-1" />
                          <MenuItem to="/instructor" icon={GraduationCap} onClick={() => setMenuOpen(false)}>
                            Командна табла
                          </MenuItem>
                        </>
                      )}

                      {(isModerator || isAdmin) && <div className="divider my-1" />}
                      {isModerator && (
                        <MenuItem to="/moderation" icon={Shield} onClick={() => setMenuOpen(false)}>
                          Модерација
                        </MenuItem>
                      )}
                      {isAdmin && (
                        <MenuItem to="/admin" icon={Crown} onClick={() => setMenuOpen(false)}>
                          Админ панел
                        </MenuItem>
                      )}

                      <div className="divider my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-accent hover:bg-accent/10 transition-colors"
                      >
                        <LogOut size={15} /> Одјави се
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="btn-ghost">Најави се</Link>
                <Link to="/register" className="btn-primary">Регистрирај</Link>
              </div>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-fg/5"
              aria-label="Меню"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border py-3 animate-slide-up">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                if (link.auth && !user) return null
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                       ${isActive ? 'bg-accent/10 text-accent' : 'hover:bg-fg/5'}`
                    }
                  >
                    {link.label}
                  </NavLink>
                )
              })}
              {!user && (
                <div className="pt-3 mt-1 border-t border-border flex gap-2">
                  <Link to="/login" className="btn-ghost flex-1" onClick={() => setMobileOpen(false)}>
                    Најави се
                  </Link>
                  <Link to="/register" className="btn-primary flex-1" onClick={() => setMobileOpen(false)}>
                    Регистрирај
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

function MenuItem({ to, icon: Icon, children, onClick, badge }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-fg/5 transition-colors"
    >
      <Icon size={15} className="text-muted" />
      <span className="flex-1">{children}</span>
      {badge > 0 && (
        <span className="bg-accent text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  )
}
