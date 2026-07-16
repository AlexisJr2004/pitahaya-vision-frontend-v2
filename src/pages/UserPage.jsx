import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getWeather } from '../services/analysisService'
import ProfileModal from '../components/ProfileModal'
import SettingsModal from '../components/SettingsModal'
import WeatherWidget from '../components/WeatherWidget'
import DashboardView from './dashboard/DashboardView'
import HistorialView from './historial/HistorialView'

export default function UserPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const view = pathname.startsWith('/historial') ? 'historial' : 'dashboard'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ left: 0, bottom: 0 })
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [weatherData, setWeatherData] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const displayName = user?.full_name || user?.username || 'Usuario'
  const userEmail = user?.email || ''
  const profilePhotoUrl = user?.profile_photo_url || null
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

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
      { timeout: 8000 },
    )
  }, [])

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

  const switchView = useCallback((v) => {
    setSidebarOpen(false)
    navigate('/' + v)
  }, [navigate])

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .brand-avatar { background: linear-gradient(135deg,#16a34a,#22c55e,#4ade80); }
        .font-cormorant { font-family:'Cormorant Garamond',serif; }
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
        .stat-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;}
        .fade-in{animation:fadeIn 0.35s ease-in-out;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div id="drawerOverlay" className={sidebarOpen ? 'open' : ''} onClick={() => setSidebarOpen(false)}></div>

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

      <div className="h-screen flex overflow-hidden bg-white">

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

          <nav className="flex flex-col gap-1 flex-1 overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
            <button className={`h-nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => switchView('dashboard')}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
              Dashboard
            </button>
            <button className={`h-nav-btn ${view === 'historial' ? 'active' : ''}`} onClick={() => switchView('historial')}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18" /><path d="M7 6h10" /><path d="M7 18h10" /></svg>
              Historial de análisis
            </button>
            <button onClick={() => navigate('/chatbot')} className="h-nav-btn">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Chatbot
            </button>
          </nav>

          <section className="flex-shrink-0 w-full mt-2 mb-1" aria-label="Clima actual"
            style={{ position: 'relative', zIndex: 1, borderRadius: 28, border: '1px solid rgba(226,232,240,0.9)', padding: '1.1rem 1rem' }}>
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
                  { timeout: 8000 },
                )
              }}
            />
          </section>

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

        {view === 'dashboard' && <DashboardView onOpenSidebar={() => setSidebarOpen(true)} />}
        {view === 'historial' && <HistorialView onOpenSidebar={() => setSidebarOpen(true)} />}
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  )
}
