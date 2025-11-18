import React, {useState, useEffect, useRef} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import ProgressCard from '../components/ProgressCard'
import NutritionForm from '../components/NutritionForm'
import MealBuilder from '../components/MealBuilder'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

function getLocalISODate() {
  const now = new Date()
  const offsetMinutes = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offsetMinutes * 60000)
  return local.toISOString().slice(0, 10)
}

export default function Tracking({ user, setUser }){
  const [weight,setWeight] = useState('')
  const [history,setHistory] = useState([])
  const [nutritionFocusToken, setNutritionFocusToken] = useState(null)
  const [goalWeight, setGoalWeight] = useState(user?.goal_weight ?? null)
  const [goalInput, setGoalInput] = useState(user?.goal_weight ? String(user.goal_weight) : '')
  const [savingGoal, setSavingGoal] = useState(false)
  const weightInputRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const showToast = useToast()
  const fatsecretEnabled = import.meta.env.VITE_FATSECRET_ENABLED === 'true'

  useEffect(()=> {
    api.get('/tracking').then(r=> setHistory(r.data || [])).catch(()=>{})
  },[])

  useEffect(() => {
    if (!location.state || !location.state.focus) return
    if (location.state.focus === 'weight') {
      weightInputRef.current?.focus()
    }
    if (location.state.focus === 'nutrition') {
      setNutritionFocusToken(Date.now())
    }
    navigate(location.pathname, { replace: true })
  }, [location, navigate])

  useEffect(() => {
    if (user?.goal_weight !== undefined && user?.goal_weight !== null) {
      setGoalWeight(Number(user.goal_weight))
      setGoalInput(String(user.goal_weight))
    }
  }, [user?.goal_weight])

  const currentWeight = history.length ? Number(history[0].weight) : null
  const startWeight = history.length ? Number(history[history.length-1].weight) : null
  const save = async () => {
    if(!weight) return
    const entry = { date: getLocalISODate(), weight }
    setHistory(prev=> [entry, ...prev])
    setWeight('')
    try {
      await api.post('/tracking', entry)
      showToast('Вес записан')
    } catch (err) {
      showToast('Не удалось сохранить вес', 'error')
      console.warn('CLIENT: tracking save failed', err?.response?.data || err.message)
    }
  }

  const saveGoalWeight = async () => {
    if (!goalInput) return
    const value = Number(goalInput)
    if (Number.isNaN(value) || value <= 0) {
      showToast('Введите корректную цель по весу', 'error')
      return
    }
    setSavingGoal(true)
    try {
      const res = await api.post('/me/goal-weight', { goalWeight: value })
      const updatedValue = res.data?.goalWeight ?? value
      setGoalWeight(updatedValue)
      setGoalInput(String(updatedValue))
      if (setUser) {
        setUser((prev) => (prev ? { ...prev, goal_weight: updatedValue } : prev))
      }
      showToast('Цель по весу сохранена')
    } catch (err) {
      showToast('Не удалось сохранить цель по весу', 'error')
      console.warn('CLIENT: goal weight save failed', err?.response?.data || err.message)
    } finally {
      setSavingGoal(false)
    }
  }

  return (
    <div className="pt-3 pb-28">
      <Header title="Трекинг" subtitle="Записывай прогресс" avatar={user?.photo_url} />
      <div className="max-w-lg mx-auto px-4">
        <div className="mb-4">
          <ProgressCard
            start={startWeight}
            current={currentWeight}
            target={goalWeight}
            emptyMessage={history.length === 0 ? 'Добавьте первый вес, чтобы видеть прогресс' : 'Укажите цель по весу'}
          />
        </div>

        <div className="card p-4 rounded-2xl mb-4">
          <div className="small-muted mb-2">Записать вес</div>
          <div className="flex gap-2">
            <input
              ref={weightInputRef}
              type="number"
              value={weight}
              onChange={e=>setWeight(e.target.value)}
              className="flex-1 p-3 rounded-lg bg-white/80 text-black placeholder-black/60"
              placeholder="кг"
            />
            <button onClick={save} className="btn-main-small">Сохранить</button>
          </div>
        </div>

        <div className="card p-4 rounded-2xl mb-4">
          <div className="small-muted mb-2">Цель по весу</div>
          <div className="flex gap-2">
            <input
              type="number"
              value={goalInput}
              onChange={e=>setGoalInput(e.target.value)}
              className="flex-1 p-3 rounded-lg bg-white/80 text-black placeholder-black/60"
              placeholder="кг"
            />
            <button onClick={saveGoalWeight} className="btn-main-small" disabled={savingGoal}>
              {savingGoal ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>

        <div className="card p-4 rounded-2xl mb-4">
          <div className="small-muted mb-2">Ввести КБЖУ</div>
          <NutritionForm autoFocusToken={nutritionFocusToken} onSaved={()=>setNutritionFocusToken(null)} />
        </div>

        {fatsecretEnabled && (
          <div className="card p-4 rounded-2xl mb-4">
            <div className="small-muted mb-2">Подбор продуктов (FatSecret)</div>
            <MealBuilder onSaved={() => setNutritionFocusToken(null)} />
          </div>
        )}

        <div>
          <div className="text-sm small-muted mb-2">История</div>
          <div className="space-y-2">
            {history.length===0 && <div className="text-gray-400">Записей пока нет</div>}
            {history.map((h,i)=>(
              <div key={i} className="card p-3 rounded-2xl flex justify-between items-center">
                <div>
                  <div className="font-medium">{h.date}</div>
                  <div className="small-muted">{h.weight} кг</div>
                </div>
                <div className="text-xs small-muted">—</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
