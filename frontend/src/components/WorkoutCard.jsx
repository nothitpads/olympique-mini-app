import React from 'react'

function buildInfo({ meta, kcal, minutes }) {
  if (meta) return meta
  const parts = []
  if (typeof kcal !== 'undefined') {
    parts.push(`${kcal} kcal`)
  }
  if (typeof minutes !== 'undefined') {
    parts.push(`${minutes} мин`)
  }
  return parts.length ? parts.join(' • ') : null
}

export default function WorkoutCard({
  title = 'Полная тренировка',
  meta,
  note,
  kcal = 346,
  minutes = 20,
  compact = false
}) {
  const info = buildInfo({ meta, kcal, minutes })
  const containerClasses = compact ? 'card rounded-2xl overflow-hidden mb-3' : 'w-72 card rounded-2xl overflow-hidden mr-3'
  const minWidth = compact ? undefined : 280

  return (
    <div className={containerClasses} style={{ minWidth }}>
      {!compact && (
        <div
          className="h-40 flex items-end p-4"
          style={{background:'linear-gradient(140deg, var(--accent-start), var(--accent-end))'}}
        >
          {info && <div className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-white/20 backdrop-blur">{info}</div>}
        </div>
      )}
      <div className="p-4">
        {compact && info && <div className="small-muted mb-1">{info}</div>}
        <div className="font-semibold text-lg">{title}</div>
        {note && <div className="small-muted mt-1 whitespace-pre-wrap">{note}</div>}
      </div>
    </div>
  )
}
