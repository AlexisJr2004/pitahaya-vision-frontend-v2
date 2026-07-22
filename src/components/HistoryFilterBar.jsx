import { useState, useEffect, useRef } from 'react'

const SEARCH_DEBOUNCE_MS = 400

// Filtro de periodo + rango de fechas (+ búsqueda opcional por cliente), compartido entre
// HistorialAdminPage, HistorialView y el modal de trazabilidad. Aplica los cambios al instante:
// solo el campo de texto se debounce para no disparar una petición por cada tecla.
export default function HistoryFilterBar({
  rangeOptions,
  range,
  onRangeChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  showUserSearch = false,
  userQuery = '',
  onUserQueryChange,
  userSearchLabel = 'Nombre del cliente',
  userSearchPlaceholder = 'Ej: Juan Pérez',
  defaultRange = 'all',
  onClear,
}) {
  const [localUserQuery, setLocalUserQuery] = useState(userQuery)
  const debounceRef = useRef(null)

  useEffect(() => { setLocalUserQuery(userQuery) }, [userQuery])
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const handleUserQueryChange = (value) => {
    setLocalUserQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onUserQueryChange(value), SEARCH_DEBOUNCE_MS)
  }

  const handleClear = () => {
    clearTimeout(debounceRef.current)
    setLocalUserQuery('')
    onClear()
  }

  const isDefault = range === defaultRange && !dateFrom && !dateTo && !localUserQuery
  const gridCols = showUserSearch ? 'xl:grid-cols-6' : 'xl:grid-cols-4'
  const fullSpan = showUserSearch ? 'xl:col-span-6' : 'xl:col-span-4'

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-3 items-end`}>
      <div className="xl:col-span-2">
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Periodo</label>
        <select value={range} onChange={e => onRangeChange(e.target.value)} className="ha-input">
          {rangeOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Desde</label>
        <input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} className="ha-input" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hasta</label>
        <input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} className="ha-input" />
      </div>
      {showUserSearch && (
        <div className="xl:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{userSearchLabel}</label>
          <input type="text" value={localUserQuery} onChange={e => handleUserQueryChange(e.target.value)}
            placeholder={userSearchPlaceholder} className="ha-input" />
        </div>
      )}
      {!isDefault && (
        <div className={fullSpan}>
          <button type="button" onClick={handleClear}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:bg-brand-50 font-medium transition cursor-pointer">
            Limpiar
          </button>
        </div>
      )}
    </div>
  )
}
