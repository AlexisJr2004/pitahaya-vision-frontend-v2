import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { login as apiLogin, logout as apiLogout, getProfile } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // ─── Restore session from localStorage on mount ─────────────────
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setInitialLoading(false)
        return
      }
      try {
        const profile = await getProfile()
        setUser(profile)
      } catch {
        localStorage.removeItem('auth_token')
      } finally {
        setInitialLoading(false)
      }
    }
    restoreSession()
  }, [])

  const login = useCallback(async (credentials) => {
    setLoading(true)
    try {
      const data = await apiLogin(credentials)
      localStorage.setItem('auth_token', data.key)
      const profile = await getProfile()
      setUser(profile)
      return profile
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // ignore
    }
    localStorage.removeItem('auth_token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, initialLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
