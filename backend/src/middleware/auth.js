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
    next()
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

module.exports = { authMiddleware }
