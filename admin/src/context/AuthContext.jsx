import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if there's a token in localStorage
    const token = localStorage.getItem('admin_token')
    if (token) {
      // Token exists, but we don't auto-validate it
      // User will be set on successful login
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    try {
      const data = await api.login(email, password)
      setUser(data.user)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    api.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

