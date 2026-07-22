import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProfileModal from '../components/modals/ProfileModal'
import SettingsModal from '../components/modals/SettingsModal'
import ClientesAdminPage from './clientes/ClientesAdminPage'
import HistorialAdminPage from './historial/HistorialAdminPage'
import DashboardAdminPage from './dashboard/DashboardAdminPage'
import { getWeather } from '../services/analysisService'
import { getInitials } from '../utils/formatters'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import Footer from '../components/Footer'

export default function HomeAdminPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [view, setView] = useState('dashboard')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  const displayName = user?.full_name || user?.username || 'Usuario'
  const userEmail = user?.email || ''
  const initials = getInitials(displayName)
  const profilePhotoUrl = user?.profile_photo_url

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  const switchView = (v) => { setView(v); setSidebarOpen(false); document.body.style.overflow = '' }

  const renderContent = () => {
    switch (view) {
      case 'history': return <HistorialAdminPage />
      case 'customers': return <ClientesAdminPage />
      case 'dashboard': return <DashboardAdminPage />
      default: return <DashboardAdminPage />
    }
  }

  const VIEW_SUBTITLES = { dashboard: 'Panel administrativo', history: 'Centro documental', customers: 'Gestión de usuarios' }

  const navItems = [
    {
      key: 'dashboard', label: 'Dashboard',
      active: view === 'dashboard',
      onClick: () => switchView('dashboard'),
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
    },
    {
      key: 'history', label: 'Historial',
      active: view === 'history',
      onClick: () => switchView('history'),
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>
    },
    {
      key: 'customers', label: 'Clientes',
      active: view === 'customers',
      onClick: () => switchView('customers'),
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    },
  ]

  return (
    <>
      <div className="h-screen flex overflow-hidden">
        <Sidebar
          brandLabel="Panel Admin"
          navItems={navItems}
          weatherData={weatherData}
          weatherLoading={weatherLoading}
          user={{ displayName, email: userEmail, profilePhotoUrl, initials }}
          onProfile={() => setShowProfileModal(true)}
          onSettings={() => setShowSettingsModal(true)}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={setSidebarOpen}
          sidebarId="admin-sidebar"
          sidebarBtnClass="nav-btn"
        />

        <main className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: '#ffffff' }}>
          <TopBar subtitle={VIEW_SUBTITLES[view] || 'Panel administrativo'} onOpenSidebar={() => setSidebarOpen(true)} />
          <div id="main-content" className="flex-1 overflow-y-auto thin-scroll p-4 md:p-6">
            {renderContent()}
          </div>
          <Footer className="bg-white text-xs" />
        </main>
      </div>
      <ProfileModal  isOpen={showProfileModal}  onClose={() => setShowProfileModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  )
}
