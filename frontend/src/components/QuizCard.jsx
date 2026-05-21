import { Link } from 'react-router-dom'
import { Heart, Play, Clock, Sparkles, BookOpen, Bookmark } from 'lucide-react'

export default function QuizCard({ quiz }) {
  const difficultyLabel = { 1: 'Лесно', 2: 'Средно', 3: 'Тешко' }[quiz.difficulty] || 'Средно'

  return (
    <Link to={`/quiz/${quiz.id}`} className="card-hover group block relative overflow-hidden">
      {/* Hover glow */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-accent/0 group-hover:bg-accent/15 blur-3xl transition-colors duration-500 rounded-full pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1.5">
            {quiz.subject_code ? (
              <span className="badge gap-1">
                <BookOpen size={10} />
                {quiz.subject_code}
              </span>
            ) : (
              <span className="badge">Без предмет</span>
            )}
            {quiz.semester && <span className="badge">Сем. {quiz.semester}</span>}
          </div>
          {quiz.ai_generated && (
            <span className="badge-soft gap-1">
              <Sparkles size={10} /> AI
            </span>
          )}
        </div>

        <h3 className="font-display text-lg leading-tight mb-2 group-hover:text-accent transition-colors line-clamp-2">
          {quiz.title}
        </h3>

        {quiz.description && (
          <p className="text-sm text-muted line-clamp-2 mb-4 leading-relaxed">
            {quiz.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs font-mono text-subtle">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {quiz.estimated_minutes}мин
          </span>
          <span className="flex items-center gap-1">
            <Heart size={11} className={quiz.liked ? 'fill-accent text-accent' : ''} />
            {quiz.likes_count}
          </span>
          <span className="flex items-center gap-1">
            <Play size={11} />
            {quiz.plays_count}
          </span>
          {quiz.saved && (
            <Bookmark size={11} className="fill-accent text-accent ml-auto" />
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
          <span className="text-subtle truncate">
            од <span className="font-medium text-fg">{quiz.author_username}</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="badge">{difficultyLabel}</span>
            <span className="font-mono text-subtle">
              {quiz.questions_count}п
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
