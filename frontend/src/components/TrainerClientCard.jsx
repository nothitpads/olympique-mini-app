import React from 'react'
import { useNavigate } from 'react-router-dom'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

function getStatusLabel(status) {
  if (status === 'exceeded') return 'Превышено'
  if (status === 'within_target') return 'В пределах цели'
  if (status === 'below_target') return 'Не добрал'
  return 'Цель не задана'
}

function statusClass(status) {
  if (status === 'exceeded') return 'text-red-400'
  if (status === 'within_target') return 'text-lime-300'
  if (status === 'below_target') return 'text-yellow-300'
  return 'text-gray-400'
}

function formatWeightDelta(delta) {
  if (delta === null || delta === undefined) return '—'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta} кг`
}

const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function TrainerClientCard({ snapshot = {} }) {
  const nav = useNavigate()
  const nutrition = snapshot.todayNutrition || { calories: 0, protein: 0, status: 'not_set' }
  const weight = snapshot.weight || { current: null, delta: null }
  const planLabel = snapshot.planToday?.title || 'Нет плана'
  const planDayIndex = typeof snapshot.planToday?.day_of_week === 'number' ? snapshot.planToday.day_of_week : null
  const day = planDayIndex !== null ? dayNames[planDayIndex] : null
  return (
    <button
      type="button"
      className="card w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 shadow-sm"
      onClick={() => nav(`/clients/${snapshot.id}`)}
    >
      <div className="flex items-center gap-3 mb-3">
        {snapshot.avatar ? (
          <img src={snapshot.avatar} alt={snapshot.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm">
            {snapshot.name?.[0] || '•'}
          </div>
        )}
        <div>
          <div className="font-semibold text-base">{snapshot.name}</div>
          <div className="text-xs text-gray-400">Последняя активность: {formatDate(snapshot.lastActive)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xs text-gray-400 mb-1">Тренировки / нед.</div>
          <div className="text-lg font-semibold">{snapshot.weeklyWorkouts}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xs text-gray-400 mb-1">Калории / Б</div>
          <div className="font-semibold">{nutrition.calories} ккал</div>
          <div className="text-xs">{nutrition.protein} г</div>
          <div className={`text-xs ${statusClass(nutrition.status)}`}>
            {getStatusLabel(nutrition.status)}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xs text-gray-400 mb-1">Вес</div>
          <div className="font-semibold">{weight.current ?? '—'} кг</div>
          <div className="text-xs">{formatWeightDelta(weight.delta)}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        {day && <span className="font-semibold text-gray-200">{day}:</span>} {planLabel}
      </div>
    </button>
  )
}

