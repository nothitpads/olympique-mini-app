// helper: validate initData from Telegram WebApp/Login Widget
const crypto = require('crypto')

const IGNORED_KEYS = new Set(['hash', 'signature'])

function buildDataCheckString(dataObj){
  // sort keys lexicographically, skip hash/signature (Telegram does not include them in the HMAC)
  const keys = Object.keys(dataObj).filter(k => !IGNORED_KEYS.has(k)).sort()
  return keys.map(k => `${k}=${dataObj[k]}`).join('\n')
}

function verifyTelegramInitData(initData, botToken){
  if(!initData) return false
  // initData might be a string "a=1&b=2..."; parse to object
  let dataObj = {}
  if(typeof initData === 'string'){
    const pairs = initData.split('&')
    for(const p of pairs){
      if(!p) continue
      const [k, ...rest] = p.split('=')
      if(!k) continue
      const value = rest.length ? rest.join('=') : ''
      dataObj[k] = decodeURIComponent(value)
    }
  } else if(typeof initData === 'object'){
    dataObj = initData
  } else return false

  const hash = dataObj.hash
  if(!hash) return false

  const data_check_string = buildDataCheckString(dataObj)

  // secret_key = SHA256(botToken) (binary)
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  const hmac = crypto.createHmac('sha256', secretKey).update(data_check_string).digest('hex')

  console.log('HMAC:', hmac)
  console.log('HASH:', hash)
  console.log('DATA_CHECK_STRING:', data_check_string)

  // timing-safe compare
  const hmb = Buffer.from(hmac, 'hex')
  const hb  = Buffer.from(hash, 'hex')
  if(hmb.length !== hb.length) return false
  if(!crypto.timingSafeEqual(hmb, hb)) return false

  // check auth_date freshness (seconds)
  const authDate = Number(dataObj.auth_date || 0)
  const now = Math.floor(Date.now() / 1000)
  if(Math.abs(now - authDate) > 60 * 60 * 24) return false // older than 24h - reject (adjust as needed)

  return dataObj // return parsed object for further use
}

module.exports = { verifyTelegramInitData }
