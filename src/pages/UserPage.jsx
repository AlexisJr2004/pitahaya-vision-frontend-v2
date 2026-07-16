import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getWeather } from '../services/analysisService'
import ProfileModal from '../components/ProfileModal'
import SettingsModal from '../components/SettingsModal'
import Sidebar from '../components/Sidebar'
import DashboardView from './dashboard/DashboardView'
import HistorialView from './historial/HistorialView'

export default function UserPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const view = pathname.startsWith('/historial') ? 'historial' : 'dashboard'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [weatherData, setWeatherData] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

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
          const data = await getWeather(coords.latitude, coords.longitude, 30)
          setWeatherData(data)
        } catch { /* silent */ }
        setWeatherLoading(false)
      },
      () => setWeatherLoading(false),
      { timeout: 8000 },
    )
  }, [])

  const handleLogout = useCallback(async () => { await logout(); navigate('/login') }, [logout, navigate])

  const switchView = useCallback((v) => {
    setSidebarOpen(false)
    navigate('/' + v)
  }, [navigate])

  const navItems = [
    {
      key: 'dashboard', label: 'Dashboard',
      active: view === 'dashboard',
      onClick: () => switchView('dashboard'),
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
    },
    {
      key: 'historial', label: 'Historial',
      active: view === 'historial',
      onClick: () => switchView('historial'),
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18" /><path d="M7 6h10" /><path d="M7 18h10" /></svg>
    },
    {
      key: 'chatbot', label: 'Chatbot',
      active: false,
      onClick: () => navigate('/chatbot'),
      icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    },
  ]

  return (
    <>
      <div className="h-screen flex overflow-hidden bg-white">
        <Sidebar
          navItems={navItems}
          weatherData={weatherData}
          weatherLoading={weatherLoading}
          user={{ displayName, email: userEmail, profilePhotoUrl, initials }}
          onProfile={() => setShowProfileModal(true)}
          onSettings={() => setShowSettingsModal(true)}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={setSidebarOpen}
          sidebarId="user-sidebar"
          sidebarBtnClass="h-nav-btn"
        />

        {view === 'dashboard' && <DashboardView onOpenSidebar={() => setSidebarOpen(true)} climateWeather={weatherData} climateWeatherLoading={weatherLoading} />}
        {view === 'historial' && <HistorialView onOpenSidebar={() => setSidebarOpen(true)} />}
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  )
}
