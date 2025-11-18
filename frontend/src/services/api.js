// frontend/src/services/api.js
import axios from 'axios'

const base = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({
  baseURL: base,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
})

// attach token from localStorage
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
}, err => Promise.reject(err))

// optional: global response handler for auth expiry
api.interceptors.response.use(r => r, err => {
  if (err.response && err.response.status === 401) {
    localStorage.removeItem('token')
    // window.location.reload() // optional
  }
  return Promise.reject(err)
})

export default api
