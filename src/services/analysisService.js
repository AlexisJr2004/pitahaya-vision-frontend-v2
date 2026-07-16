import createHttpClient from './httpClient'

const API = createHttpClient('/api/v2/analysis')

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

export async function getWeather(lat, lon, days) {
  const res = await API.get('/weather/', { params: { lat, lon, ...(days ? { days } : {}) } })
  return res.data
}
