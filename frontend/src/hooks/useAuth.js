import { useEffect, useState } from 'react'
import api from '../services/api'
import { getTelegramInitData } from '../services/telegram'

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      setLoading(true)
      const initData = getTelegramInitData()
      console.log('INIT DATA:', initData)
      const savedToken = localStorage.getItem('token')

      if (savedToken) {
        try {
          const me = await api.get('/me')
          if (mounted) {
            setUser(me.data)
            setLoading(false)
          }
          return
        } catch (err) {
          console.warn('CLIENT: stored token invalid, clearing', err?.response?.data || err.message)
          localStorage.removeItem('token')
        }
      }

      if (!initData) {
        console.warn('CLIENT: Telegram initData is missing – open via Telegram WebApp')
        if (mounted) setLoading(false)
        return
      }

      try {
        const base = import.meta.env.VITE_API_BASE || '/api'
        const response = await fetch(`${base}/auth/telegram-init`, {
          method: 'POST',
          headers: {
            Authorization: `tma ${initData}`
          }
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload?.error || `Auth failed with ${response.status}`)
        }
        const { token, user } = await response.json()
        if (token) {
          localStorage.setItem('token', token)
          console.log('CLIENT: token saved to localStorage')
        }
        if (mounted) {
          setUser(user)
        }
      } catch (err) {
        console.error(
          'CLIENT: /auth/telegram-init failed',
          err?.toString(),
          err?.response?.data
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  return { user, loading, setUser }
}
