import axios from 'axios'

const API = axios.create({ baseURL: '/api/v2/auth' })

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Token ${token}`
  return config
})

export async function getCustomers(params = {}) {
  const res = await API.get('/customers/', { params })
  return res.data
}

export async function toggleCustomerActive(id) {
  const res = await API.post(`/customers/${id}/toggle_active/`)
  return res.data
}

export async function setCustomerRole(id, role) {
  const res = await API.post(`/customers/${id}/set_role/`, { role })
  return res.data
}
