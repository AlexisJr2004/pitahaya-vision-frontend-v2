import axios from 'axios'

let throttleCount = 0
let throttleResetTimer = null

const THROTTLE_WARN_AT = 3
const CACHE_TTL = 30_000

function resetThrottleCount() {
  throttleCount = 0
}

export function getThrottleCount() {
  return throttleCount
}

function cacheKey(config) {
  const method = (config.method || 'get').toUpperCase()
  const url = config.url || ''
  const params = config.params ? JSON.stringify(config.params) : ''
  return `${method}:${url}:${params}`
}

function createHttpClient(baseURL) {
  const client = axios.create({ baseURL })

  const inflight = new Map()
  const cache = new Map()

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

  const originalRequest = client.request.bind(client)

  client.request = (config) => {
    const isGET = (config.method || 'get').toUpperCase() === 'GET'

    if (!isGET) {
      return originalRequest(config)
    }

    const key = cacheKey(config)

    const cached = cache.get(key)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    }

    const pending = inflight.get(key)
    if (pending) {
      return pending
    }

    const promise = originalRequest(config)
      .then(resp => {
        inflight.delete(key)
        if (resp.status >= 200 && resp.status < 300) {
          cache.set(key, { data: resp.data, ts: Date.now() })
        }
        return resp
      })
      .catch(err => {
        inflight.delete(key)
        throw err
      })

    inflight.set(key, promise)
    return promise
  }

  return client
}

export default createHttpClient
