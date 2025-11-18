import React, {useEffect, useState, useMemo} from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

function formatMeta(w){
  if(!w?.date) return null
  const dateObj = new Date(w.date)
  const dateLabel = Number.isNaN(dateObj.getTime()) ? w.date : dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  return w.time ? `${dateLabel} • ${w.time}` : dateLabel
}

const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']

const REST_LABEL = 'Отдых'

const MUSCLE_GROUPS = [
  { key: 'rest', label: REST_LABEL },
  { key: 'chest', label: 'Грудь' },
  { key: 'back', label: 'Спина' },
  { key: 'legs', label: 'Ноги' },
  { key: 'arms', label: 'Руки' },
  { key: 'shoulders', label: 'Плечи' },
  { key: 'core', label: 'Кор' },
  { key: 'abs', label: 'Пресс' },
  { key: 'cardio', label: 'Кардио' },
  { key: 'hiit', label: 'HIIT' },
  { key: 'mobility', label: 'Мобилити' },
  { key: 'stretch', label: 'Растяжка' }
]

const labelLookup = MUSCLE_GROUPS.reduce((acc, group) => {
  acc[normalizeLabel(group.label)] = group.label
  return acc
}, {})

function normalizeLabel(value = ''){
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function parseMuscles(raw){
  if (!raw) return []
  const normalized = raw
    .replace(/[•·\+]/g, ',')
    .split(/[,/|]/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((token) => labelLookup[normalizeLabel(token)] || token)

  const seen = new Set()
  return normalized.filter((token) => {
    const key = normalizeLabel(token)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatMuscleTitle(muscles = []){
  if (!Array.isArray(muscles) || muscles.length === 0) return ''
  return muscles.join(', ')
}

function getNextSelection(current = [], candidate){
  const entry = candidate?.label || candidate
  const label = typeof entry === 'string' ? entry : ''
  if (!label) return current

  if (label === REST_LABEL){
    if (current.length === 1 && current[0] === REST_LABEL){
      return current
    }
    return [REST_LABEL]
  }

  const withoutRest = current.filter((item) => item !== REST_LABEL)
  const exists = withoutRest.includes(label)

  if (exists){
    const remaining = withoutRest.filter((item) => item !== label)
    return remaining.length ? remaining : [REST_LABEL]
  }

  return [...withoutRest, label]
}

function arraysEqual(a = [], b = []){
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

function PencilIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.25H5v-0.92l9.06-9.06 0.92 0.92L5.92 19.5zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Calendar({ user }){
  const [workouts,setWorkouts] = useState([])
  const [loading,setLoading] = useState(true)
  const [plan, setPlan] = useState(() => days.map((label, idx) => ({ day: idx, label, muscles: [] })))
  const [planLoading, setPlanLoading] = useState(true)
  const [savingDay, setSavingDay] = useState(null)
  const [editingDay, setEditingDay] = useState(null)
  const showToast = useToast()
  const daysMap = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']

  const formatNextWorkoutMeta = (workout) => {
    if (!workout?.date) return null
    const workoutDate = new Date(workout.date)
    if (Number.isNaN(workoutDate.getTime())) return null
    const today = new Date()
    today.setHours(0,0,0,0)
    workoutDate.setHours(0,0,0,0)
    const diffDays = Math.round((workoutDate - today)/(1000*60*60*24))
    const dayLabel = daysMap[workoutDate.getDay()] || ''
    const prefix = diffDays === 0 ? 'сегодня' : diffDays === 1 ? 'завтра' : null
    const parts = [prefix, dayLabel].filter(Boolean)
    const title = workout.title || 'Тренировка'
    return `${parts.join(', ')} • ${title}`
  }

  const formatPlanEntryMeta = (entry) => {
    if (!entry) return null
    const todayIdx = new Date().getDay()
    let diff = (entry.day - todayIdx + 7) % 7
    if (diff === 0) diff = 7
    const prefix = diff === 1 ? 'завтра' : diff === 0 ? 'сегодня' : null
    const dayLabel = daysMap[entry.day] || ''
    const parts = [prefix, dayLabel].filter(Boolean)
    return parts.join(', ')
  }

  const nextWorkout = !loading && workouts.length > 0 ? workouts[0] : null
  const otherWorkouts = !loading && workouts.length > 1 ? workouts.slice(1) : []
  const nextPlanEntry = useMemo(() => {
    if (!plan || plan.length === 0) return null
    const todayIdx = new Date().getDay()
    const candidates = plan.filter((item) => Array.isArray(item.muscles) && item.muscles.length > 0)
    if (candidates.length === 0) return null
    const sorted = candidates
      .map((item) => {
        let diff = (item.day - todayIdx + 7) % 7
        if (diff === 0) diff = 7
        return { ...item, diff }
      })
      .sort((a, b) => a.diff - b.diff)
    return sorted[0] || null
  }, [plan])

  useEffect(()=> {
    let mounted = true
    const loadWorkouts = async () => {
      setLoading(true)
      try{
        const res = await api.get('/me/workouts')
        if(mounted) setWorkouts(res.data || [])
      } catch(err){
        console.warn('CLIENT: workouts load failed', err?.response?.data || err.message)
        if(mounted) setWorkouts([])
      } finally{
        if(mounted) setLoading(false)
      }
    }

    const loadPlan = async () => {
      setPlanLoading(true)
      try {
        const res = await api.get('/me/workout-plan')
        if (mounted) {
          const entries = res.data || []
          setPlan(days.map((label, idx) => {
            const match = entries.find(e => e.day_of_week === idx)
            const muscles = parseMuscles(match?.title || '')
            return {
              day: idx,
              label,
              muscles: muscles.length ? muscles : []
            }
          }))
          setEditingDay(null)
        }
      } catch (err) {
        console.warn('CLIENT: workout plan load failed', err?.response?.data || err.message)
        if (mounted) {
          setPlan(days.map((label, idx) => ({ day: idx, label, muscles: [] })))
          setEditingDay(null)
        }
      } finally {
        if (mounted) setPlanLoading(false)
      }
    }

    loadWorkouts()
    loadPlan()
    return () => { mounted = false }
  },[])

  const savePlan = async (day, musclesOverride) => {
    const entry = plan.find(item => item.day === day)
    const muscles = musclesOverride ?? entry?.muscles ?? []
    const title = formatMuscleTitle(muscles)
    if (!entry || !title) {
      showToast('Выберите хотя бы одну группу', 'error')
      return
    }
    setSavingDay(day)
    try {
      await api.post('/me/workout-plan', { day, title })
    } catch (err) {
      console.warn('CLIENT: workout plan save failed', err?.response?.data || err.message)
      showToast('Не удалось сохранить план', 'error')
    } finally {
      setSavingDay(null)
    }
  }

  const handleMuscleToggle = (day, groupLabel) => {
    const entry = plan.find(item => item.day === day)
    const current = entry?.muscles || []
    const next = getNextSelection(current, groupLabel)
    if (arraysEqual(current, next)) return
    setPlan(prev =>
      prev.map(item =>
        item.day === day ? { ...item, muscles: next } : item
      )
    )
    savePlan(day, next)
  }

  const toggleEditing = (day) => {
    if (planLoading) return
    setEditingDay(prev => (prev === day ? null : day))
  }

  const renderTag = (tag, index) => (
    <span key={`${tag}-${index}`} className={`plan-tag${tag === REST_LABEL ? ' plan-tag--rest' : ''}`}>
      <span className={`plan-status-dot ${tag === REST_LABEL ? 'plan-status-dot--rest' : 'plan-status-dot--active'}`} />
      {tag}
    </span>
  )

  const renderPlanCard = (item) => {
    const isEditing = editingDay === item.day
    const isLoading = savingDay === item.day
    const hasTags = item.muscles.length > 0

    return (
      <div
        key={item.day}
        className={`plan-card${isEditing ? ' plan-card--editing' : ''}`}
      >
        <div className="plan-card__header">
          <div>
            <div className="plan-card__day">{item.label}</div>
            <div className="plan-card__tags">
              {hasTags
                ? item.muscles.map((tag, idx) => renderTag(tag, idx))
                : <span className="plan-tag plan-tag--ghost">Добавить группы</span>}
            </div>
          </div>
          <button
            type="button"
            className="plan-edit-button"
            onClick={() => toggleEditing(item.day)}
            aria-label={`Редактировать ${item.label}`}
            disabled={planLoading}
          >
            {isLoading ? <span className="plan-edit-button__spinner" /> : <PencilIcon />}
          </button>
        </div>
        {isEditing && (
          <div className="plan-edit-panel">
            <div className="plan-chip-row">
              {MUSCLE_GROUPS.map((group) => {
                const active = item.muscles.includes(group.label)
                return (
                  <button
                    type="button"
                    key={group.key}
                    className={`plan-chip${active ? ' plan-chip--active' : ''}`}
                    onClick={() => handleMuscleToggle(item.day, group.label)}
                    aria-pressed={active}
                    disabled={savingDay === item.day}
                  >
                    {group.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pt-3 pb-28">
      <Header title="План" subtitle="Тренировки" avatar={user?.photo_url} />
      <div className="max-w-lg mx-auto px-4">
        <div className="mb-4">
          <div className="text-sm small-muted mb-2">Следующая тренировка</div>
          {loading && <div className="card p-4 rounded-2xl text-gray-400">Загружаем…</div>}
          {!loading && nextWorkout && (
            <div className="card p-4 rounded-2xl">
              <div>
                <div className="font-semibold">
                  {nextWorkout.title}
                </div>
                <div className="small-muted">
                  {formatNextWorkoutMeta(nextWorkout)}
                </div>
                {nextWorkout.notes && (
                  <div className="text-xs small-muted mt-1 whitespace-pre-wrap">{nextWorkout.notes}</div>
                )}
              </div>
            </div>
          )}
          {!loading && !nextWorkout && nextPlanEntry && (
            <div className="card p-4 rounded-2xl">
              <div>
                <div className="font-semibold">{nextPlanEntry.muscles.join(', ')}</div>
                <div className="small-muted">{formatPlanEntryMeta(nextPlanEntry)}</div>
                <div className="text-xs small-muted mt-1">По плану программы</div>
              </div>
            </div>
          )}
          {!loading && !nextWorkout && !nextPlanEntry && (
            <div className="card p-4 rounded-2xl text-gray-400">Нет запланированных тренировок</div>
          )}
        </div>

        {!loading && otherWorkouts.length > 0 && (
          <div className="mb-4">
            <div className="text-sm small-muted mb-2">Ближайшие</div>
            <div className="space-y-3">
              {otherWorkouts.map((w,i)=>(
                <div key={w.id || `${w.date}-${i}`} className="card p-4 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{w.title}</div>
                      <div className="small-muted">{formatMeta(w)}</div>
                      {w.notes && <div className="text-xs small-muted mt-1 whitespace-pre-wrap">{w.notes}</div>}
                    </div>
                    <button style={{ background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))' }} className="btn-main-small">Открыть</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="text-sm small-muted mb-2">План недели</div>
          <div className="calendar-plan">
            {plan.map(renderPlanCard)}
          </div>
          {planLoading && <div className="text-xs small-muted mt-2">Обновляем план…</div>}
        </div>

        <div>
          <div className="text-sm small-muted mb-2">Архив</div>
          <div className="card p-4 rounded-2xl text-gray-400">Прошлые занятия и заметки</div>
        </div>
      </div>
    </div>
  )
}
