const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
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
  assertTrainerAccess
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

function trainerOnly(req, res, next) {
  if (req.userRole !== 'trainer') {
    return res.status(403).json({ error: 'trainer_only' })
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

// auth init (telegram initData)
app.post('/api/auth/telegram-init', async (req, res) => {
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
// webhook (if needed)
app.post('/webhook', (req, res) => {
  console.log('webhook body:', req.body)
  res.sendStatus(200)
})

// ---- Root route
app.get('/', (req, res) => {
  res.json({ message: 'Olympique Bot API', status: 'ok' })
})

// ---- API fallback 404 for unknown API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API not found' })
  }
  next()
})

// ---- Redirect non-API routes to frontend on Render
app.get('*', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL
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
