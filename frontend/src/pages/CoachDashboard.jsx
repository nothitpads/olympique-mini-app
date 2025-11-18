import React, {useEffect, useState} from 'react'
import Header from '../components/Header'
import api from '../services/api'

export default function CoachDashboard({ user }){
  const [clients,setClients] = useState([])
  useEffect(()=> {
    api.get('/clients').then(r=> setClients(r.data || [])).catch(()=> setClients([]))
  },[])
  return (
    <div className="pt-3 pb-28">
      <Header title="Панель тренера" subtitle="Клиенты" avatar={user?.photo_url} />
      <div className="max-w-lg mx-auto px-4">
        <div className="space-y-3">
          {clients.length===0 && <div className="text-gray-400">Нет клиентов</div>}
          {clients.map(c=>(
            <div key={c.id} className="card p-3 rounded-2xl flex justify-between items-center">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="small-muted">Последняя активность: {c.lastActive}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn-main-small">Просмотр</button>
                <button className="btn-main-small">Напомнить</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
