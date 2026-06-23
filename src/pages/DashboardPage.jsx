import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAnalyses } from '../services/analysisService'
import { getFarms, getPlantHistories } from '../services/chatbotService'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ProfileModal from '../components/ProfileModal'
import DashboardReportPDF from '../components/DashboardReportPDF'
import SettingsModal from '../components/SettingsModal'
import AIAnalysisPanel from '../components/AIAnalysisPanel'

// ── helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function sevBucket(v) {
  const n = (v || '').toLowerCase()
  if (n.includes('crít')) return 4
  if (n.includes('alta')) return 3
  if (n.includes('moder')) return 2
  if (n.includes('leve') || n.includes('baja')) return 1
  return 0
}
// Deriva el nivel de riesgo desde el objeto history (usa disease_name_predicted porque
// severity solo almacena 'sana'/'enferma' — no contiene el nivel graduado)
function computeSevBucket(h) {
  const sev     = (h.severity || '').toLowerCase()
  const disease = (h.disease_name_predicted || '').toLowerCase()
  if (sev === 'sana' || disease.includes('sana'))   return 0  // Sin riesgo
  if (disease.includes('pudric'))                    return 4  // Crítica
  if (disease.includes('cancro') || disease.includes('tiz') || disease.includes('antrac')) return 3  // Alta
  if (disease.includes('mancha'))                    return 2  // Moderada
  if (sev === 'enferma')                             return 2  // Moderada (enfermedad desconocida)
  return 0
}
function computeSevLabel(h) {
  return riskLabelFromBucket(computeSevBucket(h))
}
function isHighRisk(h) { return computeSevBucket(h) >= 2 }
function riskLabelFromBucket(b) { return ['Sin riesgo', 'Baja', 'Moderada', 'Alta', 'Crítica'][b] ?? '—' }
function riskColorFromBucket(b) { return ['#16a34a', '#84cc16', '#d97706', '#ea580c', '#dc2626'][b] ?? '#94a3b8' }
function riskBgFromBucket(b) { return ['#f0fdf4', '#f7fee7', '#fff7ed', '#fff7ed', '#fef2f2'][b] ?? '#f8fafc' }
function sevPillClass(v) {
  const n = (v || '').toLowerCase()
  if (n.includes('crít')) return 'sev-critical'
  if (n.includes('alta')) return 'sev-high'
  if (n.includes('moder')) return 'sev-medium'
  return 'sev-low'
}
function formatDate(v) {
  if (!v) return '—'
  try { return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) }
  catch { return '—' }
}

// ── DonutChart ─────────────────────────────────────────────────────────────────
function DonutChart({ healthy, atRisk }) {
  const total = healthy + atRisk
  const r = 52, circ = 2 * Math.PI * r
  const hPct = total > 0 ? healthy / total : 0
  const rPct = total > 0 ? atRisk / total : 0
  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 120 120" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="13" />
        {total > 0 && <>
          <circle cx="60" cy="60" r={r} fill="none" stroke="#22c55e" strokeWidth="13"
            strokeDasharray={`${hPct * circ} ${circ}`} />
          {atRisk > 0 && <circle cx="60" cy="60" r={r} fill="none" stroke="#ef4444" strokeWidth="13"
            strokeDasharray={`${rPct * circ} ${circ}`} strokeDashoffset={-hPct * circ} />}
        </>}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {total > 0
          ? <><span className="text-3xl font-bold text-slate-900 leading-none">{total}</span><span className="text-xs text-slate-400 mt-1">análisis</span></>
          : <span className="text-xs text-slate-400">Sin datos</span>}
      </div>
    </div>
  )
}

// ── BarItem ────────────────────────────────────────────────────────────────────
function BarItem({ label, value, max }) {
  const pct = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 6
  return (
    <li className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-slate-900 truncate">{label}</p>
        <span className="text-xs font-semibold text-slate-500 flex-shrink-0">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <span className="block h-full rounded-full bg-gradient-to-r from-red-500 to-brand-500" style={{ width: `${pct}%` }}></span>
      </div>
    </li>
  )
}

// ── ZoneCard ───────────────────────────────────────────────────────────────────
function ZoneCard({ zone, idx }) {
  const color = riskColorFromBucket(zone.maxBucket)
  const bg = riskBgFromBucket(zone.maxBucket)
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-400">Corp. {idx + 1}</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-900 leading-tight truncate">{zone.farmName}</h4>
        </div>
        <span className="px-2 py-1 rounded-full text-[0.62rem] font-bold uppercase tracking-[0.08em] flex-shrink-0"
          style={{ background: bg, color }}>
          {riskLabelFromBucket(zone.maxBucket)}
        </span>
      </div>
      <div className="mt-3 rounded-2xl p-3 min-h-[80px] flex flex-col justify-between"
        style={{ background: `linear-gradient(180deg, ${bg} 0%, #fff 100%)` }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Registros</p>
            <p className="text-2xl font-bold text-slate-900">{zone.total}</p>
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Alertas</p>
            <p className="text-lg font-semibold" style={{ color }}>{zone.alerts}</p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/70 overflow-hidden border border-white/80">
          <span className="block h-full rounded-full" style={{ width: `${Math.max(6, zone.riskRate * 100)}%`, background: color }}></span>
        </div>
        {zone.topDisease && <p className="mt-2 text-[0.7rem] text-slate-500 truncate">Princ.: {zone.topDisease}</p>}
        <p className="mt-1 text-[0.68rem] text-slate-400">Últ. registro: {formatDate(zone.lastDate)}</p>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ left: 0, bottom: 0 })
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [analyses, setAnalyses] = useState([])
  const [farms, setFarms] = useState([])
  const [histories, setHistories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPDF, setShowPDF] = useState(false)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const contentRef = useRef(null)

  const displayName = user?.full_name || user?.username || 'Usuario'
  const userEmail = user?.email || ''
  const profilePhotoUrl = user?.profile_photo_url || null
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // ── load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const toArr = (d) => Array.isArray(d) ? d : (d?.results ?? [])
    Promise.allSettled([getAnalyses(), getFarms(), getPlantHistories()])
      .then(([ra, rf, rh]) => {
        setAnalyses(toArr(ra.value))
        setFarms(toArr(rf.value))
        setHistories(toArr(rh.value))
      })
      .finally(() => setLoading(false))
  }, [])

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = analyses.length
    const highRisk = histories.filter(h => isHighRisk(h)).length
    const farmSet = new Set(histories.map(h => h.context_detail?.farm_id).filter(Boolean))
    const healthy = Math.max(total - highRisk, 0)
    const latest = histories.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null
    return { total, highRisk, healthy, farms: farmSet.size || farms.length, latest }
  }, [analyses, farms, histories])

  // ── top diseases ──────────────────────────────────────────────────────────────
  const topDiseases = useMemo(() => {
    const map = new Map()
    histories.forEach(h => { const k = h.disease_name_predicted || 'Sin diagnóstico'; map.set(k, (map.get(k) || 0) + 1) })
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [histories])

  // ── farm zones ────────────────────────────────────────────────────────────────
  const farmZones = useMemo(() => {
    const map = new Map()
    histories.forEach(h => {
      const ctx = h.context_detail
      if (!ctx?.farm_id) return
      if (!map.has(ctx.farm_id)) map.set(ctx.farm_id, { farmId: ctx.farm_id, farmName: ctx.farm_name || 'Sin nombre', total: 0, alerts: 0, maxBucket: 0, diseases: new Map(), lastDate: null })
      const z = map.get(ctx.farm_id)
      z.total++
      const b = computeSevBucket(h)
      if (b >= 2) z.alerts++
      if (b > z.maxBucket) z.maxBucket = b
      const d = h.disease_name_predicted || ''
      if (d) z.diseases.set(d, (z.diseases.get(d) || 0) + 1)
      if (h.created_at && (!z.lastDate || new Date(h.created_at) > new Date(z.lastDate))) z.lastDate = h.created_at
    })
    return Array.from(map.values()).map(z => ({
      ...z,
      riskRate: z.total > 0 ? z.alerts / z.total : 0,
      topDisease: z.diseases.size > 0 ? [...z.diseases.entries()].sort((a, b) => b[1] - a[1])[0][0] : null,
    })).sort((a, b) => b.maxBucket - a.maxBucket || b.alerts - a.alerts)
  }, [histories])

  // ── recent alerts ─────────────────────────────────────────────────────────────
  const recentAlerts = useMemo(() =>
    histories.filter(h => isHighRisk(h))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 6)
  , [histories])

  // ── Leaflet map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }

    const map = L.map(mapRef.current, { zoomControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map)
    mapInstanceRef.current = map

    const geoAnalyses = analyses.filter(a => a.latitude != null && a.longitude != null)
    const markers = []

    geoAnalyses.forEach(a => {
      const sev = (a.severity || '').toLowerCase()
      const isRisk = !sev.includes('sana') && sev !== ''
      const bucket = computeSevBucket({ disease_name_predicted: a.disease_name_predicted, severity: a.severity })
      const color = riskColorFromBucket(bucket)
      const riskLbl = riskLabelFromBucket(bucket)
      const marker = L.circleMarker([a.latitude, a.longitude], {
        radius: 11, fillColor: color, color: '#fff', weight: 2.5, opacity: 1, fillOpacity: 0.9,
      }).addTo(map)
      marker.bindPopup(`<div style="font-family:Inter,sans-serif;padding:4px 6px;min-width:180px">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px">${escapeHtml(a.disease_name_predicted || 'Análisis')}</div>
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
          <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
          <span style="font-size:11px;font-weight:700;color:${color}">${riskLbl}</span>
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-bottom:2px">${new Date(a.created_at).toLocaleDateString('es-EC')}</div>
        <div style="font-size:9px;color:#cbd5e1;font-family:monospace">${a.latitude.toFixed(5)}, ${a.longitude.toFixed(5)}</div>
      </div>`)
      markers.push(marker)
    })

    if (markers.length > 0) {
      try { map.fitBounds(L.featureGroup(markers).getBounds().pad(0.3)) } catch { map.setView([-1.83, -79.97], 9) }
    } else {
      map.setView([-1.83, -79.97], 9)
    }

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [analyses])

  // ── sidebar / menu ─────────────────────────────────────────────────────────────
  const closeSidebar = () => setSidebarOpen(false)
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
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target) && !triggerRef.current?.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [menuOpen])

  // ── export PDF ────────────────────────────────────────────────────────────────
  const exportPDF = useCallback(() => {
    setShowPDF(true)
  }, [])

  // ── export CSV ────────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const BOM = '﻿'
    const headers = ['ID', 'Corporación agrícola', 'Parcela', 'Planta', 'Zona', 'Enfermedad detectada', 'Severidad', 'Síntoma principal', 'Parte afectada', 'Fecha']
    const rows = histories.map(h => {
      const ctx = h.context_detail || {}
      return [h.id, ctx.farm_name || '—', ctx.plot_name || '—', ctx.plant_key_or_id || '—', ctx.zone || '—',
        h.disease_name_predicted || '—', h.severity || '—', ctx.main_symptom || '—', ctx.affected_part || '—', formatDate(h.created_at)]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const blob = new Blob([BOM + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `analisis-pitahaya-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }, [histories])

  const maxDisease = topDiseases[0]?.value || 1

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .brand-avatar { background: linear-gradient(135deg,#16a34a,#22c55e,#4ade80); }
        .font-cormorant { font-family:'Cormorant Garamond',serif; }
        .panel-title { font-family:'Cormorant Garamond',serif; letter-spacing:-0.02em; }
        body{font-family:'Inter',sans-serif;color:#0f172a;margin:0}
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
        .um-option{display:flex;align-items:center;gap:13px;padding:11px 18px;cursor:pointer;transition:background 0.12s;}
        .um-option:hover{background:#f9fafb;}
        .um-option:hover .um-icon{background:#dcfce7;color:#16a34a;}
        .um-icon{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.78rem;transition:background 0.15s,color 0.15s;}
        #userMenu{animation:popUp 0.22s cubic-bezier(0.34,1.18,0.64,1) both;}
        @keyframes popUp{from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .dash-kpi{position:relative;overflow:hidden;border-radius:28px;border:1px solid rgba(226,232,240,.9);background:linear-gradient(180deg,#fff 0%,#fbfdff 100%);}
        .metric-spark{height:0.4rem;border-radius:9999px;background:linear-gradient(90deg,rgba(34,197,94,.1),rgba(34,197,94,.4));}
        .dash-panel{border:1px solid rgba(226,232,240,.9);border-radius:30px;background:#fff;}
        .dash-panel-hdr{border-bottom:1px solid #eef2f7;background:rgba(255,255,255,.82);}
        .glass-card{background:#fff;border:1px solid rgba(226,232,240,.9);border-radius:30px;}
        .stat-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;}
        .fade-in{animation:fadeIn 0.35s ease-in-out;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .sev-pill{display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .6rem;border-radius:9999px;font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}
        .sev-low{background:#ecfdf5;color:#166534;}
        .sev-medium{background:#fefce8;color:#a16207;}
        .sev-high{background:#fff7ed;color:#c2410c;}
        .sev-critical{background:#fef2f2;color:#b91c1c;}
        .map-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
        #dash-main::-webkit-scrollbar{width:3px;}
        #dash-main::-webkit-scrollbar-thumb{background:#d1fae5;border-radius:4px;}
        .export-btn{display:inline-flex;align-items:center;gap:0.5rem;padding:0.55rem 1rem;border-radius:10px;font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.15s;border:1px solid;}
        .export-btn-pdf{background:#dc2626;color:#fff;border-color:#dc2626;}
        .export-btn-pdf:hover{background:#b91c1c;}
        .export-btn-csv{background:#fff;color:#15803d;border-color:#bbf7d0;}
        .export-btn-csv:hover{background:#f0fdf4;}
      `}</style>

      {/* drawer overlay */}
      <div id="drawerOverlay" className={sidebarOpen ? 'open' : ''} onClick={closeSidebar}></div>

      {/* user menu */}
      {menuOpen && (
        <div id="userMenu" ref={menuRef} style={{ position: 'fixed', zIndex: 200, width: '383px', background: '#fff', borderRadius: '18px', overflow: 'hidden', border: '1px solid #f3f4f6', boxShadow: '0 24px 48px rgba(15,23,42,.18)', left: menuPos.left + 'px', bottom: menuPos.bottom + 'px', top: 'auto' }}>
          <div className="flex items-center justify-center px-5 pt-4 pb-2">
            <p className="text-[0.75rem] font-medium text-gray-500 truncate text-center w-full">{userEmail}</p>
          </div>
          <div className="flex flex-col items-center px-6 pt-1 pb-6">
            <div className="mb-3 flex-shrink-0" style={{ padding: 3, background: 'linear-gradient(135deg,#16a34a,#4ade80)', borderRadius: '9999px', boxShadow: '0 4px 18px rgba(22,163,74,.25)' }}>
              <div className="w-[78px] h-[78px] rounded-full overflow-hidden bg-white p-0.5">
                {profilePhotoUrl
                  ? <img src={profilePhotoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover select-none" />
                  : <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold text-white select-none brand-avatar">{initials}</div>}
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
            <div onClick={() => { setMenuOpen(false); setShowProfileModal(true) }} className="um-option">
              <div className="um-icon bg-gray-100 text-gray-500"><i className="fas fa-user"></i></div>
              <div><p className="text-sm font-medium text-gray-700 leading-tight">Perfil</p><p className="text-[0.68rem] text-gray-400 mt-0.5">Ver y editar tu perfil</p></div>
            </div>
            <div onClick={() => { setMenuOpen(false); setShowSettingsModal(true) }} className="um-option">
              <div className="um-icon bg-gray-100 text-gray-500"><i className="fas fa-gear"></i></div>
              <div><p className="text-sm font-medium text-gray-700 leading-tight">Configuraciones</p><p className="text-[0.68rem] text-gray-400 mt-0.5">Preferencias y ajustes</p></div>
            </div>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-1.5">
            <div onClick={handleLogout} className="um-option">
              <div className="um-icon bg-red-50 text-red-400"><i className="fas fa-arrow-right-from-bracket"></i></div>
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

      {/* layout */}
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
            <button className="h-nav-btn active">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
              Dashboard
            </button>
            <button onClick={() => navigate('/historial')} className="h-nav-btn">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18" /><path d="M7 6h10" /><path d="M7 18h10" /></svg>
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
              <button id="histMenuBtn" onClick={() => setSidebarOpen(true)} className="p-2 -ml-1 rounded-xl hover:bg-brand-50 transition text-gray-500" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
              <div className="brand-avatar w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
              </div>
              <div>
                <h1 className="font-cormorant text-base font-semibold text-gray-900 leading-none">Pitahaya Vision</h1>
                <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-brand-600 leading-none mt-0.5">Dashboard agrícola</p>
              </div>
            </div>
            <div />
          </header>

          {/* scrollable content */}
          <div id="dash-main" ref={contentRef} className="flex-1 overflow-y-auto p-4 md:p-7">

            <div className="fade-in space-y-6 pb-8">

                {/* ── PAGE HEADER + KPIs ── */}
                <section className="glass-card rounded-2xl p-4 sm:p-5">
                  <div className="grid gap-5 lg:grid-cols-[1fr_1.13fr] lg:items-center">
                    <div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em]">
                        <i className="fas fa-chart-line text-[0.7rem]"></i>
                        Centro de control agrícola
                      </span>
                      <h2 className="font-cormorant text-2xl sm:text-3xl font-semibold text-slate-900 mt-3 leading-tight">
                        Dashboard inteligente de parcelas y análisis
                      </h2>
                      <p className="text-slate-500 mt-2 max-w-2xl leading-relaxed text-sm sm:text-base">
                        Consolidación de análisis del chatbot e historial de enfermedades para visualizar la salud del cultivo, zonas críticas y tendencias clínicas en tiempo real.
                      </p>
                    </div>
                    <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
                      <div className="stat-card p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Total análisis</p>
                        <p className="text-2xl font-semibold text-slate-900 mt-1.5">{kpis.total}</p>
                        <p className="text-xs text-slate-500 mt-1">en la plataforma</p>
                      </div>
                      <div className="stat-card p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">En riesgo</p>
                        <p className="text-2xl font-semibold text-red-700 mt-1.5">{kpis.highRisk}</p>
                        <p className="text-xs text-slate-500 mt-1">severidad mod. o mayor</p>
                      </div>
                      <div className="stat-card p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Sin alerta</p>
                        <p className="text-2xl font-semibold text-emerald-700 mt-1.5">{kpis.healthy}</p>
                        <p className="text-xs text-slate-500 mt-1">plantas en buen estado</p>
                      </div>
                      <div className="stat-card p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Corporaciones</p>
                        <p className="text-2xl font-semibold text-sky-700 mt-1.5">{kpis.farms}</p>
                        <p className="text-xs text-slate-500 mt-1">con análisis registrados</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Botones exportar ── */}
                <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px' }}>
                  <button onClick={exportCSV} disabled={loading || histories.length === 0}
                    title="Exportar datos a CSV / Excel"
                    style={{ background:'transparent', border:'1.5px solid #4ade80', borderRadius:'9999px', color:'#4ade80', fontFamily:'Inter,sans-serif', fontSize:'0.82rem', fontWeight:600, padding:'0.45rem 1.2rem', cursor:'pointer', letterSpacing:'0.04em', transition:'background 0.15s,color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#4ade80'; e.currentTarget.style.color='#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#4ade80' }}>
                    CSV / Excel
                  </button>
                  <button onClick={exportPDF} disabled={loading || histories.length === 0}
                    title="Exportar reporte PDF"
                    style={{ background:'transparent', border:'1.5px solid #f87171', borderRadius:'9999px', color:'#f87171', fontFamily:'Inter,sans-serif', fontSize:'0.82rem', fontWeight:600, padding:'0.45rem 1.2rem', cursor:'pointer', letterSpacing:'0.04em', transition:'background 0.15s,color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#f87171'; e.currentTarget.style.color='#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#f87171' }}>
                    PDF
                  </button>
                </div>

                {/* ── MAP + FARM INDICATORS ── */}
                {/* ── Mapa + Panel IA ── */}
                <article className="glass-card p-6">
                  <header className="flex items-start justify-between gap-4 mb-5">
                    <hgroup>
                      <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Geolocalización</p>
                      <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Distribución geográfica de enfermedades</h3>
                    </hgroup>
                    <span className="inline-flex items-center gap-1 border border-brand-100 bg-brand-50 text-brand-700 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] flex-shrink-0">
                      <i className="fas fa-location-dot text-[0.6rem]"></i>{analyses.filter(a => a.latitude != null && a.longitude != null).length} puntos GPS
                    </span>
                  </header>

                  <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 items-stretch">
                    {/* Mapa */}
                    <div className="min-w-0">
                      <div ref={mapRef} style={{ height: '400px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0 }}></div>
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                        {[['#16a34a', 'Sin riesgo'], ['#d97706', 'Moderado'], ['#ea580c', 'Alto'], ['#dc2626', 'Crítico']].map(([c, l]) => (
                          <span key={l} className="flex items-center gap-1.5">
                            <span className="map-legend-dot" style={{ background: c }}></span>{l}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Panel IA — misma altura que el mapa */}
                    <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white overflow-hidden" style={{ height: 400 }}>
                      <AIAnalysisPanel
                        analyses={analyses}
                        buildSummary={() => {
                          const geoPoints = analyses.filter(a => a.latitude != null && a.longitude != null)
                          const sick = analyses.filter(a => (a.severity || '').toLowerCase() !== 'sana').length
                          const pctSick = analyses.length ? Math.round(sick / analyses.length * 100) : 0
                          const diseaseCounts = {}
                          analyses.forEach(a => { const d = a.disease_name_predicted || 'Desconocido'; diseaseCounts[d] = (diseaseCounts[d] || 0) + 1 })
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
                          return `Resumen del mapa geográfico de enfermedades en la finca del usuario:\n- Total de análisis registrados: ${analyses.length}\n- Análisis con coordenadas GPS: ${geoPoints.length}\n- Plantas enfermas detectadas: ${sick} (${pctSick}%)\n- Distribución por severidad: Baja=${sevCounts.Baja}, Media=${sevCounts.Media}, Alta=${sevCounts.Alta}, Crítica=${sevCounts.Crítica}\n\nEnfermedades más frecuentes:\n${topDiseases}\n${geoPoints.length === 0 ? '\nNota: Aún no hay puntos GPS registrados en el mapa.' : ''}`
                        }}
                        title="Diagnóstico fitosanitario"
                        buttonLabel="Analizar mapa"
                        emptyText="Gemma 3 interpretará los patrones del mapa y entregará un reporte agronómico"
                        showGeoStats={true}
                      />
                    </div>
                  </div>
                </article>

                {/* ── Indicadores por corporación (abajo) ── */}
                <article className="glass-card p-6">
                  <header className="flex items-start justify-between gap-3 mb-5">
                    <hgroup>
                      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Indicadores</p>
                      <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Por corporación</h3>
                    </hgroup>
                  </header>
                  {farmZones.length === 0
                    ? <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                        <i className="fas fa-building text-3xl"></i>
                        <p className="text-sm text-center">Los indicadores aparecerán cuando tengas análisis vinculados a corporaciones</p>
                      </div>
                    : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {farmZones.map((zone, i) => (
                          <div key={zone.farmId} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="min-w-0">
                                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-slate-400">Corp. {i + 1}</p>
                                <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{zone.farmName}</p>
                              </div>
                              <span className="sev-pill flex-shrink-0" style={{ background: riskBgFromBucket(zone.maxBucket), color: riskColorFromBucket(zone.maxBucket) }}>
                                {riskLabelFromBucket(zone.maxBucket)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-slate-500">{zone.total} análisis</span>
                              <span className="font-semibold" style={{ color: riskColorFromBucket(zone.maxBucket) }}>{zone.alerts} alertas</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(4, zone.riskRate * 100)}%`, background: `linear-gradient(90deg, #22c55e, ${riskColorFromBucket(zone.maxBucket)})` }}></div>
                            </div>
                            {zone.topDisease && <p className="mt-2 text-[0.68rem] text-slate-400 truncate">Princ.: {zone.topDisease}</p>}
                          </div>
                        ))}
                      </div>
                  }
                </article>

                {/* ── CHARTS ── */}
                <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  {/* health donut */}
                  <article className="glass-card p-6">
                    <header className="flex items-start justify-between gap-4 mb-5">
                      <hgroup>
                        <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Salud general</p>
                        <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Plantas sanas vs. en riesgo</h3>
                      </hgroup>
                      <span className="inline-flex items-center gap-1 border border-slate-200 bg-white text-slate-500 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase">
                        <i className="fas fa-chart-pie text-[0.6rem]"></i> Distribución
                      </span>
                    </header>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-6 items-center">
                      <figure className="relative h-56 w-full">
                        <DonutChart healthy={kpis.healthy} atRisk={kpis.highRisk} />
                      </figure>
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Sin alerta</p>
                          <div className="mt-1 flex items-end justify-between gap-3">
                            <span className="text-2xl font-semibold text-brand-700">{kpis.healthy}</span>
                            <span className="text-sm font-medium text-brand-600">{kpis.total ? Math.round((kpis.healthy / kpis.total) * 100) : 0}%</span>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">En riesgo</p>
                          <div className="mt-1 flex items-end justify-between gap-3">
                            <span className="text-2xl font-semibold text-red-700">{kpis.highRisk}</span>
                            <span className="text-sm font-medium text-red-600">{kpis.total ? Math.round((kpis.highRisk / kpis.total) * 100) : 0}%</span>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Impacto operativo</p>
                          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                            {kpis.highRisk > 0
                              ? `${kpis.highRisk} planta${kpis.highRisk !== 1 ? 's' : ''} requiere${kpis.highRisk === 1 ? '' : 'n'} atención fitosanitaria.`
                              : 'Sin alertas activas. El cultivo está en condiciones óptimas.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>

                  {/* top diseases */}
                  <article className="glass-card p-6">
                    <header className="flex items-start justify-between gap-4 mb-5">
                      <hgroup>
                        <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Tendencia clínica</p>
                        <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Enfermedades más frecuentes</h3>
                      </hgroup>
                    </header>
                    {topDiseases.length === 0
                      ? <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                          <i className="fas fa-virus-slash text-3xl"></i>
                          <p className="text-sm">Sin diagnósticos registrados aún</p>
                        </div>
                      : <ul className="space-y-3 list-none p-0">
                          {topDiseases.map(d => <BarItem key={d.label} label={d.label} value={d.value} max={maxDisease} />)}
                        </ul>
                    }
                  </article>
                </section>

                {/* ── ZONE HEATMAP ── */}
                {farmZones.length > 0 && (
                  <article className="glass-card p-6">
                    <header className="flex items-center justify-between mb-5 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-brand-600 font-semibold">Territorio</p>
                        <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Mapa de calor por corporación agrícola</h3>
                      </div>
                      <span className="text-xs px-2 py-1 bg-brand-50 text-brand-600 rounded-full border border-brand-100 flex-shrink-0">
                        {farmZones.length} corporación{farmZones.length !== 1 ? 'es' : ''} analizadas
                      </span>
                    </header>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                      {farmZones.map((zone, i) => <ZoneCard key={zone.farmId} zone={zone} idx={i} />)}
                    </div>
                  </article>
                )}

                {/* ── RECENT ALERTS ── */}
                <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">

                  <article className="glass-card p-6">
                    <header className="flex items-center justify-between mb-4 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Alertas recientes</p>
                        <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Lo que merece atención hoy</h3>
                      </div>
                      <button onClick={() => navigate('/historial')}
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium flex-shrink-0"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        Ver historial →
                      </button>
                    </header>
                    {recentAlerts.length === 0
                      ? <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                          <i className="fas fa-circle-check text-2xl text-brand-300 mb-2 block"></i>
                          Sin alertas activas. ¡El cultivo está bien!
                        </div>
                      : <ul className="space-y-3 list-none p-0">
                          {recentAlerts.map(h => {
                            const ctx = h.context_detail || {}
                            const bucket = computeSevBucket(h)
                            const color = riskColorFromBucket(bucket)
                            const bg = riskBgFromBucket(bucket)
                            return (
                              <li key={h.id}>
                                <article className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 hover:border-red-200 hover:shadow-sm transition-shadow">
                                  <div className="mt-1 w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>
                                    <i className="fas fa-triangle-exclamation"></i>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{h.disease_name_predicted || ctx.main_symptom || 'Sin diagnóstico'}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{ctx.farm_name || '—'}{ctx.plot_name ? ` · ${ctx.plot_name}` : ''}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(h.created_at)}</p>
                                  </div>
                                  <span className="sev-pill flex-shrink-0" style={{ background: riskBgFromBucket(bucket), color }}>{computeSevLabel(h)}</span>
                                </article>
                              </li>
                            )
                          })}
                        </ul>
                    }
                  </article>

                  {/* download reports panel */}
                  <article className="glass-card p-6">
                    <header className="mb-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500 font-semibold">Reportes</p>
                      <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">Descargar informes</h3>
                    </header>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-file-pdf text-red-600"></i>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Reporte PDF del dashboard</p>
                            <p className="text-xs text-slate-500 mt-0.5">Captura completa con mapa, gráficos e indicadores</p>
                          </div>
                        </div>
                        <button onClick={exportPDF} disabled={loading || histories.length === 0}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition"
                          style={{ background: '#dc2626', border: 'none', cursor: loading || histories.length === 0 ? 'not-allowed' : 'pointer', opacity: loading || histories.length === 0 ? 0.6 : 1 }}>
                          <i className="fas fa-download mr-2"></i>Descargar PDF
                        </button>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-file-excel text-green-600"></i>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Exportar análisis a Excel</p>
                            <p className="text-xs text-slate-500 mt-0.5">{histories.length} registros · CSV compatible con Excel</p>
                          </div>
                        </div>
                        <button onClick={exportCSV} disabled={loading || histories.length === 0}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold transition"
                          style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', cursor: loading || histories.length === 0 ? 'not-allowed' : 'pointer', opacity: loading || histories.length === 0 ? 0.6 : 1 }}>
                          <i className="fas fa-download mr-2"></i>Descargar CSV / Excel
                        </button>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">Resumen de datos</p>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between"><span className="text-slate-600">Total análisis</span><span className="font-semibold text-slate-900">{kpis.total}</span></div>
                          <div className="flex justify-between"><span className="text-slate-600">Con alerta de riesgo</span><span className="font-semibold text-red-700">{kpis.highRisk}</span></div>
                          <div className="flex justify-between"><span className="text-slate-600">Corporaciones</span><span className="font-semibold text-slate-900">{kpis.farms}</span></div>
                          <div className="flex justify-between"><span className="text-slate-600">Enfermedades detectadas</span><span className="font-semibold text-slate-900">{topDiseases.length}</span></div>
                        </div>
                      </div>
                    </div>
                  </article>
                </section>

              </div>
          </div>

          <footer className="hidden md:flex flex-shrink-0 items-center justify-center px-6 py-3 border-t border-gray-100 text-sm text-slate-400">
            Pitahaya Vision © 2026. Todos los derechos reservados.
          </footer>
        </main>
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      <DashboardReportPDF
        isOpen={showPDF}
        onClose={() => setShowPDF(false)}
        mode="user"
        data={{ kpis, topDiseases, farmZones, recentAlerts, userName: displayName }}
      />
    </>
  )
}
