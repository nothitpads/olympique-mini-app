import React, {useEffect, useState} from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import ProgressCard from '../components/ProgressCard'
import api from '../services/api'
import avatar from '../assets/avatar.png'

export default function Profile({ user }){
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await api.get('/me/dashboard')
        if (mounted) setStats(res.data || null)
      } catch (err) {
        console.warn('CLIENT: profile dashboard load failed', err?.response?.data || err.message)
        if (mounted) setStats(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStats()
    return () => { mounted = false }
  }, [])

  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Профиль' : 'Профиль'
  const subtitle = user ? (user.role === 'trainer' ? 'Тренер' : 'Клиент') : 'Профиль'
  const weights = stats?.weights || {}
  const avatarUrl = user?.photo_url || avatar
  const goToTracking = () => navigate('/tracking', { state: { focus: 'weight' }})
  const reportIssueLink = 'https://t.me/myrtleleaf'

  return (
    <div className="pt-3 pb-28">
      <Header title="Профиль" subtitle={fullName} avatar={avatarUrl} />
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border border-white/6">
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover"/>
          </div>
          <div>
            <div className="text-lg font-semibold">{fullName}</div>
            <div className="small-muted">
              {subtitle}
              {user?.username && ` • @${user.username}`}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <ProgressCard
            start={weights.start}
            current={weights.current}
            target={weights.target}
            onAction={goToTracking}
            emptyMessage="Добавьте вес и цель, чтобы видеть прогресс"
          />
          {loading && <div className="text-xs small-muted mt-2">Обновляем прогресс…</div>}
        </div>

        <div className="mt-6">
          <a
            href={reportIssueLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full inline-flex justify-center"
          >
            Сообщить о проблеме
          </a>
        </div>
      </div>
    </div>
  )
}
