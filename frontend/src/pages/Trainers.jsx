import React, { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import TrainerCard from '../components/TrainerCard'
import api from '../services/api'

const specialtiesOptions = ['Силовые тренировки', 'Похудение', 'Набор массы', 'Функционал', 'Реабилитация']

export default function Trainers({ user }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('')

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      specialty: specialty || undefined,
      sort: 'rating',
      limit: 30
    }),
    [search, specialty]
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/trainers', { params })
        if (!cancelled) {
          setItems(res.data?.items || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError('Не удалось загрузить каталог тренеров')
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params])

  return (
    <div className="pt-3 pb-28">
      <Header title="Каталог тренеров" subtitle="Поддержка и сопровождение" avatar={user?.photo_url} />
      <div className="max-w-lg mx-auto px-4">
        <div className="card p-3 rounded-2xl bg-white/5 border border-white/5 mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, специализации…"
            className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => setSpecialty('')}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                specialty ? 'border-white/10 text-gray-300' : 'border-indigo-400 text-white bg-indigo-500/20'
              }`}
            >
              Все
            </button>
            {specialtiesOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSpecialty(opt)}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  specialty === opt ? 'border-indigo-400 text-white bg-indigo-500/20' : 'border-white/10 text-gray-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="card p-4 rounded-2xl text-gray-400">Загружаем тренеров…</div>}
        {error && <div className="card p-4 rounded-2xl text-red-300">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="card p-4 rounded-2xl text-gray-400">Пока нет тренеров в каталоге.</div>
        )}
        <div className="space-y-3">
          {items.map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
      </div>
    </div>
  )
}

