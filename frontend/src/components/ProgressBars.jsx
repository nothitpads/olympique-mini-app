import React from 'react'

export function Bars({values=[0,0,0,0,0,0,0]}) {
  const max = Math.max(...values,1)
  const days = ['П','В','С','Ч','П','С','В']
  return (
    <div className="p-3">
      <div className="grid grid-cols-7 gap-2 items-end">
        {values.map((v,i)=>{
          const h = Math.round((v/max) * 60)
          const gradient = 'linear-gradient(180deg,var(--accent-start),var(--accent-end))'
          return (
            <div key={i} className="flex flex-col items-center">
              <div style={{height:`${h}px`, width:18, borderRadius:10, background: gradient, boxShadow:'0 6px 16px rgba(121,90,243,0.3)'}}></div>
              <div className="text-xs small-muted mt-1">{days[i]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
