import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getAnalyses } from '../../services/analysisService'
import { getPlantHistories } from '../../services/chatbotService'
import { toArray } from '../../utils/arrayUtils'
import { computeSev } from '../../utils/severity'
import { formatDateWithTime as fmtDate, formatDateLong as fmtDateShort } from '../../utils/formatters'

const RANGE_OPTIONS = [
  { key: 'all',    label: 'Todos los registros', param: null    },
  { key: 'today',  label: 'Hoy',                  param: 'today' },
  { key: '7days',  label: 'Últimos 7 días',        param: 'last7' },
  { key: '30days', label: 'Últimos 30 días',        param: 'month' },
]

function sevClass(bucket) {
  if (bucket === 'critical') return 'ha-sev-critical'
  if (bucket === 'high')     return 'ha-sev-high'
  if (bucket === 'medium')   return 'ha-sev-medium'
  return 'ha-sev-low'
}

function dotClass(bucket) {
  if (bucket === 'critical' || bucket === 'high') return 'high'
  if (bucket === 'medium') return 'medium'
  return ''
}

// SVG Donut robusto — usa conteos exactos para evitar errores de redondeo
function DonutChart({ segments, size = 160, thickness = 28 }) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  const total = segments.reduce((s, g) => s + g.count, 0)

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
      </svg>
    )
  }

  let cumulative = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
      {segments.filter(s => s.count > 0).map((seg, i) => {
        const pct = seg.count / total
        const dash = pct * circ
        const dashOffset = -cumulative * circ
        cumulative += pct
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt" />
        )
      })}
    </svg>
  )
}

export default function HistorialAdminPage() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [range, setRange]       = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [applied, setApplied]   = useState({ range: 'all', dateFrom: '', dateTo: '', userQuery: '' })
  const [detail, setDetail]     = useState(null)
  const [notesByAnId, setNotesByAnId] = useState({})
  const detailModalRef = useRef(null)
  const detailAnimated = useRef(false)

  const load = useCallback((params) => {
    setLoading(true)
    Promise.all([
      getAnalyses({ ...params, page_size: 1000 }),
      getPlantHistories({ page_size: 1000 }).catch(() => []),
    ])
      .then(([d, ph]) => {
        setAnalyses(toArray(d))
        const map = {}
        toArray(ph).forEach(p => {
          const arId = (p.analysis_result && typeof p.analysis_result === 'object') ? p.analysis_result.id : p.analysis_result
          if (arId != null) map[String(arId)] = p.notes || ''
        })
        setNotesByAnId(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const p = {}
    const opt = RANGE_OPTIONS.find(o => o.key === applied.range)
    if (opt?.param) p.range = opt.param
    if (applied.dateFrom) p.date_from = applied.dateFrom
    if (applied.dateTo)   p.date_to   = applied.dateTo
    if (applied.userQuery) p.user_name = applied.userQuery
    load(p)
  }, [applied, load])

  const closeDetail = useCallback(() => {
    const modal = detailModalRef.current
    if (!modal || window.innerWidth >= 640) { setDetail(null); detailAnimated.current = false; return }
    modal.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
    modal.style.transform = 'translateY(110%)'
    setTimeout(() => { modal.style.transform = ''; modal.style.transition = ''; detailAnimated.current = false; setDetail(null) }, 340)
  }, [])

  useEffect(() => {
    if (!detail || !detailModalRef.current || window.innerWidth >= 640) return
    const modal = detailModalRef.current
    const handle = modal.querySelector('.ha-drag-handle')
    if (!handle) return

    if (!detailAnimated.current) {
      detailAnimated.current = true
      modal.style.transition = 'none'
      modal.style.transform = 'translateY(100%)'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        modal.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1)'
        modal.style.transform = 'translateY(0)'
      }))
    }

    let sy = 0, dy = 0
    const onStart = e => { sy = e.touches[0].clientY; dy = 0; modal.style.transition = 'none' }
    const onMove  = e => { dy = Math.max(0, e.touches[0].clientY - sy); modal.style.transform = `translateY(${dy}px)` }
    const onEnd   = () => {
      if (dy > 80) {
        modal.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
        modal.style.transform = 'translateY(110%)'
        setTimeout(() => { modal.style.transform = ''; modal.style.transition = ''; detailAnimated.current = false; setDetail(null) }, 340)
      } else {
        modal.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'
        modal.style.transform = 'translateY(0)'
        setTimeout(() => { modal.style.transition = '' }, 320)
      }
    }
    handle.addEventListener('touchstart', onStart, { passive: true })
    handle.addEventListener('touchmove',  onMove,  { passive: true })
    handle.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      handle.removeEventListener('touchstart', onStart)
      handle.removeEventListener('touchmove',  onMove)
      handle.removeEventListener('touchend',   onEnd)
    }
  }, [detail])

  const handleSubmit = (e) => {
    e.preventDefault()
    setApplied({ range, dateFrom, dateTo, userQuery })
  }

  const clearFilters = () => {
    setRange('all'); setDateFrom(''); setDateTo(''); setUserQuery('')
    setApplied({ range: 'all', dateFrom: '', dateTo: '', userQuery: '' })
  }

  const openDetail = (a) => {
    setDetail(a)
    detailAnimated.current = false
  }

  const kpis = useMemo(() => {
    const total = analyses.length
    const highRisk = analyses.filter(a => {
      const b = computeSev(a).bucket
      return b === 'critical' || b === 'high' || b === 'medium'
    }).length
    const latest = analyses.length > 0
      ? analyses.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b)
      : null
    const diseases = {}
    analyses.forEach(a => {
      const d = a.disease_name_predicted || '—'
      diseases[d] = (diseases[d] || 0) + 1
    })
    const topDisease = Object.entries(diseases).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    return { total, highRisk, latest, topDisease }
  }, [analyses])

  // Distribución usando los 4 niveles derivados
  const sevDist = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 }
    analyses.forEach(a => { c[computeSev(a).bucket]++ })
    return [
      { label: 'Crítica',   count: c.critical, color: '#ef4444' },
      { label: 'Alta',      count: c.high,     color: '#f97316' },
      { label: 'Moderada',  count: c.medium,   color: '#eab308' },
      { label: 'Saludable', count: c.low,      color: '#22c55e' },
    ]
  }, [analyses])

  const totalSev = sevDist.reduce((s, g) => s + g.count, 0) || 1
  const recent = useMemo(() => analyses.slice(0, 4), [analyses])
  const rangeLabel = RANGE_OPTIONS.find(o => o.key === applied.range)?.label || 'Todos los registros'

  return (
    <>
      <style>{`
        .ha-kpi { position:relative; overflow:hidden; border-radius:28px; border:1px solid rgba(226,232,240,0.9); background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%); }
        .ha-panel { border:1px solid rgba(226,232,240,0.9); border-radius:30px; }
        .ha-panel-header { border-bottom:1px solid #eef2f7; background:rgba(255,255,255,0.82); }
        .ha-panel-title { font-family:'Cormorant Garamond',serif; letter-spacing:-0.02em; }
        .ha-muted { color:#64748b; }
        .ha-sparkline { height:0.4rem; border-radius:9999px; background:linear-gradient(90deg,rgba(34,197,94,.1),rgba(34,197,94,.4)); }
        .ha-fade { animation:haFade 0.3s ease-in-out; }
        @keyframes haFade { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }

        .ha-severity-pill { display:inline-flex;align-items:center;padding:.25rem .55rem;border-radius:9999px;font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase; }
        .ha-sev-low      { background:#ecfdf5; color:#166534; }
        .ha-sev-medium   { background:#fefce8; color:#a16207; }
        .ha-sev-high     { background:#fff7ed; color:#c2410c; }
        .ha-sev-critical { background:#fef2f2; color:#b91c1c; }

        .ha-timeline-list { display:grid; gap:0.75rem; list-style:none; padding:0; margin:0; }
        .ha-timeline-item { display:grid; grid-template-columns:auto 1fr auto; gap:0.8rem; align-items:start; border:1px solid #e2e8f0; border-radius:20px; background:#fff; padding:.85rem .95rem; }
        .ha-dot { width:.8rem; height:.8rem; border-radius:9999px; margin-top:.35rem; background:#22c55e; box-shadow:0 0 0 5px rgba(34,197,94,.16); flex-shrink:0; }
        .ha-dot.high   { background:#ef4444; box-shadow:0 0 0 5px rgba(239,68,68,.16); }
        .ha-dot.medium { background:#f59e0b; box-shadow:0 0 0 5px rgba(245,158,11,.16); }

        .ha-table-scroll { overflow-x:auto; }
        .ha-table-scroll::-webkit-scrollbar { height:3px; }
        .ha-table-scroll::-webkit-scrollbar-thumb { background:#d1fae5; border-radius:4px; }
        .ha-table-scroll::-webkit-scrollbar-track { background:transparent; }
        .ha-tr:hover td { background:rgba(240,253,244,0.6); cursor:pointer; }

        .ha-input { width:100%; font-size:.875rem; border:1px solid #e2e8f0; border-radius:.75rem; background:#fff; padding:.6rem .75rem; outline:none; color:#0f172a; transition:border-color .15s,box-shadow .15s; }
        .ha-input:focus { border-color:#22c55e; box-shadow:0 0 0 2px rgba(34,197,94,.2); }

        /* Modal */
        .ha-overlay { display:none; position:fixed; inset:0; background:rgba(15,23,42,.45); backdrop-filter:blur(4px); z-index:200; align-items:flex-end; justify-content:center; padding:0; }
        .ha-overlay.open { display:flex; }
        .ha-modal { width:100%; max-height:92dvh; border-radius:28px 28px 0 0; background:#fff; border:1px solid #eef2f7; box-shadow:0 -8px 48px rgba(15,23,42,.18); overflow:hidden; display:flex; flex-direction:column; }
        @media(min-width:640px){
          .ha-overlay { align-items:center; padding:1rem; }
          .ha-modal { width:min(100%,720px); max-height:min(92dvh,900px); border-radius:24px; box-shadow:0 24px 48px rgba(15,23,42,.18); }
        }
        .ha-modal-header { background:#fff; border-bottom:1px solid #eef2f7; flex-shrink:0; }
        .ha-modal-body { overflow-y:auto; background:linear-gradient(180deg,#fff 0%,#f8fafc 100%); overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
        .ha-drag-handle { display:none; }
        @media(max-width:639px){ .ha-drag-handle { display:block; width:36px; height:4px; background:#cbd5e1; border-radius:999px; margin:10px auto 4px; flex-shrink:0; touch-action:none; cursor:grab; } }
        .ha-detail-section { border:1px solid #e5e7eb; background:#fff; border-radius:22px; padding:1rem; }
        .ha-detail-section-title { font-size:.78rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#166534; }
        .ha-detail-badge { display:inline-flex; align-items:center; gap:.35rem; border-radius:9999px; border:1px solid #dcfce7; background:#f0fdf4; color:#15803d; padding:.3rem .7rem; font-size:.68rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
        .ha-detail-field { display:flex; flex-direction:column; gap:.15rem; }
        .ha-detail-label { font-size:.62rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#94a3b8; }
        .ha-detail-value { font-size:.9rem; color:#0f172a; line-height:1.4; }
        .ha-detail-img { width:100%; max-height:260px; object-fit:cover; border-radius:16px; border:1px solid #e5e7eb; }
        .ha-conf-bar { height:.5rem; border-radius:9999px; background:#f1f5f9; overflow:hidden; }
        .ha-conf-fill { height:100%; border-radius:9999px; background:linear-gradient(90deg,#22c55e,#16a34a); transition:width .6s ease; }
      `}</style>

      {/* ── Detail Modal ── */}
      {detail && (
        <div className="ha-overlay open" onClick={closeDetail}>
          <div className="ha-modal" ref={detailModalRef} onClick={e => e.stopPropagation()}>
            <div className="ha-drag-handle" />

            <header className="ha-modal-header px-5 py-4 sm:px-8 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="ha-detail-badge"><i className="fas fa-file-lines mr-1"></i> Detalle del análisis</span>
                  <h3 className="ha-panel-title text-xl sm:text-2xl font-semibold text-slate-900 mt-3 leading-tight">
                    {detail.disease_name_predicted || 'Registro completo'}
                  </h3>
                </div>
                <button onClick={closeDetail}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition flex-shrink-0"
                  style={{ border: 'none', cursor: 'pointer' }}>
                  <i className="fas fa-xmark"></i>
                </button>
              </div>
            </header>

            <div className="ha-modal-body flex-1 p-5 sm:p-8 space-y-4">

              {/* Imagen */}
              <div className="ha-detail-section">
                <p className="ha-detail-section-title mb-3">Imagen del análisis</p>
                {detail.image_url
                  ? <img src={detail.image_url} alt="análisis" className="ha-detail-img" />
                  : <div className="w-full h-40 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <i className="fas fa-leaf text-5xl"></i>
                    </div>
                }
              </div>

              {/* Usuario */}
              <div className="ha-detail-section">
                <p className="ha-detail-section-title mb-3">Información del usuario</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="ha-detail-field">
                    <span className="ha-detail-label">Nombre</span>
                    <span className="ha-detail-value">{detail.owner_name || '—'}</span>
                  </div>
                  <div className="ha-detail-field">
                    <span className="ha-detail-label">Correo electrónico</span>
                    <span className="ha-detail-value">{detail.owner_email || '—'}</span>
                  </div>
                  <div className="ha-detail-field sm:col-span-2">
                    <span className="ha-detail-label">Fecha del análisis</span>
                    <span className="ha-detail-value">{fmtDate(detail.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Diagnóstico */}
              <div className="ha-detail-section">
                <p className="ha-detail-section-title mb-3">Diagnóstico</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="ha-detail-field">
                    <span className="ha-detail-label">Enfermedad detectada</span>
                    <span className="ha-detail-value font-semibold">{detail.disease_name_predicted || '—'}</span>
                  </div>
                  <div className="ha-detail-field">
                    <span className="ha-detail-label">Severidad</span>
                    <span className="ha-detail-value">
                      {(() => { const s = computeSev(detail); return <span className={`ha-severity-pill ${sevClass(s.bucket)}`}>{s.label}</span> })()}
                    </span>
                  </div>
                </div>

                {detail.confidence_percent != null && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="ha-detail-field">
                        <span className="ha-detail-label">Confianza del modelo</span>
                        <span className="ha-detail-value font-semibold">{detail.confidence_percent}%</span>
                        <div className="ha-conf-bar mt-1">
                          <div className="ha-conf-fill" style={{ width: `${detail.confidence_percent}%` }}></div>
                        </div>
                      </div>
                      {detail.probability != null && (
                        <div className="ha-detail-field">
                          <span className="ha-detail-label">Probabilidad</span>
                          <span className="ha-detail-value font-semibold">
                            {typeof detail.probability === 'number' ? `${(detail.probability * 100).toFixed(1)}%` : detail.probability}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="ha-detail-field">
                    <span className="ha-detail-label">Observación</span>
                    <div className="ha-detail-value mt-1 text-sm leading-relaxed whitespace-pre-line">
                      {notesByAnId[String(detail.id)] || <span className="text-slate-400 italic">Sin observaciones</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recomendaciones */}
              {detail.recommendations_text && (
                <div className="ha-detail-section">
                  <p className="ha-detail-section-title mb-3">Recomendaciones de manejo</p>
                  <div className="ha-detail-field">
                    <span className="ha-detail-label">Acciones sugeridas</span>
                    <div className="ha-detail-value mt-1 text-sm leading-relaxed whitespace-pre-line bg-brand-50 rounded-xl p-3 border border-brand-100">
                      {detail.recommendations_text}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <section className="mb-10 ha-fade space-y-6">

        {/* Header */}
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600 mb-2">Centro documental</p>
            <h2 className="ha-panel-title text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
              Historial inteligente de análisis
            </h2>
            <p className="mt-3 text-sm md:text-base text-slate-500 leading-7">
              Aquí se cruzan las sesiones previas al análisis con los resultados históricos para revisar severidad, síntomas y zonas con más actividad.
            </p>
          </div>
          <div className="ha-panel px-4 py-3 min-w-[240px]">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Filtro activo</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{rangeLabel}</p>
            <p className="mt-1 text-sm ha-muted">Vista administrativa · búsqueda por cliente</p>
          </div>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <article className="ha-kpi p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Registros visibles</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{kpis.total}</p>
                <p className="mt-2 text-sm ha-muted">Análisis en el período</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center border border-brand-100 flex-shrink-0">
                <i className="fas fa-folder-tree text-brand-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 ha-sparkline"></div>
          </article>

          <article className="ha-kpi p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Alertas clínicas</p>
                <p className="mt-2 text-4xl font-bold text-red-700">{kpis.highRisk}</p>
                <p className="mt-2 text-sm ha-muted">Severidad moderada, alta o crítica</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 flex-shrink-0">
                <i className="fas fa-triangle-exclamation text-red-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 ha-sparkline" style={{ background: 'linear-gradient(90deg,rgba(239,68,68,.1),rgba(239,68,68,.45))' }}></div>
          </article>

          <article className="ha-kpi p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Diagnóstico frecuente</p>
                <p className="mt-2 text-lg font-bold text-slate-900 truncate">{kpis.topDisease}</p>
                <p className="mt-2 text-sm ha-muted">Principal enfermedad detectada</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 flex-shrink-0">
                <i className="fas fa-bug text-amber-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 ha-sparkline" style={{ background: 'linear-gradient(90deg,rgba(234,179,8,.1),rgba(234,179,8,.45))' }}></div>
          </article>

          <article className="ha-kpi p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Último evento</p>
                <p className="mt-2 text-lg font-bold text-slate-900 truncate">{kpis.latest?.owner_name || 'Sin actividad'}</p>
                <p className="mt-2 text-sm ha-muted truncate">{kpis.latest ? fmtDateShort(kpis.latest.created_at) : 'Aún no hay registros'}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center border border-sky-100 flex-shrink-0">
                <i className="fas fa-clock-rotate-left text-sky-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 ha-sparkline" style={{ background: 'linear-gradient(90deg,rgba(14,165,233,.1),rgba(14,165,233,.45))' }}></div>
          </article>
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">

          {/* Izquierda: filtros + tabla */}
          <article className="ha-panel overflow-hidden">
            <header className="ha-panel-header px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Filtros</p>
                <h3 className="mt-1 ha-panel-title text-2xl font-semibold text-slate-900">Ajusta el periodo de revisión</h3>
              </div>
              <span className="text-xs text-slate-500">Historial operativo</span>
            </header>

            <div className="px-5 py-5">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
                <div className="xl:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Periodo</label>
                  <select value={range} onChange={e => setRange(e.target.value)} className="ha-input">
                    {RANGE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Desde</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="ha-input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hasta</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="ha-input" />
                </div>
                <div className="xl:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre del cliente</label>
                  <input type="text" value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Ej: Juan Pérez" className="ha-input" />
                </div>
                <div className="flex gap-2 xl:col-span-6">
                  <button type="submit" style={{ border: 'none', cursor: 'pointer' }}
                    className="bg-brand-600 text-white font-medium rounded-xl px-4 py-2.5 text-sm hover:bg-brand-700 transition">
                    Aplicar
                  </button>
                  <button type="button" onClick={clearFilters} style={{ cursor: 'pointer' }}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:bg-brand-50 font-medium transition">
                    Limpiar
                  </button>
                </div>
              </form>
            </div>

            <div className="ha-table-scroll border-t border-slate-100">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span className="text-sm font-medium">Cargando historial…</span>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Imagen</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Diagnóstico del modelo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Confianza</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Severidad</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {analyses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-sm">
                          No hay registros para el filtro seleccionado.
                        </td>
                      </tr>
                    ) : analyses.map(a => (
                      <tr key={a.id} className="ha-tr transition" onClick={() => openDetail(a)}>
                        <td className="px-4 py-3">
                          {a.image_url
                            ? <img src={a.image_url} alt="" className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                            : <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                <i className="fas fa-leaf text-lg"></i>
                              </div>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{a.owner_name || '—'}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[140px]">{a.owner_email || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-[200px] truncate">{a.disease_name_predicted || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{a.confidence_percent != null ? `${a.confidence_percent}%` : '—'}</td>
                        <td className="px-4 py-3">
                          {(() => { const s = computeSev(a); return <span className={`ha-severity-pill ${sevClass(s.bucket)}`}>{s.label}</span> })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmtDateShort(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </article>

          {/* Columna derecha */}
          <div className="space-y-6">

            {/* Donut */}
            <article className="ha-panel overflow-hidden">
              <header className="ha-panel-header px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Severidad</p>
                  <h3 className="mt-1 ha-panel-title text-2xl font-semibold text-slate-900">Distribución clínica</h3>
                </div>
                <span className="text-xs text-slate-500">Mapa rápido</span>
              </header>
              <div className="px-5 py-5">
                <div className="flex justify-center">
                  <DonutChart segments={sevDist} size={160} thickness={28} />
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-3 list-none p-0 m-0">
                  {sevDist.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }}></span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">{s.label}</p>
                        <p className="text-xs text-slate-500">{s.count} · {Math.round(s.count / totalSev * 100)}%</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            {/* Últimos eventos */}
            <article className="ha-panel overflow-hidden">
              <header className="ha-panel-header px-5 py-4">
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Actividad reciente</p>
                <h3 className="mt-1 ha-panel-title text-2xl font-semibold text-slate-900">Últimos eventos</h3>
              </header>
              <div className="px-5 py-5">
                {recent.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No hay eventos recientes para mostrar.</p>
                ) : (
                  <ul className="ha-timeline-list">
                    {recent.map((a, i) => (
                      <li key={a.id ?? i} className="ha-timeline-item" style={{ cursor: 'pointer' }} onClick={() => openDetail(a)}>
                        {(() => {
                          const s = computeSev(a)
                          return <>
                            <span className={`ha-dot ${dotClass(s.bucket)}`}></span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{a.owner_name || 'Sin usuario'}</p>
                              <h4 className="mt-1 text-sm font-semibold text-slate-900 truncate">{a.disease_name_predicted || '—'}</h4>
                              <p className="mt-1 text-xs text-slate-500 truncate">{a.owner_email || ''}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`ha-severity-pill ${sevClass(s.bucket)}`}>{s.label}</span>
                              <p className="mt-2 text-[0.68rem] text-slate-400">{fmtDateShort(a.created_at)}</p>
                            </div>
                          </>
                        })()}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>

          </div>
        </section>
      </section>
    </>
  )
}
