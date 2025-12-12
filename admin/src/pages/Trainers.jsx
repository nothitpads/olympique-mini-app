import { useEffect, useState } from 'react'
import api from '../services/api'
import '../styles/Trainers.css'

export default function Trainers() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPendingTrainers()
  }, [])

  const loadPendingTrainers = async () => {
    try {
      setLoading(true)
      const data = await api.getPendingTrainers()
      setPending(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId) => {
    if (!confirm('Approve this trainer application?')) return

    try {
      await api.approveTrainer(userId, true)
      // optimistic remove
      setPending((prev) => prev.filter((p) => p.id !== userId))
      loadPendingTrainers()
    } catch (err) {
      alert('Failed to approve trainer: ' + err.message)
    }
  }

  const handleReject = async (userId) => {
    if (!confirm('Reject this trainer application?')) return

    try {
      await api.approveTrainer(userId, false)
      // optimistic remove
      setPending((prev) => prev.filter((p) => p.id !== userId))
      loadPendingTrainers()
    } catch (err) {
      alert('Failed to reject trainer: ' + err.message)
    }
  }

  return (
    <div className="trainers-page">
      <h2 className="page-title">Trainer Approvals</h2>

      {loading && <div className="loading">Loading pending trainers...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && pending.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h3>No Pending Approvals</h3>
          <p>All trainer applications have been processed.</p>
        </div>
      )}

      {!loading && !error && pending.length > 0 && (
        <div className="trainers-grid">
          {pending.map((trainer) => (
            <div key={trainer.id} className="trainer-card">
              <div className="trainer-header">
                {trainer.photo_url && (
                  <img src={trainer.photo_url} alt="" className="trainer-avatar" />
                )}
                <div>
                  <h3>{trainer.name}</h3>
                  <p className="trainer-meta">@{trainer.username || 'N/A'}</p>
                </div>
              </div>

              {trainer.profile && (
                <div className="trainer-details">
                  <div className="trainer-bio-block">
                    <div className="label">CV / Summary:</div>
                    <p className="trainer-bio">
                      {trainer.profile.bio || 'No CV provided.'}
                    </p>
                  </div>

                  <div className="trainer-info">
                    {trainer.profile.years_experience && (
                      <div className="info-item">
                        <span className="label">Experience:</span>
                        <span>{trainer.profile.years_experience} years</span>
                      </div>
                    )}

                    <div className="info-item">
                      <span className="label">City:</span>
                      <span>{trainer.profile.location || '—'}</span>
                    </div>
                  </div>

                  {trainer.profile.hero_url && (
                    <div className="info-item">
                      <span className="label">CV File:</span>
                      <a
                        href={trainer.profile.hero_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link"
                      >
                        Open
                      </a>
                    </div>
                  )}

                  {trainer.profile.specialties && trainer.profile.specialties.length > 0 ? (
                    <div className="tags">
                      {trainer.profile.specialties.map((spec, idx) => (
                        <span key={idx} className="tag">{spec}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="info-item small-muted">No specialties listed.</div>
                  )}
                </div>
              )}

              <div className="trainer-footer">
                <button
                  onClick={() => handleApprove(trainer.id)}
                  className="btn btn-success"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleReject(trainer.id)}
                  className="btn btn-danger"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

