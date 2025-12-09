import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function TrainerCard({ trainer }) {
  const nav = useNavigate()
  const {
    id,
    name,
    headline,
    location,
    yearsExperience,
    rating,
    reviewCount,
    specialties = [],
    heroUrl,
    avatar,
    contactUrl
  } = trainer || {}

  const handleOpen = () => {
    nav(`/trainers/${id}`)
  }

  const handleContact = (e) => {
    e.stopPropagation()
    if (contactUrl) {
      window.open(contactUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="card w-full text-left p-3 rounded-2xl bg-white/5 border border-white/5 shadow-sm hover:border-white/15 transition"
    >
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 flex-shrink-0">
          {heroUrl ? (
            <img src={heroUrl} alt={name} className="w-full h-full object-cover" />
          ) : avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">{name?.[0] || '•'}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base truncate">{name}</div>
          {headline && <div className="text-sm text-gray-300 truncate">{headline}</div>}
          <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-2">
            {location && <span>{location}</span>}
            {yearsExperience ? <span>{yearsExperience} лет опыта</span> : null}
          </div>
          <div className="text-xs text-gray-300 mt-1">
            {rating ? `★ ${rating.toFixed(1)} (${reviewCount || 0})` : 'Нет отзывов'}
          </div>
          {specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {specialties.slice(0, 3).map((spec) => (
                <span
                  key={spec}
                  className="px-2 py-1 text-[11px] rounded-full bg-white/10 text-white/90 border border-white/10"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleOpen}
          className="flex-1 h-10 rounded-xl bg-white/10 border border-white/10 text-sm font-semibold text-white"
        >
          Профиль
        </button>
        <button
          type="button"
          onClick={handleContact}
          className="flex-1 h-10 rounded-xl bg-indigo-500 text-sm font-semibold text-white shadow"
          disabled={!contactUrl}
        >
          Написать
        </button>
      </div>
    </button>
  )
}

