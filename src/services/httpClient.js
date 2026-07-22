import axios from 'axios'

let throttleCount = 0
let throttleResetTimer = null

const THROTTLE_WARN_AT = 3
const CACHE_TTL = 30_000

// Todas las cachés de GET de todos los clientes creados (uno por servicio).
// Se limpian juntas al iniciar/cerrar sesión para que un usuario nunca vea
// datos cacheados de otra cuenta en el mismo navegador.
const allCaches = []

export function clearAllHttpCaches() {
  allCaches.forEach(cache => cache.clear())
}

function resetThrottleCount() {
  throttleCount = 0
}

export function getThrottleCount() {
  return throttleCount
}

function cacheKey(config, token) {
  const method = (config.method || 'get').toUpperCase()
  const url = config.url || ''
  const params = config.params ? JSON.stringify(config.params) : ''
  return `${token || ''}:${method}:${url}:${params}`
}

function createHttpClient(baseURL) {
  const client = axios.create({ baseURL })

  const inflight = new Map()
  const cache = new Map()
  allCaches.push(cache)

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
        clearAllHttpCaches()
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
    const token = localStorage.getItem('auth_token')

    if (!isGET) {
      // Una mutación exitosa invalida toda la caché de lecturas de este
      // cliente, para no devolver listas desactualizadas justo después de
      // crear/editar/borrar algo.
      return originalRequest(config).then(resp => {
        if (resp.status >= 200 && resp.status < 300) cache.clear()
        return resp
      })
    }

    const key = cacheKey(config, token)

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
