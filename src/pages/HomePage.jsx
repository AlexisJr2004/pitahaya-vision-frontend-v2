import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProfileModal from '../components/ProfileModal'
import SettingsModal from '../components/SettingsModal'
import ClientesPage from './ClientesPage'
import HistorialAdminPage from './historial/HistorialAdminPage'
import DashboardAdminPage from './dashboard/DashboardAdminPage'
import { getWeather } from '../services/analysisService'
import WeatherWidget from '../components/WeatherWidget'

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
        .botanical-bg { position: absolute; bottom: -0.75rem; left: -0.75rem; width: 11rem; opacity: 0.08; pointer-events: none; }
      `}</style>

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

          <nav className="flex flex-col gap-1 overflow-y-auto flex-1" style={{ position: 'relative', zIndex: 1 }}>
            {navItems.map(item => (
              <button key={item.key} onClick={() => switchView(item.key)}
                className={`nav-btn ${view === item.key ? 'active' : ''}`}>
                {item.svg}
                {item.label}
              </button>
            ))}
          </nav>

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
