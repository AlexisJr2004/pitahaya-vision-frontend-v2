import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import HomePage from './pages/HomePage'
import ChatbotPage from './pages/ChatbotPage'
import UserPage from './pages/UserPage'
import LoadingScreen from './components/LoadingScreen'
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
  if (isAdmin) return <HomePage />
  return <Navigate to="/chatbot" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <AuthTransitionLoader />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/registro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/recuperar-cuenta" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/recuperar-cuenta/confirmar" element={<PublicRoute><ResetPasswordConfirmPage /></PublicRoute>} />
        <Route path="/verificar-correo" element={<VerifyEmailPage />} />
        <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
        <Route path="/chatbot" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
        <Route path="/historial" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
