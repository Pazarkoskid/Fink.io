import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'

import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Search from './pages/Search'
import Profile from './pages/Profile'
import MyQuizzes from './pages/MyQuizzes'
import Upload from './pages/Upload'
import CreateQuiz from './pages/CreateQuiz'
import QuizPreviewEdit from './pages/QuizPreviewEdit'
import QuizDetail from './pages/QuizDetail'
import QuizPlay from './pages/QuizPlay'
import QuizResult from './pages/QuizResult'
import InstructorDashboard from './pages/InstructorDashboard'
import ModeratorQueue from './pages/ModeratorQueue'
import Leaderboard from './pages/Leaderboard'
import QuizAnalytics from './pages/QuizAnalytics'
import AdminPanel from './pages/AdminPanel'
import UserProfile from './pages/UserProfile'
import Friends from './pages/Friends'
import Databases from './pages/Databases'
import Help from './pages/Help'
import NotFound from './pages/NotFound'

export default function App() {
  const hydrate = useAuth((s) => s.hydrate)
  const loading = useAuth((s) => s.loading)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="font-mono text-sm uppercase tracking-widest text-muted">
          Се вчитува…
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="help" element={<Help />} />

        <Route path="quiz/:id" element={<QuizDetail />} />
        <Route path="quiz/:id/play" element={<QuizPlay />} />
        <Route path="quiz/:id/result" element={<QuizResult />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="users/:id" element={<UserProfile />} />
        <Route path="databases" element={<Databases />} />

        {/* Authenticated (any role) */}
        <Route element={<RequireAuth />}>
          <Route path="profile" element={<Profile />} />
          <Route path="friends" element={<Friends />} />
          <Route path="my-quizzes" element={<MyQuizzes />} />
          <Route path="upload" element={<Upload />} />
          <Route path="create-quiz" element={<CreateQuiz />} />
          <Route path="quiz/:id/edit" element={<QuizPreviewEdit />} />
          <Route path="quiz/:id/analytics" element={<QuizAnalytics />} />
        </Route>

        {/* Instructor */}
        <Route element={<RequireAuth role="instructor" />}>
          <Route path="instructor" element={<InstructorDashboard />} />
        </Route>

        {/* Moderator */}
        <Route element={<RequireAuth role="moderator" />}>
          <Route path="moderation" element={<ModeratorQueue />} />
        </Route>

        {/* Admin */}
        <Route element={<RequireAuth role="admin" />}>
          <Route path="admin" element={<AdminPanel />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
