import React, { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250

function getLocalISODate() {
  const now = new Date()
  const offsetMinutes = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offsetMinutes * 60000)
  return local.toISOString().slice(0, 10)
}

function round(value) {
  return Math.round(value * 10) / 10
}

export default function MealBuilder({ onSaved }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [selectedFood, setSelectedFood] = useState(null)
  const [servingId, setServingId] = useState(null)
  const [amount, setAmount] = useState('1')
  const [mealItems, setMealItems] = useState([])
  const [fetchingFood, setFetchingFood] = useState(false)
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      return
    }
    const handle = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const res = await api.get('/fatsecret/autocomplete', {
          params: { q: query.trim(), limit: 15 }
        })
        setSuggestions(res.data || [])
        setShowSuggestions(true)
      } catch (err) {
        console.warn('CLIENT: fatsecret autocomplete failed', err?.response?.data || err.message)
      } finally {
        setLoadingSuggestions(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [query])

  const totals = useMemo(() => {
    return mealItems.reduce(
      (acc, item) => {
        acc.calories += item.calories
        acc.protein += item.protein
        acc.carbs += item.carbs
        acc.fat += item.fat
        return acc
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [mealItems])

  const hasMeal = mealItems.length > 0

  const handleSuggestionSelect = async (suggestion) => {
    const nextQuery = suggestion?.name || suggestion?.value || ''
    if (!nextQuery) return
    setQuery(nextQuery)
    setSuggestions([])
    setShowSuggestions(false)
    await loadFoodDetails(suggestion.id, nextQuery)
  }

  const loadFoodDetails = async (foodId, fallbackQuery) => {
    let resolvedId = foodId
    if (!resolvedId && fallbackQuery) {
      try {
        const res = await api.get('/fatsecret/search', {
          params: { q: fallbackQuery, limit: 1 }
        })
        resolvedId = res.data?.[0]?.id
      } catch (err) {
        console.warn('CLIENT: fatsecret search fallback failed', err?.response?.data || err.message)
      }
    }
    if (!resolvedId) {
      showToast('Не удалось найти продукт', 'error')
      return
    }

    setFetchingFood(true)
    try {
      const res = await api.get(`/fatsecret/food/${resolvedId}`)
      const food = res.data
      if (!food?.servings || food.servings.length === 0) {
        showToast('Нет данных по порциям для продукта', 'error')
        return
      }
      setSelectedFood(food)
      setServingId(food.servings[0]?.id || null)
      setAmount('1')
    } catch (err) {
      console.warn('CLIENT: fatsecret food get failed', err?.response?.data || err.message)
      showToast('Не удалось загрузить продукт', 'error')
    } finally {
      setFetchingFood(false)
    }
  }

  const handleAddItem = () => {
    if (!selectedFood) return
    const serving = selectedFood.servings?.find((s) => s.id === servingId) || selectedFood.servings?.[0]
    if (!serving) return
    const quantity = Number(amount) || 1
    const multiplier = quantity / (serving.numberOfUnits || 1)

    const newItem = {
      key: `${selectedFood.id}-${serving.id}-${Date.now()}`,
      name: selectedFood.name,
      serving: serving.description,
      quantity,
      calories: round(serving.calories * multiplier),
      protein: round(serving.protein * multiplier),
      carbs: round(serving.carbs * multiplier),
      fat: round(serving.fat * multiplier)
    }

    setMealItems((prev) => [...prev, newItem])
    setSelectedFood(null)
    setAmount('1')
    setServingId(null)
    setQuery('')
  }

  const handleRemoveItem = (key) => {
    setMealItems((prev) => prev.filter((item) => item.key !== key))
  }

  const handleSave = async () => {
    if (!hasMeal || saving) return
    setSaving(true)
    try {
      await api.post('/nutrition', {
        date: getLocalISODate(),
        calories: round(totals.calories),
        protein: round(totals.protein),
        carbs: round(totals.carbs),
        fat: round(totals.fat),
        note: `FatSecret: ${mealItems.map((item) => item.name).join(', ')}`
      })
      showToast(`Сохранено: ${round(totals.calories)} ккал • ${round(totals.protein)} г белка`)
      setMealItems([])
      setSelectedFood(null)
      setQuery('')
      setServingId(null)
      setAmount('1')
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
      onSaved && onSaved()
    } catch (err) {
      console.warn('CLIENT: fatsecret meal save failed', err?.response?.data || err.message)
      showToast('Не удалось сохранить приём пищи', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="meal-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Введите продукт..."
          className="w-full p-3 rounded-lg bg-white/80 text-black placeholder-black/60"
          onFocus={() => suggestions.length && setShowSuggestions(true)}
        />
        {loadingSuggestions && <div className="meal-hint">Ищем…</div>}
        {showSuggestions && suggestions.length > 0 && (
          <div className="meal-suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.id || suggestion.name}-${suggestion.name}`}
                type="button"
                className="meal-suggestion-item"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                {suggestion.name || suggestion.value}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedFood && (
        <div className="meal-selected">
          <div className="font-medium mb-2">{selectedFood.name}</div>
          <div className="flex flex-col gap-2">
            <select
              value={servingId || ''}
              onChange={(e) => setServingId(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/80 text-black"
            >
              {selectedFood.servings?.map((serving) => (
                <option key={serving.id} value={serving.id}>
                  {serving.description}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-24 p-3 rounded-lg bg-white/80 text-black placeholder-black/60"
                placeholder="шт"
              />
              <button
                type="button"
                className="btn-main-small flex-1"
                onClick={handleAddItem}
                disabled={fetchingFood}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {mealItems.length > 0 && (
        <div className="meal-list space-y-2">
          {mealItems.map((item) => (
            <div key={item.key} className="meal-list-item">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs small-muted">
                  {item.serving} • {item.quantity} ×
                </div>
                <div className="text-xs mt-1 text-white/80">
                  {item.calories} ккал • Б {item.protein} • Ж {item.fat} • У {item.carbs}
                </div>
              </div>
              <button type="button" className="meal-remove" onClick={() => handleRemoveItem(item.key)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="meal-summary">
        <div>Итого: {round(totals.calories)} ккал</div>
        <div className="text-xs small-muted">
          Б {round(totals.protein)} • Ж {round(totals.fat)} • У {round(totals.carbs)}
        </div>
      </div>

      <button
        type="button"
        className="btn-gradient disabled:opacity-50"
        onClick={handleSave}
        disabled={!hasMeal || saving}
      >
        {saving ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </div>
  )
}

