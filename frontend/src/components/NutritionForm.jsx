import React, {useState, useRef, useEffect} from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

function getLocalISODate() {
  const now = new Date()
  const offsetMinutes = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offsetMinutes * 60000)
  return local.toISOString().slice(0, 10)
}

export default function NutritionForm({ onSaved, autoFocusToken }) {
  const [form, setForm] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  })
  const [loading, setLoading] = useState(false)
  const calRef = useRef(null)
  const showToast = useToast()

  useEffect(() => {
    if (autoFocusToken && calRef.current) {
      calRef.current.focus()
    }
  }, [autoFocusToken])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const save = async () => {
    if (Object.values(form).some((value) => value === '')) return
    setLoading(true)
    try {
      await api.post('/nutrition', {
        date: getLocalISODate(),
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat)
      })
      setForm({ calories: '', protein: '', carbs: '', fat: '' })
      onSaved && onSaved()
      showToast('Запись по КБЖУ сохранена')
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
    } catch (e) {
      console.warn('CLIENT: nutrition save failed', e?.response?.data || e.message)
      showToast('Не удалось сохранить КБЖУ', 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full p-3 rounded-lg bg-white/80 text-black placeholder-black/60"

  return (
    <div className="space-y-3">
      <div>
        <label className="small-muted block mb-1">Калории</label>
        <input ref={calRef} type="number" value={form.calories} onChange={handleChange('calories')} className={inputClass} placeholder="ккал" />
      </div>
      <div>
        <label className="small-muted block mb-1">Белок</label>
        <input type="number" value={form.protein} onChange={handleChange('protein')} className={inputClass} placeholder="г" />
      </div>
      <div>
        <label className="small-muted block mb-1">Углеводы</label>
        <input type="number" value={form.carbs} onChange={handleChange('carbs')} className={inputClass} placeholder="г" />
      </div>
      <div>
        <label className="small-muted block mb-1">Жиры</label>
        <input type="number" value={form.fat} onChange={handleChange('fat')} className={inputClass} placeholder="г" />
      </div>
      <button
        style={{ background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))' }}
        className="w-full py-3 rounded-lg disabled:opacity-50"
        onClick={save}
        disabled={loading || Object.values(form).some((value) => value === '')}
      >
        Сохранить
      </button>
    </div>
  )
}
