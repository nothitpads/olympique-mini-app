import React from 'react'

export function Bars({values=[0,0,0,0,0,0,0]}) {
  const max = Math.max(...values,1)
  const days = ['П','В','С','Ч','П','С','В']
  return (
    <div className="p-3">
      <div className="grid grid-cols-7 gap-2 items-end">
        {values.map((v,i)=>{
          const h = Math.round((v/max) * 60)
          const gradient = 'linear-gradient(180deg,#d8ff37,#a6ff3a)'
          return (
            <div key={i} className="flex flex-col items-center">
              <div style={{height:`${h}px`, width:18, borderRadius:10, background: gradient}}></div>
              <div className="text-xs small-muted mt-1">{days[i]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
