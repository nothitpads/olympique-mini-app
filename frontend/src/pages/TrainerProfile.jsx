import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import api from '../services/api'

function ReviewCard({ review }) {
  if (!review) return null
  const author = review.author || {}
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        {author.avatar ? (
          <img src={author.avatar} alt={author.name} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">{author.name?.[0] || '•'}</div>
        )}
        <div className="text-sm font-semibold">{author.name || 'Клиент'}</div>
        <div className="text-xs text-gray-300 ml-auto">★ {review.rating}</div>
      </div>
      {review.comment && <div className="text-sm text-gray-200">{review.comment}</div>}
    </div>
  )
}

export default function TrainerProfile() {
  const { trainerId } = useParams()
  const nav = useNavigate()
  const [trainer, setTrainer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get(`/trainers/${trainerId}`)
        if (!cancelled) {
          setTrainer(res.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Не удалось загрузить профиль тренера')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [trainerId])

  const handleContact = () => {
    if (trainer?.contactUrl) {
      window.open(trainer.contactUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return (
      <div className="pt-3 pb-28">
        <Header title="Профиль тренера" subtitle="" />
        <div className="max-w-lg mx-auto px-4">
          <div className="card p-4 rounded-2xl text-gray-400">Загружаем…</div>
        </div>
      </div>
    )
  }

  if (error || !trainer) {
    return (
      <div className="pt-3 pb-28">
        <Header title="Профиль тренера" subtitle="" />
        <div className="max-w-lg mx-auto px-4 space-y-3">
          <div className="card p-4 rounded-2xl text-red-300">{error || 'Тренер не найден'}</div>
          <button
            type="button"
            className="h-11 rounded-xl bg-white/10 text-white w-full"
            onClick={() => nav(-1)}
          >
            Назад
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28">
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-gray-800 to-black/80" />
        {trainer.heroUrl && (
          <img src={trainer.heroUrl} alt={trainer.name} className="w-full h-64 object-cover" />
        )}
        {!trainer.heroUrl && (
          <div className="w-full h-64 bg-gradient-to-b from-indigo-500/40 to-black/80" />
        )}
        <div className="absolute top-3 left-3">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="w-10 h-10 rounded-full bg-black/60 border border-white/10 text-white"
          >
            ←
          </button>
        </div>
        <div className="absolute bottom-[-32px] left-6">
          <div className="w-20 h-20 rounded-3xl border-2 border-white/20 overflow-hidden bg-white/10">
            {trainer.avatar ? (
              <img src={trainer.avatar} alt={trainer.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-white">{trainer.name?.[0] || '•'}</div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-14">
        <Header title={trainer.name} subtitle={trainer.headline || 'Персональный тренер'} />

        <div className="flex gap-2 mb-3 text-sm text-gray-300">
          {trainer.location && <span>{trainer.location}</span>}
          {trainer.yearsExperience ? <span>• {trainer.yearsExperience} лет опыта</span> : null}
          {trainer.rating ? <span>• ★ {trainer.rating.toFixed(1)} ({trainer.reviewCount || 0})</span> : null}
        </div>

        <div className="flex gap-3 mb-4">
          <button
            type="button"
            className="flex-1 h-11 rounded-xl bg-indigo-500 text-white font-semibold shadow"
            onClick={handleContact}
            disabled={!trainer.contactUrl}
          >
            Написать в Telegram
          </button>
          {trainer.priceFrom ? (
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/90">
              от {trainer.priceFrom} ₽
            </div>
          ) : null}
        </div>

        {trainer.specialties?.length ? (
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-2">Специализации</div>
            <div className="flex flex-wrap gap-2">
              {trainer.specialties.map((item) => (
                <span key={item} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {trainer.languages?.length ? (
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Языки</div>
            <div className="text-sm text-white">{trainer.languages.join(', ')}</div>
          </div>
        ) : null}

        {trainer.certifications?.length ? (
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-2">Сертификаты</div>
            <div className="flex flex-wrap gap-2">
              {trainer.certifications.map((item) => (
                <span key={item} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/90">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {trainer.bio ? (
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">О тренере</div>
            <div className="text-sm text-white leading-relaxed whitespace-pre-line">{trainer.bio}</div>
          </div>
        ) : null}

        {trainer.reviews?.length ? (
          <div className="mb-10">
            <div className="text-sm text-gray-400 mb-2">Отзывы</div>
            <div className="space-y-2">
              {trainer.reviews.map((rev) => (
                <ReviewCard key={rev.id} review={rev} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">Пока нет отзывов.</div>
        )}
      </div>
    </div>
  )
}

