import axios from 'axios'

/*
 * Axios client pre-configured to talk to the FastAPI backend.
 * In development, Vite proxies /api/* → localhost:8000 (see vite.config.js).
 * In production, set VITE_API_URL environment variable.
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// ── Request interceptor: attach JWT token ──
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('leadflow_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ── Response interceptor: handle 401 ──
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('leadflow_token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// ─── Lead Acquisition ───
export const leadsAPI = {
    getLeads: (filters) => api.get('/leads', { params: filters }),
    getFilters: () => api.get('/leads/filters'),
    exportCSV: (filters) => api.get('/leads/export', { params: filters, responseType: 'blob' }),
}

// ─── Lead Evaluation ───
export const evaluationAPI = {
    evaluate: (data) => api.post('/evaluate', data),
    uploadCSV: (file) => {
        const formData = new FormData()
        formData.append('file', file)
        return api.post('/evaluate/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
}

// ─── Email Generation ───
export const emailsAPI = {
    generate: (data) => api.post('/emails/generate', data),
}

// ─── Email Sending (ReachInbox) ───
export const sendingAPI = {
    listCampaigns: () => api.get('/campaigns'),
    moveLeads: (data) => api.post('/campaigns/move', data),
    toggleCampaign: (id, action) => api.post(`/campaigns/${id}/toggle`, null, { params: { action } }),
}

// ─── Dashboard ───
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
}

// ─── Auth ───
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (data) => api.post('/auth/register', data),
}

export default api
