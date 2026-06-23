import { useState } from 'react'
import formatAIText from '../utils/formatAIText'

/**
 * Panel de análisis con IA (Gemma 3) reutilizable.
 *
 * Props:
 *   analyses      — array de análisis (para computar stats: total, sick, GPS)
 *   buildSummary  — () => string   — construye el prompt para Gemma (definido por cada página)
 *   title         — título del panel  (default: "Diagnóstico fitosanitario")
 *   buttonLabel   — texto del botón de acción (default: "Analizar")
 *   emptyText     — descripción en estado vacío
 *   showGeoStats  — muestra el contador de puntos GPS (default: false)
 *   variant       — "full" (dashboard, ocupa toda la altura del contenedor)
 *                   "compact" (historial, se renderiza como stat-card autónoma)
 *   className     — clase extra para el contenedor raíz
 */
export default function AIAnalysisPanel({
  analyses = [],
  buildSummary,
  title = 'Diagnóstico fitosanitario',
  buttonLabel = 'Analizar',
  emptyText = 'Gemma 3 analizará los datos y entregará un reporte agronómico.',
  showGeoStats = false,
  variant = 'full',
  className = '',
}) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')

  const sick      = analyses.filter(a => (a.severity || '').toLowerCase() !== 'sana').length
  const pctSick   = analyses.length ? Math.round(sick / analyses.length * 100) : 0
  const geoPoints = analyses.filter(a => a.latitude != null && a.longitude != null)

  const isCompact = variant === 'compact'

  async function requestAnalysis() {
    setLoading(true); setError(''); setAnalysis('')
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/v2/chatbot/heatmap-analysis/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ summary: buildSummary() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAnalysis(data.analysis || 'Sin respuesta del modelo.')
    } catch {
      setError('No se pudo conectar con el servicio de IA. Verifica que el modelo Gemma esté activo en Colab.')
    } finally {
      setLoading(false)
    }
  }

  const containerClass = isCompact
    ? `stat-card overflow-hidden flex flex-col ${className}`
    : `flex flex-col h-full ${className}`

  const iconSize   = isCompact ? 'h-9 w-9 rounded-xl' : 'h-12 w-12 rounded-2xl'
  const iconText   = isCompact ? 'text-sm' : 'text-xl'
  const titleClass = isCompact ? 'text-base font-semibold text-slate-900 leading-tight' : 'text-2xl font-semibold text-slate-900 leading-tight'
  const headerPad  = isCompact ? 'px-4 pt-4 pb-3' : 'px-5 pt-5 pb-4'
  const statsPad   = isCompact ? 'px-4 py-2' : 'px-5 py-3'
  const bodyPad    = isCompact ? 'px-4 py-3' : 'px-5 py-4'
  const footerPad  = isCompact ? 'px-4 pb-4 pt-2' : 'px-5 pb-5 pt-3'
  const btnClass   = isCompact
    ? 'w-full py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5'
    : 'w-full py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2'
  const emptyIconSize = isCompact ? 'w-11 h-11' : 'w-14 h-14'
  const emptyIconText = isCompact ? 'text-base' : 'text-xl'
  const resultMaxH    = isCompact ? 200 : 180
  const resultRadius  = isCompact ? 'rounded-xl' : 'rounded-2xl'
  const resultPad     = isCompact ? 'px-3 py-2.5 text-[0.72rem]' : 'px-4 py-3 text-[0.76rem]'
  const errorRadius   = isCompact ? 'rounded-xl' : 'rounded-2xl'

  return (
    <div className={containerClass}>

      {/* ── Cabecera ── */}
      <div className={`${headerPad} border-b border-slate-100`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-brand-600 mb-1">IA · Gemma 3</p>
            <h4 className={titleClass}>{title}</h4>
            {!isCompact && <p className="text-[0.72rem] text-slate-400 mt-1">Generado por google/gemma-3-4b-it</p>}
          </div>
          <span className={`flex ${iconSize} items-center justify-center border border-brand-100 bg-brand-50 flex-shrink-0`}>
            <i className={`fas fa-robot text-brand-600 ${iconText}`}></i>
          </span>
        </div>

        {/* Stats compactas (solo en variant=compact, dentro del header) */}
        {isCompact && (
          <div className="mt-2 flex items-center gap-3 text-[0.68rem] font-medium text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><i className="fas fa-chart-bar text-brand-400"></i> {analyses.length} análisis</span>
            <span className="flex items-center gap-1"><i className="fas fa-triangle-exclamation text-red-400"></i> {sick} en riesgo</span>
          </div>
        )}
      </div>

      {/* ── Stats (solo en variant=full) ── */}
      {!isCompact && (
        <div className={`${statsPad} border-b border-slate-100`}>
          <div className="flex items-center gap-4 flex-wrap text-[0.72rem] font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <i className="fas fa-chart-bar text-brand-400 w-3 text-center"></i>
              {analyses.length} análisis
            </span>
            <span className="flex items-center gap-1.5">
              <i className="fas fa-triangle-exclamation text-red-400 w-3 text-center"></i>
              {sick} en riesgo ({pctSick}%)
            </span>
            {showGeoStats && (
              <span className="flex items-center gap-1.5">
                <i className="fas fa-location-dot text-brand-400 w-3 text-center"></i>
                {geoPoints.length} puntos GPS
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Área de contenido ── */}
      <div className={`flex-1 min-h-0 overflow-hidden ${bodyPad} flex flex-col justify-center`} style={isCompact ? { minHeight: 120 } : {}}>

        {/* Vacío */}
        {!analysis && !loading && !error && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className={`${emptyIconSize} rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center`}>
              <i className={`fas fa-magnifying-glass-chart text-brand-500 ${emptyIconText}`}></i>
            </div>
            <div>
              <p className={`${isCompact ? 'text-xs' : 'text-sm'} font-semibold text-slate-700`}>Análisis pendiente</p>
              <p className={`${isCompact ? 'text-[0.68rem]' : 'text-xs'} text-slate-400 mt-1 leading-relaxed max-w-[200px]`}>{emptyText}</p>
            </div>
          </div>
        )}

        {/* Cargando */}
        {loading && (
          <div className="flex items-center justify-center gap-2.5 py-6 text-slate-400">
            <i className={`fas fa-spinner fa-spin text-brand-500 ${isCompact ? 'text-sm' : 'text-base'}`}></i>
            <div>
              <p className={`${isCompact ? 'text-xs' : 'text-sm'} font-medium text-slate-700`}>Gemma 3 analizando...</p>
              <p className={`${isCompact ? 'text-[0.67rem]' : 'text-xs'} text-slate-400`}>Puede tomar hasta 30 segundos</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className={`${errorRadius} border border-red-100 bg-red-50 px-4 py-4`}>
            <div className="flex items-start gap-3">
              <i className={`fas fa-triangle-exclamation text-red-400 ${isCompact ? 'text-sm' : 'text-base'} mt-0.5 flex-shrink-0`}></i>
              <p className={`${isCompact ? 'text-[0.68rem]' : 'text-xs'} text-red-600 leading-relaxed`}>{error}</p>
            </div>
          </div>
        )}

        {/* Resultado */}
        {analysis && !loading && (
          <div
            className={`overflow-y-auto ${resultRadius} border border-slate-100 bg-slate-50/60 ${resultPad}`}
            style={{ maxHeight: resultMaxH }}
            dangerouslySetInnerHTML={{ __html: formatAIText(analysis) }}
          />
        )}
      </div>

      {/* ── Botón ── */}
      <div className={`flex-shrink-0 ${footerPad} border-t border-slate-100`}>
        <button onClick={requestAnalysis} disabled={loading} className={btnClass}>
          {loading
            ? <><i className="fas fa-spinner fa-spin text-xs"></i> Analizando...</>
            : analysis
              ? <><i className="fas fa-rotate-right text-xs"></i> Volver a analizar</>
              : <><i className="fas fa-magnifying-glass-chart text-xs"></i> {buttonLabel}</>
          }
        </button>
      </div>

    </div>
  )
}
