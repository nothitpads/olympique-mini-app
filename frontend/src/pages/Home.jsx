import React, {useEffect, useState, useCallback} from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import StatCard from '../components/StatCard'
import WorkoutCard from '../components/WorkoutCard'
import ProgressCard from '../components/ProgressCard'
import { Bars } from '../components/ProgressBars'
import QuickActions from '../components/QuickActions'
import api from '../services/api'

function formatWorkoutMeta(workout) {
  if (!workout?.date) return null
  const dateObj = new Date(workout.date)
  const dateLabel = Number.isNaN(dateObj.getTime())
    ? workout.date
    : dateObj.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
  if (workout.time) {
    return `${dateLabel} • ${workout.time}`
  }
  return dateLabel
}

export default function Home({ user }){
  const [dashboard,setDashboard] = useState(null)
  const [loading,setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/me/dashboard')
      setDashboard(res.data || {})
    } catch (err) {
      console.warn('CLIENT: dashboard load failed', err?.response?.data || err.message)
      setDashboard(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    const handler = () => fetchDashboard()
    window.addEventListener('dashboard:refresh', handler)
    return () => window.removeEventListener('dashboard:refresh', handler)
  }, [fetchDashboard])

  const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'спортсмен' : null
  const greeting = displayName ? `Добро пожаловать, ${displayName}!` : 'Добро пожаловать!'
  const subtitle = null
  const weights = dashboard?.weights || {}
  const weekly = Array.isArray(dashboard?.weeklyAttendance) ? dashboard.weeklyAttendance : null
  const upcoming = dashboard?.upcomingWorkouts || []
  const todayStr = new Date().toISOString().slice(0,10)
  const todaysWorkouts = upcoming.filter(w => w.date === todayStr)
  const futureWorkouts = upcoming.filter(w => w.date !== todayStr)
  const hasWeeklyData = Array.isArray(weekly) && weekly.some((v)=>v>0)
  const showWeeklyEmpty = Array.isArray(weekly) && !hasWeeklyData
  const weeklyWorkouts = dashboard?.weeklyWorkouts ?? 0
  const todayCalories = dashboard?.todayNutrition?.calories ?? 0
  const todayProtein = dashboard?.todayNutrition?.protein ?? 0
  const needsWeightEntry = dashboard?.needsWeightEntry
  const planToday = dashboard?.planToday
  const weightEmptyMessage = needsWeightEntry
    ? 'Добавьте первый вес, чтобы видеть прогресс'
    : 'Укажите цель по весу'
  const goToTracking = (focus) => () => navigate('/tracking', { state: { focus } })

  return (
    <div className="pt-3 pb-28"> {/* pb-28 to avoid nav */}
      <Header title={greeting} subtitle={subtitle} avatar={user?.photo_url} />
      <div className="max-w-lg mx-auto px-4 mb-4">
        <div className="stats-row mb-4">
          <StatCard
            title="На этой неделе"
            value={dashboard ? `${weeklyWorkouts} трен.` : (loading ? '…' : '0')}
            className="w-full"
          />
          <StatCard
            title="Калории и белки (сегодня)"
            value={dashboard ? `${todayCalories} ккал • ${todayProtein} г` : (loading ? '…' : '0')}
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <div className="text-sm small-muted mb-2">Сегодня</div>
          {planToday && (
            <div className="card p-4 rounded-2xl mb-3">
              <div className="small-muted mb-1">План на сегодня</div>
              <div className="font-semibold text-lg">{planToday.title}</div>
            </div>
          )}
          {loading && <div className="card p-4 rounded-2xl small-muted">Загружаем тренировки…</div>}
          {!loading && todaysWorkouts.length === 0 && !planToday && (
            <div className="card p-4 rounded-2xl small-muted">
              Нет тренировок на сегодня. Задайте план в календаре.
            </div>
          )}
          {todaysWorkouts.length > 0 && (
            <div className="flex overflow-x-auto pb-2">
              {todaysWorkouts.map((w)=>(
                <WorkoutCard
                  key={w.id || `${w.date}-${w.title}`}
                  title={w.title}
                  meta={formatWorkoutMeta(w)}
                  note={w.notes}
                />
              ))}
            </div>
          )}
        </div>

        <QuickActions
          checkedInToday={dashboard?.checkedInToday}
          onAttendanceSaved={fetchDashboard}
        />

        {futureWorkouts.length > 0 && (
          <div className="mb-4">
            <div className="text-sm small-muted mb-2">Следующие</div>
            <div className="flex overflow-x-auto pb-2">
              {futureWorkouts.map((w)=>(
                <WorkoutCard
                  key={w.id || `${w.date}-${w.title}`}
                  title={w.title}
                  meta={formatWorkoutMeta(w)}
                  note={w.notes}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <ProgressCard
            start={weights.start}
            current={weights.current}
            target={weights.target}
            emptyMessage={weightEmptyMessage}
            onAction={goToTracking('weight')}
          />
        </div>

        <div className="mb-6">
          <div className="text-sm small-muted mb-2">Тренировки (неделя)</div>
          <div className="card rounded-2xl p-3">
            {hasWeeklyData && <Bars values={weekly} />}
            {showWeeklyEmpty && <div className="text-center text-sm small-muted py-6">На этой неделе вы не тренировались.</div>}
            {!weekly && (
              <div className="text-center text-sm small-muted py-6">
                {loading ? 'Смотрим статистику…' : 'Данные недоступны'}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
