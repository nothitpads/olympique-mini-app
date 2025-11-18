import React from 'react'

export default function Modal({open,onClose,title,children}) {
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="bg-card rounded-t-2xl w-full max-w-lg p-4 z-50">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">{title}</div>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}
