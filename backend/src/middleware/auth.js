const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config')

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'no_token' })
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.uid
    req.userRole = payload.role
    // Debug logging for production issues
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log('[AUTH] User authenticated:', { userId: req.userId, role: req.userRole, path: req.path })
    }
    next()
  } catch (e) {
    console.error('[AUTH] Token verification failed:', e.message)
    return res.status(401).json({ error: 'invalid_token' })
  }
}

module.exports = { authMiddleware }
