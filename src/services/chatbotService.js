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

export async function updateFarm(id, data) {
  const res = await API.patch(`/farms/${id}/`, data)
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

export async function updatePlot(id, data) {
  const res = await API.patch(`/plots/${id}/`, data)
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

// ─── Contexts ───
export async function createContext(data) {
  const res = await API.post('/contexts/', data)
  return res.data
}
export async function updateContext(id, data) {
  const res = await API.patch(`/contexts/${id}/`, data)
  return res.data
}
export async function updateConversation(id, data) {
  const res = await API.patch(`/conversations/${id}/`, data)
  return res.data
}

// ─── Plant Histories ───
export async function getPlantHistories(params = {}) {
  const res = await API.get('/plant-histories/', { params })
  return res.data
}

export async function createPlantHistory(data) {
  const res = await API.post('/plant-histories/', data)
  return res.data
}

export async function updatePlantHistory(id, data) {
  const res = await API.patch(`/plant-histories/${id}/`, data)
  return res.data
}

// ─── Contexts (read) ───
export async function getContexts() {
  const res = await API.get('/contexts/')
  return res.data
}

// ─── AI Chatbot ───
export async function askChatbot({ message, conversation_id, max_length = 1024, no_rag = false }) {
  const res = await API.post('/chat/', { message, conversation_id, max_length, no_rag })
  return res.data
}

export async function askChatbotStream({ message, conversation_id, max_length = 250, no_rag = false, onToken }) {
  const authToken = localStorage.getItem('auth_token')
  const response = await fetch('/api/v2/chatbot/chat/stream/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${authToken}`,
    },
    body: JSON.stringify({ message, conversation_id, max_length, no_rag }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue
        try {
          const parsed = JSON.parse(raw)
          if (parsed.done) return fullText
          if (parsed.token) {
            fullText += parsed.token
            onToken && onToken(fullText)
          }
        } catch { /* chunk parcial */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
  return fullText
}

export async function getSuggestions({ bot_response }) {
  const res = await API.post('/suggest/', { bot_response })
  return res.data
}

