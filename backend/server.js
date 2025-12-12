const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const rateLimit = require('express-rate-limit')
const { validate: validateInitData, parse: parseInitData } = require('@telegram-apps/init-data-node')
require('dotenv').config()
const { authMiddleware } = require('./src/middleware/auth')
const { BOT_TOKEN, JWT_SECRET } = require('./src/config')

const {
  findUserByTelegramId,
  findUserById,
  createUser,
  updateUserProfile,
  getNextWorkout,
  getUpcomingWorkouts,
  getDashboardData,
  getClientsSample,
  saveNutritionSample,
  getTrackingHistory,
  createTrackingEntry,
  createAttendanceEntry,
  setGoalWeight,
  getWorkoutPlan,
  upsertWorkoutPlanEntry,
  getTrainerClientsSnapshots,
  getTrainerClientProfile,
  getTrainerHomeSummary,
  getTrainerMonitoringSummary,
  setClientNutritionTargets,
  bulkUpsertWorkoutPlanEntriesForClient,
  addTrainerNutritionEntry,
  markTrainerAttendance,
  assertTrainerAccess,
  listTrainers,
  upsertTrainerProfile,
  getTrainerProfileForUser,
  getTrainerPublicProfile,
  // Admin functions
  findUserByEmail,
  createAdmin,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getPlatformStats,
  getPendingTrainerApprovals,
  logAdminAction,
  getAuditLogs
} = require('./src/db/db')
const {
  autocompleteFoods,
  searchFoods,
  getFoodById
} = require('./src/lib/fatsecret')

const app = express()

app.use((req,res,next)=>{ console.log(new Date().toISOString(), req.method, req.path); next(); })



// ---- middleware
app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({extended: true}))

// ---- rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false
})

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_attempts' }
})

const telegramAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' }
})

const trainerApplyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' }
})

app.use('/api', apiLimiter)

function trainerOnly(req, res, next) {
  if (req.userRole !== 'trainer') {
    // Enhanced error logging for debugging 403 issues
    console.error('[TRAINER_ONLY] Access denied:', {
      userId: req.userId,
      userRole: req.userRole,
      expectedRole: 'trainer',
      path: req.path,
      method: req.method
    })
    return res.status(403).json({ error: 'trainer_only', receivedRole: req.userRole })
  }
  next()
}

function adminOnly(req, res, next) {
  if (req.userRole !== 'admin') {
    console.error('[ADMIN_ONLY] Access denied:', {
      userId: req.userId,
      userRole: req.userRole,
      expectedRole: 'admin',
      path: req.path,
      method: req.method
    })
    return res.status(403).json({ error: 'admin_only', receivedRole: req.userRole })
  }
  next()
}


function extractInitData(req) {
  const header = req.headers.authorization || ''
  const [scheme, ...rest] = header.split(' ')
  let raw = null

  if (scheme && scheme.toLowerCase() === 'tma') {
    raw = rest.join(' ').trim()
  }

  if (!raw && req.body && req.body.initData) {
    raw = req.body.initData
  }

  if (!raw) {
    return { error: 'missing_init_data' }
  }

  try {
    validateInitData(raw, BOT_TOKEN, { expiresIn: 3600 })
    const parsed = parseInitData(raw)
    return { parsed, raw }
  } catch (err) {
    console.error('initData validation failed', err)
    return { error: 'invalid_init_data' }
  }
}

function isValidUrlMaybe(val) {
  if (!val) return true
  try {
    const u = new URL(val)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch (e) {
    return false
  }
}

// auth init (telegram initData)
app.post('/api/auth/telegram-init', telegramAuthLimiter, async (req, res) => {
  const { parsed, error } = extractInitData(req)
  if (error || !parsed) {
    const status = error === 'missing_init_data' ? 400 : 401
    return res.status(status).json({ error })
  }

  console.log('>>> TELEGRAM INITDATA RAW:', parsed)

  const userObj = parsed.user || {
    id: parsed.id,
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    username: parsed.username
  }
  const photoUrl = userObj.photo_url || userObj.photoUrl || null

  if (!userObj || !userObj.id) {
    return res.status(400).json({ error: 'invalid_user_payload' })
  }

  try {
    let user = await findUserByTelegramId(userObj.id)
    if (!user) {
      user = await createUser({
        telegram_id: userObj.id,
        username: userObj.username || null,
        first_name: userObj.first_name || null,
        last_name: userObj.last_name || null,
        photo_url: photoUrl
      })
    } else {
      await updateUserProfile(user.id, {
        username: userObj.username,
        first_name: userObj.first_name,
        last_name: userObj.last_name,
        photo_url: photoUrl
      })
      user = await findUserById(user.id)
    }

    const payload = { uid: user.id, role: user.role || 'user' }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch (err) {
    console.error('auth error', err)
    res.status(500).json({ error: 'server_error' })
  }
})

// Admin email/password login
app.post('/api/auth/admin/login', adminLoginLimiter, async (req, res) => {
  const { email, password } = req.body || {}
  
  if (!email || !password) {
    return res.status(400).json({ error: 'email_and_password_required' })
  }

  try {
    const user = await findUserByEmail(email)
    
    if (!user || !user.password) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'admin_only' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    const payload = { uid: user.id, role: user.role }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })
    
    // Log the login action
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    await logAdminAction(user.id, 'admin.login', null, null, null, ip)
    
    res.json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    })
  } catch (err) {
    console.error('admin login error', err)
    res.status(500).json({ error: 'server_error' })
  }
})

// Admin registration (protected - only admins can create other admins)
app.post('/api/auth/admin/register', authMiddleware, adminOnly, async (req, res) => {
  const { email, password, first_name, last_name } = req.body || {}
  
  if (!email || !password) {
    return res.status(400).json({ error: 'email_and_password_required' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'password_too_short' })
  }

  try {
    const existing = await findUserByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'email_already_exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    const newAdmin = await createAdmin({
      email,
      password: hashedPassword,
      first_name: first_name || null,
      last_name: last_name || null
    })

    // Log the action
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    await logAdminAction(
      req.userId, 
      'admin.create', 
      newAdmin.id, 
      'user',
      { email: newAdmin.email },
      ip
    )

    res.json({ 
      success: true,
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        first_name: newAdmin.first_name,
        last_name: newAdmin.last_name,
        role: newAdmin.role
      }
    })
  } catch (err) {
    console.error('admin registration error', err)
    res.status(500).json({ error: 'server_error' })
  }
})

// get current user (demo)
app.get('/api/me', authMiddleware, async(req, res) => {
  try {
    const user = await findUserById(req.userId)
    if (!user) return res.status(404).json({ error: 'user_not_found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// next workout
app.get('/api/me/next-workout', authMiddleware, async (req, res) => {
  try {
    const workout = await getNextWorkout(req.userId)
    res.json(workout)
  } catch (err) {
    res.status(500).json({ error: 'failed' })
  }
})

// dashboard snapshot
app.get('/api/me/dashboard', authMiddleware, async (req, res) => {
  try {
    const dashboard = await getDashboardData(req.userId)
    res.json(dashboard)
  } catch (err) {
    console.error('dashboard error', err)
    res.status(500).json({ error: 'failed_to_load_dashboard' })
  }
})

// submit or update trainer profile (for approval)
app.get('/api/me/trainer-profile', authMiddleware, async (req, res) => {
  try {
    const profile = await getTrainerProfileForUser(req.userId)
    res.json(profile || null)
  } catch (err) {
    console.error('trainer profile GET error', err)
    res.status(500).json({ error: 'failed_to_load_trainer_profile' })
  }
})

app.post('/api/me/trainer-profile', authMiddleware, trainerApplyLimiter, async (req, res) => {
  const body = req.body || {}

  if (!body.bio || !body.bio.trim()) {
    return res.status(400).json({ error: 'bio_required' })
  }

  const bio = body.bio.trim()
  if (bio.length > 2000) {
    return res.status(400).json({ error: 'bio_too_long' })
  }

  const fullName = (body.full_name || '').trim()
  if (!fullName) {
    return res.status(400).json({ error: 'full_name_required' })
  }

  const location = (body.location || '').trim()
  if (!location) {
    return res.status(400).json({ error: 'location_required' })
  }

  if (body.hero_url && !isValidUrlMaybe(body.hero_url)) {
    return res.status(400).json({ error: 'invalid_cv_link' })
  }

  try {
    // Derive defaults from user for contact
    const user = await findUserById(req.userId)
    const contactFromUsername = user?.username ? `https://t.me/${user.username.replace('@', '')}` : null

    // Allow updating full name if provided
    if (fullName) {
      const parts = fullName.split(' ').filter(Boolean)
      const first_name = parts[0] || null
      const last_name = parts.length > 1 ? parts.slice(1).join(' ') : null
      await updateUserProfile(req.userId, { first_name, last_name })
    }

    const payload = {
      headline: fullName || body.headline,
      bio,
      years_experience: body.years_experience,
      location,
      price_from: null,
      languages: [],
      specialties: [],
      certifications: [],
      hero_url: body.hero_url || null, // cv link
      contact_url: contactFromUsername,
      telegram_username: user?.username || null
    }

    const profile = await upsertTrainerProfile(req.userId, payload)
    res.json({ ok: true, profile })
  } catch (err) {
    console.error('trainer profile POST error', err)
    res.status(500).json({ error: 'failed_to_save_trainer_profile' })
  }
})

// goal weight
app.post('/api/me/goal-weight', authMiddleware, async (req, res) => {
  const value = req.body?.goalWeight
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return res.status(400).json({ error: 'invalid_goal_weight' })
  }

  try {
    const updated = await setGoalWeight(req.userId, value)
    res.json({ ok: true, goalWeight: updated.goal_weight })
  } catch (err) {
    console.error('goal weight error', err)
    res.status(500).json({ error: 'failed_to_update_goal_weight' })
  }
})

// upcoming workouts
app.get('/api/me/workouts', authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10
    const workouts = await getUpcomingWorkouts(req.userId, { limit })
    res.json(workouts)
  } catch (err) {
    console.error('workouts error', err)
    res.status(500).json({ error: 'failed_to_load_workouts' })
  }
})

// workout plan
app.get('/api/me/workout-plan', authMiddleware, async (req, res) => {
  try {
    const plan = await getWorkoutPlan(req.userId)
    res.json(plan)
  } catch (err) {
    console.error('workout plan GET error', err)
    res.status(500).json({ error: 'failed_to_load_plan' })
  }
})

app.post('/api/me/workout-plan', authMiddleware, async (req, res) => {
  const { day, title } = req.body || {}
  if (day === undefined || day === null || !title || !title.trim()) {
    return res.status(400).json({ error: 'day_and_title_required' })
  }

  try {
    const entry = await upsertWorkoutPlanEntry(req.userId, day, title)
    res.json({ ok: true, entry })
  } catch (err) {
    const status = err.message === 'invalid_day' || err.message === 'title_required' ? 400 : 500
    console.error('workout plan POST error', err)
    res.status(status).json({ error: err.message })
  }
})

// trainer catalogue (public for authenticated users)
app.get('/api/trainers', authMiddleware, async (req, res) => {
  try {
    const result = await listTrainers({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      specialty: req.query.specialty,
      location: req.query.location,
      language: req.query.language,
      minExperience: req.query.minExperience,
      minRating: req.query.minRating,
      sort: req.query.sort
    })
    res.json(result)
  } catch (err) {
    console.error('trainer catalogue error', err)
    res.status(500).json({ error: 'failed_to_load_trainers' })
  }
})

app.get('/api/trainers/:trainerId', authMiddleware, async (req, res) => {
  try {
    const profile = await getTrainerPublicProfile(req.params.trainerId)
    if (!profile) return res.status(404).json({ error: 'trainer_not_found' })
    res.json(profile)
  } catch (err) {
    console.error('trainer profile error', err)
    res.status(500).json({ error: 'failed_to_load_trainer' })
  }
})

// clients
app.get('/api/clients', authMiddleware, async (req, res) => {
  try {
    const clients = await getClientsSample(req.userId)
    res.json(clients)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// trainer dashboards
app.get('/api/trainer/home', authMiddleware, trainerOnly, async (req, res) => {
  try {
    const summary = await getTrainerHomeSummary(req.userId)
    res.json(summary)
  } catch (err) {
    console.error('trainer home error', err)
    res.status(err.code === 'TRAINER_ONLY' ? 403 : 500).json({ error: err.message })
  }
})

app.get('/api/trainer/clients', authMiddleware, trainerOnly, async (req, res) => {
  try {
    const snapshots = await getTrainerClientsSnapshots(req.userId)
    res.json(snapshots)
  } catch (err) {
    console.error('trainer clients error', err)
    const status = err.code === 'TRAINER_ONLY' ? 403 : 500
    res.status(status).json({ error: err.message })
  }
})

app.get('/api/trainer/clients/:clientId', authMiddleware, trainerOnly, async (req, res) => {
  try {
    const profile = await getTrainerClientProfile(req.userId, req.params.clientId)
    res.json(profile)
  } catch (err) {
    console.error('trainer client profile error', err)
    let status = 500
    if (err.code === 'TRAINER_ONLY') status = 403
    else if (err.code === 'CLIENT_NOT_FOUND') status = 404
    else if (err.code === 'FORBIDDEN') status = 403
    res.status(status).json({ error: err.message })
  }
})

app.post('/api/trainer/clients/:clientId/nutrition-target', authMiddleware, trainerOnly, async (req, res) => {
  try {
    await assertTrainerAccess(req.userId, req.params.clientId)
    const updated = await setClientNutritionTargets(req.params.clientId, req.body || {})
    res.json({ ok: true, targets: updated })
  } catch (err) {
    console.error('trainer set target error', err)
    const status =
      err.code === 'CLIENT_NOT_FOUND'
        ? 404
        : err.code === 'FORBIDDEN' || err.code === 'TRAINER_ONLY'
          ? 403
          : 500
    res.status(status).json({ error: err.message })
  }
})

app.post('/api/trainer/clients/:clientId/nutrition-entry', authMiddleware, trainerOnly, async (req, res) => {
  try {
    await assertTrainerAccess(req.userId, req.params.clientId)
    await addTrainerNutritionEntry(req.params.clientId, req.body || {})
    res.json({ ok: true })
  } catch (err) {
    console.error('trainer nutrition entry error', err)
    const status =
      err.code === 'CLIENT_NOT_FOUND'
        ? 404
        : err.code === 'FORBIDDEN' || err.code === 'TRAINER_ONLY'
          ? 403
          : 500
    res.status(status).json({ error: err.message })
  }
})

app.post('/api/trainer/clients/:clientId/workout-plan/bulk', authMiddleware, trainerOnly, async (req, res) => {
  try {
    await assertTrainerAccess(req.userId, req.params.clientId)
    const plan = await bulkUpsertWorkoutPlanEntriesForClient(req.params.clientId, req.body?.entries || [])
    res.json({ ok: true, plan })
  } catch (err) {
    console.error('trainer workout plan bulk error', err)
    const status =
      err.code === 'CLIENT_NOT_FOUND'
        ? 404
        : err.code === 'FORBIDDEN' || err.code === 'TRAINER_ONLY'
          ? 403
          : 500
    res.status(status).json({ error: err.message })
  }
})

app.post('/api/trainer/clients/:clientId/attendance', authMiddleware, trainerOnly, async (req, res) => {
  try {
    await assertTrainerAccess(req.userId, req.params.clientId)
    const record = await markTrainerAttendance(req.params.clientId, req.body || {})
    res.json({ ok: true, id: record.id })
  } catch (err) {
    console.error('trainer attendance override error', err)
    const status =
      err.code === 'CLIENT_NOT_FOUND'
        ? 404
        : err.code === 'FORBIDDEN' || err.code === 'TRAINER_ONLY'
          ? 403
          : 500
    res.status(status).json({ error: err.message })
  }
})

app.get('/api/trainer/monitoring', authMiddleware, trainerOnly, async (req, res) => {
  try {
    const days = req.query.rangeDays ? Number(req.query.rangeDays) : undefined
    const summary = await getTrainerMonitoringSummary(req.userId, { rangeDays: days || 30 })
    res.json(summary)
  } catch (err) {
    console.error('trainer monitoring error', err)
    const status = err.code === 'TRAINER_ONLY' ? 403 : 500
    res.status(status).json({ error: err.message })
  }
})

// tracking: get history
app.get('/api/tracking', authMiddleware, async (req, res) => {
  try {
    const rows = await getTrackingHistory(req.userId)
    res.json(rows || [])
  } catch (err) {
    console.error('tracking GET error', err)
    res.status(500).json({ error: err.message })
  }
})

// tracking: post entry
app.post('/api/tracking', authMiddleware, async (req, res) => {
  try {
    const record = await createTrackingEntry(req.userId, req.body || {})
    res.json({ ok: true, id: record.id })
  } catch (err) {
    const status = err.message === 'date_and_weight_required' ? 400 : 500
    console.error('tracking POST error', err)
    res.status(status).json({ error: err.message })
  }
})

// fatsecret proxy endpoints
app.get('/api/fatsecret/autocomplete', authMiddleware, async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) {
    return res.status(400).json({ error: 'query_required' })
  }
  const limit = Number(req.query.limit) || 10
  try {
    const items = await autocompleteFoods(q, limit)
    res.json(items)
  } catch (err) {
    console.error('fatsecret autocomplete error', err)
    res.status(500).json({ error: 'fatsecret_autocomplete_failed' })
  }
})

app.get('/api/fatsecret/search', authMiddleware, async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) {
    return res.status(400).json({ error: 'query_required' })
  }
  const page = Number(req.query.page) || 0
  const limit = Number(req.query.limit) || 20
  try {
    const items = await searchFoods(q, page, limit)
    res.json(items)
  } catch (err) {
    console.error('fatsecret search error', err)
    res.status(500).json({ error: 'fatsecret_search_failed' })
  }
})

app.get('/api/fatsecret/food/:foodId', authMiddleware, async (req, res) => {
  const { foodId } = req.params
  if (!foodId) {
    return res.status(400).json({ error: 'food_id_required' })
  }
  try {
    const food = await getFoodById(foodId)
    res.json(food)
  } catch (err) {
    console.error('fatsecret food error', err)
    const status = err.message === 'fatsecret_food_not_found' ? 404 : 500
    res.status(status).json({ error: 'fatsecret_food_failed' })
  }
})

// nutrition
app.post('/api/nutrition', authMiddleware, async (req, res) => {
  try {
    await saveNutritionSample(req.userId, req.body)
    res.json({ ok: true })
  } catch (err) {
    const status = err && (err.message === 'date_required' || err.message === 'user_required') ? 400 : 500
    res.status(status).json({ error: err.message })
  }
})

// attendance
app.post('/api/attendance', authMiddleware, async (req, res) => {
  try {
    const payload = {
      userId: req.userId,
      workoutId: req.body?.workoutId,
      time: req.body?.time
    }
    const record = await createAttendanceEntry(payload)
    res.json({ ok: true, id: record.id })
  } catch (err) {
    console.error('attendance POST error', err)
    res.status(500).json({ error: err.message })
  }
})

// ===== Admin Routes =====

// Get platform statistics
app.get('/api/admin/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const stats = await getPlatformStats()
    res.json(stats)
  } catch (err) {
    console.error('admin stats error', err)
    res.status(500).json({ error: 'failed_to_load_stats' })
  }
})

// Get all users with pagination and filters
app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await getAllUsers({
      page: req.query.page,
      limit: req.query.limit,
      role: req.query.role,
      search: req.query.search
    })
    res.json(result)
  } catch (err) {
    console.error('admin users list error', err)
    res.status(500).json({ error: 'failed_to_load_users' })
  }
})

// Get single user details
app.get('/api/admin/users/:userId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await findUserById(req.params.userId)
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }
    res.json(user)
  } catch (err) {
    console.error('admin user detail error', err)
    res.status(500).json({ error: 'failed_to_load_user' })
  }
})

// Update user role
app.patch('/api/admin/users/:userId/role', authMiddleware, adminOnly, async (req, res) => {
  const { role } = req.body || {}
  
  if (!role) {
    return res.status(400).json({ error: 'role_required' })
  }

  try {
    const updated = await updateUserRole(req.params.userId, role)
    
    // Log the action
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    await logAdminAction(
      req.userId,
      'user.role.update',
      updated.id,
      'user',
      { old_role: req.body.old_role, new_role: role },
      ip
    )
    
    res.json({ success: true, user: updated })
  } catch (err) {
    console.error('admin update role error', err)
    const status = err.message === 'invalid_role' ? 400 : 500
    res.status(status).json({ error: err.message })
  }
})

// Delete user
app.delete('/api/admin/users/:userId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await findUserById(req.params.userId)
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    await deleteUser(req.params.userId)
    
    // Log the action
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    await logAdminAction(
      req.userId,
      'user.delete',
      user.id,
      'user',
      { email: user.email, username: user.username },
      ip
    )
    
    res.json({ success: true })
  } catch (err) {
    console.error('admin delete user error', err)
    res.status(500).json({ error: 'failed_to_delete_user' })
  }
})

// Get pending trainer approvals
app.get('/api/admin/trainers/pending', authMiddleware, adminOnly, async (req, res) => {
  try {
    const pending = await getPendingTrainerApprovals()
    res.json(pending)
  } catch (err) {
    console.error('admin pending trainers error', err)
    res.status(500).json({ error: 'failed_to_load_pending_trainers' })
  }
})

// Approve/reject trainer (update role)
app.post('/api/admin/trainers/:userId/approve', authMiddleware, adminOnly, async (req, res) => {
  const { approved } = req.body || {}
  
  try {
    const user = await findUserById(req.params.userId)
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    if (approved) {
      await updateUserRole(req.params.userId, 'trainer')
      
      // Log the action
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      await logAdminAction(
        req.userId,
        'trainer.approve',
        user.id,
        'user',
        null,
        ip
      )
      
      res.json({ success: true, message: 'trainer_approved' })
    } else {
      // On reject: remove trainer profile so it disappears from pending
      await upsertTrainerProfile(req.params.userId, {
        headline: null,
        bio: null,
        years_experience: null,
        location: null,
        price_from: null,
        languages: [],
        specialties: [],
        certifications: [],
        hero_url: null,
        contact_url: null,
        telegram_username: null
      })
      await logAdminAction(
        req.userId,
        'trainer.reject',
        user.id,
        'user',
        null,
        req.headers['x-forwarded-for'] || req.connection.remoteAddress
      )
      
      res.json({ success: true, message: 'trainer_rejected' })
    }
  } catch (err) {
    console.error('admin approve trainer error', err)
    res.status(500).json({ error: 'failed_to_process_approval' })
  }
})

// Get audit logs
app.get('/api/admin/audit-logs', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await getAuditLogs({
      page: req.query.page,
      limit: req.query.limit,
      adminId: req.query.adminId,
      action: req.query.action
    })
    res.json(result)
  } catch (err) {
    console.error('admin audit logs error', err)
    res.status(500).json({ error: 'failed_to_load_audit_logs' })
  }
})

// webhook (if needed)
app.post('/webhook', (req, res) => {
  console.log('webhook body:', req.body)
  res.sendStatus(200)
})

// ---- API fallback 404 for unknown API routes
app.use('/api/{*splat}', (req, res) => {
  res.status(404).json({ error: 'API not found' })
})

// ---- Redirect all non-API routes to frontend on Render
app.get('{*splat}', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL
  if (!frontendUrl) {
    return res.status(500).json({ error: 'FRONTEND_URL not configured' })
  }
  return res.redirect(frontendUrl + req.originalUrl)
})




// ---- start
// Export for Vercel serverless
module.exports = app

// Start server locally (not in Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 4000
  app.listen(PORT, '0.0.0.0', () => console.log(`Backend started on ${PORT}`))
}
