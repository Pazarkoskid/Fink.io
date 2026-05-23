import { Link } from 'react-router-dom'
import { Heart, ExternalLink, Github } from 'lucide-react'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="container-app py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <Logo size={32} />
              <span className="font-display text-xl font-semibold">
                Fink<span className="text-accent">.</span>io
              </span>
            </Link>
            <p className="text-sm text-muted max-w-md mb-4">
              AI-powered quiz platform for FINKI students. Прикачи материјал,
              генерирај квалитетни прашања, учи паметно.
            </p>
          </div>

          {/* Explore */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
              Истражувај
            </p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search" className="hover:text-accent transition-colors">Квизови</Link></li>
              <li><Link to="/databases" className="hover:text-accent transition-colors">Бази</Link></li>
              <li><Link to="/leaderboard" className="hover:text-accent transition-colors">Ранг листа</Link></li>
              <li><Link to="/help" className="hover:text-accent transition-colors">Помош</Link></li>
            </ul>
          </div>

          {/* About / Tech */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
              About
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://pazarkoskid.github.io/portfolio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors inline-flex items-center gap-1"
                >
                  Portfolio <ExternalLink size={11} />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/pazarkoskid"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors inline-flex items-center gap-1"
                >
                  <Github size={12} /> GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-mono text-subtle">
            © {new Date().getFullYear()} Fink.io. All rights reserved.
          </p>
          <p className="text-xs text-muted flex items-center gap-1.5">
            Made with <Heart size={11} className="fill-accent text-accent" /> by{' '}
            <a
              href="https://pazarkoskid.github.io/portfolio/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-fg hover:text-accent transition-colors inline-flex items-center gap-1"
            >
              Pazarkoski <ExternalLink size={10} />
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
