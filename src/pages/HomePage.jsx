import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProfileModal from '../components/ProfileModal'
import SettingsModal from '../components/SettingsModal'
import ClientesPage from './ClientesPage'
import HistorialAdminPage from './HistorialAdminPage'
import DashboardAdminPage from './DashboardAdminPage'
import { getAnalyses, getWeather } from '../services/analysisService'
import WeatherWidget from '../components/WeatherWidget'

// ─── Helpers ─────────────────────────────────────────────────────────
const toArr = (d) => Array.isArray(d) ? d : (d?.results ?? [])
const fmtDate = (s) => {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}
const SEV_RANK = { crítica: 4, critica: 4, alta: 3, media: 2, leve: 1, saludable: 0, desconocida: -1 }
const sevBucket = (s) => {
  const v = (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (v === 'critica') return 'critica'
  if (v === 'alta') return 'alta'
  if (v === 'media') return 'media'
  if (v === 'leve') return 'leve'
  return 'saludable'
}
const isRisk = (s) => { const b = sevBucket(s); return b === 'critica' || b === 'alta' }
const sevColor = (s) => (({ critica: '#ef4444', alta: '#f97316', media: '#eab308', leve: '#22c55e', saludable: '#6b7280' })[sevBucket(s)] || '#6b7280')
const sevBadge = (s) => (({ critica: 'sev-critica', alta: 'sev-alta', media: 'sev-media', leve: 'sev-leve', saludable: 'sev-sano' })[sevBucket(s)] || 'sev-sano')
const sevLabel = (s) => (({ critica: 'Crítica', alta: 'Alta', media: 'Media', leve: 'Leve', saludable: 'Saludable' })[sevBucket(s)] || (s || '—'))

// ─── SVG DonutChart ───────────────────────────────────────────────────
function DonutChart({ segments, size = 120, thickness = 22 }) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  const total = segments.reduce((a, s) => a + (s.value || 0), 0)
  let offset = 0
  const slices = total === 0
    ? [{ color: '#e2e8f0', dash: circ, gap: 0, offset: 0 }]
    : segments.filter(s => s.value > 0).map(s => {
        const dash = (s.value / total) * circ
        const sl = { color: s.color, dash, gap: circ - dash, offset }
        offset += dash
        return sl
      })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((sl, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={sl.color} strokeWidth={thickness}
          strokeDasharray={`${sl.dash} ${sl.gap}`}
          strokeDashoffset={-(sl.offset) + circ / 4}
        />
      ))}
    </svg>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────
function Sparkline({ data, color = '#16a34a', w = 100, h = 36 }) {
  if (!data || data.length < 2) return <div style={{ width: w, height: h }} />
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`
  ).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── HBar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-32 truncate text-slate-600 flex-shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-6 text-right text-slate-500 flex-shrink-0">{value}</span>
    </div>
  )
}

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [view, setView] = useState('dashboard')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ left: 0, bottom: 0 })
  const menuRef = useRef(null)
  const triggerRef = useRef(null)

  // ─── Data state ────────────────────────────────────────────────────
  const [analyses, setAnalyses] = useState([])
  const [dashLoading, setDashLoading] = useState(true)
  const [histLoading, setHistLoading] = useState(false)

  // ─── History filters ───────────────────────────────────────────────
  const [histPeriod, setHistPeriod] = useState('all')
  const [histFrom, setHistFrom] = useState('')
  const [histTo, setHistTo] = useState('')
  const [histUser, setHistUser] = useState('')
  const [histApplied, setHistApplied] = useState({ period: 'all', date_from: '', date_to: '', user_name: '' })

  // ─── Weather ──────────────────────────────────────────────────────
  const [weatherData, setWeatherData] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) return
    setWeatherLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await getWeather(coords.latitude, coords.longitude)
          setWeatherData(data)
        } catch { /* silent */ }
        setWeatherLoading(false)
      },
      () => setWeatherLoading(false),
      { timeout: 8000 }
    )
  }, [])

  // ─── Detail modal ─────────────────────────────────────────────────
  const [detail, setDetail] = useState(null)

  // ─── Toast ────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null)
  const showToast = useCallback((msg, err = false) => {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ─── Close menu on outside click ─────────────────────────────────
  useEffect(() => {
    const handleClick = (e) => {
      if (!menuOpen) return
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setMenuOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  // ─── Data loading ─────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'dashboard') return
    setDashLoading(true)
    getAnalyses()
      .then(d => setAnalyses(toArr(d)))
      .catch(() => {})
      .finally(() => setDashLoading(false))
  }, [view])

  useEffect(() => {
    if (view !== 'history') return
    setHistLoading(true)
    const p = {}
    if (histApplied.period !== 'all') p.range = histApplied.period
    if (histApplied.date_from) p.date_from = histApplied.date_from
    if (histApplied.date_to) p.date_to = histApplied.date_to
    if (histApplied.user_name) p.user_name = histApplied.user_name
    getAnalyses(p)
      .then(d => setAnalyses(toArr(d)))
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [view, histApplied])

  // ─── Dashboard computed ────────────────────────────────────────────
  const dashKpis = useMemo(() => {
    const total = analyses.length
    const risk = analyses.filter(a => isRisk(a.severity)).length
    const healthy = analyses.filter(a => !isRisk(a.severity)).length
    const byOwner = {}
    analyses.forEach(a => {
      const o = a.owner_name || 'Sin propietario'
      if (!byOwner[o]) byOwner[o] = 0
      if (isRisk(a.severity)) byOwner[o]++
    })
    let critZone = '—'; let maxR = 0
    Object.entries(byOwner).forEach(([k, v]) => { if (v > maxR) { maxR = v; critZone = k } })
    return { total, risk, healthy, critZone }
  }, [analyses])

  const topDiseases = useMemo(() => {
    const c = {}
    analyses.forEach(a => { const d = a.disease_name_predicted || 'Sin diagnóstico'; c[d] = (c[d] || 0) + 1 })
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [analyses])

  const sevDist = useMemo(() => {
    const c = { critica: 0, alta: 0, media: 0, leve: 0, saludable: 0 }
    analyses.forEach(a => { const b = sevBucket(a.severity); c[b] = (c[b] || 0) + 1 })
    return c
  }, [analyses])

  const trendData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      return { label: d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }), date: d.toISOString().slice(0, 10) }
    })
    return days.map(d => ({ ...d, count: analyses.filter(a => a.created_at?.startsWith(d.date)).length }))
  }, [analyses])

  const zoneData = useMemo(() => {
    const map = {}
    analyses.forEach(a => {
      const o = a.owner_name || 'Sin propietario'
      if (!map[o]) map[o] = { name: o, total: 0, risk: 0, maxSev: 'saludable' }
      map[o].total++
      if (isRisk(a.severity)) map[o].risk++
      const cur = SEV_RANK[a.severity?.toLowerCase()] ?? -1
      const prev = SEV_RANK[map[o].maxSev?.toLowerCase()] ?? -1
      if (cur > prev) map[o].maxSev = a.severity
    })
    return Object.values(map).sort((a, b) => b.risk - a.risk)
  }, [analyses])

  const recentAlerts = useMemo(() => analyses.filter(a => isRisk(a.severity)).slice(0, 8), [analyses])

  // ─── History computed ──────────────────────────────────────────────
  const histSevDist = useMemo(() => {
    const c = { critica: 0, alta: 0, media: 0, leve: 0, saludable: 0 }
    analyses.forEach(a => { const b = sevBucket(a.severity); c[b] = (c[b] || 0) + 1 })
    return c
  }, [analyses])

  const histInsights = useMemo(() => {
    if (!analyses.length) return []
    const total = analyses.length
    const riskPct = Math.round((analyses.filter(a => isRisk(a.severity)).length / total) * 100)
    const topDisease = (() => {
      const c = {}
      analyses.forEach(a => { const d = a.disease_name_predicted || 'Sin diagnóstico'; c[d] = (c[d] || 0) + 1 })
      return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    })()
    const owners = [...new Set(analyses.map(a => a.owner_name).filter(Boolean))].length
    return [
      { icon: 'fa-triangle-exclamation', color: '#ef4444', bg: '#fef2f2', title: 'Índice de riesgo', value: `${riskPct}%`, desc: 'de análisis con severidad alta o crítica' },
      { icon: 'fa-bug', color: '#f97316', bg: '#fff7ed', title: 'Diagnóstico más frecuente', value: topDisease, desc: 'principal enfermedad detectada en el período' },
      { icon: 'fa-users', color: '#6366f1', bg: '#eef2ff', title: 'Agricultores activos', value: `${owners}`, desc: 'usuarios con análisis en el período seleccionado' },
    ]
  }, [analyses])

  // ─── User info ────────────────────────────────────────────────────
  const displayName = user?.full_name || user?.username || 'Usuario'
  const userEmail = user?.email || ''
  const roleLabel = user?.role_label || (user?.is_admin ? 'Administrador' : 'Usuario')
  const initials = (() => {
    const parts = displayName.split(' ')
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.substring(0, 2).toUpperCase()
  })()
  const profilePhotoUrl = user?.profile_photo_url

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  const toggleUserMenu = () => {
    if (menuOpen) { setMenuOpen(false); return }
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const W = 383, MARGIN = 10
    let left = rect.left
    let bottom = window.innerHeight - rect.top + 10
    if (left + W > window.innerWidth - MARGIN) left = window.innerWidth - W - MARGIN
    if (left < MARGIN) left = MARGIN
    setMenuPos({ left, bottom })
    setMenuOpen(true)
  }

  const switchView = (v) => { setView(v); setMenuOpen(false); setSidebarOpen(false); document.body.style.overflow = '' }
  const openProfileModal  = () => { setShowProfileModal(true);  setMenuOpen(false); setSidebarOpen(false) }
  const openSettingsModal = () => { setShowSettingsModal(true); setMenuOpen(false); setSidebarOpen(false) }
  const openSidebar = () => { setSidebarOpen(true); document.body.style.overflow = 'hidden' }
  const closeSidebar = () => { setSidebarOpen(false); document.body.style.overflow = '' }

  // ─── VIEW: DASHBOARD ──────────────────────────────────────────────
  const renderDashboard = () => {
    if (dashLoading) return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <i className="fas fa-spinner fa-spin mr-2"></i> Cargando datos…
      </div>
    )
    const donutSegs = [
      { color: '#ef4444', value: sevDist.critica },
      { color: '#f97316', value: sevDist.alta },
      { color: '#eab308', value: sevDist.media },
      { color: '#22c55e', value: sevDist.leve },
      { color: '#6b7280', value: sevDist.saludable },
    ]
    const maxDisease = topDiseases[0]?.[1] || 1
    const trendCounts = trendData.map(d => d.count)
    return (
      <div className="space-y-5 fade-in pb-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="kpi-card">
            <p className="kpi-label">Registros totales</p>
            <p className="kpi-val text-slate-800">{dashKpis.total}</p>
            <p className="kpi-sub">Análisis consolidados</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Alertas de riesgo</p>
            <p className="kpi-val text-red-500">{dashKpis.risk}</p>
            <p className="kpi-sub">Severidad alta o crítica</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Casos saludables</p>
            <p className="kpi-val text-green-600">{dashKpis.healthy}</p>
            <p className="kpi-sub">Sin riesgo detectado</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Zona crítica</p>
            <p className="text-sm font-bold text-slate-800 truncate leading-tight mt-1" title={dashKpis.critZone}>{dashKpis.critZone}</p>
            <p className="kpi-sub">Mayor concentración</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut */}
          <div className="admin-panel">
            <p className="panel-sec-title">Distribución de salud</p>
            <div className="flex items-center gap-4 mt-3">
              <DonutChart segments={donutSegs} size={108} thickness={22} />
              <div className="space-y-1.5 flex-1 min-w-0">
                {[['Crítica','#ef4444'],['Alta','#f97316'],['Media','#eab308'],['Leve','#22c55e'],['Saludable','#6b7280']].map(([l, c], i) => (
                  donutSegs[i].value > 0 && (
                    <div key={l} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }}></span>
                      <span className="text-slate-600 flex-1">{l}</span>
                      <span className="font-semibold text-slate-700">{donutSegs[i].value}</span>
                    </div>
                  )
                ))}
                {analyses.length === 0 && <p className="text-xs text-slate-400">Sin datos</p>}
              </div>
            </div>
          </div>

          {/* Top diseases */}
          <div className="admin-panel">
            <p className="panel-sec-title">Principales diagnósticos</p>
            <div className="space-y-2 mt-3">
              {topDiseases.length === 0
                ? <p className="text-xs text-slate-400">Sin datos</p>
                : topDiseases.map(([d, v]) => <HBar key={d} label={d} value={v} max={maxDisease} color="#16a34a" />)
              }
            </div>
          </div>

          {/* Trend */}
          <div className="admin-panel">
            <p className="panel-sec-title">Tendencia últimos 7 días</p>
            <div className="mt-3">
              <Sparkline data={trendCounts} color="#16a34a" w={218} h={58} />
              <div className="flex justify-between mt-1.5">
                {trendData.map(d => (
                  <div key={d.date} className="text-center" style={{ minWidth: 0 }}>
                    <p className="text-[0.58rem] text-slate-400 leading-none">{d.label}</p>
                    <p className="text-[0.68rem] font-semibold text-slate-600">{d.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Zone heatmap */}
        <div className="admin-panel">
          <p className="panel-sec-title">Mapa de zonas por agricultor</p>
          {zoneData.length === 0
            ? <p className="text-xs text-slate-400 mt-3">Sin datos de zonas</p>
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
                {zoneData.map(z => (
                  <div key={z.name} className={`heatmap-cell heatmap-${sevBucket(z.maxSev)}`}>
                    <p className="font-semibold text-xs truncate text-slate-800" title={z.name}>{z.name}</p>
                    <p className="text-[0.67rem] text-slate-500 mt-0.5">{z.total} análisis · {z.risk} riesgo</p>
                    <span className={`sev-pill mt-1.5 inline-block ${sevBadge(z.maxSev)}`}>{sevLabel(z.maxSev)}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Recent alerts */}
        <div className="admin-panel">
          <p className="panel-sec-title">Alertas recientes</p>
          {recentAlerts.length === 0
            ? <p className="text-xs text-slate-400 mt-3">Sin alertas de riesgo</p>
            : <div className="space-y-2 mt-3">
                {recentAlerts.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition"
                    onClick={() => setDetail(a)}>
                    {a.image_url
                      ? <img src={a.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-100" />
                      : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-leaf text-slate-300"></i>
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{a.disease_name_predicted || 'Sin diagnóstico'}</p>
                      <p className="text-[0.67rem] text-slate-400">{a.owner_name || '—'} · {fmtDate(a.created_at)}</p>
                    </div>
                    <span className={`sev-pill flex-shrink-0 ${sevBadge(a.severity)}`}>{sevLabel(a.severity)}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    )
  }

  // ─── VIEW: HISTORY ────────────────────────────────────────────────
  const renderHistory = () => {
    const total = analyses.length
    const risk = analyses.filter(a => isRisk(a.severity)).length
    const critica = analyses.filter(a => sevBucket(a.severity) === 'critica').length
    const owners = [...new Set(analyses.map(a => a.owner_name).filter(Boolean))].length
    const donutSegs = [
      { color: '#ef4444', value: histSevDist.critica },
      { color: '#f97316', value: histSevDist.alta },
      { color: '#eab308', value: histSevDist.media },
      { color: '#22c55e', value: histSevDist.leve },
      { color: '#6b7280', value: histSevDist.saludable },
    ]
    return (
      <div className="space-y-5 fade-in pb-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="kpi-card"><p className="kpi-label">Total período</p><p className="kpi-val text-slate-800">{total}</p><p className="kpi-sub">Análisis en el filtro</p></div>
          <div className="kpi-card"><p className="kpi-label">Casos de riesgo</p><p className="kpi-val text-red-500">{risk}</p><p className="kpi-sub">Alta o crítica</p></div>
          <div className="kpi-card"><p className="kpi-label">Casos críticos</p><p className="kpi-val text-red-700">{critica}</p><p className="kpi-sub">Severidad crítica</p></div>
          <div className="kpi-card"><p className="kpi-label">Agricultores</p><p className="kpi-val text-indigo-600">{owners}</p><p className="kpi-sub">Usuarios activos</p></div>
        </div>

        {/* Filters */}
        <div className="admin-panel">
          <p className="panel-sec-title mb-3">Filtros de búsqueda</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-[0.67rem] text-slate-500 mb-1 font-medium">Período</label>
              <select className="filter-input" value={histPeriod} onChange={e => setHistPeriod(e.target.value)}>
                <option value="all">Todos</option>
                <option value="today">Hoy</option>
                <option value="last7">Últimos 7 días</option>
                <option value="month">Este mes</option>
              </select>
            </div>
            <div>
              <label className="block text-[0.67rem] text-slate-500 mb-1 font-medium">Desde</label>
              <input type="date" className="filter-input" value={histFrom} onChange={e => setHistFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-[0.67rem] text-slate-500 mb-1 font-medium">Hasta</label>
              <input type="date" className="filter-input" value={histTo} onChange={e => setHistTo(e.target.value)} />
            </div>
            <div>
              <label className="block text-[0.67rem] text-slate-500 mb-1 font-medium">Cliente</label>
              <input type="text" className="filter-input" placeholder="Nombre del agricultor…"
                value={histUser} onChange={e => setHistUser(e.target.value)} style={{ minWidth: 170 }} />
            </div>
            <button className="apply-btn"
              onClick={() => setHistApplied({ period: histPeriod, date_from: histFrom, date_to: histTo, user_name: histUser })}>
              <i className="fas fa-filter mr-1.5"></i>Aplicar
            </button>
            <button className="clear-btn"
              onClick={() => {
                setHistPeriod('all'); setHistFrom(''); setHistTo(''); setHistUser('')
                setHistApplied({ period: 'all', date_from: '', date_to: '', user_name: '' })
              }}>
              <i className="fas fa-xmark mr-1.5"></i>Limpiar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Table */}
          <div className="admin-panel lg:col-span-2">
            <p className="panel-sec-title mb-3">Registros de análisis</p>
            {histLoading
              ? <div className="flex justify-center py-8 text-slate-400"><i className="fas fa-spinner fa-spin mr-2"></i> Cargando…</div>
              : analyses.length === 0
                ? <p className="text-xs text-slate-400 py-4">No hay registros para los filtros seleccionados.</p>
                : <div className="overflow-x-auto">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Imagen</th>
                          <th>Usuario</th>
                          <th>Diagnóstico</th>
                          <th>Confianza</th>
                          <th>Severidad</th>
                          <th>Fecha</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyses.map(a => (
                          <tr key={a.id}>
                            <td>
                              {a.image_url
                                ? <img src={a.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-100" />
                                : <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><i className="fas fa-leaf text-slate-300 text-xs"></i></div>
                              }
                            </td>
                            <td>
                              <p className="font-medium text-slate-700">{a.owner_name || '—'}</p>
                              <p className="text-[0.64rem] text-slate-400">{a.owner_email || ''}</p>
                            </td>
                            <td className="max-w-[150px]">
                              <p className="truncate text-slate-600" title={a.disease_name_predicted}>{a.disease_name_predicted || '—'}</p>
                            </td>
                            <td>
                              <span className="font-semibold text-slate-600">{a.confidence_percent ? `${a.confidence_percent}%` : '—'}</span>
                            </td>
                            <td>
                              <span className={`sev-pill ${sevBadge(a.severity)}`}>{sevLabel(a.severity)}</span>
                            </td>
                            <td className="whitespace-nowrap text-slate-500">{fmtDate(a.created_at)}</td>
                            <td>
                              <button onClick={() => setDetail(a)}
                                className="text-brand-600 hover:text-brand-800 font-medium px-2 py-0.5 rounded hover:bg-brand-50 transition"
                                style={{ fontSize: '0.72rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                                Ver
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[0.67rem] text-slate-400 mt-2">{analyses.length} registros</p>
                  </div>
            }
          </div>

          {/* Donut + insights */}
          <div className="space-y-4">
            <div className="admin-panel">
              <p className="panel-sec-title">Distribución por severidad</p>
              <div className="flex flex-col items-center mt-3 gap-3">
                <DonutChart segments={donutSegs} size={96} thickness={19} />
                <div className="w-full space-y-1">
                  {[['Crítica','#ef4444','critica'],['Alta','#f97316','alta'],['Media','#eab308','media'],['Leve','#22c55e','leve'],['Saludable','#6b7280','saludable']].map(([l,c,k]) => (
                    histSevDist[k] > 0 && (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }}></span>
                        <span className="flex-1 text-slate-600">{l}</span>
                        <span className="font-semibold text-slate-700">{histSevDist[k]}</span>
                      </div>
                    )
                  ))}
                  {analyses.length === 0 && <p className="text-xs text-slate-400">Sin datos</p>}
                </div>
              </div>
            </div>

            {histInsights.map((ins, i) => (
              <div key={i} className="insight-card">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ins.bg }}>
                    <i className={`fas ${ins.icon} text-xs`} style={{ color: ins.color }}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.67rem] text-slate-400 font-medium">{ins.title}</p>
                    <p className="text-sm font-bold text-slate-800 truncate" title={ins.value}>{ins.value}</p>
                    <p className="text-[0.63rem] text-slate-400 mt-0.5">{ins.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        {analyses.length > 0 && (
          <div className="admin-panel">
            <p className="panel-sec-title mb-3">Eventos recientes</p>
            <div className="space-y-0">
              {analyses.slice(0, 10).map((a, i) => (
                <div key={a.id} className="flex gap-3 relative cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1 transition"
                  onClick={() => setDetail(a)} style={{ paddingLeft: 24 }}>
                  {i < 9 && <div className="tl-line"></div>}
                  <span className="tl-dot absolute" style={{ left: 7, top: 8, background: sevColor(a.severity) }}></span>
                  <div className="pb-2 min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700">{a.disease_name_predicted || 'Análisis realizado'}</p>
                    <p className="text-[0.67rem] text-slate-400">{a.owner_name || '—'} · {fmtDate(a.created_at)}</p>
                  </div>
                  <span className={`sev-pill flex-shrink-0 self-start mt-1 ${sevBadge(a.severity)}`}>{sevLabel(a.severity)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Render content ───────────────────────────────────────────────
  const renderContent = () => {
    switch (view) {
      case 'history': return <HistorialAdminPage />
      case 'customers': return <ClientesPage />
      case 'dashboard': return <DashboardAdminPage />
      default: return <DashboardAdminPage />
    }
  }

  const navItems = [
    {
      key: 'dashboard', label: 'Dashboard',
      svg: <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
    },
    {
      key: 'history', label: 'Historial',
      svg: <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>
    },
    {
      key: 'customers', label: 'Clientes',
      svg: <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    },
  ]

  return (
    <>
      <style>{`
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .font-cormorant { font-family: 'Cormorant Garamond', serif; }
        .brand-avatar { background: linear-gradient(135deg, #16a34a, #22c55e, #4ade80); }
        .panel-title { font-family: 'Cormorant Garamond', serif; letter-spacing: -0.02em; }
        .nav-btn { display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.75rem; border-radius: 0.75rem; font-size: 0.875rem; color: #4b5563; transition: all 0.14s ease; border: 1px solid rgba(209,213,219,0.63); cursor: pointer; width: 100%; background: none; text-align: left; }
        .nav-btn:hover { background: #f0fdf4; border-color: #22c55e; }
        .nav-btn:active { background: #dcfce7; }
        .nav-btn.active { background: #f0fdf4; color: #166534; border-color: #bbf7d0; font-weight: 500; }
        .um-option { display: flex; align-items: center; gap: 13px; padding: 11px 18px; text-decoration: none; transition: background 0.12s; cursor: pointer; }
        .um-option:hover { background: #f9fafb; }
        .um-icon { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.78rem; }
        #userTrigger { transition: background 0.15s; }
        #userTrigger:hover { background: #f9fafb; }
        .trigger-ring { transition: box-shadow 0.15s; }
        #userTrigger:hover .trigger-ring { box-shadow: 0 0 0 2px #4ade80; }
        @keyframes popUp { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        #userMenu { animation: popUp 0.22s cubic-bezier(0.34, 1.18, 0.64, 1) both; }
        #drawerOverlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 40; }
        #drawerOverlay.open { display: block; }
        #sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 272px; background: #fff; border-right: 1px solid #f3f4f6; display: flex; flex-direction: column; padding: 1rem; gap: 0.75rem; z-index: 50; overflow: hidden; transform: translateX(-100%); transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
        #sidebar.open { transform: translateX(0); }
        @media (min-width: 768px) { #sidebar { position: relative; flex-shrink: 0; transform: none; } #drawerOverlay { display: none !important; } #menuBtn { display: none !important; } }
        #main-content::-webkit-scrollbar { width: 3px; }
        #main-content::-webkit-scrollbar-thumb { background: #d1fae5; border-radius: 4px; }
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .botanical-bg { position: absolute; bottom: -0.75rem; left: -0.75rem; width: 11rem; opacity: 0.08; pointer-events: none; }
        /* Admin panels */
        .admin-panel { background: #fff; border: 1px solid #e8edf2; border-radius: 16px; padding: 1.25rem; }
        .panel-sec-title { font-size: 0.82rem; font-weight: 600; color: #374151; }
        /* KPI */
        .kpi-card { background: #fff; border: 1px solid #e8edf2; border-radius: 14px; padding: 1rem 1.25rem; }
        .kpi-label { font-size: 0.64rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 2px; }
        .kpi-val { font-size: 1.65rem; font-weight: 700; line-height: 1.1; }
        .kpi-sub { font-size: 0.67rem; color: #94a3b8; margin-top: 2px; }
        /* Pills */
        .sev-pill { display: inline-block; font-size: 0.63rem; font-weight: 600; padding: 2px 7px; border-radius: 999px; border: 1px solid; white-space: nowrap; }
        .sev-critica { background: #fef2f2; color: #b91c1c; border-color: #fca5a5; }
        .sev-alta { background: #fff7ed; color: #c2410c; border-color: #fdba74; }
        .sev-media { background: #fefce8; color: #a16207; border-color: #fde047; }
        .sev-leve { background: #f0fdf4; color: #15803d; border-color: #86efac; }
        .sev-sano { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
        .role-admin { background: #eef2ff; color: #4338ca; border-color: #a5b4fc; }
        .role-user { background: #f0fdf4; color: #15803d; border-color: #86efac; }
        .status-active { background: #f0fdf4; color: #15803d; border-color: #86efac; }
        .status-inactive { background: #f8fafc; color: #94a3b8; border-color: #cbd5e1; }
        /* Table */
        .admin-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
        .admin-table th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 0.63rem; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.5rem 0.625rem; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .admin-table td { padding: 0.5rem 0.625rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .admin-table tr:last-child td { border-bottom: none; }
        .admin-table tr:hover td { background: #fafafa; }
        /* Action buttons */
        .act-btn { font-size: 0.67rem; font-weight: 500; padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid; cursor: pointer; transition: all 0.15s; white-space: nowrap; background: none; }
        .act-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn-act { color: #15803d; border-color: #86efac; } .btn-act:hover:not(:disabled) { background: #f0fdf4; }
        .btn-deact { color: #b91c1c; border-color: #fca5a5; } .btn-deact:hover:not(:disabled) { background: #fef2f2; }
        .btn-promote { color: #4338ca; border-color: #a5b4fc; } .btn-promote:hover:not(:disabled) { background: #eef2ff; }
        .btn-demote { color: #6b7280; border-color: #d1d5db; } .btn-demote:hover:not(:disabled) { background: #f3f4f6; }
        /* Filters */
        .filter-input { font-size: 0.8rem; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.375rem 0.75rem; outline: none; background: #fff; color: #374151; }
        .filter-input:focus { border-color: #86efac; box-shadow: 0 0 0 2px rgba(134,239,172,.25); }
        .apply-btn { font-size: 0.8rem; background: #16a34a; color: #fff; border: none; border-radius: 8px; padding: 0.375rem 0.875rem; cursor: pointer; font-weight: 500; white-space: nowrap; transition: background 0.15s; }
        .apply-btn:hover { background: #15803d; }
        .clear-btn { font-size: 0.8rem; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.375rem 0.875rem; cursor: pointer; font-weight: 500; white-space: nowrap; }
        .clear-btn:hover { background: #f1f5f9; }
        /* Insight */
        .insight-card { background: #f8fafc; border: 1px solid #e8edf2; border-radius: 12px; padding: 0.875rem; }
        /* Timeline */
        .tl-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .tl-line { position: absolute; left: 11px; top: 16px; bottom: 0; width: 1px; background: #e2e8f0; }
        /* Heatmap */
        .heatmap-cell { border-radius: 10px; padding: 0.625rem 0.75rem; }
        .heatmap-critica { background: #fef2f2; border: 1.5px solid #fca5a5; }
        .heatmap-alta { background: #fff7ed; border: 1.5px solid #fdba74; }
        .heatmap-media { background: #fefce8; border: 1.5px solid #fde047; }
        .heatmap-leve { background: #f0fdf4; border: 1.5px solid #86efac; }
        .heatmap-saludable { background: #f8fafc; border: 1.5px solid #e2e8f0; }
        /* Detail modal */
        .detail-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .detail-modal { background: #fff; border-radius: 20px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; }
        /* Toast */
        .toast { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 400; padding: 0.75rem 1.25rem; border-radius: 12px; font-size: 0.82rem; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,.12); animation: popUp 0.25s ease; pointer-events: none; }
        .toast-ok { background: #f0fdf4; color: #15803d; border: 1px solid #86efac; }
        .toast-err { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.err ? 'toast-err' : 'toast-ok'}`}>
          <i className={`fas ${toast.err ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-2`}></i>
          {toast.msg}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="detail-overlay" onClick={() => setDetail(null)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-green-600">Detalle del análisis</p>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif" }} className="text-xl font-semibold text-slate-800 mt-0.5">
                  {detail.disease_name_predicted || 'Sin diagnóstico'}
                </h3>
              </div>
              <button onClick={() => setDetail(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition"
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <i className="fas fa-xmark"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {detail.image_url && (
                <img src={detail.image_url} alt="Imagen del análisis"
                  className="w-full h-48 object-cover rounded-xl border border-gray-100" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="kpi-card py-2.5 px-3"><p className="kpi-label">Agricultor</p><p className="text-sm font-semibold text-slate-700 truncate">{detail.owner_name || '—'}</p></div>
                <div className="kpi-card py-2.5 px-3"><p className="kpi-label">Fecha</p><p className="text-sm font-semibold text-slate-700">{fmtDate(detail.created_at)}</p></div>
                <div className="kpi-card py-2.5 px-3"><p className="kpi-label">Severidad</p><span className={`sev-pill mt-1 inline-block ${sevBadge(detail.severity)}`}>{sevLabel(detail.severity)}</span></div>
                <div className="kpi-card py-2.5 px-3"><p className="kpi-label">Confianza IA</p><p className="text-sm font-semibold text-slate-700">{detail.confidence_percent ? `${detail.confidence_percent}%` : '—'}</p></div>
              </div>
              {detail.analysis_text && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Análisis</p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{detail.analysis_text}</p>
                </div>
              )}
              {detail.recommendations_text && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Recomendaciones</p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{detail.recommendations_text}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div id="drawerOverlay" className={sidebarOpen ? 'open' : ''} onClick={closeSidebar}></div>

      {/* USER MENU */}
      {menuOpen && (
        <div id="userMenu" ref={menuRef}
          style={{ position: 'fixed', zIndex: 200, width: '383px', background: '#fff', borderRadius: '18px', overflow: 'hidden', border: '1px solid #f3f4f6', boxShadow: '0 24px 48px rgba(15,23,42,.18)', left: menuPos.left + 'px', bottom: menuPos.bottom + 'px', top: 'auto' }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2 gap-2">
            <p className="text-[0.75rem] font-medium text-gray-500 truncate text-center w-full">{userEmail}</p>
          </div>
          <div className="flex flex-col items-center px-6 pt-1 pb-6">
            <div className="mb-3 flex-shrink-0" style={{ padding: 3, background: 'linear-gradient(135deg,#16a34a,#4ade80)', borderRadius: '9999px', boxShadow: '0 4px 18px rgba(22,163,74,.25)' }}>
              <div className="w-[78px] h-[78px] rounded-full overflow-hidden bg-white p-0.5">
                {profilePhotoUrl
                  ? <img src={profilePhotoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover select-none" />
                  : <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold text-white select-none"
                      style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e,#4ade80)' }}>{initials}</div>
                }
              </div>
            </div>
            <p className="text-[1.1rem] font-semibold text-gray-800 mb-0.5">¡Hola, {displayName.split(' ')[0]}!</p>
            <p className="text-[0.72rem] text-gray-400 mb-4">{roleLabel}</p>
            <button onClick={openProfileModal}
              className="w-full text-center border border-green-600 text-green-700 rounded-full py-2 px-4 text-[0.82rem] font-medium hover:bg-green-50 transition-colors cursor-pointer"
              style={{ background: 'none' }}>
              Gestionar mi perfil
            </button>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-1.5">
            <div onClick={openProfileModal} className="um-option group">
              <div className="um-icon bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600"><i className="fas fa-user"></i></div>
              <div><p className="text-sm font-medium text-gray-700">Perfil</p><p className="text-[0.68rem] text-gray-400">Ver y editar tu perfil</p></div>
            </div>
            <div onClick={openSettingsModal} className="um-option group">
              <div className="um-icon bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600"><i className="fas fa-gear"></i></div>
              <div><p className="text-sm font-medium text-gray-700">Configuraciones</p><p className="text-[0.68rem] text-gray-400">Preferencias y ajustes</p></div>
            </div>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-1.5">
            <div onClick={handleLogout} className="um-option group">
              <div className="um-icon bg-red-50 text-red-400 group-hover:bg-red-100 group-hover:text-red-500"><i className="fas fa-arrow-right-from-bracket"></i></div>
              <p className="text-sm font-semibold text-red-500">Cerrar sesión</p>
            </div>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-3 flex items-center justify-center gap-2.5">
            <a href="#" className="text-[0.63rem] text-gray-400 hover:text-gray-600 hover:underline">Política de privacidad</a>
            <span className="text-gray-300 text-xs">·</span>
            <a href="#" className="text-[0.63rem] text-gray-400 hover:text-gray-600 hover:underline">Términos de servicio</a>
          </div>
        </div>
      )}

      {/* LAYOUT */}
      <div className="h-screen flex overflow-hidden">
        <aside id="sidebar" className={sidebarOpen ? 'open' : ''}>
          <svg className="botanical-bg" viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
            <div className="brand-avatar w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond',serif" }} className="font-semibold text-base text-gray-900">Pitahaya Vision</span>
          </div>

          <p className="text-[0.67rem] font-semibold uppercase tracking-widest text-gray-400 mt-1 px-1" style={{ position: 'relative', zIndex: 1 }}>Panel Admin</p>

          <div className="flex flex-col gap-1 overflow-y-auto flex-1" style={{ position: 'relative', zIndex: 1 }}>
            {navItems.map(item => (
              <button key={item.key} onClick={() => switchView(item.key)}
                className={`nav-btn ${view === item.key ? 'active' : ''}`}>
                {item.svg}
                {item.label}
              </button>
            ))}
          </div>

          {/* ── Weather widget ── */}
          <section className="flex-shrink-0 w-full mt-2 mb-1" aria-label="Clima actual"
            style={{ position: 'relative', zIndex: 1, borderRadius: 28, border: '1px solid rgba(226,232,240,0.9)', background: 'transparent', padding: '1.1rem 1rem' }}>
            <WeatherWidget
              data={weatherData}
              loading={weatherLoading}
              variant="sidebar"
              filterToday={true}
              onRetry={() => {
                setWeatherLoading(true)
                navigator.geolocation?.getCurrentPosition(
                  async ({ coords }) => {
                    try { const d = await getWeather(coords.latitude, coords.longitude); setWeatherData(d) } catch {}
                    setWeatherLoading(false)
                  },
                  () => setWeatherLoading(false),
                  { timeout: 8000 }
                )
              }}
            />
          </section>

          <div className="border-t border-gray-100 pt-3 mt-1" style={{ position: 'relative', zIndex: 1 }}>
            <button id="userTrigger" ref={triggerRef} onClick={toggleUserMenu}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <div className="trigger-ring w-9 h-9 rounded-full flex-shrink-0 p-0.5"
                style={{ background: 'linear-gradient(135deg,#16a34a,#4ade80)', boxShadow: '0 0 0 2px white' }}>
                {profilePhotoUrl
                  ? <img src={profilePhotoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  : <div className="w-full h-full rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e,#4ade80)' }}>{initials}</div>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.82rem] font-semibold text-gray-800 truncate leading-tight">{displayName}</p>
                <p className="text-[0.68rem] text-gray-400 truncate leading-tight">{userEmail}</p>
              </div>
              <i className={`fas fa-chevron-up text-[0.62rem] text-gray-400 flex-shrink-0 transition-transform duration-200 ${menuOpen ? '' : 'rotate-180'}`}></i>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: '#ffffff' }}>
          <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
            <button id="menuBtn" onClick={openSidebar}
              className="p-2 -ml-1 rounded-xl text-gray-500 hover:bg-green-50 transition"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="brand-avatar w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontFamily: "'Cormorant Garamond',serif" }} className="text-base font-semibold text-gray-900 leading-none">Pitahaya Vision</h1>
              <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-green-600 leading-none mt-0.5">
                {({ dashboard: 'Panel administrativo', history: 'Centro documental', customers: 'Gestión de usuarios' })[view] || 'Panel administrativo'}
              </p>
            </div>
          </header>

          <div id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6">
            {renderContent()}
          </div>

          <footer className="hidden md:flex flex-shrink-0 items-center justify-center px-6 py-3 border-t border-gray-100 bg-white text-xs text-slate-400">
            Pitahaya Vision © 2026. Todos los derechos reservados.
          </footer>
        </main>
      </div>
      <ProfileModal  isOpen={showProfileModal}  onClose={() => setShowProfileModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  )
}
