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
    headline: '',
    bio: '',
    years_experience: '',
    location: '',
    price_from: '',
    languages: '',
    specialties: '',
    certifications: '',
    contact_url: '',
    telegram_username: '',
    hero_url: ''
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
            headline: p.headline || '',
            bio: p.bio || '',
            years_experience: p.years_experience ?? '',
            location: p.location || '',
            price_from: p.price_from ?? '',
            languages: (p.languages || []).join(', '),
            specialties: (p.specialties || []).join(', '),
            certifications: (p.certifications || []).join(', '),
            contact_url: p.contact_url || '',
            telegram_username: p.telegram_username || '',
            hero_url: p.hero_url || ''
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
        headline: form.headline?.trim(),
        bio: form.bio?.trim(),
        years_experience: form.years_experience === '' ? null : Number(form.years_experience),
        location: form.location?.trim(),
        price_from: form.price_from === '' ? null : Number(form.price_from),
        languages: splitList(form.languages),
        specialties: splitList(form.specialties),
        certifications: splitList(form.certifications),
        contact_url: form.contact_url?.trim(),
        telegram_username: form.telegram_username?.replace('@', '').trim(),
        hero_url: form.hero_url?.trim()
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
            <label className="form-label">Заголовок*</label>
            <input
              className="form-input"
              placeholder="Онлайн тренер, гибкие программы"
              value={form.headline}
              onChange={update('headline')}
              required={!form.bio}
            />
          </div>
          <div>
            <label className="form-label">О себе*</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Опишите опыт, подход, специализации"
              value={form.bio}
              onChange={update('bio')}
              required={!form.headline}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <label className="form-label">Стоимость от</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.price_from}
                onChange={update('price_from')}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Локация</label>
            <input
              className="form-input"
              placeholder="Москва / Онлайн"
              value={form.location}
              onChange={update('location')}
            />
          </div>
          <div>
            <label className="form-label">Специализации (через запятую)</label>
            <input
              className="form-input"
              placeholder="Снижение веса, Набор массы"
              value={form.specialties}
              onChange={update('specialties')}
            />
          </div>
          <div>
            <label className="form-label">Языки (через запятую)</label>
            <input
              className="form-input"
              placeholder="Русский, English"
              value={form.languages}
              onChange={update('languages')}
            />
          </div>
          <div>
            <label className="form-label">Сертификаты (через запятую)</label>
            <input
              className="form-input"
              placeholder="ACE, NASM"
              value={form.certifications}
              onChange={update('certifications')}
            />
          </div>
          <div>
            <label className="form-label">Контакт (ссылка)</label>
            <input
              className="form-input"
              placeholder="https://t.me/yourname"
              value={form.contact_url}
              onChange={update('contact_url')}
            />
          </div>
          <div>
            <label className="form-label">Telegram username</label>
            <input
              className="form-input"
              placeholder="@username"
              value={form.telegram_username}
              onChange={update('telegram_username')}
            />
          </div>
          <div>
            <label className="form-label">Картинка (hero)</label>
            <input
              className="form-input"
              placeholder="https://..."
              value={form.hero_url}
              onChange={update('hero_url')}
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

