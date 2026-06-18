import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAnalyses } from '../services/analysisService'
import { getFarms, getPlantHistories, getConversations, getContexts } from '../services/chatbotService'

// Normalize: lowercase + remove diacritics so "Crítica" = "Critica" = "critica"
function normSev(val) {
  return String(val || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function severityClass(val) {
  const s = normSev(val)
  if (s.includes('crit') || s.includes('extrem') || s.includes('muy alta') || s.includes('muy grav')) return 'severity-critical'
  if (s.includes('alta') || s.includes('high') || s.includes('grav') || s.includes('sever') || s.includes('seria')) return 'severity-high'
  if (s.includes('moder') || s.includes('media') || s.includes('inter') || s.includes('parcial')) return 'severity-medium'
  if (s.includes('baja') || s.includes('leve') || s.includes('low') || s.includes('liger') || s.includes('inici') || s.includes('min')) return 'severity-low'
  return 'severity-low'
}

function severityBucket(val) {
  const s = normSev(val)
  if (s.includes('crit') || s.includes('extrem') || s.includes('muy alta') || s.includes('muy grav')) return 'critical'
  if (s.includes('alta') || s.includes('high') || s.includes('grav') || s.includes('sever') || s.includes('seria')) return 'high'
  if (s.includes('moder') || s.includes('media') || s.includes('inter') || s.includes('parcial')) return 'medium'
  return 'low'
}

function fmtDate(v) {
  if (!v) return 'Sin fecha'
  const d = new Date(v)
  if (isNaN(d)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function fmtDateShort(v) {
  if (!v) return 'Sin fecha'
  const d = new Date(v)
  if (isNaN(d)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeStyle: 'short' }).format(d)
}

const sevLabels = ['Baja', 'Moderada', 'Alta', 'Crítica']
const sevColors = ['#22c55e', '#f59e0b', '#fb923c', '#ef4444']

function severityLevel(val) {
  const s = normSev(val)
  if (s.includes('crit') || s.includes('extrem') || s.includes('muy alta') || s.includes('muy grav')) return 3
  if (s.includes('alta') || s.includes('high') || s.includes('grav') || s.includes('sever') || s.includes('seria')) return 2
  if (s.includes('moder') || s.includes('media') || s.includes('med') || s.includes('inter') || s.includes('parcial')) return 1
  if (s.includes('baja') || s.includes('leve') || s.includes('low') || s.includes('liger') || s.includes('inici') || s.includes('min')) return 0
  return -1
}

function normArr(v) {
  return Array.isArray(v) ? v : (v && v.results ? v.results : [])
}

export default function HistorialAnalisisPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fichaRef = useRef(null)

  const [analyses, setAnalyses] = useState([])
  const [enrichedPhs, setEnrichedPhs] = useState([])
  const [groupCount, setGroupCount] = useState({})
  const [farms, setFarms] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showTrazabilidad, setShowTrazabilidad] = useState(false)
  const [showFicha, setShowFicha] = useState(false)
  const [activeGroupKey, setActiveGroupKey] = useState('')

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'critical', label: 'Críticos' },
    { key: 'high', label: 'Altos' },
    { key: 'medium', label: 'Moderados' },
    { key: 'low', label: 'Leves' },
  ]

  useEffect(() => {
    Promise.all([
      getAnalyses(),
      getFarms(),
      getPlantHistories(),
      getContexts().catch(() => []),
    ]).then(([rawA, rawF, rawPh, rawCtx]) => {
      const farmsArr = normArr(rawF)

      // Build plot → farm lookup maps from getFarms() (most reliable source)
      const plotsById = {}
      const farmByPlotId = {}
      farmsArr.forEach(farm => {
        ;(farm.plots || []).forEach(plot => {
          const pid = String(plot.id)
          plotsById[pid] = plot
          farmByPlotId[pid] = farm
        })
      })

      // Build context lookup from getContexts()
      const ctxById = {}
      normArr(rawCtx).forEach(ctx => {
        const cid = String(ctx.id || ctx.id_context || '')
        if (cid) ctxById[cid] = ctx
      })

      // Enrich plant histories
      const phArr = normArr(rawPh)
      const enrichedPhArr = phArr.map(ph => {
        // Resolve context: may already be nested object or just an int ID
        let ctx = null
        if (ph.context && typeof ph.context === 'object') {
          ctx = ph.context
          // Cache it in ctxById in case we see the int later
          const cid = String(ctx.id || ctx.id_context || '')
          if (cid && !ctxById[cid]) ctxById[cid] = ctx
        } else if (ph.context) {
          ctx = ctxById[String(ph.context)] || null
        }

        // Resolve plot and farm
        let plot = null, farm = null, plotId = ''
        if (ctx) {
          if (ctx.plot && typeof ctx.plot === 'object') {
            plot = ctx.plot
            plotId = String(plot.id || plot.id_plot || '')
          } else if (ctx.plot) {
            plotId = String(ctx.plot)
          } else if (ctx.id_plot) {
            plotId = String(ctx.id_plot)
          }
          if (plotId) {
            plot = plot || plotsById[plotId]
            farm = farmByPlotId[plotId]
          }
        }

        const ctxId = ctx?.id || ctx?.id_context || (typeof ph.context === 'number' ? ph.context : null)
        const plantId = ctx?.plant_key_or_id || ctx?.context_plant_key_or_id || ''
        // Group by plant_key_or_id + plot_id so the SAME physical plant is linked across
        // different conversations (each conversation creates a new context, but the plant
        // and plot don't change). Fall back to context ID when plant ID isn't available.
        const groupKey = (plantId && plotId) ? `${plantId}|${plotId}` : (ctxId ? `ctx_${ctxId}` : '')

        return {
          ...ph,
          _ctx: ctx,
          _plot: plot,
          _farm: farm,
          _groupKey: groupKey,
          _plantId: plantId,
          _affectedPart: ctx?.affected_part || ctx?.context_affected_part || '',
          _mainSymptom: ctx?.main_symptom || ctx?.context_main_symptom || '',
          _status: ctx?.status || ctx?.context_status || '',
          _plotName: plot?.name || plot?.plot_name || '',
          _farmName: farm?.name || farm?.farm_name || '',
          _gps: plot?.gps_location || plot?.plot_gps_location || '',
          _zone: plot?.zone || plot?.plot_zone || '',
          _rows: (plot?.rows != null) ? String(plot.rows) : '',
          _hectares: (plot?.hectares != null) ? String(plot.hectares) : '',
        }
      })

      // Build analysis_result_id → enriched ph map
      const phByAnId = {}
      enrichedPhArr.forEach(ph => {
        const arId = (ph.analysis_result && typeof ph.analysis_result === 'object')
          ? ph.analysis_result.id
          : ph.analysis_result
        if (arId != null) phByAnId[String(arId)] = ph
      })

      // Deduplicate analyses (same image_path + conversation)
      const rawAnalyses = normArr(rawA)
      const seenKeys = new Set()
      const deduped = rawAnalyses.filter(x => {
        if (!x.image_path) return true
        const key = `${x.image_path}__${x.conversation || ''}`
        if (seenKeys.has(key)) return false
        seenKeys.add(key)
        return true
      })

      // Enrich analyses with linked plant history
      const enrichedArr = deduped.map(an => ({
        ...an,
        _ph: phByAnId[String(an.id)] || null,
      }))

      // Precompute group analysis counts
      const gc = {}
      enrichedArr.forEach(an => {
        const gk = an._ph?._groupKey
        if (gk) gc[gk] = (gc[gk] || 0) + 1
      })

      setFarms(farmsArr)
      setEnrichedPhs(enrichedPhArr)
      setAnalyses(enrichedArr)
      setGroupCount(gc)
    }).catch(err => {
      console.error('Error cargando historial:', err)
    }).finally(() => setLoading(false))
  }, [])

  // All analyses for a group, sorted oldest → newest
  function getGroupAnalyses(groupKey) {
    if (!groupKey) return []
    return analyses
      .filter(a => a._ph?._groupKey === groupKey)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
  }

  // Stats
  const activePlots = new Set(analyses.map(a => a._ph?._plot?.id).filter(Boolean))
  const stats = {
    total: analyses.length,
    lots: activePlots.size || farms.length,
    critical: analyses.filter(a => severityBucket(a.severity) === 'critical').length,
  }

  // Filtered list for main view
  const filtered = analyses.filter(a => {
    const q = searchQuery.trim().toLowerCase()
    const ph = a._ph
    const txt = [
      a.disease_name_predicted || '',
      a.severity || '',
      a.analysis_text || '',
      ph?._plantId || '',
      ph?._plotName || '',
      ph?._farmName || '',
      ph?._zone || '',
      ph?._mainSymptom || '',
    ].join(' ').toLowerCase()
    return (!q || txt.includes(q)) && (activeFilter === 'all' || severityBucket(a.severity) === activeFilter)
  })

  function openTrazabilidad(a) {
    setActiveGroupKey(a._ph?._groupKey || '')
    setShowTrazabilidad(true)
  }

  function openFicha(a) {
    setActiveGroupKey(a._ph?._groupKey || '')
    setShowFicha(true)
  }

  function downloadPDF() {
    const el = fichaRef.current
    if (!el) return
    import('html2canvas').then(h2c => {
      h2c.default(el, { scale: 2, backgroundColor: '#ffffff', logging: false }).then(canvas => {
        const imgData = canvas.toDataURL('image/png')
        import('jspdf').then(({ jsPDF }) => {
          const pdf = new jsPDF('p', 'mm', 'a4')
          const pw = pdf.internal.pageSize.getWidth()
          const ph = (canvas.height * pw) / canvas.width
          let hl = ph, pos = 0
          pdf.addImage(imgData, 'PNG', 0, pos, pw, ph)
          hl -= pdf.internal.pageSize.getHeight()
          while (hl > 0) {
            pos = hl - ph
            pdf.addPage()
            pdf.addImage(imgData, 'PNG', 0, pos, pw, ph)
            hl -= pdf.internal.pageSize.getHeight()
          }
          pdf.save('ficha_tecnica.pdf')
        })
      })
    })
  }

  function renderAnalysisCard(a, idx) {
    const ph = a._ph
    const groupKey = ph?._groupKey || ''
    const hasFicha = Boolean(groupKey)
    const hasTrazabilidad = Boolean(groupKey && (groupCount[groupKey] || 0) >= 2)
    const sev = a.severity || 'Sin severidad'
    const disease = a.disease_name_predicted || 'Diagnóstico pendiente'
    const preview = a.analysis_text ? a.analysis_text.substring(0, 120) + '…' : 'Sin descripción'
    const location = ph
      ? [ph._farmName, ph._plotName, ph._zone, ph._rows ? `Hilera ${ph._rows}` : ''].filter(Boolean).join(' · ') || 'Sin ubicación'
      : 'Sin ubicación'
    const plantId = ph?._plantId || '—'
    const symptom = ph?._mainSymptom || disease
    const affectedPart = ph?._affectedPart || '—'
    const conf = a.confidence_percent ?? (a.confidence ? Math.round(a.confidence * 100) : null)

    return (
      <article key={a.id || idx} className="analysis-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className={`severity-pill ${severityClass(sev)}`}>{sev}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 leading-tight">{disease}</h3>
            <p className="text-sm text-slate-500 mt-1.5">{preview}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {hasTrazabilidad && (
              <button onClick={() => openTrazabilidad(a)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50 transition cursor-pointer"
                style={{ border: 'none' }}>
                <i className="fas fa-code-branch text-[0.78rem]"></i>
                Ver trazabilidad
              </button>
            )}
            {hasFicha && (
              <button onClick={() => openFicha(a)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50 transition cursor-pointer"
                style={{ border: 'none' }}>
                <i className="fas fa-file-medical text-[0.78rem]"></i>
                Ficha técnica
              </button>
            )}
            <button onClick={async () => {
              let convId = a.conversation || a.conversation_id
              if (!convId && ph?._ctx) {
                try {
                  const convs = await getConversations()
                  const list = normArr(convs)
                  const cid = ph._ctx.id || ph._ctx.id_context
                  const match = list.find(c => c.context && String(c.context) === String(cid))
                  if (match) convId = match.id
                } catch {}
              }
              navigate('/chatbot', { state: { conversationId: convId } })
            }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition flex-shrink-0 cursor-pointer" style={{ border: 'none' }}>
              Abrir en chat
              <i className="fas fa-arrow-up-right-from-square text-[0.78rem]"></i>
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mt-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-400 font-semibold">Ubicación</p>
            <p className="mt-1 text-slate-700 leading-relaxed">{location}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-400 font-semibold">Planta</p>
            <p className="mt-1 text-slate-700 leading-relaxed">{plantId}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-400 font-semibold">Síntoma</p>
            <p className="mt-1 text-slate-700 leading-relaxed">{symptom}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-400 font-semibold">Órgano afectado</p>
            <p className="mt-1 text-slate-700 leading-relaxed">{affectedPart}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {conf != null && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 font-semibold">Confianza: {conf}%</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {a.image_url && (
              <img src={a.image_url} alt="" className="w-10 h-10 rounded-lg border border-slate-200 object-cover" />
            )}
            <p className="text-xs text-slate-400">Actualizado {a.created_at ? fmtDate(a.created_at) : '—'}</p>
          </div>
        </div>
      </article>
    )
  }

  // ── Trazabilidad data (newest first for timeline) ──
  const tzAnalyses = showTrazabilidad ? [...getGroupAnalyses(activeGroupKey)].reverse() : []
  const tzPh = tzAnalyses[0]?._ph

  // ── Ficha data (oldest → newest for progression) ──
  const fichaAnalyses = showFicha ? getGroupAnalyses(activeGroupKey) : []
  const fichaPh = fichaAnalyses[fichaAnalyses.length - 1]?._ph || fichaAnalyses[0]?._ph
  const fichaTotal = fichaAnalyses.length
  const fichaDiseases = [...new Set(fichaAnalyses.map(e => e.disease_name_predicted).filter(Boolean))]
  const fichaTopDisease = fichaDiseases.length
    ? [...fichaDiseases].sort((a, b) =>
        fichaAnalyses.filter(e => e.disease_name_predicted === b).length -
        fichaAnalyses.filter(e => e.disease_name_predicted === a).length
      )[0]
    : '—'
  const fichaLastDate = fichaAnalyses.length
    ? fmtDateShort(fichaAnalyses[fichaAnalyses.length - 1].created_at)
    : '—'
  // Severity levels (only mapped entries, for trend/avg)
  const sevLevels = fichaAnalyses
    .map(e => severityLevel(e.severity))
    .filter(l => l >= 0)
  const avgSeverityIdx = sevLevels.length
    ? Math.round(sevLevels.reduce((a, b) => a + b, 0) / sevLevels.length)
    : -1
  // Avg severity: prefer mapped label, fallback to most-common raw value
  const avgSeverityLabel = avgSeverityIdx >= 0
    ? sevLabels[avgSeverityIdx]
    : (fichaAnalyses.length ? fichaAnalyses[0].severity || '—' : '—')

  const severityTrend = sevLevels.length >= 2
    ? (sevLevels[sevLevels.length - 1] > sevLevels[0] ? 'Empeorando'
      : sevLevels[sevLevels.length - 1] < sevLevels[0] ? 'Mejorando' : 'Estable')
    : (fichaAnalyses.length === 1 ? 'Sin comparación (1 análisis)' : '—')

  // Dynamic distribution: count by actual severity value from DB
  const sevDistMap = {}
  fichaAnalyses.forEach(e => {
    const raw = (e.severity || 'Sin datos').trim()
    sevDistMap[raw] = (sevDistMap[raw] || 0) + 1
  })
  // Sort by severity level desc, then alphabetically
  const sevDistEntries = Object.entries(sevDistMap).sort(([a], [b]) => {
    const la = severityLevel(a), lb = severityLevel(b)
    if (lb !== la) return lb - la
    return a.localeCompare(b)
  })
  const maxSevCount = Math.max(...Object.values(sevDistMap), 1)

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        body{font-family:'Inter',sans-serif;color:#0f172a;margin:0}
        .font-cormorant{font-family:'Cormorant Garamond',serif}
        .page-shell{position:relative;overflow:hidden;min-height:100vh}
        .botanical{position:absolute;inset:auto auto -4rem -4rem;width:20rem;opacity:.08;pointer-events:none}
        .botanical-right{position:absolute;inset:0 -4rem auto auto;width:18rem;opacity:.08;pointer-events:none;transform:scaleX(-1)}
        .glass-card{background:#fff;border:1px solid #eef2f7;border-radius:1rem}
        .stat-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px}
        .analysis-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;transition:border-color .16s ease,background .16s ease}
        .analysis-card:hover{border-color:#bbf7d0;background:#f8fafc}
        .severity-pill{display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .55rem;border-radius:9999px;font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
        .severity-low{background:#ecfdf5;color:#166534}
        .severity-medium{background:#fefce8;color:#a16207}
        .severity-high{background:#fff7ed;color:#c2410c}
        .severity-critical{background:#fef2f2;color:#b91c1c}
        .chip{border:1px solid #e5e7eb;background:#fff;border-radius:9999px;padding:.4rem .75rem;font-size:.8rem;color:#334155;transition:background .14s ease,border-color .14s ease,color .14s ease;cursor:pointer}
        .chip.active{background:#dcfce7;border-color:#bbf7d0;color:#166534}
        .search-input{width:100%;border:1px solid #dbe4ee;border-radius:14px;padding:.78rem .9rem .78rem 2.5rem;background:#fff;outline:none;transition:border-color .14s ease,box-shadow .14s ease}
        .search-input:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.12)}
        .detail-section{border:1px solid #e5e7eb;background:#fff;border-radius:22px;padding:1rem}
        .detail-section-title{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#166534}
        .detail-field{display:flex;flex-direction:column;gap:.15rem}
        .detail-field-label{font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8}
        .detail-field-value{font-size:.9rem;color:#0f172a;line-height:1.4}
      `}</style>

      <div className="page-shell">
        <svg className="botanical" viewBox="0 0 220 280" aria-hidden="true">
          <path d="M40 270 C40 190 80 160 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M65 70 C65 70 20 50 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M65 70 C65 70 115 45 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M52 155 C52 155 8 142 -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M52 155 C52 155 96 130 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
          <ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" />
          <ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" />
          <ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" />
        </svg>
        <svg className="botanical-right" viewBox="0 0 220 280" aria-hidden="true">
          <path d="M40 270 C40 190 80 160 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M65 70 C65 70 20 50 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M65 70 C65 70 115 45 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M52 155 C52 155 8 142 -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M52 155 C52 155 96 130 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
          <ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" />
          <ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" />
          <ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" />
        </svg>

        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green-700">Pitahaya Vision</p>
                  <h1 className="font-cormorant text-2xl sm:text-[2rem] font-semibold text-slate-900 leading-tight">Historial de análisis</h1>
                </div>
              </div>
              <button onClick={() => navigate('/chatbot')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                style={{ border: 'none' }}>
                <i className="fas fa-arrow-left text-[0.8rem]"></i>
                Volver al chat
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <section className="glass-card rounded-2xl p-4 sm:p-5 mb-5">
            <div className="grid gap-5 lg:grid-cols-[1.25fr_.85fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em]">
                  <i className="fas fa-chart-line text-[0.7rem]"></i>
                  Registro histórico
                </span>
                <h2 className="font-cormorant text-2xl sm:text-3xl font-semibold text-slate-900 mt-3 leading-tight">
                  Revisa cada caso, el contexto de la planta y la decisión que se tomó.
                </h2>
                <p className="text-slate-500 mt-2 max-w-2xl leading-relaxed text-sm sm:text-base">
                  Esta vista resume el análisis guardado desde el chatbot para consultar lotes, plantas, síntomas y estados sanitarios sin perder el hilo entre conversaciones.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="stat-card p-3.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Análisis</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1.5">{stats.total}</p>
                  <p className="text-xs text-slate-500 mt-1">guardados</p>
                </div>
                <div className="stat-card p-3.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Parcelas</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1.5">{stats.lots}</p>
                  <p className="text-xs text-slate-500 mt-1">con actividad</p>
                </div>
                <div className="stat-card p-3.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Casos críticos</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1.5">{stats.critical}</p>
                  <p className="text-xs text-slate-500 mt-1">requieren prioridad</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="search" className="search-input" placeholder="Buscar por lote, planta, síntoma o diagnóstico..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button key={f.key} className={`chip ${activeFilter === f.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(f.key)} style={{ border: 'none', cursor: 'pointer' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Análisis recientes</h3>
                <p className="text-sm text-slate-500">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
              </div>

              {loading ? (
                <div className="stat-card p-6 text-center mt-4 text-slate-500">Cargando...</div>
              ) : !analyses.length ? (
                <div className="stat-card p-6 text-center mt-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                    <i className="fas fa-notes-medical text-2xl"></i>
                  </div>
                  <h4 className="font-cormorant text-xl font-semibold text-slate-900">Aún no hay análisis guardados</h4>
                  <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">Vuelve al chat, registra el contexto de la planta y envía una imagen para que el historial empiece a llenarse.</p>
                  <button onClick={() => navigate('/chatbot')}
                    className="inline-flex items-center gap-2 mt-4 px-3.5 py-2 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition text-sm cursor-pointer"
                    style={{ border: 'none' }}>
                    <i className="fas fa-arrow-left text-[0.8rem]"></i>
                    Ir al chat
                  </button>
                </div>
              ) : !filtered.length ? (
                <div className="stat-card p-6 text-slate-500">No se encontraron análisis con esos filtros.</div>
              ) : (
                <div className="grid gap-4">
                  {filtered.map((a, i) => renderAnalysisCard(a, i))}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="stat-card p-4">
                <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Qué muestra</h4>
                <div className="mt-3 space-y-2.5 text-sm text-slate-600 leading-relaxed">
                  <p><span className="font-semibold text-slate-900">Ubicación:</span> finca, parcela, zona e hilera exacta.</p>
                  <p><span className="font-semibold text-slate-900">Estado:</span> síntoma principal, órgano afectado y severidad.</p>
                  <p><span className="font-semibold text-slate-900">Trazabilidad:</span> evolución cronológica por planta con imágenes y recomendaciones.</p>
                </div>
              </div>
              <div className="stat-card p-4">
                <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Decisión rápida</h4>
                <p className="text-slate-600 mt-3 leading-relaxed text-sm">
                  Usa esta pantalla para identificar patrones por parcela y revisar qué plantas requieren seguimiento antes de volver a escanear.
                </p>
              </div>
            </aside>
          </section>
        </main>
      </div>

      {/* ── TRAZABILIDAD MODAL ── */}
      {showTrazabilidad && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTrazabilidad(false)}>
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-cormorant text-xl font-semibold text-slate-900">
                  Trazabilidad
                  {tzPh?._plantId ? ` — Planta ${tzPh._plantId}` : ''}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {tzAnalyses.length} análisis
                  {tzPh?._plotName ? ` · Parcela ${tzPh._plotName}` : ''}
                  {tzPh?._farmName ? ` · Finca ${tzPh._farmName}` : ''}
                </p>
              </div>
              <button onClick={() => setShowTrazabilidad(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0 cursor-pointer"
                style={{ border: 'none', background: 'none' }}>
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>

            <div className="p-6 space-y-2">
              {tzAnalyses.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No hay registros de trazabilidad para esta planta.</div>
              ) : (
                tzAnalyses.map((entry, idx) => {
                  const isLatest = idx === 0
                  const disease = entry.disease_name_predicted || entry._ph?.history_final_diagnosis || '—'
                  const sev = entry.severity || '—'
                  const conf = entry.confidence_percent ?? (entry.confidence ? Math.round(entry.confidence * 100) : null)
                  const recs = entry.recommendations_text || entry.analysis_recommendations_text || ''
                  const location = entry._ph
                    ? [entry._ph._farmName, entry._ph._plotName, entry._ph._zone, entry._ph._rows ? `Hilera ${entry._ph._rows}` : ''].filter(Boolean).join(' · ')
                    : '—'
                  const notes = entry._ph?.history_notes || entry._ph?.notes || ''
                  const treatment = entry._ph?.history_treatment_applied || ''
                  return (
                    <div key={entry.id || idx} className="relative pl-9 pb-5">
                      {idx < tzAnalyses.length - 1 && (
                        <div className="absolute left-[13px] top-4 bottom-0 w-0.5 bg-slate-200"></div>
                      )}
                      <div className={`absolute left-[7px] top-[7px] w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${isLatest ? 'bg-brand-500' : 'bg-slate-300'}`}
                        style={{ boxShadow: `0 0 0 2px ${isLatest ? '#22c55e' : '#cbd5e1'}` }}></div>
                      <div className="analysis-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className={`severity-pill ${severityClass(sev)}`}>{sev}</span>
                              {conf != null && (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">{conf}%</span>
                              )}
                              {isLatest && (
                                <span className="severity-pill severity-low">
                                  <i className="fas fa-clock text-[0.6rem]"></i> Último
                                </span>
                              )}
                            </div>
                            <p className="text-base font-semibold text-slate-900">{disease}</p>
                            <p className="text-sm text-slate-500 mt-0.5">{fmtDateShort(entry.created_at)}</p>
                          </div>
                          {entry.image_url ? (
                            <img src={entry.image_url} alt=""
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-200 object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                              <i className="fas fa-image text-xl"></i>
                            </div>
                          )}
                        </div>

                        <div className="grid gap-1.5 sm:grid-cols-2 text-sm mb-3">
                          <p><span className="font-semibold text-slate-800">Ubicación:</span> <span className="text-slate-700">{location}</span></p>
                          {entry._ph?._plantId && (
                            <p><span className="font-semibold text-slate-800">Planta:</span> <span className="text-slate-700">{entry._ph._plantId}</span></p>
                          )}
                        </div>

                        {entry.analysis_text && (
                          <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 mb-2 leading-relaxed">
                            {entry.analysis_text}
                          </div>
                        )}

                        {recs && (
                          <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-2 leading-relaxed">
                            <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-emerald-600 mb-1">Recomendaciones</p>
                            {recs}
                          </div>
                        )}

                        {(treatment || notes) && (
                          <div className="grid gap-1.5 sm:grid-cols-2 mt-2">
                            {treatment && (
                              <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed">
                                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-amber-600 mb-1">Tratamiento aplicado</p>
                                {treatment}
                              </div>
                            )}
                            {notes && (
                              <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 leading-relaxed">
                                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-400 mb-1">Notas</p>
                                {notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-5 border-t border-slate-200 text-center">
              <button onClick={() => setShowTrazabilidad(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition cursor-pointer"
                style={{ border: 'none' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FICHA TÉCNICA MODAL ── */}
      {showFicha && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowFicha(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-cormorant text-xl font-semibold text-slate-900">
                  Ficha técnica{fichaPh?._plantId ? ` — Planta ${fichaPh._plantId}` : ''}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {fichaTotal} análisis · {fichaDiseases.length} enfermedad{fichaDiseases.length !== 1 ? 'es' : ''} · Último: {fichaLastDate}
                </p>
              </div>
              <button onClick={() => setShowFicha(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0 cursor-pointer"
                style={{ border: 'none', background: 'none' }}>
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>

            <div ref={fichaRef} className="p-5 space-y-4">

              {/* Finca / Parcela */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Finca y parcela</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="detail-field">
                    <span className="detail-field-label">Finca</span>
                    <span className="detail-field-value">{fichaPh?._farmName || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Parcela</span>
                    <span className="detail-field-value">{fichaPh?._plotName || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Zona</span>
                    <span className="detail-field-value">{fichaPh?._zone || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Hileras</span>
                    <span className="detail-field-value">{fichaPh?._rows || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Hectáreas</span>
                    <span className="detail-field-value">{fichaPh?._hectares ? `${fichaPh._hectares} ha` : '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Coordenadas GPS</span>
                    <span className="detail-field-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fichaPh?._gps || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Contexto clínico */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Contexto clínico</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="detail-field">
                    <span className="detail-field-label">ID / Número de planta</span>
                    <span className="detail-field-value font-semibold">{fichaPh?._plantId || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Estado observado</span>
                    <span className="detail-field-value">{fichaPh?._status || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Síntoma principal</span>
                    <span className="detail-field-value">{fichaPh?._mainSymptom || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Órgano afectado</span>
                    <span className="detail-field-value">{fichaPh?._affectedPart || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Estadísticas</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="detail-field">
                    <span className="detail-field-label">Total de análisis</span>
                    <span className="detail-field-value font-bold text-brand-700 text-xl">{fichaTotal}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Diagnóstico más frecuente</span>
                    <span className="detail-field-value">{fichaTopDisease}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Último análisis</span>
                    <span className="detail-field-value">{fichaLastDate}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Severidad promedio</span>
                    <span className="detail-field-value">{avgSeverityLabel}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Tendencia</span>
                    <span className={`detail-field-value font-semibold ${severityTrend === 'Empeorando' ? 'text-red-600' : severityTrend === 'Mejorando' ? 'text-green-600' : 'text-slate-500'}`}>
                      {severityTrend === 'Empeorando' && <i className="fas fa-arrow-trend-up mr-1"></i>}
                      {severityTrend === 'Mejorando' && <i className="fas fa-arrow-trend-down mr-1"></i>}
                      {severityTrend === 'Estable' && <i className="fas fa-minus mr-1"></i>}
                      {severityTrend}
                    </span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Enfermedades distintas</span>
                    <span className="detail-field-value">{fichaDiseases.length}</span>
                  </div>
                </div>
              </div>

              {/* Distribución de severidad — dinámica, usa los valores reales de la BD */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Distribución de severidad</p>
                {sevDistEntries.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin datos de severidad</p>
                ) : (
                  <div className="space-y-2">
                    {sevDistEntries.map(([label, count]) => {
                      const pct = fichaTotal > 0 ? Math.round((count / fichaTotal) * 100) : 0
                      const lvl = severityLevel(label)
                      const color = lvl >= 0 ? sevColors[lvl] : '#94a3b8'
                      return (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-600 w-24 text-right truncate" title={label}>{label}</span>
                          <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.max(4, (count / maxSevCount) * 100)}%`, background: color }}></div>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-16">{count} ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Galería */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Galería de imágenes</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {fichaAnalyses.filter(e => e.image_url).length > 0 ? (
                    [...fichaAnalyses].reverse().filter(e => e.image_url).map((e, i) => (
                      <div key={i} className="flex-shrink-0 w-48">
                        <img src={e.image_url} alt=""
                          className="w-48 h-32 rounded-xl border border-slate-200 object-cover" />
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`severity-pill ${severityClass(e.severity)}`}>{e.severity || '—'}</span>
                          <span className="text-xs text-slate-500">{fmtDate(e.created_at)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400 py-4">Sin imágenes disponibles</div>
                  )}
                </div>
              </div>

              {/* Línea de tiempo */}
              <div className="detail-section">
                <p className="detail-section-title mb-3">Línea de tiempo</p>
                {[...fichaAnalyses].reverse().map((e, i) => {
                  const disease = e.disease_name_predicted || e._ph?.history_final_diagnosis || '—'
                  const isFirst = i === 0
                  const recs = e.recommendations_text || e.analysis_recommendations_text || ''
                  const treatment = e._ph?.history_treatment_applied || ''
                  return (
                    <div key={i} className="relative pl-8 pb-4">
                      {i < fichaAnalyses.length - 1 && (
                        <div className="absolute left-[11px] top-4 bottom-0 w-0.5 bg-slate-200"></div>
                      )}
                      <div className={`absolute left-[5px] top-[6px] w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${isFirst ? 'bg-brand-500' : 'bg-slate-300'}`}
                        style={{ boxShadow: `0 0 0 2px ${isFirst ? '#22c55e' : '#cbd5e1'}` }}></div>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{disease}</p>
                          <p className="text-xs text-slate-500">{fmtDateShort(e.created_at)}</p>
                        </div>
                        <span className={`severity-pill ${severityClass(e.severity)} flex-shrink-0`}>{e.severity || '—'}</span>
                      </div>
                      {recs && (
                        <div className="text-xs text-emerald-800 bg-emerald-50 rounded-lg p-2 mt-1.5 leading-relaxed">
                          <span className="font-semibold">Rec.: </span>{recs}
                        </div>
                      )}
                      {treatment && (
                        <div className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2 mt-1 leading-relaxed">
                          <span className="font-semibold">Tratamiento: </span>{treatment}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Diagnósticos identificados */}
              {fichaDiseases.length > 0 && (
                <div className="detail-section">
                  <p className="detail-section-title mb-3">Diagnósticos identificados</p>
                  <div className="flex flex-wrap gap-2">
                    {fichaDiseases.map((d, i) => {
                      const count = fichaAnalyses.filter(e => e.disease_name_predicted === d).length
                      return (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                          {d}
                          <span className="px-1.5 py-0.5 rounded-full bg-white text-xs text-slate-500">{count}x</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>

            <div className="p-5 border-t border-slate-200 flex items-center gap-3 justify-center">
              <button onClick={downloadPDF}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition shadow-sm cursor-pointer"
                style={{ border: 'none' }}>
                <i className="fas fa-file-pdf mr-1.5"></i> Descargar PDF
              </button>
              <button onClick={() => setShowFicha(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition cursor-pointer"
                style={{ border: 'none' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
