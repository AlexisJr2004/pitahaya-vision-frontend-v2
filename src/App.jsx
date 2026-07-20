import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordConfirmPage from './pages/auth/ResetPasswordConfirmPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import HomeAdminPage from './pages/HomeAdminPage'
import ChatbotPage from './pages/chatbot/ChatbotPage'
import HomeUserPage from './pages/HomeUserPage'
import LoadingScreen from './components/LoadingScreen'
import ThrottleBanner from './components/ThrottleBanner'
import AuthTransitionLoader from './components/AuthTransitionLoader'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function ProtectedRoute({ children }) {
  const { user, initialLoading } = useAuth()
  if (initialLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

function RoleHome() {
  const { user } = useAuth()
  const isAdmin = user?.is_admin || user?.role_label === 'Administrador'
  if (isAdmin) return <HomeAdminPage />
  return <Navigate to="/chatbot" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <AuthTransitionLoader />
      <ThrottleBanner />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/registro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/recuperar-cuenta" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/recuperar-cuenta/confirmar" element={<PublicRoute><ResetPasswordConfirmPage /></PublicRoute>} />
        <Route path="/verificar-correo" element={<VerifyEmailPage />} />
        <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
        <Route path="/chatbot" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
        <Route path="/historial" element={<ProtectedRoute><HomeUserPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><HomeUserPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
