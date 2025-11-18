import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import ProgressCard from '../components/ProgressCard'
import { Bars } from '../components/ProgressBars'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const DAY_LABELS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

const PLAN_TEMPLATES = [
  {
    id: 'push-pull',
    title: 'Push / Pull / Legs',
    entries: [
      { day: 1, title: 'Push: грудь + плечи' },
      { day: 3, title: 'Pull: спина + бицепс' },
      { day: 5, title: 'Legs: ноги + кор' }
    ]
  },
  {
    id: 'functional',
    title: 'Функциональный цикл',
    entries: [
      { day: 1, title: 'HIIT + техника' },
      { day: 2, title: 'Силовая база' },
      { day: 4, title: 'Выносливость' },
      { day: 6, title: 'Мобильность / расслабление' }
    ]
  }
]

const templateButtons = PLAN_TEMPLATES

export default function TrainerClientProfile() {
  const { clientId } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingTargets, setSavingTargets] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [markingAttendance, setMarkingAttendance] = useState(false)
  const [targetsForm, setTargetsForm] = useState({
    daily_calorie_target: '',
    daily_protein_target: '',
    daily_carb_target: '',
    daily_fat_target: '',
    goal_weight: '',
    goal_date: ''
  })
  const [planDraft, setPlanDraft] = useState(() => Array.from({ length: 7 }, (_, day) => ({ day, title: '' })))
  const initialized = useRef(false)
  const showToast = useToast()

  const fetchProfile = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await api.get(`/trainer/clients/${clientId}`)
      setProfile(res.data || null)
      initialized.current = false
    } catch (err) {
      console.warn('TRAINER: profile load failed', err?.response?.data || err.message)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (!profile || initialized.current) return
    const nextTargets = {
      daily_calorie_target: profile.nutrition?.targets?.calories ?? '',
      daily_protein_target: profile.nutrition?.targets?.protein ?? '',
      daily_carb_target: profile.nutrition?.targets?.carbs ?? '',
      daily_fat_target: profile.nutrition?.targets?.fat ?? '',
      goal_weight: profile.client?.goalWeight ?? '',
      goal_date: profile.client?.goalDate ? profile.client.goalDate.slice(0, 10) : ''
    }
    setTargetsForm(nextTargets)
    const nextPlan = Array.from({ length: 7 }, (_, day) => {
      const existing = profile.training?.plan?.find((item) => item.day_of_week === day)
      return { day, title: existing?.title || '' }
    })
    setPlanDraft(nextPlan)
    initialized.current = true
  }, [profile])

  const handleTargetsChange = (field) => (e) => {
    setTargetsForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handlePlanChange = (day) => (e) => {
    const value = e.target.value
    setPlanDraft((prev) => prev.map((entry) => (entry.day === day ? { ...entry, title: value } : entry)))
  }

  const applyTemplate = (template) => {
    setPlanDraft((prev) =>
      prev.map((entry) => {
        const replacement = template.entries.find((tpl) => tpl.day === entry.day)
        if (replacement) {
          return { ...entry, title: replacement.title }
        }
        return entry
      })
    )
  }

  const submitTargets = async () => {
    if (!clientId) return
    setSavingTargets(true)
    try {
      await api.post(`/trainer/clients/${clientId}/nutrition-target`, targetsForm)
      showToast('Цели обновлены')
      fetchProfile()
    } catch (err) {
      console.warn('TRAINER: targets save failed', err?.response?.data || err.message)
      showToast('Не удалось обновить цели', 'error')
    } finally {
      setSavingTargets(false)
    }
  }

  const submitPlan = async () => {
    if (!clientId) return
    setSavingPlan(true)
    try {
      const entries = planDraft.filter((entry) => entry.title && entry.title.trim().length > 0)
      await api.post(`/trainer/clients/${clientId}/workout-plan/bulk`, { entries })
      showToast('План обновлен')
      fetchProfile()
    } catch (err) {
      console.warn('TRAINER: plan save failed', err?.response?.data || err.message)
      showToast('Не удалось обновить план', 'error')
    } finally {
      setSavingPlan(false)
    }
  }

  const markCompleted = async () => {
    if (!clientId) return
    setMarkingAttendance(true)
    try {
      await api.post(`/trainer/clients/${clientId}/attendance`, { time: new Date().toISOString() })
      showToast('Отметили выполнение')
      fetchProfile()
    } catch (err) {
      console.warn('TRAINER: attendance override failed', err?.response?.data || err.message)
      showToast('Не удалось отметить', 'error')
    } finally {
      setMarkingAttendance(false)
    }
  }

  const todayEntries = profile?.nutrition?.todayEntries || []
  const historyEntries = profile?.nutrition?.recentEntries || []
  const planToday = profile?.training?.planToday

  const weeklyAttendance = useMemo(() => {
    if (!profile?.training?.weeklyAttendance) return null
    return profile.training.weeklyAttendance
  }, [profile])

  return (
    <div className="pt-3 pb-28">
      <Header title={profile?.client?.name || 'Клиент'} subtitle="Профиль" avatar={profile?.client?.avatar} />
      <div className="max-w-lg mx-auto px-4 space-y-5">
        {loading && <div className="card p-4 rounded-2xl text-gray-400">Загружаем профиль…</div>}
        {!loading && profile && (
          <>
            <section className="card p-4 rounded-2xl space-y-3">
              <div className="text-sm text-gray-400">Цель по весу</div>
              <ProgressCard
                start={profile.weight.start}
                current={profile.weight.current}
                target={profile.weight.target}
                emptyMessage="Нет данных по весу"
              />
              {profile.client.goalDate && (
                <div className="text-xs text-gray-400">
                  Дедлайн: {new Date(profile.client.goalDate).toLocaleDateString('ru-RU')}
                </div>
              )}
            </section>

            <section className="card p-4 rounded-2xl space-y-4">
              <div>
                <div className="text-base font-semibold mb-1">Питание</div>
                <div className="text-sm text-gray-400">
                  Сегодня: {profile.nutrition.todayTotals.calories} ккал • {profile.nutrition.todayTotals.protein} г белка
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { field: 'daily_calorie_target', label: 'Цель по калориям', placeholder: 'ккал' },
                  { field: 'daily_protein_target', label: 'Цель по белку', placeholder: 'г' },
                  { field: 'daily_carb_target', label: 'Цель по углеводам', placeholder: 'г' },
                  { field: 'daily_fat_target', label: 'Цель по жирам', placeholder: 'г' },
                  { field: 'goal_weight', label: 'Целевой вес', placeholder: 'кг' },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="text-xs text-gray-400">{label}</label>
                    <input
                      type="number"
                      className="w-full mt-1 rounded-xl bg-white text-black placeholder-black/60 p-2"
                      value={targetsForm[field]}
                      onChange={handleTargetsChange(field)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-400">Дата цели</label>
                  <input
                    type="date"
                    className="w-full mt-1 rounded-xl bg-white text-black placeholder-black/60 p-2"
                    value={targetsForm.goal_date}
                    onChange={handleTargetsChange('goal_date')}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn-main-small w-full"
                onClick={submitTargets}
                disabled={savingTargets}
              >
                {savingTargets ? 'Сохраняем…' : 'Сохранить цели'}
              </button>

              <div className="pt-2 border-t border-white/10">
                <div className="text-sm font-semibold mb-2">Записи за сегодня</div>
                {todayEntries.length === 0 && (
                  <div className="text-sm text-gray-400">Нет записей. Вы можете добавить вручную.</div>
                )}
                <div className="space-y-2">
                  {todayEntries.map((entry) => (
                    <div key={entry.id} className="bg-white/5 rounded-xl p-3 text-sm">
                      <div className="font-medium">{entry.calories} ккал • Б {entry.protein} г</div>
                      <div className="text-xs text-gray-400">{entry.note || 'Без названия'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="card p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">Тренировки</div>
                  {planToday && <div className="text-sm text-gray-400">Сегодня: {planToday.title}</div>}
                </div>
                <button
                  type="button"
                  className="btn-main-small"
                  onClick={markCompleted}
                  disabled={markingAttendance}
                >
                  {markingAttendance ? 'Отмечаем…' : 'Отметить выполнено'}
                </button>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-2">Шаблоны</div>
                <div className="flex flex-wrap gap-2">
                  {templateButtons.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="px-3 py-2 text-xs rounded-full bg-white/10"
                      onClick={() => applyTemplate(template)}
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {planDraft.map((entry) => (
                  <div key={entry.day}>
                    <label className="text-xs text-gray-400">{DAY_LABELS[entry.day]}</label>
                    <input
                      type="text"
                      className="w-full mt-1 rounded-xl bg-white text-black placeholder-black/60 p-2"
                      value={entry.title}
                      onChange={handlePlanChange(entry.day)}
                      placeholder="Введите упражнение / цикл"
                    />
                  </div>
                ))}
              </div>
              <button type="button" className="btn-main-small w-full" onClick={submitPlan} disabled={savingPlan}>
                {savingPlan ? 'Сохраняем…' : 'Сохранить план'}
              </button>

              <div className="pt-4 border-t border-white/10">
                <div className="text-sm font-semibold mb-2">Статистика недели</div>
                {weeklyAttendance ? (
                  <Bars values={weeklyAttendance} />
                ) : (
                  <div className="text-xs text-gray-400">Нет данных.</div>
                )}
              </div>
            </section>

            <section className="card p-4 rounded-2xl space-y-3">
              <div className="text-base font-semibold">История веса</div>
              {profile.weight.history.length === 0 && (
                <div className="text-sm text-gray-400">Пока нет записей.</div>
              )}
              <div className="space-y-2 text-sm">
                {profile.weight.history.slice(0, 6).map((entry) => (
                  <div key={`${entry.date}-${entry.weight}`} className="flex justify-between">
                    <span>{entry.date}</span>
                    <span>{entry.weight ?? '—'} кг</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-4 rounded-2xl space-y-2">
              <div className="text-base font-semibold">Последние приёмы пищи</div>
              {historyEntries.length === 0 && <div className="text-sm text-gray-400">Нет данных.</div>}
              {historyEntries.slice(0, 10).map((entry) => (
                <div key={`history-${entry.id}`} className="text-sm border-b border-white/5 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                  <div className="font-medium">
                    {entry.date}: {entry.calories} ккал • Б {entry.protein} г
                  </div>
                  {entry.note && <div className="text-xs text-gray-400">{entry.note}</div>}
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

