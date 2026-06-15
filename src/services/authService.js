import axios from 'axios'

const API = axios.create({
  baseURL: '/api/v2/auth',
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

export async function confirmEmail(uid, token) {
  const res = await API.post('/email/verify/confirm/', { uid, token })
  return res.data
}

export async function updateProfile(data) {
  const isFormData = data instanceof FormData
  const res = await API.patch('/profile/', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
  })
  return res.data
}

export async function getProfilePreferences() {
  const res = await API.get('/profile/preferences/')
  return res.data
}

export async function updateProfilePreferences(data) {
  const res = await API.patch('/profile/preferences/', data)
  return res.data
}

export async function changePassword(data) {
  const res = await API.post('/password/change/', data)
  return res.data
}

export async function deleteAccount() {
  const res = await API.post('/account/delete/')
  return res.data
}
