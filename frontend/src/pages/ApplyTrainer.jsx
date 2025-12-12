import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import api from '../services/api'

const splitList = (value) =>
  (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

export default function ApplyTrainer() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [prefillLoading, setPrefillLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    bio: '',
    years_experience: '',
    location: '',
    hero_url: '',
    cv_link: ''
  })

  useEffect(() => {
    let mounted = true
    async function load() {
      setPrefillLoading(true)
      try {
        const res = await api.get('/me/trainer-profile')
        if (mounted && res.data) {
          const p = res.data
          setForm({
            full_name: p.name || '',
            bio: p.bio || '',
            years_experience: p.years_experience ?? '',
            location: p.location || '',
            hero_url: p.hero_url || '',
            cv_link: p.hero_url || ''
          })
        }
      } catch (err) {
        // ignore if first-time user
      } finally {
        if (mounted) setPrefillLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const payload = {
        full_name: form.full_name?.trim(),
        headline: form.full_name?.trim() || 'Trainer',
        bio: form.bio?.trim(),
        years_experience: form.years_experience === '' ? null : Number(form.years_experience),
        location: form.location?.trim(),
        hero_url: form.cv_link?.trim() || form.hero_url?.trim() || null
      }

      const res = await api.post('/me/trainer-profile', payload)
      if (res.data?.ok) {
        setSuccess('Заявка отправлена. Мы проверим профиль и свяжемся с вами.')
      }
    } catch (err) {
      const apiError = err?.response?.data?.error
      if (apiError === 'headline_or_bio_required') {
        setError('Добавьте заголовок или краткое описание.')
      } else {
        setError('Не удалось сохранить. Попробуйте позже.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-3 pb-24">
      <Header title="Стать тренером" subtitle="Заполните профиль для модерации" />
      <div className="max-w-lg mx-auto px-4">
        {prefillLoading && <div className="card p-3 mb-3 text-sm text-gray-300">Загружаем профиль…</div>}
        {error && (
          <div className="card p-3 mb-3 text-sm text-red-200 border border-red-500/40 bg-red-500/10">{error}</div>
        )}
        {success && (
          <div className="card p-3 mb-3 text-sm text-emerald-200 border border-emerald-500/40 bg-emerald-500/10">
            {success}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="form-label">Полное имя*</label>
            <input
              className="form-input"
              placeholder="Имя и фамилия"
              value={form.full_name}
              onChange={update('full_name')}
              required
            />
          </div>
          <div>
            <label className="form-label">Город*</label>
            <input
              className="form-input"
              placeholder="Город"
              value={form.location}
              onChange={update('location')}
              required
            />
          </div>
          <div>
            <label className="form-label">CV / О себе*</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Опишите опыт, подход, проекты"
              value={form.bio}
              onChange={update('bio')}
              required
            />
          </div>
          <div>
            <label className="form-label">Опыт (лет)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={form.years_experience}
              onChange={update('years_experience')}
            />
          </div>
          <div>
            <label className="form-label">Файл CV (ссылка)</label>
            <input
              className="form-input"
              placeholder="https://..."
              value={form.cv_link}
              onChange={update('cv_link')}
            />
          </div>
          <div className="space-y-2">
            <button
              type="submit"
              className="btn-primary w-full h-12"
              disabled={loading || prefillLoading}
            >
              {loading ? 'Сохраняем…' : 'Отправить заявку'}
            </button>
            <button
              type="button"
              className="btn-secondary w-full h-11"
              onClick={() => nav(-1)}
            >
              Назад
            </button>
          </div>
          <p className="text-xs text-gray-400">
            После отправки заявка попадет на модерацию. Если всё ок, администратор активирует ваш
            профиль тренера, и вы сможете работать с клиентами.
          </p>
        </form>
      </div>
    </div>
  )
}

