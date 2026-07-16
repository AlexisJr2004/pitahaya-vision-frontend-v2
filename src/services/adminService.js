import createHttpClient from './httpClient'

const API = createHttpClient('/api/v2/auth')

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
