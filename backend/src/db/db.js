const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeRole(role) {
  return role === 'trainer' ? 'trainer' : 'user'
}

async function findUserByTelegramId(telegramId) {
  if (!telegramId) return null
  return prisma.user.findUnique({
    where: { telegram_id: String(telegramId) }
  })
}

async function findUserById(id) {
  if (!id) return null
  return prisma.user.findUnique({
    where: { id: Number(id) }
  })
}

async function createUser(payload = {}) {
  const data = {
    telegram_id: payload.telegram_id ? String(payload.telegram_id) : null,
    username: payload.username ?? null,
    first_name: payload.first_name ?? null,
    last_name: payload.last_name ?? null,
    photo_url: payload.photo_url ?? null,
    goal_weight: payload.goal_weight !== undefined && payload.goal_weight !== null
      ? Number(payload.goal_weight)
      : null,
    role: normalizeRole(payload.role)
  }

  return prisma.user.create({ data })
}

async function updateUserProfile(id, fields = {}) {
  if (!id) return null
  const allowed = ['username', 'first_name', 'last_name', 'role', 'photo_url', 'goal_weight']
  const data = {}

  allowed.forEach((key) => {
    if (fields[key] !== undefined) {
      if (key === 'role') {
        data[key] = normalizeRole(fields[key])
      } else if (key === 'goal_weight') {
        data[key] =
          fields[key] === null || fields[key] === undefined ? null : Number(fields[key])
      } else {
        data[key] = fields[key]
      }
    }
  })

  if (Object.keys(data).length === 0) {
    return null
  }

  await prisma.user.update({
    where: { id: Number(id) },
    data
  })

  return findUserById(id)
}

const DAY_MS = 24 * 60 * 60 * 1000

function splitDateTime(value) {
  if (!value || typeof value !== 'string') {
    return { date: null, time: null }
  }

  if (value.includes('T')) {
    const [date, rest] = value.split('T')
    const time = rest ? rest.slice(0, 5) : null
    return { date, time }
  }

  if (value.includes(' ')) {
    const [date, time] = value.split(' ')
    return { date, time }
  }

  return { date: value, time: null }
}

function formatUserName(user = {}) {
  const parts = [user.first_name, user.last_name].filter(Boolean)
  if (parts.length > 0) return parts.join(' ').trim()
  if (user.username) return user.username
  if (user.telegram_id) return `ID ${user.telegram_id}`
  return 'Без имени'
}

function buildContactUrl(profile = {}, user = {}) {
  if (profile.contact_url) return profile.contact_url
  const username = profile.telegram_username || user.username
  if (username) return `https://t.me/${username}`
  return null
}

function analyzeNutritionStatus(calories, calorieTarget, protein, proteinTarget) {
  if (!calorieTarget && !proteinTarget) return 'not_set'
  const statusForValue = (value, target) => {
    if (!target) return null
    if (target === 0) return value === 0 ? 'on_track' : 'exceeded'
    if (value <= target * 1.05 && value >= target * 0.85) return 'within_target'
    if (value > target * 1.05) return 'exceeded'
    return 'below_target'
  }
  const calorieStatus = statusForValue(calories, calorieTarget)
  const proteinStatus = statusForValue(protein, proteinTarget)
  if (calorieStatus === 'exceeded' || proteinStatus === 'exceeded') return 'exceeded'
  if (calorieStatus === 'below_target' || proteinStatus === 'below_target') return 'below_target'
  if (calorieStatus === 'within_target' || proteinStatus === 'within_target') return 'within_target'
  return 'not_set'
}

async function ensureTrainerUser(userId) {
  const user = await findUserById(userId)
  if (!user || user.role !== 'trainer') {
    const err = new Error('trainer_only')
    err.code = 'TRAINER_ONLY'
    throw err
  }
  return user
}

async function getTrainerClientUsers(trainerId) {
  if (!trainerId) return []
  const direct = await prisma.user.findMany({
    where: { trainer_id: Number(trainerId), role: 'user' },
    orderBy: { created_at: 'desc' }
  })
  const map = new Map()
  direct.forEach((user) => {
    map.set(user.id, user)
  })

  const legacyClients = await prisma.client.findMany({
    where: { trainer_id: Number(trainerId) },
    select: { telegram_id: true, name: true }
  })

  for (const row of legacyClients) {
    if (!row.telegram_id) continue
    const user = await findUserByTelegramId(row.telegram_id)
    if (user && !map.has(user.id)) {
      map.set(user.id, user)
    }
  }

  return Array.from(map.values())
}

async function findClientForUser(user) {
  if (!user) return null
  const where = []

  if (user.telegram_id) {
    where.push({ telegram_id: user.telegram_id })
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  if (name) {
    where.push({ name })
  }

  if (where.length === 0) return null

  return prisma.client.findFirst({
    where: {
      OR: where
    }
  })
}

async function getUpcomingWorkouts(userId, options = {}) {
  const limit = Number(options.limit) || 5
  const numericId = Number(userId)
  if (!numericId) return []

  const user = options.user || (await findUserById(numericId))
  if (!user) return []

  const client = await findClientForUser(user)
  if (!client) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = formatLocalDate(today)

  const records = await prisma.workout.findMany({
    where: {
      client_id: client.id,
      date: {
        gte: todayStr
      }
    },
    orderBy: {
      date: 'asc'
    },
    take: limit
  })

  return records.map((row) => {
    const { date, time } = splitDateTime(row.date)
    return {
      id: row.id,
      title: row.title || 'Тренировка',
      date,
      time,
      notes: row.exercises || null
    }
  })
}

async function getNextWorkout(userId, options = {}) {
  const workouts = await getUpcomingWorkouts(userId, { ...options, limit: 1 })
  return workouts[0] || null
}

async function getWeeklyAttendanceSeries(userId, startDate) {
  const numericId = Number(userId)
  if (!numericId) return [0, 0, 0, 0, 0, 0, 0]

  const start = startDate ? new Date(startDate) : new Date()
  start.setHours(0, 0, 0, 0)
  if (!startDate) {
    start.setDate(start.getDate() - 6)
  }
  const sinceIso = start.toISOString()

  const rows = await prisma.attendance.findMany({
    where: {
      user_id: numericId,
      time: {
        gte: sinceIso
      }
    },
    select: {
      time: true,
      created_at: true
    }
  })

  const buckets = Array(7).fill(0)

  rows.forEach((row) => {
    const ts = row.time ? new Date(row.time) : row.created_at
    if (!ts || Number.isNaN(ts.getTime?.() || ts)) {
      return
    }
    const dateObj = ts instanceof Date ? ts : new Date(ts)
    if (Number.isNaN(dateObj.getTime())) return
    const diff = Math.floor((dateObj - start) / DAY_MS)
    if (diff >= 0 && diff < 7) {
      buckets[diff] += 1
    }
  })

  return buckets
}

async function getDashboardData(userId) {
  const numericId = Number(userId)
  if (!numericId) {
    return {
      completedWorkouts: 0,
      caloriesLogged: 0,
      weeklyAttendance: [0, 0, 0, 0, 0, 0, 0],
      weights: {
        start: null,
        current: null,
        target: null
      },
      nextWorkout: null,
      upcomingWorkouts: []
    }
  }

  const user = await findUserById(numericId)
  if (!user) {
    return {
      completedWorkouts: 0,
      caloriesLogged: 0,
      weeklyAttendance: [0, 0, 0, 0, 0, 0, 0],
      weights: {
        start: null,
        current: null,
        target: null
      },
      nextWorkout: null,
      upcomingWorkouts: []
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = formatLocalDate(today)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - 6)
  const dayStart = new Date(today)
  const dayEnd = new Date(today)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const [
    weeklyWorkouts,
    todayNutritionAggregate,
    latestTracking,
    earliestTracking,
    weeklyAttendance,
    upcomingWorkouts,
    workoutPlan,
    todayAttendance
  ] = await Promise.all([
    prisma.attendance.count({
      where: {
        user_id: numericId,
        created_at: {
          gte: weekStart
        }
      }
    }),
    prisma.nutrition.aggregate({
      where: {
        user_id: numericId,
        date: todayStr
      },
      _sum: { calories: true, protein: true }
    }),
    prisma.tracking.findFirst({
      where: { user_id: numericId },
      orderBy: { date: 'desc' }
    }),
    prisma.tracking.findFirst({
      where: { user_id: numericId },
      orderBy: { date: 'asc' }
    }),
    getWeeklyAttendanceSeries(numericId, weekStart),
    getUpcomingWorkouts(numericId, { limit: 5, user }),
    getWorkoutPlan(numericId),
    prisma.attendance.findFirst({
      where: {
        user_id: numericId,
        created_at: {
          gte: dayStart,
          lt: dayEnd
        }
      },
      select: { id: true }
    })
  ])

  const weights = {
    start: earliestTracking?.weight ?? null,
    current: latestTracking?.weight ?? null,
    target: user.goal_weight ?? null
  }

  const todayNutrition = {
    calories: todayNutritionAggregate?._sum?.calories ?? 0,
    protein: todayNutritionAggregate?._sum?.protein ?? 0
  }

  const todayPlan = workoutPlan.find((entry) => entry.day_of_week === today.getDay()) || null

  return {
    completedWorkouts: weeklyWorkouts,
    weeklyWorkouts,
    todayNutrition,
    caloriesLogged: todayNutrition.calories,
    weeklyAttendance,
    weights,
    goalWeight: user.goal_weight ?? null,
    hasGoalWeight: Boolean(user.goal_weight),
    needsWeightEntry: !latestTracking,
    planToday: todayPlan,
    nextWorkout: upcomingWorkouts[0] || null,
    upcomingWorkouts,
    checkedInToday: Boolean(todayAttendance)
  }
}

async function getClientsSample(trainerId) {
  const where = trainerId
    ? {
        OR: [
          { trainer_id: Number(trainerId) },
          { trainer_id: null }
        ]
      }
    : {}

  return prisma.client.findMany({
    where,
    orderBy: {
      lastActive: 'desc'
    },
    select: {
      id: true,
      name: true,
      lastActive: true
    }
  })
}

async function saveNutritionSample(userId, payload = {}) {
  if (!userId) {
    throw new Error('user_required')
  }
  if (!payload.date) {
    throw new Error('date_required')
  }

  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  await prisma.nutrition.create({
    data: {
      user_id: Number(userId),
      date: payload.date,
      calories: toNumber(payload.calories),
      protein: toNumber(payload.protein),
      fat: toNumber(payload.fat),
      carbs: toNumber(payload.carbs),
      note: payload.note ?? null
    }
  })
}

async function getTrackingHistory(userId) {
  return prisma.tracking.findMany({
    where: { user_id: Number(userId) },
    select: { date: true, weight: true },
    orderBy: { date: 'desc' },
    take: 100
  })
}

async function createTrackingEntry(userId, trackingPayload = {}) {
  const { date, weight = null, body_fat = null } = trackingPayload
  if (!date || typeof weight === 'undefined') {
    throw new Error('date_and_weight_required')
  }

  return prisma.tracking.create({
    data: {
      user_id: Number(userId),
      date,
      weight: weight === null ? null : Number(weight),
      body_fat: body_fat === null ? null : Number(body_fat)
    }
  })
}

async function createAttendanceEntry(payload = {}) {
  return prisma.attendance.create({
    data: {
      user_id: payload.userId ? Number(payload.userId) : null,
      workout_id: payload.workoutId ? Number(payload.workoutId) : null,
      time: payload.time || new Date().toISOString()
    }
  })
}

async function setGoalWeight(userId, goalWeight) {
  if (!userId) {
    throw new Error('user_required')
  }

  const numericId = Number(userId)
  const value =
    goalWeight === null || goalWeight === undefined ? null : Number(goalWeight)

  const updated = await prisma.user.update({
    where: { id: numericId },
    data: {
      goal_weight: value
    }
  })

  return updated
}

async function getWorkoutPlan(userId) {
  const numericId = Number(userId)
  if (!numericId) return []

  return prisma.workoutPlan.findMany({
    where: { user_id: numericId },
    orderBy: { day_of_week: 'asc' }
  })
}

async function upsertWorkoutPlanEntry(userId, dayOfWeek, title) {
  const numericId = Number(userId)
  if (!numericId) throw new Error('user_required')

  const day = Number(dayOfWeek)
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw new Error('invalid_day')
  }

  if (!title || !title.trim()) {
    throw new Error('title_required')
  }

  return prisma.workoutPlan.upsert({
    where: {
      user_id_day_of_week: {
        user_id: numericId,
        day_of_week: day
      }
    },
    update: { title: title.trim() },
    create: {
      user_id: numericId,
      day_of_week: day,
      title: title.trim()
    }
  })
}

function computeWeightDelta(current, goal) {
  if (current === null || current === undefined || goal === null || goal === undefined) {
    return null
  }
  return Number((current - goal).toFixed(1))
}

async function buildClientSnapshot(user) {
  const dashboard = await getDashboardData(user.id)
  const todayNutrition = dashboard?.todayNutrition || { calories: 0, protein: 0 }
  const status = analyzeNutritionStatus(
    todayNutrition.calories,
    user.daily_calorie_target,
    todayNutrition.protein,
    user.daily_protein_target
  )
  const lastAttendance = await prisma.attendance.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
    select: { created_at: true }
  })

  return {
    id: user.id,
    name: formatUserName(user),
    avatar: user.photo_url,
    weeklyWorkouts: dashboard?.weeklyWorkouts ?? 0,
    todayNutrition: {
      calories: todayNutrition.calories ?? 0,
      protein: todayNutrition.protein ?? 0,
      calorieTarget: user.daily_calorie_target ?? null,
      proteinTarget: user.daily_protein_target ?? null,
      status
    },
    weight: {
      current: dashboard?.weights?.current ?? null,
      goal: user.goal_weight ?? dashboard?.weights?.target ?? null,
      delta: computeWeightDelta(dashboard?.weights?.current, user.goal_weight ?? dashboard?.weights?.target)
    },
    goal: {
      weight: user.goal_weight ?? null,
      date: user.goal_date ?? null
    },
    planToday: dashboard?.planToday || null,
    lastActive: lastAttendance?.created_at || user.created_at,
    checkedInToday: dashboard?.checkedInToday ?? false
  }
}

async function assertTrainerAccess(trainerId, clientId) {
  const trainer = await ensureTrainerUser(trainerId)
  const client = await findUserById(clientId)
  if (!client || client.role !== 'user') {
    const err = new Error('client_not_found')
    err.code = 'CLIENT_NOT_FOUND'
    throw err
  }
  if (client.trainer_id && client.trainer_id !== trainer.id) {
    const err = new Error('forbidden')
    err.code = 'FORBIDDEN'
    throw err
  }
  return client
}

async function getTrainerClientsSnapshots(trainerId) {
  await ensureTrainerUser(trainerId)
  const users = await getTrainerClientUsers(trainerId)
  if (!users.length) return []
  return Promise.all(users.map((user) => buildClientSnapshot(user)))
}

async function getClientNutritionEntries(userId, { date, limit = 20 } = {}) {
  const where = { user_id: Number(userId) }
  if (date) where.date = date
  return prisma.nutrition.findMany({
    where,
    orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    take: limit,
    select: {
      id: true,
      date: true,
      calories: true,
      protein: true,
      fat: true,
      carbs: true,
      note: true,
      created_at: true
    }
  })
}

async function getTrainerClientProfile(trainerId, clientId) {
  const client = await assertTrainerAccess(trainerId, clientId)
  const dashboard = await getDashboardData(client.id)
  const todayStr = formatLocalDate(new Date())
  const todayEntries = await getClientNutritionEntries(client.id, { date: todayStr })
  const historyEntries = await getClientNutritionEntries(client.id, { limit: 30 })
  const trackingHistory = await getTrackingHistory(client.id)
  const plan = await getWorkoutPlan(client.id)

  return {
    client: {
      id: client.id,
      name: formatUserName(client),
      avatar: client.photo_url,
      goalWeight: client.goal_weight,
      goalDate: client.goal_date,
      goalProgress: {
        start: dashboard?.weights?.start ?? null,
        current: dashboard?.weights?.current ?? null,
        target: client.goal_weight ?? dashboard?.weights?.target ?? null
      }
    },
    nutrition: {
      todayTotals: dashboard?.todayNutrition || { calories: 0, protein: 0 },
      targets: {
        calories: client.daily_calorie_target ?? null,
        protein: client.daily_protein_target ?? null,
        carbs: client.daily_carb_target ?? null,
        fat: client.daily_fat_target ?? null
      },
      todayEntries,
      recentEntries: historyEntries
    },
    training: {
      planToday: dashboard?.planToday || null,
      plan,
      weeklyAttendance: dashboard?.weeklyAttendance || [],
      upcoming: dashboard?.upcomingWorkouts || [],
      completedThisWeek: dashboard?.weeklyWorkouts ?? 0,
      checkedInToday: dashboard?.checkedInToday ?? false
    },
    weight: {
      history: trackingHistory || [],
      start: dashboard?.weights?.start ?? null,
      current: dashboard?.weights?.current ?? null,
      target: client.goal_weight ?? dashboard?.weights?.target ?? null
    }
  }
}

async function getTrainerHomeSummary(trainerId) {
  const trainer = await ensureTrainerUser(trainerId)
  const clients = await getTrainerClientUsers(trainer.id)
  if (!clients.length) {
    return {
      trainer: {
        id: trainer.id,
        name: formatUserName(trainer),
        avatar: trainer.photo_url
      },
      totals: {
        clients: 0,
        activeToday: 0,
        workoutsThisWeek: 0
      },
      spotlight: [],
      alerts: []
    }
  }
  const spotlightCandidates = clients.slice(0, 3)
  const spotlight = await Promise.all(spotlightCandidates.map((user) => buildClientSnapshot(user)))
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const activeToday = await prisma.attendance.count({
    where: {
      user_id: { in: clients.map((c) => c.id) },
      created_at: {
        gte: todayStart,
        lt: tomorrow
      }
    }
  })

  const workoutsThisWeek = spotlight.reduce((acc, snap) => acc + (snap.weeklyWorkouts || 0), 0)

  return {
    trainer: {
      id: trainer.id,
      name: formatUserName(trainer),
      avatar: trainer.photo_url
    },
    totals: {
      clients: clients.length,
      activeToday,
      workoutsThisWeek
    },
    spotlight,
    alerts: []
  }
}

async function getTrainerMonitoringSummary(trainerId, options = {}) {
  const { rangeDays = 30 } = options
  const trainer = await ensureTrainerUser(trainerId)
  const clients = await getTrainerClientUsers(trainer.id)
  if (!clients.length) {
    return {
      workoutsByWeekday: Array(7).fill(0),
      calorieAdherence: 0,
      weightDynamics: [],
      ranking: []
    }
  }
  const clientIds = clients.map((c) => c.id)
  const since = new Date()
  since.setDate(since.getDate() - (rangeDays - 1))
  since.setHours(0, 0, 0, 0)

  const [attendanceRows, nutritionRows, trackingRows] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        user_id: { in: clientIds },
        created_at: { gte: since }
      },
      select: { user_id: true, created_at: true }
    }),
    prisma.nutrition.findMany({
      where: {
        user_id: { in: clientIds },
        date: { gte: formatLocalDate(since) }
      },
      select: { user_id: true, date: true, calories: true, protein: true }
    }),
    prisma.tracking.findMany({
      where: { user_id: { in: clientIds } },
      orderBy: [{ user_id: 'asc' }, { date: 'asc' }],
      select: { user_id: true, date: true, weight: true }
    })
  ])

  const workoutsByWeekday = Array(7).fill(0)
  attendanceRows.forEach((row) => {
    const date = new Date(row.created_at)
    const weekday = date.getDay()
    workoutsByWeekday[weekday] += 1
  })

  const adherenceMap = new Map()
  nutritionRows.forEach((row) => {
    const key = `${row.user_id}-${row.date}`
    const entry = adherenceMap.get(key) || { calories: 0, protein: 0 }
    entry.calories += row.calories || 0
    entry.protein += row.protein || 0
    adherenceMap.set(key, entry)
  })

  let adherenceHits = 0
  let adherenceTotal = 0
  adherenceMap.forEach((totals, key) => {
    const userId = Number(key.split('-')[0])
    const client = clients.find((c) => c.id === userId)
    if (!client) return
    if (!client.daily_calorie_target && !client.daily_protein_target) return
    adherenceTotal += 1
    const status = analyzeNutritionStatus(
      totals.calories,
      client.daily_calorie_target,
      totals.protein,
      client.daily_protein_target
    )
    if (status === 'within_target') {
      adherenceHits += 1
    }
  })

  const latestWeightMap = new Map()
  trackingRows.forEach((row) => {
    latestWeightMap.set(row.user_id, row)
  })

  const ranking = clients
    .map((client) => {
      const latest = latestWeightMap.get(client.id)
      const currentWeight = latest?.weight ?? null
      const delta = computeWeightDelta(currentWeight, client.goal_weight)
      return {
        id: client.id,
        name: formatUserName(client),
        currentWeight,
        goal: client.goal_weight ?? null,
        delta
      }
    })
    .filter((item) => item.delta !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return {
    workoutsByWeekday,
    calorieAdherence:
      adherenceTotal === 0 ? null : Number(((adherenceHits / adherenceTotal) * 100).toFixed(1)),
    weightDynamics: trackingRows,
    ranking
  }
}

async function listTrainers(filters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1)
  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 50)
  const skip = (page - 1) * limit
  const profileFilters = {}

  if (filters.specialty) {
    profileFilters.specialties = { has: filters.specialty }
  }
  if (filters.language) {
    profileFilters.languages = { has: filters.language }
  }
  if (filters.location) {
    profileFilters.location = { contains: filters.location, mode: 'insensitive' }
  }
  if (filters.minExperience) {
    profileFilters.years_experience = { gte: Number(filters.minExperience) }
  }
  if (filters.minRating) {
    profileFilters.rating_avg = { gte: Number(filters.minRating) }
  }

  const clauses = [
    {
      role: 'trainer',
      trainerProfile: {
        isNot: null
      }
    }
  ]

  if (Object.keys(profileFilters).length > 0) {
    clauses.push({ trainerProfile: profileFilters })
  }

  const search = (filters.search || '').trim()
  if (search) {
    clauses.push({
      OR: [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { trainerProfile: { headline: { contains: search, mode: 'insensitive' } } },
        { trainerProfile: { specialties: { has: search } } }
      ]
    })
  }

  const where = { AND: clauses }

  let orderBy = [{ created_at: 'desc' }]
  const sort = (filters.sort || '').toLowerCase()
  if (sort === 'rating') {
    orderBy = [{ trainerProfile: { rating_avg: 'desc' } }, { trainerProfile: { rating_count: 'desc' } }]
  } else if (sort === 'experience') {
    orderBy = [{ trainerProfile: { years_experience: 'desc' } }]
  } else if (sort === 'price') {
    orderBy = [{ trainerProfile: { price_from: 'asc' } }]
  }

  const [trainers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        first_name: true,
        last_name: true,
        photo_url: true,
        trainerProfile: {
          select: {
            headline: true,
            years_experience: true,
            location: true,
            price_from: true,
            languages: true,
            specialties: true,
            certifications: true,
            rating_avg: true,
            rating_count: true,
            hero_url: true,
            contact_url: true,
            telegram_username: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ])

  const items = trainers.map((trainer) => {
    const profile = trainer.trainerProfile || {}
    return {
      id: trainer.id,
      name: formatUserName(trainer),
      headline: profile.headline || null,
      location: profile.location || null,
      yearsExperience: profile.years_experience ?? null,
      rating: profile.rating_avg ?? null,
      reviewCount: profile.rating_count ?? 0,
      priceFrom: profile.price_from ?? null,
      specialties: profile.specialties || [],
      languages: profile.languages || [],
      certifications: profile.certifications || [],
      heroUrl: profile.hero_url || trainer.photo_url || null,
      avatar: trainer.photo_url || null,
      contactUrl: buildContactUrl(profile, trainer),
      telegramUsername: profile.telegram_username || trainer.username || null
    }
  })

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1)
  }
}

async function upsertTrainerProfile(userId, payload = {}) {
  if (!userId) throw new Error('user_required')

  const arrayOrEmpty = (value) =>
    Array.isArray(value)
      ? value.map((v) => String(v).trim()).filter(Boolean)
      : typeof value === 'string'
        ? value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : []

  const data = {
    headline: payload.headline ?? null,
    bio: payload.bio ?? null,
    years_experience:
      payload.years_experience === undefined || payload.years_experience === null
        ? null
        : Number(payload.years_experience),
    location: payload.location ?? null,
    price_from:
      payload.price_from === undefined || payload.price_from === null ? null : Number(payload.price_from),
    languages: arrayOrEmpty(payload.languages),
    specialties: arrayOrEmpty(payload.specialties),
    certifications: arrayOrEmpty(payload.certifications),
    hero_url: payload.hero_url ?? null,
    contact_url: payload.contact_url ?? null,
    telegram_username: payload.telegram_username ?? null
  }

  return prisma.trainerProfile.upsert({
    where: { user_id: Number(userId) },
    update: data,
    create: {
      user_id: Number(userId),
      ...data
    }
  })
}

async function getTrainerProfileForUser(userId) {
  if (!userId) return null
  const trainer = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: { trainerProfile: true }
  })
  if (!trainer || !trainer.trainerProfile) return null
  const profile = trainer.trainerProfile
  return {
    id: trainer.id,
    name: formatUserName(trainer),
    headline: profile.headline || null,
    bio: profile.bio || null,
    location: profile.location || null,
    years_experience: profile.years_experience ?? null,
    price_from: profile.price_from ?? null,
    languages: profile.languages || [],
    specialties: profile.specialties || [],
    certifications: profile.certifications || [],
    hero_url: profile.hero_url || null,
    contact_url: profile.contact_url || null,
    telegram_username: profile.telegram_username || trainer.username || null
  }
}

async function getTrainerPublicProfile(trainerId) {
  const numericId = Number(trainerId)
  if (!numericId) return null

  const trainer = await prisma.user.findFirst({
    where: {
      id: numericId,
      role: 'trainer',
      trainerProfile: { isNot: null }
    },
    select: {
      id: true,
      username: true,
      first_name: true,
      last_name: true,
      photo_url: true,
      trainerProfile: true,
      trainerReviews: {
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          user: {
            select: {
              first_name: true,
              last_name: true,
              username: true,
              photo_url: true
            }
          }
        }
      }
    }
  })

  if (!trainer || !trainer.trainerProfile) return null
  const profile = trainer.trainerProfile

  return {
    id: trainer.id,
    name: formatUserName(trainer),
    headline: profile.headline || null,
    bio: profile.bio || null,
    location: profile.location || null,
    yearsExperience: profile.years_experience ?? null,
    rating: profile.rating_avg ?? null,
    reviewCount: profile.rating_count ?? 0,
    priceFrom: profile.price_from ?? null,
    specialties: profile.specialties || [],
    languages: profile.languages || [],
    certifications: profile.certifications || [],
    heroUrl: profile.hero_url || trainer.photo_url || null,
    avatar: trainer.photo_url || null,
    contactUrl: buildContactUrl(profile, trainer),
    telegramUsername: profile.telegram_username || trainer.username || null,
    reviews: (trainer.trainerReviews || []).map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      author: row.user
        ? {
            name: formatUserName(row.user),
            avatar: row.user.photo_url || null
          }
        : null
    }))
  }
}

async function setClientNutritionTargets(clientId, targets = {}) {
  if (!clientId) throw new Error('client_required')
  const data = {}
  const numericFields = ['daily_calorie_target', 'daily_protein_target', 'daily_carb_target', 'daily_fat_target', 'goal_weight']
  numericFields.forEach((key) => {
    if (targets[key] !== undefined) {
      const value = targets[key]
      data[key] = value === null || value === '' ? null : Number(value)
    }
  })
  if (targets.goal_date !== undefined) {
    data.goal_date = targets.goal_date ? new Date(targets.goal_date) : null
  }
  return prisma.user.update({
    where: { id: Number(clientId) },
    data
  })
}

async function bulkUpsertWorkoutPlanEntriesForClient(clientId, entries = []) {
  if (!clientId) throw new Error('client_required')
  const numericId = Number(clientId)
  const daysProvided = []
  for (const entry of entries) {
    if (entry.day === undefined || entry.title === undefined) continue
    const dayNumber = Number(entry.day)
    if (!Number.isInteger(dayNumber) || dayNumber < 0 || dayNumber > 6) continue
    daysProvided.push(dayNumber)
    await prisma.workoutPlan.upsert({
      where: {
        user_id_day_of_week: {
          user_id: numericId,
          day_of_week: dayNumber
        }
      },
      update: { title: entry.title.trim() },
      create: {
        user_id: numericId,
        day_of_week: dayNumber,
        title: entry.title.trim()
      }
    })
  }
  if (daysProvided.length > 0) {
    await prisma.workoutPlan.deleteMany({
      where: {
        user_id: numericId,
        day_of_week: { notIn: daysProvided }
      }
    })
  }
  return getWorkoutPlan(numericId)
}

async function addTrainerNutritionEntry(clientId, payload = {}) {
  return saveNutritionSample(clientId, payload)
}

async function markTrainerAttendance(clientId, payload = {}) {
  return createAttendanceEntry({
    userId: clientId,
    workoutId: payload.workoutId,
    time: payload.time
  })
}

// ===== Admin Functions =====

async function findUserByEmail(email) {
  if (!email) return null
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })
}

async function createAdmin(payload = {}) {
  if (!payload.email || !payload.password) {
    throw new Error('email_and_password_required')
  }
  
  const data = {
    email: payload.email.toLowerCase(),
    password: payload.password, // Should be hashed before calling this
    first_name: payload.first_name || null,
    last_name: payload.last_name || null,
    role: 'admin'
  }

  return prisma.user.create({ data })
}

async function getAllUsers(filters = {}) {
  const where = {}
  
  if (filters.role) {
    where.role = filters.role
  }
  
  if (filters.search) {
    where.OR = [
      { first_name: { contains: filters.search, mode: 'insensitive' } },
      { last_name: { contains: filters.search, mode: 'insensitive' } },
      { username: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } }
    ]
  }

  const page = Math.max(0, Number(filters.page) || 0)
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20))
  const skip = page * limit

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        trainerProfile: true,
        _count: {
          select: {
            clients: true,
            nutrition: true,
            tracking: true
          }
        }
      }
    }),
    prisma.user.count({ where })
  ])

  return {
    users: users.map(u => ({
      id: u.id,
      telegram_id: u.telegram_id,
      email: u.email,
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      photo_url: u.photo_url,
      role: u.role,
      created_at: u.created_at,
      hasTrainerProfile: !!u.trainerProfile,
      stats: {
        clientCount: u._count.clients || 0,
        nutritionEntries: u._count.nutrition || 0,
        trackingEntries: u._count.tracking || 0
      }
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

async function updateUserRole(userId, newRole) {
  if (!userId || !newRole) {
    throw new Error('user_id_and_role_required')
  }
  
  if (!['user', 'trainer', 'admin'].includes(newRole)) {
    throw new Error('invalid_role')
  }

  return prisma.user.update({
    where: { id: Number(userId) },
    data: { role: newRole }
  })
}

async function deleteUser(userId) {
  if (!userId) throw new Error('user_id_required')
  
  const numericId = Number(userId)
  
  // Delete related records first
  await prisma.$transaction([
    prisma.attendance.deleteMany({ where: { user_id: numericId } }),
    prisma.tracking.deleteMany({ where: { user_id: numericId } }),
    prisma.nutrition.deleteMany({ where: { user_id: numericId } }),
    prisma.workoutPlan.deleteMany({ where: { user_id: numericId } }),
    prisma.trainerReview.deleteMany({ where: { user_id: numericId } }),
    prisma.trainerReview.deleteMany({ where: { trainer_id: numericId } }),
    prisma.trainerProfile.deleteMany({ where: { user_id: numericId } }),
    prisma.workout.deleteMany({ where: { trainer_id: numericId } }),
    prisma.client.deleteMany({ where: { trainer_id: numericId } }),
    prisma.user.delete({ where: { id: numericId } })
  ])
  
  return { success: true }
}

async function getPlatformStats() {
  const [
    totalUsers,
    totalTrainers,
    totalAdmins,
    recentUsers,
    totalNutritionEntries,
    totalTrackingEntries,
    totalWorkouts
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'user' } }),
    prisma.user.count({ where: { role: 'trainer' } }),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count({
      where: {
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    prisma.nutrition.count(),
    prisma.tracking.count(),
    prisma.workout.count()
  ])

  return {
    users: {
      total: totalUsers,
      trainers: totalTrainers,
      admins: totalAdmins,
      recentSignups: recentUsers
    },
    activity: {
      nutritionEntries: totalNutritionEntries,
      trackingEntries: totalTrackingEntries,
      workouts: totalWorkouts
    }
  }
}

async function getPendingTrainerApprovals() {
  // Get users with trainer profile but still have 'user' role
  const pendingTrainers = await prisma.user.findMany({
    where: {
      role: 'user',
      trainerProfile: {
        isNot: null
      }
    },
    include: {
      trainerProfile: true
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  return pendingTrainers.map(u => ({
    id: u.id,
    name: formatUserName(u),
    username: u.username,
    photo_url: u.photo_url,
    email: u.email,
    telegram_id: u.telegram_id,
    created_at: u.created_at,
    profile: u.trainerProfile ? {
      headline: u.trainerProfile.headline,
      bio: u.trainerProfile.bio,
      years_experience: u.trainerProfile.years_experience,
      location: u.trainerProfile.location,
      specialties: u.trainerProfile.specialties,
      certifications: u.trainerProfile.certifications,
      hero_url: u.trainerProfile.hero_url
    } : null
  }))
}

async function logAdminAction(adminId, action, targetId, targetType, details, ipAddress) {
  return prisma.auditLog.create({
    data: {
      admin_id: Number(adminId),
      action,
      target_id: targetId ? Number(targetId) : null,
      target_type: targetType || null,
      details: details || null,
      ip_address: ipAddress || null
    }
  })
}

async function getAuditLogs(filters = {}) {
  const where = {}
  
  if (filters.adminId) {
    where.admin_id = Number(filters.adminId)
  }
  
  if (filters.action) {
    where.action = { contains: filters.action, mode: 'insensitive' }
  }

  const page = Math.max(0, Number(filters.page) || 0)
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50))
  const skip = page * limit

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            username: true
          }
        }
      }
    }),
    prisma.auditLog.count({ where })
  ])

  return {
    logs: logs.map(log => ({
      id: log.id,
      action: log.action,
      target_id: log.target_id,
      target_type: log.target_type,
      details: log.details,
      ip_address: log.ip_address,
      created_at: log.created_at,
      admin: log.admin ? {
        id: log.admin.id,
        name: formatUserName(log.admin),
        email: log.admin.email
      } : null
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

module.exports = {
  prisma,
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
}