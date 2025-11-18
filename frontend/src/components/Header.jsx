import React from 'react'
import defaultAvatar from '../assets/avatar.png'

export default function Header({title='Привет', subtitle, avatar}) {
  const avatarSrc = avatar || defaultAvatar
  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          {subtitle && <div className="small-muted mb-1">{subtitle}</div>}
          <div className="text-2xl font-bold leading-tight">{title}</div>
        </div>
        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/8 bg-white/5">
          <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover"/>
        </div>
      </div>
    </div>
  )
}
