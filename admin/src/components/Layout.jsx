import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/Layout.css'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Olympique</h2>
          <span className="badge">Admin</span>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="nav-item">
            <span className="icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/users" className="nav-item">
            <span className="icon">👥</span>
            <span>Users</span>
          </NavLink>
          
          <NavLink to="/trainers" className="nav-item">
            <span className="icon">💪</span>
            <span>Trainers</span>
          </NavLink>
          
          <NavLink to="/audit" className="nav-item">
            <span className="icon">📝</span>
            <span>Audit Logs</span>
          </NavLink>
        </nav>
      </aside>
      
      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <h1>Admin Panel</h1>
          </div>
          <div className="header-right">
            <div className="user-menu">
              <span className="user-name">{user?.email || 'Admin'}</span>
              <button onClick={handleLogout} className="btn btn-sm btn-secondary">
                Logout
              </button>
            </div>
          </div>
        </header>
        
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  )
}

