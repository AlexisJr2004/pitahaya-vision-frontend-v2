import { useState, useEffect } from 'react'

export default function ThrottleBanner() {
  const [visible, setVisible] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const handler = (e) => {
      setCount(e.detail.count)
      setVisible(true)
    }
    window.addEventListener('throttle-warning', handler)
    return () => window.removeEventListener('throttle-warning', handler)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 bg-amber-50 border-b border-amber-200 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <i className="fas fa-exclamation-triangle text-amber-500"></i>
          <span>
            Se han detectado <strong>{count}</strong> respuestas de límite de solicitudes (429).
            Si el sistema se bloquea,{' '}
            <button onClick={() => window.location.reload()}
              className="font-semibold text-amber-900 underline hover:no-underline bg-transparent border-none cursor-pointer">
              haz clic aquí para reiniciar la sesión
            </button>
            .
          </span>
        </div>
        <button onClick={() => setVisible(false)}
          className="text-amber-500 hover:text-amber-700 bg-transparent border-none cursor-pointer text-lg leading-none">
          ×
        </button>
      </div>
    </div>
  )
}