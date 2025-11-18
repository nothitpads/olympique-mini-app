import React, { useEffect, useState, useCallback } from 'react'
import Header from '../components/Header'
import TrainerClientCard from '../components/TrainerClientCard'
import api from '../services/api'

export default function TrainerHome({ user }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/trainer/home')
      setSummary(res.data || null)
    } catch (err) {
      console.warn('TRAINER: home load failed', err?.response?.data || err.message)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const totals = summary?.totals || {}
  const spotlight = summary?.spotlight || []

  return (
    <div className="pt-3 pb-28">
      <Header title="Панель тренера" subtitle="Главная" avatar={user?.photo_url} />
      <div className="max-w-lg mx-auto px-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card rounded-2xl p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Клиенты</div>
            <div className="text-2xl font-semibold">{loading ? '…' : totals.clients ?? 0}</div>
          </div>
          <div className="card rounded-2xl p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Активны сегодня</div>
            <div className="text-2xl font-semibold">{loading ? '…' : totals.activeToday ?? 0}</div>
          </div>
          <div className="card rounded-2xl p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Тренировок / нед.</div>
            <div className="text-2xl font-semibold">{loading ? '…' : totals.workoutsThisWeek ?? 0}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">Фокус</div>
            <button className="text-xs text-white/70 underline" type="button" onClick={fetchSummary}>
              Обновить
            </button>
          </div>
          {loading && <div className="card p-4 rounded-2xl text-gray-400">Собираем данные…</div>}
          {!loading && spotlight.length === 0 && (
            <div className="card p-4 rounded-2xl text-gray-400">Нет клиентов для отображения.</div>
          )}
          <div className="space-y-3">
            {spotlight.map((client) => (
              <TrainerClientCard key={client.id} snapshot={client} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

