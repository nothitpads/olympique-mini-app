const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config')
const { findUserById } = require('../db/db')

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'no_token' })
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.uid
    
    // Always fetch fresh role from database to handle role changes
    // This ensures that even if the token has an old role, we use the current DB role
    const user = await findUserById(req.userId)
    if (!user) {
      console.error('[AUTH] User not found in database:', req.userId)
      return res.status(401).json({ error: 'user_not_found' })
    }
    
    req.userRole = user.role || 'user'
    
    // Debug logging for production issues
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log('[AUTH] User authenticated:', { 
        userId: req.userId, 
        role: req.userRole, 
        tokenRole: payload.role,
        path: req.path 
      })
    }
    next()
  } catch (e) {
    console.error('[AUTH] Token verification failed:', e.message)
    return res.status(401).json({ error: 'invalid_token' })
  }
}

module.exports = { authMiddleware }
