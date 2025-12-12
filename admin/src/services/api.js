const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

class ApiService {
  constructor() {
    this.token = localStorage.getItem('admin_token')
  }

  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('admin_token', token)
    } else {
      localStorage.removeItem('admin_token')
    }
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }
    return headers
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const config = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      return data
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    this.setToken(data.token)
    return data
  }

  async createAdmin(email, password, first_name, last_name) {
    return this.request('/auth/admin/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, first_name, last_name })
    })
  }

  // Stats
  async getStats() {
    return this.request('/admin/stats')
  }

  // Users
  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/admin/users${query ? `?${query}` : ''}`)
  }

  async getUser(userId) {
    return this.request(`/admin/users/${userId}`)
  }

  async updateUserRole(userId, role, old_role) {
    return this.request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, old_role })
    })
  }

  async deleteUser(userId) {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE'
    })
  }

  // Trainers
  async getPendingTrainers() {
    return this.request('/admin/trainers/pending')
  }

  async approveTrainer(userId, approved) {
    return this.request(`/admin/trainers/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved })
    })
  }

  // Audit Logs
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/admin/audit-logs${query ? `?${query}` : ''}`)
  }

  logout() {
    this.setToken(null)
  }
}

export default new ApiService()

