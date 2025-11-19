const required = (key) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`)
  }
  return value
}

module.exports = {
  BOT_TOKEN: required('BOT_TOKEN'),
  JWT_SECRET: required('JWT_SECRET'),
  FATSECRET_CLIENT_ID: required('FATSECRET_CLIENT_ID'),
  FATSECRET_CLIENT_SECRET: required('FATSECRET_CLIENT_SECRET')
}

