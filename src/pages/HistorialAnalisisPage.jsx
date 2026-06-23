import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAnalyses } from '../services/analysisService'
import { getFarms, getPlantHistories, getConversations, getContexts } from '../services/chatbotService'
import ProfileModal from '../components/ProfileModal'
import SettingsModal from '../components/SettingsModal'
import AIAnalysisPanel from '../components/AIAnalysisPanel'
import { downloadFichaTecnicaPDF } from '../components/FichaTecnicaPDF'

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

const filters = [
  { key: 'all', label: 'Todos' },
  { key: 'critical', label: 'Críticos' },
  { key: 'high', label: 'Altos' },
  { key: 'medium', label: 'Moderados' },
  { key: 'low', label: 'Leves' },
]

export default function HistorialAnalisisPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const trazModalRef = useRef(null)
  const fichaModalRef = useRef(null)
  const animatedModalRefs = useRef(new Set())
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const [analyses, setAnalyses] = useState([])
  const [groupCount, setGroupCount] = useState({})
  const [farms, setFarms] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showTrazabilidad, setShowTrazabilidad] = useState(false)
  const [showFicha, setShowFicha] = useState(false)
  const [activeGroupKey, setActiveGroupKey] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ left: 0, bottom: 0 })
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

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

  const [pdfLoading, setPdfLoading] = useState(false)

  async function downloadPDF() {
    setPdfLoading(true)
    try {
      await downloadFichaTecnicaPDF({
        fichaPh,
        fichaAnalyses,
        fichaTotal,
        fichaDiseases,
        fichaTopDisease,
        fichaLastDate,
        avgSeverityLabel,
        severityTrend,
        sevDistEntries,
        maxSevCount,
        user,
      })
    } finally {
      setPdfLoading(false)
    }
  }

  const animateClose = useCallback((modalRef, closeFn) => {
    if (window.innerWidth >= 640 || !modalRef.current) { closeFn(); return }
    const m = modalRef.current
    m.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
    m.style.transform = 'translateY(110%)'
    setTimeout(() => { m.style.transform = ''; m.style.transition = ''; animatedModalRefs.current.delete(modalRef); closeFn() }, 340)
  }, [])

  useEffect(() => {
    if (window.innerWidth >= 640) return
    const setups = [
      { ref: trazModalRef, open: showTrazabilidad, close: () => setShowTrazabilidad(false) },
      { ref: fichaModalRef, open: showFicha, close: () => setShowFicha(false) },
    ]
    const cleanups = []
    setups.forEach(({ ref, open, close }) => {
      if (!open || !ref.current) return
      const modal = ref.current
      const handle = modal.querySelector('.drag-handle-hist')
      if (!handle) return
      if (!animatedModalRefs.current.has(ref)) {
        animatedModalRefs.current.add(ref)
        modal.style.transition = 'none'
        modal.style.transform = 'translateY(100%)'
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            modal.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1)'
            modal.style.transform = 'translateY(0)'
          })
        })
      }
      let sy = 0, dy = 0
      const onStart = e => { sy = e.touches[0].clientY; dy = 0; modal.style.transition = 'none' }
      const onMove = e => { dy = Math.max(0, e.touches[0].clientY - sy); modal.style.transform = `translateY(${dy}px)` }
      const onEnd = () => {
        if (dy > 80) {
          modal.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
          modal.style.transform = 'translateY(110%)'
          setTimeout(() => { modal.style.transform = ''; modal.style.transition = ''; animatedModalRefs.current.delete(ref); close() }, 340)
        } else {
          modal.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'
          modal.style.transform = 'translateY(0)'
          setTimeout(() => { modal.style.transition = '' }, 320)
        }
      }
      handle.addEventListener('touchstart', onStart, { passive: true })
      handle.addEventListener('touchmove', onMove, { passive: true })
      handle.addEventListener('touchend', onEnd, { passive: true })
      cleanups.push(() => {
        handle.removeEventListener('touchstart', onStart)
        handle.removeEventListener('touchmove', onMove)
        handle.removeEventListener('touchend', onEnd)
      })
    })
    return () => cleanups.forEach(fn => fn())
  }, [showTrazabilidad, showFicha])

  const displayName = user?.full_name || user?.username || 'Usuario'
  const userEmail = user?.email || ''
  const profilePhotoUrl = user?.profile_photo_url || null
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const handleLogout = useCallback(async () => { await logout(); navigate('/login') }, [logout, navigate])

  const toggleUserMenu = useCallback(() => {
    if (!triggerRef.current) return
    if (menuOpen) { setMenuOpen(false); return }
    const rect = triggerRef.current.getBoundingClientRect()
    const W = 310, M = 10
    let left = rect.left
    let bottom = window.innerHeight - rect.top + 10
    if (left + W > window.innerWidth - M) left = window.innerWidth - W - M
    if (left < M) left = M
    setMenuPos({ left, bottom })
    setMenuOpen(true)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const fn = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !triggerRef.current?.contains(e.target))
        setMenuOpen(false)
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [menuOpen])

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
        #drawerOverlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:40}
        #drawerOverlay.open{display:block}
        #hist-sidebar{position:fixed;top:0;left:0;bottom:0;width:272px;background:#fff;border-right:1px solid #f3f4f6;display:flex;flex-direction:column;padding:1rem;gap:0.75rem;z-index:50;overflow:hidden;transform:translateX(0);transition:transform 0.28s cubic-bezier(0.22,1,0.36,1)}
        @media(max-width:767px){#hist-sidebar{transform:translateX(-100%)}#hist-sidebar.open{transform:translateX(0)}}
        @media(min-width:768px){#hist-sidebar{position:relative;flex-shrink:0}#drawerOverlay{display:none!important}#histMenuBtn{display:none!important}}
        .hist-botanical-bg{position:absolute;bottom:-0.75rem;left:-0.75rem;width:11rem;opacity:0.08;pointer-events:none}
        .brand-avatar-h{background:linear-gradient(135deg,#16a34a,#22c55e,#4ade80)}
        .h-nav-btn{display:flex;align-items:center;gap:0.65rem;padding:0.6rem 0.75rem;border-radius:0.75rem;font-size:0.875rem;color:#4b5563;transition:all 0.14s ease;border:1px solid #d1d5dba0;cursor:pointer;width:100%;text-align:left;background:none}
        .h-nav-btn:hover{background:#f0fdf4;border-color:#22c55e}
        .h-nav-btn.active{background:#f0fdf4;color:#166534;border-color:#bbf7d0;font-weight:500}
        .trigger-ring-h{transition:box-shadow 0.15s;}
        #userTriggerH:hover .trigger-ring-h{box-shadow:0 0 0 2px #4ade80;}
        .um-option-h{display:flex;align-items:center;gap:13px;padding:11px 18px;cursor:pointer;transition:background 0.12s}
        .um-option-h:hover{background:#f9fafb}
        .um-option-h:hover .um-icon-h{background:#dcfce7;color:#16a34a}
        .um-icon-h{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.78rem;transition:background 0.15s,color 0.15s}
        #userMenuH{animation:popUpH 0.22s cubic-bezier(0.34,1.18,0.64,1) both}
        @keyframes popUpH{from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
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
        .hist-overlay{position:fixed;inset:0;z-index:50;display:none;align-items:flex-end;justify-content:center;padding:0;background:rgba(15,23,42,.45);backdrop-filter:blur(4px)}
        .hist-overlay.open{display:flex}
        .hist-modal{width:100%;max-height:92dvh;border-radius:28px 28px 0 0;background:#fff;border:1px solid #eef2f7;box-shadow:0 -8px 48px rgba(15,23,42,.18);overflow:hidden;display:flex;flex-direction:column}
        .hist-modal-body{overflow-y:auto;flex:1;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
        .drag-handle-hist{display:none}
        @media(min-width:640px){
          .hist-overlay{align-items:center;padding:1rem}
          .hist-modal{border-radius:24px;box-shadow:0 24px 48px rgba(15,23,42,.18);max-height:min(92dvh,960px)}
        }
        @media(max-width:639px){
          .drag-handle-hist{display:block;width:36px;height:4px;background:#cbd5e1;border-radius:999px;margin:10px auto 4px;flex-shrink:0;touch-action:none;cursor:grab}
        }
      `}</style>

      {/* drawer overlay */}
      <div id="drawerOverlay" className={sidebarOpen ? 'open' : ''} onClick={() => setSidebarOpen(false)}></div>

      {/* user menu */}
      {menuOpen && (
        <div id="userMenuH" ref={menuRef} style={{ position: 'fixed', zIndex: 200, width: '383px', background: '#fff', borderRadius: '18px', overflow: 'hidden', border: '1px solid #f3f4f6', boxShadow: '0 24px 48px rgba(15,23,42,.18)', left: menuPos.left + 'px', bottom: menuPos.bottom + 'px', top: 'auto' }}>
          <div className="flex items-center justify-center px-5 pt-4 pb-2">
            <p className="text-[0.75rem] font-medium text-gray-500 truncate text-center w-full">{userEmail}</p>
          </div>
          <div className="flex flex-col items-center px-6 pt-1 pb-6">
            <div className="mb-3 flex-shrink-0" style={{ padding: 3, background: 'linear-gradient(135deg,#16a34a,#4ade80)', borderRadius: '9999px', boxShadow: '0 4px 18px rgba(22,163,74,.25)' }}>
              <div className="w-[78px] h-[78px] rounded-full overflow-hidden bg-white p-0.5">
                {profilePhotoUrl
                  ? <img src={profilePhotoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover select-none" />
                  : <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold text-white select-none brand-avatar-h">{initials}</div>}
              </div>
            </div>
            <p className="text-[1.1rem] font-semibold text-gray-800 mb-0.5">¡Hola, {displayName.split(' ')[0]}!</p>
            <p className="text-[0.72rem] text-gray-400 mb-4 text-center">{displayName}</p>
            <button onClick={() => { setMenuOpen(false); setShowProfileModal(true) }} className="w-full text-center border border-brand-600 text-brand-700 rounded-full py-2 px-4 text-[0.82rem] font-medium hover:bg-brand-50 active:bg-brand-100 transition-colors cursor-pointer" style={{ background: 'none' }}>
              Gestionar mi perfil
            </button>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-1.5">
            <div onClick={() => { setMenuOpen(false); setShowProfileModal(true) }} className="um-option-h">
              <div className="um-icon-h bg-gray-100 text-gray-500"><i className="fas fa-user"></i></div>
              <div><p className="text-sm font-medium text-gray-700 leading-tight">Perfil</p><p className="text-[0.68rem] text-gray-400 mt-0.5">Ver y editar tu perfil</p></div>
            </div>
            <div onClick={() => { setMenuOpen(false); setShowSettingsModal(true) }} className="um-option-h">
              <div className="um-icon-h bg-gray-100 text-gray-500"><i className="fas fa-gear"></i></div>
              <div><p className="text-sm font-medium text-gray-700 leading-tight">Configuraciones</p><p className="text-[0.68rem] text-gray-400 mt-0.5">Preferencias y ajustes</p></div>
            </div>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-1.5">
            <div onClick={handleLogout} className="um-option-h">
              <div className="um-icon-h bg-red-50 text-red-400"><i className="fas fa-arrow-right-from-bracket"></i></div>
              <p className="text-sm font-semibold text-red-500">Cerrar sesión</p>
            </div>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-3 flex items-center justify-center gap-2.5">
            <span className="text-[0.63rem] text-gray-400">Política de privacidad</span>
            <span className="text-gray-300 select-none text-xs">·</span>
            <span className="text-[0.63rem] text-gray-400">Términos de servicio</span>
          </div>
        </div>
      )}

      <div className="h-screen flex overflow-hidden bg-white">

        {/* ── SIDEBAR ── */}
        <aside id="hist-sidebar" className={sidebarOpen ? 'open' : ''}>
          <svg className="hist-botanical-bg" viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M40 270 C 40 190, 80 160, 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M65 70 C 65 70, 20 50, 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M65 70 C 65 70, 115 45, 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M52 155 C 52 155, 8 142, -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M52 155 C 52 155, 96 130, 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
            <ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" />
            <ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" />
            <ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" />
          </svg>

          <div className="flex items-center gap-2 mb-1" style={{ position: 'relative', zIndex: 1 }}>
            <div className="brand-avatar-h w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
            </div>
            <span className="font-cormorant font-semibold text-base text-gray-900">Pitahaya Vision</span>
          </div>

          <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-gray-400 mt-1 px-1" style={{ position: 'relative', zIndex: 1 }}>Navegación</p>

          <div className="flex flex-col gap-1 flex-1 overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
            <button onClick={() => navigate('/dashboard')} className="h-nav-btn">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
              Dashboard
            </button>
            <button className="h-nav-btn active">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18" /><path d="M7 6h10" /><path d="M7 18h10" /></svg>
              Historial de análisis
            </button>
            <button onClick={() => navigate('/chatbot')} className="h-nav-btn">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Chatbot
            </button>
          </div>

          <div className="border-t border-gray-100 pt-3 mt-1" style={{ position: 'relative', zIndex: 1 }}>
            <button id="userTriggerH" ref={triggerRef} onClick={toggleUserMenu} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <div className="trigger-ring-h w-9 h-9 rounded-full flex-shrink-0 p-0.5" style={{ background: 'linear-gradient(135deg,#16a34a,#4ade80)', boxShadow: '0 0 0 2px white' }}>
                {profilePhotoUrl
                  ? <img src={profilePhotoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover select-none" />
                  : <div className="w-full h-full rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white brand-avatar-h select-none">{initials}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.82rem] font-semibold text-gray-800 truncate leading-tight">{displayName}</p>
                <p className="text-[0.68rem] text-gray-400 truncate leading-tight">{userEmail}</p>
              </div>
              <i className={`fas fa-chevron-up text-[0.62rem] text-gray-400 flex-shrink-0 transition-transform duration-200 ${menuOpen ? '' : 'rotate-180'}`}></i>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">

          {/* top bar */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button id="histMenuBtn" onClick={() => setSidebarOpen(true)} className="p-2 -ml-1 rounded-xl hover:bg-green-50 transition text-gray-500" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
              <div className="brand-avatar-h w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
              </div>
              <div>
                <h1 className="font-cormorant text-base font-semibold text-gray-900 leading-none">Historial de análisis</h1>
                <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-green-600 leading-none mt-0.5">Pitahaya Vision</p>
              </div>
            </div>
            <button onClick={() => navigate('/chatbot')} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition" style={{ background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
              <i className="fas fa-comments text-[0.78rem]"></i>
              <span className="hidden sm:inline">Ir al chat</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-7">
          <div className="space-y-6 pb-8">
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

          <section className="grid gap-4 lg:grid-cols-[3fr_2fr]">
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
              <div className="stat-card overflow-hidden" style={{ height: 400 }}>
                <AIAnalysisPanel
                  analyses={analyses}
                  buildSummary={() => {
                    const sick = analyses.filter(a => (a.severity || '').toLowerCase() !== 'sana').length
                    const pctSick = analyses.length ? Math.round(sick / analyses.length * 100) : 0
                    const diseaseCounts = {}
                    const plantSet = new Set()
                    analyses.forEach(a => {
                      const d = a.disease_name_predicted || 'Desconocido'
                      diseaseCounts[d] = (diseaseCounts[d] || 0) + 1
                      if (a.plant_id) plantSet.add(a.plant_id)
                    })
                    const topDiseases = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => `- ${name}: ${count} caso${count > 1 ? 's' : ''}`).join('\n')
                    const sevCounts = { Baja: 0, Media: 0, Alta: 0, Crítica: 0 }
                    analyses.forEach(a => {
                      const s = (a.severity || '').toLowerCase(); const d = (a.disease_name_predicted || '').toLowerCase()
                      if (s === 'sana' || d.includes('sana')) sevCounts.Baja++
                      else if (d.includes('pudric')) sevCounts.Crítica++
                      else if (d.includes('cancro') || d.includes('tiz') || d.includes('antrac')) sevCounts.Alta++
                      else if (d.includes('mancha')) sevCounts.Media++
                      else sevCounts.Alta++
                    })
                    return `Historial de análisis fitosanitarios del agricultor:\n- Total de análisis: ${analyses.length}\n- Plantas distintas analizadas: ${plantSet.size}\n- Plantas con enfermedad: ${sick} (${pctSick}%)\n- Severidad: Baja=${sevCounts.Baja}, Media=${sevCounts.Media}, Alta=${sevCounts.Alta}, Crítica=${sevCounts.Crítica}\n\nEnfermedades encontradas:\n${topDiseases || '- Sin datos'}\n\nDecide: ¿qué plantas priorizar para seguimiento? ¿hay patrones preocupantes?`
                  }}
                  title="Decisión rápida"
                  buttonLabel="Analizar historial"
                  emptyText="Gemma 3 revisará tu historial e indicará qué plantas priorizar"
                />
              </div>
            </aside>
          </section>
          </div>{/* closes max-w-7xl */}
          </div>{/* closes flex-1 overflow-y-auto */}

          <footer className="hidden md:flex flex-shrink-0 items-center justify-center px-6 py-3 border-t border-gray-100 text-sm text-slate-400">
            Pitahaya Vision © 2026. Todos los derechos reservados.
          </footer>
        </main>{/* closes new main */}
      </div>{/* closes h-screen flex */}

      {/* ── TRAZABILIDAD MODAL ── */}
      {showTrazabilidad && (
        <div className="hist-overlay open" onClick={() => animateClose(trazModalRef, () => setShowTrazabilidad(false))}>
          <div ref={trazModalRef} className="hist-modal" style={{maxWidth:'min(100%,1024px)'}} onClick={e => e.stopPropagation()}>
            <div className="drag-handle-hist" />
            <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0 bg-white">
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
              <button onClick={() => animateClose(trazModalRef, () => setShowTrazabilidad(false))}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0"
                style={{ border: 'none', cursor: 'pointer' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="hist-modal-body p-6 space-y-2">
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

            <div className="p-5 border-t border-slate-200 text-center flex-shrink-0">
              <button onClick={() => animateClose(trazModalRef, () => setShowTrazabilidad(false))}
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
        <div className="hist-overlay open" onClick={() => animateClose(fichaModalRef, () => setShowFicha(false))}>
          <div ref={fichaModalRef} className="hist-modal" style={{maxWidth:'min(100%,896px)'}} onClick={e => e.stopPropagation()}>
            <div className="drag-handle-hist" />
            <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0 bg-white">
              <div>
                <h2 className="font-cormorant text-xl font-semibold text-slate-900">
                  Ficha técnica{fichaPh?._plantId ? ` — Planta ${fichaPh._plantId}` : ''}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {fichaTotal} análisis · {fichaDiseases.length} enfermedad{fichaDiseases.length !== 1 ? 'es' : ''} · Último: {fichaLastDate}
                </p>
              </div>
              <button onClick={() => animateClose(fichaModalRef, () => setShowFicha(false))}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500 flex-shrink-0"
                style={{ border: 'none', cursor: 'pointer' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="hist-modal-body">
              <div className="p-5 space-y-4">

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
            </div>
            <div className="p-5 border-t border-slate-200 flex items-center gap-3 justify-center flex-shrink-0">
              <button onClick={downloadPDF} disabled={pdfLoading}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                style={{ border: 'none' }}>
                {pdfLoading
                  ? <><i className="fas fa-spinner fa-spin mr-1.5"></i> Generando PDF...</>
                  : <><i className="fas fa-file-pdf mr-1.5"></i> Descargar PDF</>}
              </button>
              <button onClick={() => animateClose(fichaModalRef, () => setShowFicha(false))}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition cursor-pointer"
                style={{ border: 'none' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  )
}
