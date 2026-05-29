import api from './axios'

// ── Auth ──────────────────────────────────────────────
export const login = (login_id: string, password: string) =>
  api.post('/auth/login', { login_id, password })

// ── Codes ─────────────────────────────────────────────
export const getCodeGroups = () => api.get('/codes/groups')
export const getCodeGroup = (groupCode: string) => api.get(`/codes/groups/${groupCode}`)
export const createCodeGroup = (data: { group_code: string; group_name: string }) =>
  api.post('/codes/groups', data)
export const createCodeDetail = (groupId: number, data: object) =>
  api.post(`/codes/groups/${groupId}/details`, data)
export const updateCodeDetail = (detailId: number, data: object) =>
  api.put(`/codes/details/${detailId}`, data)
export const deleteCodeDetail = (detailId: number) =>
  api.delete(`/codes/details/${detailId}`)

// ── Users ─────────────────────────────────────────────
export const getUsers = () => api.get('/users')
export const createUser = (data: object) => api.post('/users', data)
export const updateUser = (id: number, data: object) => api.put(`/users/${id}`, data)
export const deleteUser = (id: number) => api.delete(`/users/${id}`)
export const resetPassword = (id: number, newPassword: string) =>
  api.post(`/users/${id}/reset-password`, { new_password: newPassword })

// ── Schedules ─────────────────────────────────────────
export const getMonthlySchedules = (year: number, month: number) =>
  api.get('/schedules/monthly', { params: { year, month } })
export const getDailySchedules = (workDate: string) =>
  api.get('/schedules/daily', { params: { work_date: workDate } })
export const getDailySummary = (workDate: string) =>
  api.get('/schedules/daily/summary', { params: { work_date: workDate } })
export const createSchedule = (data: object) => api.post('/schedules', data)
export const updateSchedule = (id: number, data: object) => api.put(`/schedules/${id}`, data)
export const deleteSchedule = (id: number) => api.delete(`/schedules/${id}`)
export const bulkUpsertSchedules = (data: object[]) => api.post('/schedules/bulk', data)

// ── Holidays ──────────────────────────────────────────
export const getHolidays = (year: number, month?: number) =>
  api.get('/holidays', { params: month ? { year, month } : { year } })
export const createHoliday = (data: object) => api.post('/holidays', data)
export const updateHoliday = (id: number, data: object) => api.put(`/holidays/${id}`, data)
export const deleteHoliday = (id: number) => api.delete(`/holidays/${id}`)
