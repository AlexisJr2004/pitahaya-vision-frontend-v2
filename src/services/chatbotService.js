import axios from 'axios'

const API = axios.create({
  baseURL: '/api/v2/chatbot',
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

// ─── Farms ───
export async function getFarms() {
  const res = await API.get('/farms/')
  return res.data
}

export async function createFarm(data) {
  const res = await API.post('/farms/', data)
  return res.data
}

export async function deleteFarm(id) {
  const res = await API.delete(`/farms/${id}/`)
  return res.data
}

// ─── Plots ───
export async function createPlot(data) {
  const res = await API.post('/plots/', data)
  return res.data
}

export async function deletePlot(id) {
  const res = await API.delete(`/plots/${id}/`)
  return res.data
}

// ─── Conversations ───
export async function getConversations() {
  const res = await API.get('/conversations/')
  return res.data
}

export async function createConversation(data) {
  const res = await API.post('/conversations/', data)
  return res.data
}

export async function deleteConversation(id) {
  const res = await API.delete(`/conversations/${id}/`)
  return res.data
}

export async function getConversation(id) {
  const res = await API.get(`/conversations/${id}/`)
  return res.data
}

// ─── Messages ───
export async function sendMessage(data) {
  const res = await API.post('/messages/', data)
  return res.data
}

// ─── Plant Histories ───
export async function getPlantHistories(params = {}) {
  const res = await API.get('/plant-histories/', { params })
  return res.data
}
