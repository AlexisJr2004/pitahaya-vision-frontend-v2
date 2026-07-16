import { useState } from 'react'

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function weatherStyle(condition) {
  const c = (condition || '').toLowerCase()
  if (c.includes('lluvi'))                           return { icon: 'fa-cloud-rain',  iconColor: 'text-blue-500',  bg: '#eff6ff', border: '#bfdbfe', label: '#1d4ed8',  cls: { bg: 'bg-blue-50',  border: 'border-blue-100',  text: 'text-blue-700'  } }
  if (c.includes('húmedo') || c.includes('humedo')) return { icon: 'fa-cloud',        iconColor: 'text-sky-500',   bg: '#f0f9ff', border: '#bae6fd', label: '#0369a1',  cls: { bg: 'bg-sky-50',   border: 'border-sky-100',   text: 'text-sky-700'   } }
  if (c.includes('seco'))                            return { icon: 'fa-sun',          iconColor: 'text-amber-500', bg: '#fffbeb', border: '#fde68a', label: '#b45309',  cls: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' } }
  return                                                    { icon: 'fa-cloud-sun',    iconColor: 'text-green-600', bg: '#f0fdf4', border: '#bbf7d0', label: '#15803d',  cls: { bg: 'bg-brand-50', border: 'border-brand-100', text: 'text-brand-700' } }
}

export function dayIcon(precip, humidity) {
  if (precip > 5)    return { i: 'fa-cloud-rain',     c: 'text-blue-500'  }
  if (precip > 1)    return { i: 'fa-cloud-sun-rain', c: 'text-sky-400'   }
  if (humidity > 78) return { i: 'fa-cloud',           c: 'text-slate-400' }
  if (humidity > 65) return { i: 'fa-cloud-sun',       c: 'text-brand-500' }
  return                    { i: 'fa-sun',              c: 'text-amber-400' }
}

export function shortDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-EC', { weekday: 'short' })
}

// ─── WeatherWidget ────────────────────────────────────────────────────────────
//
// Props
//   data               — objeto weatherData (null si no hay)
//   loading            — boolean
//   variant            — "sidebar" | "panel"
//   filterToday        — boolean: excluir hoy del listado de días (sidebar)
//   onRetry            — fn: muestra botón Reintentar en estado de error (sidebar)
//   conditionValue     — string: valor del select de condición (panel)
//   onConditionChange  — fn: handler del select (panel)
//   fallback           — ReactNode: UI que se muestra cuando no hay datos y no está cargando
//                        (panel usa un <select> plano cuando no hay GPS de parcela)
//
export default function WeatherWidget({
  data,
  loading,
  variant = 'sidebar',
  filterToday = false,
  pastDaysLimit,
  onRetry,
  conditionValue,
  onConditionChange,
  fallback,
}) {
  const [collapsed, setCollapsed] = useState(true)
  const isSidebar = variant === 'sidebar'
  const label     = isSidebar ? 'Clima local' : 'Auto · últimos 3 días'

  const allDays  = data?.days || []
  const todayStr = new Date().toISOString().split('T')[0]

  // filterToday=true  → excluye hoy, toma los últimos 3 pasados (sidebar)
  // pastDaysLimit=N   → toma los N pasados más recientes + hoy (panel)
  // (ninguno)         → todos los días
  let days
  if (filterToday) {
    days = allDays.filter(d => d.date !== todayStr).slice(-3)
  } else if (pastDaysLimit != null) {
    const todayEntry = allDays.find(d => d.date === todayStr)
    const past       = allDays.filter(d => d.date !== todayStr).slice(-pastDaysLimit)
    days = todayEntry ? [...past, todayEntry] : past
  } else {
    days = allDays
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return isSidebar ? (
      <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
        <i className="fas fa-spinner fa-spin"></i>
        <span className="text-sm font-medium">Obteniendo clima...</span>
      </div>
    ) : (
      <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-5">
        <div className="flex items-center justify-center py-2 gap-2.5 text-slate-400">
          <i className="fas fa-spinner fa-spin text-sm"></i>
          <span className="text-sm font-medium">Obteniendo clima de la parcela...</span>
        </div>
      </div>
    )
  }

  // ── Error / sin datos ─────────────────────────────────────────────────────
  if (!data) {
    if (fallback) return fallback
    return isSidebar ? (
      <div className="text-center py-4">
        <i className="fas fa-location-slash text-xl text-slate-300 mb-2 block"></i>
        <p className="text-xs text-slate-500 mb-2">No se pudo obtener el clima</p>
        {onRetry && (
          <button type="button" onClick={onRetry}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Reintentar
          </button>
        )}
      </div>
    ) : null
  }

  const ws = weatherStyle(data.condition)

  // ── Sidebar variant ───────────────────────────────────────────────────────
  if (isSidebar) {
    return (
      <>
        <button type="button" onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-between gap-3 text-left"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-brand-600 truncate">{label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.8rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.15, marginTop: 2 }}>
              {data.avgTemp}°C
            </p>
            <p className="text-sm text-slate-500 mt-1 capitalize">{data.condition}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 flex-shrink-0">
              <i className={`fas ${ws.icon} text-3xl text-brand-600`}></i>
            </span>
            <i className={`fas fa-chevron-${collapsed ? 'down' : 'up'} text-[0.6rem] text-slate-400 transition-transform`}></i>
          </div>
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[500px] opacity-100'}`}>
          <div className="mt-4 pt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.72rem] text-slate-500"
            style={{ borderTop: '1px solid #eef2f7' }}>
            <span className="flex items-center gap-1.5 font-medium">
              <i className="fas fa-droplet text-brand-500 w-3.5 text-center flex-shrink-0"></i>{data.avgHumidity}% humedad
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <i className="fas fa-wind text-brand-500 w-3.5 text-center flex-shrink-0"></i>{data.avgWind} km/h
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <i className="fas fa-cloud-rain text-brand-500 w-3.5 text-center flex-shrink-0"></i>{data.totalPrecip} mm lluvia
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <i className="fas fa-temperature-half text-brand-500 w-3.5 text-center flex-shrink-0"></i>↓{data.tempMin}° ↑{data.tempMax}°
            </span>
          </div>

          {days.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid #eef2f7' }}>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-slate-400 mb-2">Últimos 3 días</p>
              <ul className="space-y-0.5">
                {days.map((day, i) => {
                  const di = dayIcon(day.precip, day.humidity)
                  return (
                    <li key={i} className="rounded-xl px-2 py-1.5"
                      style={{ background: i === 0 ? '#f8fafc' : 'transparent' }}>
                      <div className="flex items-center gap-2">
                        <i className={`fas ${di.i} ${di.c} text-sm w-4 text-center flex-shrink-0`}></i>
                        <span className="font-semibold text-slate-700 w-9 flex-shrink-0 capitalize text-[0.75rem]">{shortDay(day.date)}</span>
                        <span className="font-bold text-slate-900 text-[0.82rem] flex-1">{day.temp}°C</span>
                        <span className="text-slate-400 text-[0.65rem] flex-shrink-0">↓{day.tempMin}° ↑{day.tempMax}°</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 pl-6 text-[0.65rem] text-slate-400">
                        <span className="flex items-center gap-1">
                          <i className="fas fa-droplet text-brand-300 text-[0.55rem]"></i>{day.humidity}%
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="fas fa-cloud-rain text-blue-300 text-[0.55rem]"></i>{day.precip} mm
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </>
    )
  }

  // ── Panel variant (ChatbotPage) ───────────────────────────────────────────
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white overflow-hidden">
      {/* Header: temp + rango + icono */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-brand-600 mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[2rem] font-semibold text-slate-900 leading-none">{data.avgTemp}°C</span>
              <span className="text-xs text-slate-400 font-medium">↓{data.tempMin}° ↑{data.tempMax}°</span>
            </div>
            <p className={`text-sm font-semibold mt-1 ${ws.cls.text}`}>{data.condition}</p>
          </div>
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl border flex-shrink-0 ${ws.cls.bg} ${ws.cls.border}`}>
            <i className={`fas ${ws.icon} text-2xl ${ws.iconColor}`}></i>
          </span>
        </div>
      </div>

      {/* Stats agregados */}
      <div className="px-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-4 flex-wrap text-[0.72rem] font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <i className="fas fa-droplet text-brand-400 w-3 text-center"></i>
            {data.avgHumidity}% humedad
          </span>
          <span className="flex items-center gap-1.5">
            <i className="fas fa-cloud-rain text-blue-400 w-3 text-center"></i>
            {data.totalPrecip} mm lluvia
          </span>
          <span className="flex items-center gap-1.5">
            <i className="fas fa-wind text-slate-400 w-3 text-center"></i>
            {data.avgWind} km/h viento
          </span>
        </div>
      </div>

      {/* Desglose por día */}
      <ul className="divide-y divide-slate-50">
        {days.map((day, i) => {
          const di = dayIcon(day.precip, day.humidity)
          return (
            <li key={i} className="flex items-center gap-2.5 px-4 py-2.5 text-[0.78rem]">
              <i className={`fas ${di.i} ${di.c} w-4 text-center text-sm flex-shrink-0`}></i>
              <span className="text-slate-500 font-medium w-9 flex-shrink-0 capitalize">{shortDay(day.date)}</span>
              <span className="font-semibold text-slate-800 flex-1">{day.temp}°C</span>
              <span className="text-[0.68rem] text-slate-400">↓{day.tempMin}° ↑{day.tempMax}°</span>
              <span className="flex items-center gap-1 text-slate-400 text-[0.68rem] ml-1">
                <i className="fas fa-droplet text-brand-300 text-[0.55rem]"></i>{day.humidity}%
              </span>
              <span className="flex items-center gap-1 text-slate-400 text-[0.68rem]">
                <i className="fas fa-cloud-rain text-blue-300 text-[0.55rem]"></i>{day.precip}mm
              </span>
            </li>
          )
        })}
      </ul>

      {/* Confirmar condición (solo si se pasa onConditionChange) */}
      {onConditionChange && (
        <div className="px-4 pb-4 pt-3 border-t border-slate-100">
          <span className="block text-[0.62rem] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1.5">Confirmar condición</span>
          <select value={conditionValue} onChange={e => onConditionChange(e.target.value)} className="context-select text-sm">
            <option value="Lluvioso">Lluvioso</option>
            <option value="Húmedo sin lluvia">Húmedo sin lluvia</option>
            <option value="Normal para la época">Normal para la época</option>
            <option value="Período seco">Período seco</option>
          </select>
        </div>
      )}
    </div>
  )
}
