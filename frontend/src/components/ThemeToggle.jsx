import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../lib/theme'

const OPTIONS = [
  { key: 'light',  icon: Sun,     label: 'Светло' },
  { key: 'dark',   icon: Moon,    label: 'Темно' },
  { key: 'system', icon: Monitor, label: 'Систем' },
]

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme()

  // Compact mode: just an icon button that cycles through
  if (compact) {
    const current = OPTIONS.find(o => o.key === theme) || OPTIONS[2]
    const Icon = current.icon
    return (
      <button
        type="button"
        onClick={() => {
          const idx = OPTIONS.findIndex(o => o.key === theme)
          setTheme(OPTIONS[(idx + 1) % OPTIONS.length].key)
        }}
        className="p-2 rounded-xl hover:bg-fg/10 transition-colors"
        title={`Тема: ${current.label}`}
        aria-label="Промени тема"
      >
        <Icon size={18} />
      </button>
    )
  }

  // Full mode: segmented control
  return (
    <div className="inline-flex items-center gap-0.5 p-1 rounded-xl border border-border bg-surface">
      {OPTIONS.map(o => {
        const Icon = o.icon
        const isActive = theme === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setTheme(o.key)}
            className={`p-2 rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-accent text-white shadow-soft'
                : 'text-muted hover:text-fg hover:bg-fg/5'}`}
            title={o.label}
            aria-label={o.label}
            aria-pressed={isActive}
          >
            <Icon size={16} />
          </button>
        )
      })}
    </div>
  )
}
