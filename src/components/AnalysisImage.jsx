import { useState } from 'react'

export default function AnalysisImage({ src, alt, className, style }) {
  const [broken, setBroken] = useState(false)

  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-green-500 to-emerald-400 text-white font-bold select-none ${className || 'w-20 h-20 sm:w-24 sm:h-24'}`}
        style={{ flexShrink: 0, ...style }}>
        <span className="text-[0.6rem] sm:text-xs leading-none tracking-wider">S/F</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      className={`object-cover rounded-xl border border-slate-200 ${className || 'w-20 h-20 sm:w-24 sm:h-24'}`}
      style={style}
      onError={() => setBroken(true)}
    />
  )
}
