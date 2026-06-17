import axios from 'axios'

const TOKEN_KEY = 'footbath_token'
const USER_KEY = 'footbath_user'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const removeToken = () => localStorage.removeItem(TOKEN_KEY)

export const getCurrentUser = () => {
  const userStr = localStorage.getItem(USER_KEY)
  return userStr ? JSON.parse(userStr) : null
}
export const setCurrentUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user))
export const removeCurrentUser = () => localStorage.removeItem(USER_KEY)

export const clearAuth = () => {
  removeToken()
  removeCurrentUser()
}

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
    if (error.response?.status === 401) {
      clearAuth()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error.response?.data || { success: false, message: error.message })
  }
)

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
}

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
  nextCardNo: () => api.get('/members/next-card-no'),
  analysisSummary: () => api.get('/members/analysis/summary'),
  analysisLevelDistribution: () => api.get('/members/analysis/level-distribution'),
  analysisTrend: (params) => api.get('/members/analysis/trend', { params }),
  analysisWarnings: (params) => api.get('/members/analysis/warnings', { params }),
  markFollowUp: (id, data) => api.post(`/members/${id}/follow-up`, data),
  batchFollowUp: (data) => api.post('/members/batch/follow-up', data),
  batchSendSms: (data) => api.post('/members/batch/send-sms', data)
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

export const inventoryApi = {
  list: (params) => api.get('/inventory', { params }),
  get: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  remove: (id) => api.delete(`/inventory/${id}`),
  categories: () => api.get('/inventory/categories'),
  summary: (params) => api.get('/inventory/summary', { params }),
  stockIn: (data) => api.post('/inventory/stock-in', data),
  stockOut: (data) => api.post('/inventory/stock-out', data),
  records: (itemId, params) => api.get(`/inventory/${itemId}/records`, { params })
}

export const dashboardApi = {
  summary: (params) => api.get('/dashboard/summary', { params }),
  trend: (days) => api.get('/dashboard/trend', { params: { days } })
}

export const employeePerformanceApi = {
  summary: (params) => api.get('/employee-performance/summary', { params }),
  ranking: (params) => api.get('/employee-performance/ranking', { params }),
  detail: (id) => api.get(`/employee-performance/${id}/detail`),
  exportCsv: (params) => api.get('/employee-performance/export/csv', {
    params,
    responseType: 'blob'
  })
}

export default api
