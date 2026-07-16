import { useState, useEffect, useRef, useCallback } from 'react'
import AppLogo from './AppLogo'
import WeatherWidget from './WeatherWidget'
import { getWeather } from '../services/analysisService'

function BotanicalBg() {
  return (
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
  )
}

export default function Sidebar({
  brandLabel,
  navItems,
  children,
  weatherData,
  weatherLoading,
  onRetryWeather,
  hideWeather,
  user,
  onProfile,
  onSettings,
  onLogout,
  sidebarOpen,
  onToggleSidebar,
  sidebarId = 'sidebar',
  sidebarBtnClass = 'sidebar-btn',
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ left: 0, bottom: 0 })
  const menuRef = useRef(null)
  const triggerRef = useRef(null)

  const toggleUserMenu = useCallback(() => {
    if (!triggerRef.current) return
    if (menuOpen) { setMenuOpen(false); return }
    const rect = triggerRef.current.getBoundingClientRect()
    const W = 383, M = 10
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

  const retry = onRetryWeather || (() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try { const d = await getWeather(coords.latitude, coords.longitude); /* handled by parent */ } catch {}
      },
      () => {},
      { timeout: 8000 },
    )
  })

  return (
    <>
      <style>{`
        #drawerOverlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:40}
        #drawerOverlay.open{display:block}
        #${sidebarId}{position:fixed;top:0;left:0;bottom:0;width:272px;background:#fff;border-right:1px solid #f3f4f6;display:flex;flex-direction:column;padding:1rem;gap:0.75rem;z-index:50;overflow:hidden;transform:translateX(0);transition:transform 0.28s cubic-bezier(0.22,1,0.36,1)}
        @media(max-width:767px){#${sidebarId}{transform:translateX(-100%)}#${sidebarId}.open{transform:translateX(0)}}
        @media(min-width:768px){#${sidebarId}{position:relative;flex-shrink:0}#drawerOverlay{display:none!important}#${sidebarId}MenuBtn{display:none!important}}
        .z-sidebar{position:relative;z-index:1}
        .botanical-bg{position:absolute;bottom:-0.75rem;left:-0.75rem;width:11rem;opacity:0.08;pointer-events:none}
        .brand-sidebar-avatar{background:linear-gradient(135deg,#16a34a,#22c55e,#4ade80)}
        .brand-sidebar-ring{background:linear-gradient(135deg,#16a34a,#4ade80);box-shadow:0 0 0 2px white}
        .sidebar-nav-inner{position:relative;z-index:1;display:flex;flex-direction:column;gap:0.75rem}
        .${sidebarBtnClass}{display:flex;align-items:center;gap:0.65rem;padding:0.6rem 0.75rem;border-radius:0.75rem;font-size:0.875rem;color:#4b5563;transition:all 0.14s ease;border:1px solid #d1d5dba0;cursor:pointer;width:100%;text-align:left;background:none}
        .${sidebarBtnClass}:hover{background:#f0fdf4;border-color:#22c55e}
        .${sidebarBtnClass}:active{background:#dcfce7}
        .${sidebarBtnClass}.active{background:#f0fdf4;color:#166534;border-color:#bbf7d0;font-weight:500}
        .trigger-ring-s{transition:box-shadow 0.15s}
        #userTriggerS:hover .trigger-ring-s{box-shadow:0 0 0 2px #4ade80}
        .um-option{display:flex;align-items:center;gap:13px;padding:11px 18px;cursor:pointer;transition:background 0.12s}
        .um-option:hover{background:#f9fafb}
        .um-option:hover .um-icon{background:#dcfce7;color:#16a34a}
        .um-icon{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.78rem;transition:background 0.15s,color 0.15s}
        #userMenuS{animation:popUp 0.22s cubic-bezier(0.34,1.18,0.64,1) both}
        @keyframes popUp{from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>

      <div id="drawerOverlay" className={sidebarOpen ? 'open' : ''} onClick={() => onToggleSidebar?.(false)}></div>

      {menuOpen && (
        <div id="userMenuS" ref={menuRef}
          style={{ position: 'fixed', zIndex: 200, width: '383px', background: '#fff', borderRadius: '18px', overflow: 'hidden', border: '1px solid #f3f4f6', boxShadow: '0 24px 48px rgba(15,23,42,.18)', left: menuPos.left + 'px', bottom: menuPos.bottom + 'px', top: 'auto' }}>
          <div className="flex items-center justify-center px-5 pt-4 pb-2">
            <p className="text-[0.75rem] font-medium text-gray-500 truncate text-center w-full">{user?.email || ''}</p>
          </div>
          <div className="flex flex-col items-center px-6 pt-1 pb-6">
            <div className="mb-3 flex-shrink-0" style={{ padding: 3, background: 'linear-gradient(135deg,#16a34a,#4ade80)', borderRadius: '9999px', boxShadow: '0 4px 18px rgba(22,163,74,.25)' }}>
              <div className="w-[78px] h-[78px] rounded-full overflow-hidden bg-white p-0.5">
                {user?.profilePhotoUrl
                  ? <img src={user.profilePhotoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover select-none" />
                  : <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold text-white select-none brand-sidebar-avatar">{user?.initials || 'U'}</div>}
              </div>
            </div>
            <p className="text-[1.1rem] font-semibold text-gray-800 mb-0.5">¡Hola, {user?.displayName?.split(' ')[0] || 'Usuario'}!</p>
            <p className="text-[0.72rem] text-gray-400 mb-4 text-center">{user?.displayName || ''}</p>
            <button onClick={() => { setMenuOpen(false); onProfile?.() }}
              className="w-full text-center border border-brand-600 text-brand-700 rounded-full py-2 px-4 text-[0.82rem] font-medium hover:bg-brand-50 active:bg-brand-100 transition-colors cursor-pointer"
              style={{ background: 'none' }}>
              Gestionar mi perfil
            </button>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-1.5">
            <div onClick={() => { setMenuOpen(false); onProfile?.() }} className="um-option">
              <div className="um-icon bg-gray-100 text-gray-500"><i className="fas fa-user"></i></div>
              <div><p className="text-sm font-medium text-gray-700 leading-tight">Perfil</p><p className="text-[0.68rem] text-gray-400 mt-0.5">Ver y editar tu perfil</p></div>
            </div>
            <div onClick={() => { setMenuOpen(false); onSettings?.() }} className="um-option">
              <div className="um-icon bg-gray-100 text-gray-500"><i className="fas fa-gear"></i></div>
              <div><p className="text-sm font-medium text-gray-700 leading-tight">Configuraciones</p><p className="text-[0.68rem] text-gray-400 mt-0.5">Preferencias y ajustes</p></div>
            </div>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-1.5">
            <div onClick={() => { setMenuOpen(false); onLogout?.() }} className="um-option">
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

      <aside id={sidebarId} className={sidebarOpen ? 'open' : ''}>
        <BotanicalBg />

        <div className="flex items-center gap-2 mb-1 z-sidebar">
          <div className="brand-sidebar-avatar w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <AppLogo className="w-4 h-4 fill-white" />
          </div>
          <span className="font-cormorant font-semibold text-base text-gray-900">Pitahaya Vision</span>
        </div>

        {brandLabel && (
          <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-gray-400 mt-1 px-1 z-sidebar">{brandLabel}</p>
        )}

        <nav className="sidebar-nav-inner flex-1 overflow-y-auto">
          {navItems.map((item, i) => (
            <button key={item.key || i} onClick={item.onClick}
              className={`${sidebarBtnClass} ${item.active ? 'active' : ''}`}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {children && (
          <div className="z-sidebar overflow-y-auto flex-1">
            {children}
          </div>
        )}

        {!hideWeather && (
          <section className="flex-shrink-0 w-full mt-2 mb-1 z-sidebar"
            style={{ borderRadius: 28, border: '1px solid rgba(226,232,240,0.9)', padding: '1.1rem 1rem' }}>
            <WeatherWidget
              data={weatherData}
              loading={weatherLoading}
              variant="sidebar"
              filterToday={true}
              onRetry={retry}
            />
          </section>
        )}

        <div className="border-t border-gray-100 pt-3 mt-1 z-sidebar">
          <button id="userTriggerS" ref={triggerRef} onClick={toggleUserMenu}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div className="trigger-ring-s w-9 h-9 rounded-full flex-shrink-0 p-0.5 brand-sidebar-ring">
              {user?.profilePhotoUrl
                ? <img src={user.profilePhotoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover select-none" />
                : <div className="w-full h-full rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white select-none brand-sidebar-avatar">{user?.initials || 'U'}</div>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.82rem] font-semibold text-gray-800 truncate leading-tight">{user?.displayName || 'Usuario'}</p>
              <p className="text-[0.68rem] text-gray-400 truncate leading-tight">{user?.email || ''}</p>
            </div>
            <i className={`fas fa-chevron-up text-[0.62rem] text-gray-400 flex-shrink-0 transition-transform duration-200 ${menuOpen ? '' : 'rotate-180'}`}></i>
          </button>
        </div>
      </aside>
    </>
  )
}
