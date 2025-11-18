import React, { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header'
import { Bars } from '../components/ProgressBars'
import api from '../services/api'

const RANGE_OPTIONS = [
  { label: '7 дней', value: 7 },
  { label: '30 дней', value: 30 }
]

export default function TrainerMonitoring({ user }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/trainer/monitoring', { params: { rangeDays: range } })
      setSummary(res.data || null)
    } catch (err) {
      console.warn('TRAINER: monitoring failed', err?.response?.data || err.message)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const ranking = summary?.ranking || []

  return (
    <div className="pt-3 pb-28">
      <Header title="Мониторинг" subtitle="Аналитика" avatar={user?.photo_url} />
      <div className="max-w-lg mx-auto px-4 space-y-4">
        <div className="card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">Период анализа</div>
            <div className="flex gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`px-3 py-1 rounded-full text-xs ${
                    option.value === range ? 'bg-white text-black' : 'bg-white/10 text-white'
                  }`}
                  onClick={() => setRange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {loading && <div className="text-sm text-gray-400">Собираем данные…</div>}
          {!loading && summary && (
            <>
              <div className="text-sm text-gray-400 mb-2">Тренировки по дням недели</div>
              <Bars values={summary.workoutsByWeekday || []} />
            </>
          )}
        </div>

        <div className="card rounded-2xl p-4">
          <div className="text-base font-semibold mb-2">Соблюдение КБЖУ</div>
          {loading && <div className="text-sm text-gray-400">Анализируем…</div>}
          {!loading && (
            <div className="text-2xl font-semibold">
              {summary?.calorieAdherence === null ? 'Нет данных' : `${summary.calorieAdherence}%`}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">Процент дней, когда клиент укладывается в цели</div>
        </div>

        <div className="card rounded-2xl p-4 space-y-2">
          <div className="text-base font-semibold">Отклонения от планов</div>
          {loading && <div className="text-sm text-gray-400">Считаем…</div>}
          {!loading && ranking.length === 0 && <div className="text-sm text-gray-400">Пока нет ранжирования.</div>}
          {!loading &&
            ranking.slice(0, 10).map((item) => (
              <div key={item.id} className="flex justify-between text-sm border-b border-white/5 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                <span>{item.name}</span>
                <span className={item.delta > 0 ? 'text-red-300' : 'text-lime-300'}>
                  {item.delta > 0 ? '+' : ''}
                  {item.delta} кг
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

