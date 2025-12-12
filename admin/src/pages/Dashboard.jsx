import { useEffect, useState } from 'react'
import api from '../services/api'
import '../styles/Dashboard.css'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await api.getStats()
      setStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading statistics...</div>
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>
  }

  return (
    <div className="dashboard">
      <h2 className="page-title">Dashboard Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-details">
            <div className="stat-value">{stats?.users?.total || 0}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💪</div>
          <div className="stat-details">
            <div className="stat-value">{stats?.users?.trainers || 0}</div>
            <div className="stat-label">Trainers</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔐</div>
          <div className="stat-details">
            <div className="stat-value">{stats?.users?.admins || 0}</div>
            <div className="stat-label">Admins</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-details">
            <div className="stat-value">{stats?.users?.recentSignups || 0}</div>
            <div className="stat-label">New Users (7d)</div>
          </div>
        </div>
      </div>
      
      <div className="activity-section">
        <h3>Platform Activity</h3>
        <div className="activity-grid">
          <div className="activity-card">
            <span className="activity-icon">🍎</span>
            <div>
              <div className="activity-value">{stats?.activity?.nutritionEntries || 0}</div>
              <div className="activity-label">Nutrition Entries</div>
            </div>
          </div>
          
          <div className="activity-card">
            <span className="activity-icon">⚖️</span>
            <div>
              <div className="activity-value">{stats?.activity?.trackingEntries || 0}</div>
              <div className="activity-label">Tracking Entries</div>
            </div>
          </div>
          
          <div className="activity-card">
            <span className="activity-icon">🏋️</span>
            <div>
              <div className="activity-value">{stats?.activity?.workouts || 0}</div>
              <div className="activity-label">Workouts Created</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

