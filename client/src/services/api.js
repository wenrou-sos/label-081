import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error.response?.data || { success: false, message: error.message })
  }
)

export const storesApi = {
  list: () => api.get('/stores'),
  get: (id) => api.get(`/stores/${id}`),
  create: (data) => api.post('/stores', data),
  update: (id, data) => api.put(`/stores/${id}`, data),
  delete: (id) => api.delete(`/stores/${id}`)
}

export const servicesApi = {
  list: () => api.get('/services'),
  get: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`)
}

export const membersApi = {
  list: (params) => api.get('/members', { params }),
  get: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  recharge: (data) => api.post('/members/recharge', data),
  levels: () => api.get('/members/levels'),
  createLevel: (data) => api.post('/members/levels', data),
  updateLevel: (id, data) => api.put(`/members/levels/${id}`, data),
  nextCardNo: () => api.get('/members/next-card-no')
}

export const employeesApi = {
  list: (params) => api.get('/employees', { params }),
  get: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  resign: (id) => api.post(`/employees/${id}/resign`),
  transfer: (id, data) => api.post(`/employees/${id}/transfer`, data)
}

export const ordersApi = {
  list: (params) => api.get('/orders', { params }),
  create: (data) => api.post('/orders', data)
}

export const shiftReportsApi = {
  list: (params) => api.get('/shift-reports', { params }),
  get: (id) => api.get(`/shift-reports/${id}`),
  create: (data) => api.post('/shift-reports', data),
  confirm: (id, data) => api.post(`/shift-reports/${id}/confirm`, data),
  generate: (storeId, date, shiftId) => api.get(`/shift-reports/generate/${storeId}/${date}/${shiftId}`),
  shifts: (storeId) => api.get(`/shift-reports/shifts/${storeId}`)
}

export const dashboardApi = {
  summary: (params) => api.get('/dashboard/summary', { params }),
  trend: (days) => api.get('/dashboard/trend', { params: { days } })
}

export default api
