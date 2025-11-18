import React, {useState} from 'react'
import Header from '../components/Header'
import Modal from '../components/Modal'

export default function AI({ user }){
  const [q,setQ] = useState('')
  const [history,setHistory] = useState([])
  const [open,setOpen] = useState(false)

  const send = async () => {
    if(!q.trim()) return
    const text = q.trim()
    setQ('')
    await new Promise(r=>setTimeout(r,400))
    const reply = 'Рекомендация: баланс белков и дефицит 300 ккал.'
    setHistory(h=>[{q:text,reply,time:new Date().toLocaleTimeString()}, ...h])
  }

  return (
    <div className="pt-3 pb-28">
      <Header title="AI Ассистент" subtitle="Задай вопрос тренеру" avatar={user?.photo_url} />
      <div className="max-w-lg mx-auto px-4">
        <div className="card rounded-2xl p-4 mb-4">
          <textarea
            value={q}
            onChange={e=>setQ(e.target.value)}
            rows="4"
            className="w-full p-3 rounded-lg bg-white/80 text-black placeholder-black/60 mb-3"
            placeholder="Напиши вопрос..."
          ></textarea>
          <div className="flex gap-2">
            <button className="btn-main-small" onClick={send}>Отправить</button>
            <button className="btn-main-small" onClick={()=>setOpen(true)}>Примеры</button>
          </div>
        </div>

        <div className="text-sm small-muted mb-3">История</div>
        <div className="space-y-3">
          {history.length===0 && <div className="text-gray-400">Нет запросов</div>}
          {history.map((h,i)=>(
            <div key={i} className="card rounded-2xl p-3">
              <div className="text-sm small-muted mb-2">{h.q}</div>
              <div>{h.reply}</div>
              <div className="text-xs small-muted mt-2">{h.time}</div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="Примеры">
        <ul className="space-y-2">
          <li>Как похудеть без потери мышц?</li>
          <li>Сколько белка мне нужно в день?</li>
          <li>Как распланировать 3 тренировки в неделю?</li>
        </ul>
      </Modal>
    </div>
  )
}
