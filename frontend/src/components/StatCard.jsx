import React from 'react'

export default function StatCard({ title, value, className = '' }) {
  return (
    <div className={`stat-compact ${className}`}>
      <div className="stat-compact__title">{title}</div>
      <div className="stat-compact__value">{value}</div>
    </div>
  )
}
