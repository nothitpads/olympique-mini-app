import React from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function QuickActions({ checkedInToday, onAttendanceSaved }) {
  const navigate = useNavigate()
  const showToast = useToast()
  const [submitting, setSubmitting] = React.useState(false)

  const markArrived = async () => {
    if (checkedInToday || submitting) return
    setSubmitting(true)
    try {
      await api.post('/attendance', { time: new Date().toISOString() })
      showToast('Посещение отмечено ✅')
      onAttendanceSaved?.()
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
    } catch (err) {
      console.warn('CLIENT: attendance save failed', err?.response?.data || err.message)
      showToast('Не удалось отметить посещение', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex gap-3 mb-4 flex-wrap">
      <button
        onClick={markArrived}
        className="btn-main-small"
        disabled={checkedInToday || submitting}
        style={checkedInToday ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
      >
        {checkedInToday ? 'Отмечено' : 'Я пришёл'}
      </button>
      <button
        onClick={()=>navigate('/tracking', { state: { focus: 'nutrition' }})}
        className="btn-main-small"
      >
        Ввести БЖУ
      </button>
    </div>
  )
}
