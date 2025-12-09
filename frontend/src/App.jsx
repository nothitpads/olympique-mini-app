import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import AI from './pages/AI'
import Calendar from './pages/Calendar'
import Tracking from './pages/Tracking'
import Profile from './pages/Profile'
import CoachDashboard from './pages/CoachDashboard'
import TrainerHome from './pages/TrainerHome'
import TrainerClients from './pages/TrainerClients'
import TrainerClientProfile from './pages/TrainerClientProfile'
import TrainerMonitoring from './pages/TrainerMonitoring'
import Trainers from './pages/Trainers'
import TrainerProfile from './pages/TrainerProfile'
import BottomNav from './components/BottomNav'
import useAuth from './hooks/useAuth'
import './index.css'

export default function App(){
  const { user, loading, setUser } = useAuth()
  const isTrainer = user?.role === 'trainer'

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-screen">
        <div className="small-muted text-center">Загружаем профиль…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-shell flex items-center justify-center min-h-screen px-6 text-center">
        <div>
          <div className="text-lg font-semibold mb-2">Не удалось авторизоваться</div>
          <p className="small-muted">Пожалуйста, откройте мини-приложение из Telegram, чтобы мы могли получить initData.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="flex-1 overflow-auto">
        <Routes>
          {isTrainer ? (
            <>
              <Route path="/" element={<TrainerHome user={user} />} />
              <Route path="/clients" element={<TrainerClients user={user} />} />
              <Route path="/clients/:clientId" element={<TrainerClientProfile />} />
              <Route path="/monitoring" element={<TrainerMonitoring user={user} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home user={user}/>} />
              <Route path="/ai" element={<AI user={user}/>} />
              <Route path="/calendar" element={<Calendar user={user}/>} />
              <Route path="/tracking" element={<Tracking user={user} setUser={setUser}/>} />
              <Route path="/profile" element={<Profile user={user}/>} />
              <Route path="/coach" element={<CoachDashboard user={user}/>} />
              <Route path="/trainers" element={<Trainers user={user} />} />
              <Route path="/trainers/:trainerId" element={<TrainerProfile />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </div>
      <BottomNav user={user} />
    </div>
  )
}
