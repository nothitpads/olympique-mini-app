import React from 'react'

function parseWeight(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = parseFloat(String(value).replace(',', '.'))
  return Number.isNaN(parsed) ? null : parsed
}

function formatLabel(value, fallback, unit) {
  if (value === undefined || value === null || value === '') {
    if (fallback === null || fallback === undefined) return '—'
    return `${fallback}${unit}`
  }
  if (typeof value === 'number') {
    return `${value}${unit}`
  }
  return value
}

export default function ProgressCard({
  start,
  current,
  target,
  unit = 'kg',
  onAction,
  actionLabel = 'Записать вес',
  emptyMessage
}) {
  const startNumeric = parseWeight(start)
  const currentNumeric = parseWeight(current)
  const targetNumeric = parseWeight(target)

  const hasAllValues =
    Number.isFinite(startNumeric) &&
    Number.isFinite(currentNumeric) &&
    Number.isFinite(targetNumeric) &&
    startNumeric !== targetNumeric

  let percent = 0
  if (hasAllValues) {
    percent = Math.max(
      0,
      Math.min(100, ((startNumeric - currentNumeric) / (startNumeric - targetNumeric)) * 100)
    )
  }

  const fallbackMessage =
    emptyMessage ||
    (!Number.isFinite(targetNumeric)
      ? 'Укажите цель по весу, чтобы видеть прогресс'
      : 'Добавьте записи веса, чтобы видеть прогресс')

  return (
    <div className="card rounded-2xl p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="small-muted">ВЕС</div>
        <div className="small-muted">⚖</div>
      </div>
      {hasAllValues ? (
        <>
          <div className="w-full rounded-full h-3 overflow-hidden" style={{background:'#e9e5ff'}}>
            <div
              style={{width:`${percent}%`, background: 'linear-gradient(120deg,var(--accent-start),var(--accent-contrast))'}}
              className="h-3 bg-gradient-to-r"
            ></div>
          </div>
          <div className="flex justify-between text-sm small-muted mt-3">
            <div>Старт {formatLabel(start, startNumeric, unit)}</div>
            <div>Текущий {formatLabel(current, currentNumeric, unit)}</div>
            <div>Цель {formatLabel(target, targetNumeric, unit)}</div>
          </div>
        </>
      ) : (
        <div className="text-center text-sm small-muted py-4">{fallbackMessage}</div>
      )}
      {onAction && (
        <button className="btn-gradient mt-3" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  )
}
