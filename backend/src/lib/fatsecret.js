const fetch = require('node-fetch')
const {
  FATSECRET_CLIENT_ID,
  FATSECRET_CLIENT_SECRET
} = require('../config')

const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token'
const API_BASE = 'https://platform.fatsecret.com/rest/server.api'

const tokenCache = {
  accessToken: null,
  expiresAt: 0
}

function ensureFatSecretCredentials() {
  if (!FATSECRET_CLIENT_ID || !FATSECRET_CLIENT_SECRET) {
    throw new Error('fatsecret_credentials_missing')
  }
}

async function fetchAccessToken() {
  ensureFatSecretCredentials()

  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 10000) {
    return tokenCache.accessToken
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'basic'
  })

  const auth = Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64')

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`fatsecret_token_failed:${errorBody}`)
  }

  const payload = await response.json()
  tokenCache.accessToken = payload.access_token
  tokenCache.expiresAt = Date.now() + (payload.expires_in - 30) * 1000

  return tokenCache.accessToken
}

async function fatsecretRequest(method, params = {}) {
  const token = await fetchAccessToken()
  const url = new URL(API_BASE)
  const mergedParams = new URLSearchParams({
    method,
    format: 'json',
    v: '2',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v ?? '']))
  })
  url.search = mergedParams.toString()

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await response.json()

  if (!response.ok || data.error || data.errors) {
    const description = data.error?.message || data.errors?.error?.message || response.statusText
    throw new Error(`fatsecret_request_failed:${description}`)
  }

  return data
}

function toArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function parseNumber(value) {
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

async function autocompleteFoods(searchExpression, maxResults = 10) {
  const data = await fatsecretRequest('foods.autocomplete', {
    search_expression: searchExpression,
    max_results: String(maxResults)
  })

  const foods = toArray(
    data?.foods?.food ||
      data?.suggestions?.suggestion ||
      data?.results?.result
  )

  return foods
    .map((item) => ({
      id: item?.food_id || item?.id || item?.food_id_ext,
      name: item?.food_name || item?.value || item?.name
    }))
    .filter((item) => item.id && item.name)
}

async function searchFoods(searchExpression, page = 0, maxResults = 20) {
  const data = await fatsecretRequest('foods.search', {
    search_expression: searchExpression,
    max_results: String(maxResults),
    page_number: String(page)
  })

  const foods = toArray(data?.foods?.food)

  return foods.map((food) => ({
    id: food?.food_id,
    name: food?.food_name,
    brand: food?.brand_name || null,
    description: food?.food_description || '',
    calories: parseNumber(food?.food_type === 'Brand' ? food?.servings?.serving?.calories : food?.calories),
    type: food?.food_type
  })).filter((item) => item.id)
}

async function getFoodById(foodId) {
  const data = await fatsecretRequest('food.get', { food_id: String(foodId) })
  const food = data?.food
  if (!food) {
    throw new Error('fatsecret_food_not_found')
  }

  const servings = toArray(food?.servings?.serving).map((serving) => ({
    id: serving?.serving_id,
    description: serving?.serving_description || serving?.serving_url || serving?.measurement_description,
    metricAmount: parseNumber(serving?.metric_serving_amount),
    metricUnit: serving?.metric_serving_unit || '',
    numberOfUnits: parseNumber(serving?.number_of_units || serving?.serving_size || 1),
    measurementDescription: serving?.measurement_description || '',
    calories: parseNumber(serving?.calories),
    protein: parseNumber(serving?.protein),
    fat: parseNumber(serving?.fat),
    carbs: parseNumber(serving?.carbohydrate),
    servingWeightGrams: parseNumber(serving?.serving_weight_grams)
  })).filter((serving) => serving.id && serving.description)

  return {
    id: food.food_id,
    name: food.food_name,
    brand: food.brand_name || null,
    servings
  }
}

module.exports = {
  autocompleteFoods,
  searchFoods,
  getFoodById
}

