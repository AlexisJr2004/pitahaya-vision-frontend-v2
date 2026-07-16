import axios from 'axios'

let throttleCount = 0
let throttleResetTimer = null

const THROTTLE_WARN_AT = 3

function resetThrottleCount() {
  throttleCount = 0
}

export function getThrottleCount() {
  return throttleCount
}

function createHttpClient(baseURL) {
  const client = axios.create({ baseURL })

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
      if (error.response?.status === 429) {
        throttleCount++
        clearTimeout(throttleResetTimer)
        throttleResetTimer = setTimeout(resetThrottleCount, 60_000)
        if (throttleCount >= THROTTLE_WARN_AT) {
          window.dispatchEvent(new CustomEvent('throttle-warning', {
            detail: { count: throttleCount }
          }))
        }
      }
      return Promise.reject(error)
    }
  )

  return client
}

export default createHttpClient
