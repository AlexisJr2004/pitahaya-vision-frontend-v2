import axios from 'axios'

const API = axios.create({
  baseURL: '/api/v2/auth',
  headers: { 'Content-Type': 'application/json' },
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

export async function login(credentials) {
  const res = await API.post('/login/', credentials)
  return res.data
}

export async function logout() {
  const res = await API.post('/logout/')
  return res.data
}

export async function getProfile() {
  const res = await API.get('/profile/')
  return res.data
}

export async function register(data) {
  const res = await API.post('/registration/', data)
  return res.data
}

export async function requestPasswordReset(email) {
  const res = await API.post('/password/reset/', { email })
  return res.data
}

export async function confirmPasswordReset(data) {
  const res = await API.post('/password/reset/confirm/', data)
  return res.data
}
