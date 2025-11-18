import { retrieveRawInitData } from '@telegram-apps/sdk'

const FALLBACK_ENV_KEY = 'VITE_FAKE_INIT_DATA'

export function getTelegramInitData() {
  try {
    const raw = retrieveRawInitData()
    if (raw && raw.length) {
      return raw
    }
  } catch (err) {
    console.warn('retrieveRawInitData failed', err)
  }

  // fallback to Telegram JS object if SDK is unavailable
  try {
    const tg = window.Telegram && window.Telegram.WebApp
    if (tg) {
      if (typeof tg.ready === 'function') tg.ready()
      if (typeof tg.expand === 'function') tg.expand()
      if (tg.initData && tg.initData.length > 0) {
        return tg.initData
      }
      if (tg.initDataUnsafe) {
        const params = new URLSearchParams()
        Object.entries(tg.initDataUnsafe).forEach(([key, value]) => {
          if (value === undefined || value === null) return
          const normalized =
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          params.append(key, normalized)
        })
        const serialized = params.toString()
        if (serialized) return serialized
      }
    }
  } catch (err) {
    console.warn('Telegram WebApp fallback failed', err)
  }

  try {
    const searchParams = new URLSearchParams(window.location.search)
    const tgParam = searchParams.get('tgWebAppData')
    if (tgParam) return tgParam
  } catch (err) {
    console.warn('tgWebAppData param fallback failed', err)
  }

  const fake = import.meta.env[FALLBACK_ENV_KEY]
  return fake && fake.length ? fake : null
}
