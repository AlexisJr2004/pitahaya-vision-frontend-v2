import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import HomePage from './pages/HomePage'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/registro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/recuperar-cuenta" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/recuperar-cuenta/confirmar" element={<PublicRoute><ResetPasswordConfirmPage /></PublicRoute>} />
        <Route path="/verificar-correo" element={<VerifyEmailPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
