import { useEffect, useState } from 'react'
import api from '../services/api'
import '../styles/AuditLogs.css'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ page: 0, limit: 50 })

  useEffect(() => {
    loadLogs()
  }, [filters])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await api.getAuditLogs(filters)
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  const getActionBadgeClass = (action) => {
    if (action.includes('create') || action.includes('approve')) return 'action-success'
    if (action.includes('delete') || action.includes('reject')) return 'action-danger'
    if (action.includes('update') || action.includes('role')) return 'action-warning'
    return 'action-info'
  }

  return (
    <div className="audit-logs-page">
      <h2 className="page-title">Audit Logs</h2>

      {loading && <div className="loading">Loading audit logs...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          <div className="table-container">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="timestamp">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      {log.admin ? (
                        <div className="admin-cell">
                          <strong>{log.admin.name}</strong>
                          <small>{log.admin.email}</small>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      {log.target_type && log.target_id ? (
                        <span className="target">
                          {log.target_type} #{log.target_id}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {log.details ? (
                        <code className="details">
                          {JSON.stringify(log.details, null, 2)}
                        </code>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="ip">{log.ip_address || '-'}</td>
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

