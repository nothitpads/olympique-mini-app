import { useEffect, useState } from 'react'
import api from '../services/api'
import '../styles/Users.css'

export default function Users() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ page: 0, limit: 20, search: '', role: '' })

  useEffect(() => {
    loadUsers()
  }, [filters])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await api.getUsers(filters)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value, page: 0 })
  }

  const handleRoleFilter = (e) => {
    setFilters({ ...filters, role: e.target.value, page: 0 })
  }

  const handleRoleChange = async (userId, newRole, oldRole) => {
    if (!confirm(`Change user role to ${newRole}?`)) return

    try {
      await api.updateUserRole(userId, newRole, oldRole)
      loadUsers()
    } catch (err) {
      alert('Failed to update role: ' + err.message)
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      await api.deleteUser(userId)
      loadUsers()
    } catch (err) {
      alert('Failed to delete user: ' + err.message)
    }
  }

  const nextPage = () => {
    if (pagination.page < pagination.totalPages - 1) {
      setFilters({ ...filters, page: filters.page + 1 })
    }
  }

  const prevPage = () => {
    if (pagination.page > 0) {
      setFilters({ ...filters, page: filters.page - 1 })
    }
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h2 className="page-title">User Management</h2>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search users..."
          value={filters.search}
          onChange={handleSearch}
          className="search-input"
        />
        
        <select value={filters.role} onChange={handleRoleFilter} className="role-filter">
          <option value="">All Roles</option>
          <option value="user">Users</option>
          <option value="trainer">Trainers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading && <div className="loading">Loading users...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>
                      <div className="user-cell">
                        {user.photo_url && (
                          <img src={user.photo_url} alt="" className="user-avatar" />
                        )}
                        <span>{user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '-'}</span>
                      </div>
                    </td>
                    <td>{user.email || '-'}</td>
                    <td>{user.username || '-'}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value, user.role)}
                        className={`role-badge role-${user.role}`}
                      >
                        <option value="user">User</option>
                        <option value="trainer">Trainer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button onClick={prevPage} disabled={pagination.page === 0} className="btn btn-sm">
              Previous
            </button>
            <span className="pagination-info">
              Page {pagination.page + 1} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <button
              onClick={nextPage}
              disabled={pagination.page >= pagination.totalPages - 1}
              className="btn btn-sm"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

