import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getAnalyses } from '../../services/analysisService'
import { getPlantHistories } from '../../services/chatbotService'
import { toArray } from '../../utils/arrayUtils'
import { animateClose, setupDragToDismiss } from '../../utils/modalUtils'
import { API_PAGE_SIZE } from '../../services/apiConfig'
import AnalysisImage from '../../components/AnalysisImage'
import PageHeader from '../../components/PageHeader'
import Pagination from '../../components/Pagination'
import HistoryFilterBar from '../../components/HistoryFilterBar'
import { computeSev, sevPillClass } from '../../utils/severity'
import { formatDateWithTime as fmtDate, formatDateLong as fmtDateShort } from '../../utils/formatters'
import '../../components/modals/modals.css'
import './historial.css'

const PAGE_SIZE = 5

const RANGE_OPTIONS = [
  { key: 'all',    label: 'Todos los registros', param: null    },
  { key: 'today',  label: 'Hoy',                  param: 'today' },
  { key: '7days',  label: 'Últimos 7 días',        param: 'last7' },
  { key: '30days', label: 'Últimos 30 días',        param: 'month' },
]

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
  const [detail, setDetail]     = useState(null)
  const [notesByAnId, setNotesByAnId] = useState({})
  const [page, setPage]         = useState(1)
  const detailModalRef = useRef(null)
  const detailAnimatedRef = useRef(new Set())

  const load = useCallback((params) => {
    setLoading(true)
    Promise.all([
      getAnalyses({ ...params, page_size: API_PAGE_SIZE }),
      getPlantHistories({ page_size: API_PAGE_SIZE }).catch(() => []),
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
    const opt = RANGE_OPTIONS.find(o => o.key === range)
    if (opt?.param) p.range = opt.param
    if (dateFrom) p.date_from = dateFrom
    if (dateTo)   p.date_to   = dateTo
    if (userQuery) p.user_name = userQuery
    load(p)
    setPage(1)
  }, [range, dateFrom, dateTo, userQuery, load])

  const closeDetail = useCallback(() => {
    animateClose(detailModalRef, () => setDetail(null), detailAnimatedRef)
  }, [])

  // drag-to-dismiss on mobile
  useEffect(() => setupDragToDismiss({
    modalRef: detailModalRef, isOpen: !!detail, onClose: () => setDetail(null),
    handleClass: '.ha-drag-handle', animatedRefs: detailAnimatedRef,
  }), [detail])

  const clearFilters = () => {
    setRange('all'); setDateFrom(''); setDateTo(''); setUserQuery('')
  }

  const openDetail = (a) => {
    setDetail(a)
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
  const totalPages = Math.max(1, Math.ceil(analyses.length / PAGE_SIZE))
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])
  const paginated = useMemo(() => analyses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [analyses, page])
  const rangeLabel = RANGE_OPTIONS.find(o => o.key === range)?.label || 'Todos los registros'

  return (
    <>
      {/* ── Detail Modal ── */}
      {detail && (
        <div className="ha-overlay open" onClick={closeDetail}>
          <div className="ha-modal" ref={detailModalRef} onClick={e => e.stopPropagation()}>
            <div className="ha-drag-handle" />

            <header className="ha-modal-header px-5 py-4 sm:px-8 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="context-badge"><i className="fas fa-file-lines mr-1"></i> Detalle del análisis</span>
                  <h3 className="panel-title text-xl sm:text-2xl font-semibold text-slate-900 mt-3 leading-tight">
                    {detail.disease_name_predicted || 'Registro completo'}
                  </h3>
                </div>
                <button onClick={closeDetail}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition flex-shrink-0 border-none cursor-pointer">
                  <i className="fas fa-xmark"></i>
                </button>
              </div>
            </header>

            <div className="ha-modal-body flex-1 p-5 sm:p-8 space-y-4">

              {/* Imagen */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Imagen del análisis</p>
                <AnalysisImage src={detail.image_url} className="w-full h-40 rounded-2xl" />
              </div>

              {/* Usuario */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Información del usuario</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="detail-field">
                    <span className="detail-field-label">Nombre</span>
                    <span className="detail-field-value">{detail.owner_name || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Correo electrónico</span>
                    <span className="detail-field-value">{detail.owner_email || '—'}</span>
                  </div>
                  <div className="detail-field sm:col-span-2">
                    <span className="detail-field-label">Fecha del análisis</span>
                    <span className="detail-field-value">{fmtDate(detail.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Diagnóstico */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Diagnóstico</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="detail-field">
                    <span className="detail-field-label">Enfermedad detectada</span>
                    <span className="detail-field-value font-semibold">{detail.disease_name_predicted || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Severidad</span>
                    <span className="detail-field-value">
                      {(() => { const s = computeSev(detail); return <span className={`sev-pill ${sevPillClass(s.bucket)}`}>{s.label}</span> })()}
                    </span>
                  </div>
                </div>

                {detail.confidence_percent != null && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="detail-field">
                        <span className="detail-field-label">Confianza del modelo</span>
                        <span className="detail-field-value font-semibold">{detail.confidence_percent}%</span>
                        <div className="ha-conf-bar mt-1">
                          <div className="ha-conf-fill" style={{ width: `${detail.confidence_percent}%` }}></div>
                        </div>
                      </div>
                      {detail.probability != null && (
                        <div className="detail-field">
                          <span className="detail-field-label">Probabilidad</span>
                          <span className="detail-field-value font-semibold">
                            {typeof detail.probability === 'number' ? `${(detail.probability * 100).toFixed(1)}%` : detail.probability}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="detail-field">
                    <span className="detail-field-label">Observación</span>
                    <div className="detail-field-value mt-1 text-sm leading-relaxed whitespace-pre-line">
                      {notesByAnId[String(detail.id)] || <span className="text-slate-400 italic">Sin observaciones</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recomendaciones */}
              {detail.recommendations_text && (
                <div className="detail-section">
                  <p className="detail-section-title mb-3">Recomendaciones de manejo</p>
                  <div className="detail-field">
                    <span className="detail-field-label">Acciones sugeridas</span>
                    <div className="detail-field-value mt-1 text-sm leading-relaxed whitespace-pre-line bg-brand-50 rounded-xl p-3 border border-brand-100">
                      {detail.recommendations_text}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <section className="mb-10 fade-in-up space-y-6">

        <PageHeader
          eyebrow="Centro documental"
          title="Historial inteligente de análisis"
          description="Aquí se cruzan las sesiones previas al análisis con los resultados históricos para revisar severidad, síntomas y zonas con más actividad."
          info={{
            label: 'Filtro activo',
            value: rangeLabel,
            note: 'Vista administrativa · búsqueda por cliente',
          }}
          kpis={[
            { label: 'Registros visibles', value: kpis.total, note: 'Análisis en el período', icon: 'fa-folder-tree', tone: 'brand' },
            { label: 'Alertas clínicas', value: kpis.highRisk, note: 'Severidad moderada, alta o crítica', icon: 'fa-triangle-exclamation', tone: 'red' },
            { label: 'Diagnóstico frecuente', value: kpis.topDisease, note: 'Principal enfermedad detectada', icon: 'fa-bug', tone: 'amber', small: true },
            { label: 'Último evento', value: kpis.latest?.owner_name || 'Sin actividad', note: kpis.latest ? fmtDateShort(kpis.latest.created_at) : 'Aún no hay registros', icon: 'fa-clock-rotate-left', tone: 'sky', small: true },
          ]}
        />

        {/* Main grid */}
        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">

          {/* Izquierda: filtros + tabla */}
          <article className="info-card overflow-hidden">
            <header className="ha-panel-header px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Filtros</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Ajusta el periodo de revisión</h3>
              </div>
              <span className="text-xs text-slate-500">Historial operativo</span>
            </header>

            <div className="px-5 py-5">
              <HistoryFilterBar
                rangeOptions={RANGE_OPTIONS}
                range={range}
                onRangeChange={setRange}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                dateTo={dateTo}
                onDateToChange={setDateTo}
                showUserSearch
                userQuery={userQuery}
                onUserQueryChange={setUserQuery}
                onClear={clearFilters}
              />
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
                    ) : paginated.map(a => (
                      <tr key={a.id} className="ha-tr transition" onClick={() => openDetail(a)}>
                        <td className="px-4 py-3">
                          <AnalysisImage src={a.image_url} className="w-14 h-14" />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{a.owner_name || '—'}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[140px]">{a.owner_email || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-[200px] truncate">{a.disease_name_predicted || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{a.confidence_percent != null ? `${a.confidence_percent}%` : '—'}</td>
                        <td className="px-4 py-3">
                          {(() => { const s = computeSev(a); return <span className={`sev-pill ${sevPillClass(s.bucket)}`}>{s.label}</span> })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmtDateShort(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </article>

          {/* Columna derecha */}
          <div className="space-y-6">

            {/* Donut */}
            <article className="info-card overflow-hidden">
              <header className="ha-panel-header px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Severidad</p>
                  <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Distribución clínica</h3>
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
            <article className="info-card overflow-hidden">
              <header className="ha-panel-header px-5 py-4">
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Actividad reciente</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Últimos eventos</h3>
              </header>
              <div className="px-5 py-5">
                {recent.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No hay eventos recientes para mostrar.</p>
                ) : (
                  <ul className="ha-timeline-list">
                    {recent.map((a, i) => (
                      <li key={a.id ?? i} className="ha-timeline-item" onClick={() => openDetail(a)}>
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
                              <span className={`sev-pill ${sevPillClass(s.bucket)}`}>{s.label}</span>
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
