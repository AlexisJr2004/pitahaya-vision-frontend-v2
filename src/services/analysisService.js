import axios from 'axios'

const API = axios.create({
  baseURL: '/api/v2/analysis',
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

export async function uploadImage(formData) {
  const res = await API.post('/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getAnalyses(params = {}) {
  const res = await API.get('/', { params })
  return res.data
}

export async function updateAnalysis(id, data) {
  const res = await API.patch(`/${id}/`, data)
  return res.data
}

export async function deleteAnalysis(id) {
  await API.delete(`/${id}/`)
}

export async function getWeather(lat, lon) {
  const res = await API.get('/weather/', { params: { lat, lon } })
  return res.data
}
