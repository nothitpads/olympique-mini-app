import React, { useEffect, useState, useCallback } from 'react'
import Header from '../components/Header'
import TrainerClientCard from '../components/TrainerClientCard'
import api from '../services/api'

export default function TrainerClients({ user }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/trainer/clients')
      setClients(res.data || [])
    } catch (err) {
      console.warn('TRAINER: clients load failed', err?.response?.data || err.message)
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  return (
    <div className="pt-3 pb-28">
      <Header title="Клиенты" subtitle="Снимки состояния" avatar={user?.photo_url} />
      <div className="max-w-lg mx-auto px-4 space-y-3">
        {loading && <div className="card p-4 rounded-2xl text-gray-400">Загружаем клиентов…</div>}
        {!loading && clients.length === 0 && (
          <div className="card p-4 rounded-2xl text-gray-400">Пока нет назначенных клиентов.</div>
        )}
        {clients.map((client) => (
          <TrainerClientCard key={client.id} snapshot={client} />
        ))}
      </div>
    </div>
  )
}

