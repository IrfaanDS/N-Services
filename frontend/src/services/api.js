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

// ─── Email Sending (Local Mailbox + ReachInbox) ───
export const sendingAPI = {
    getMailbox: (status) => api.get('/campaigns/mailbox', { params: { status } }),
    receiveEmails: (data) => api.post('/campaigns/receive', data),
    sendCampaign: (data) => api.post('/campaigns/send', data),
    toggleCampaign: (id, action) => api.post(`/campaigns/${id}/toggle`, null, { params: { action } }),
    getAccounts: () => api.get('/campaigns/accounts'),
    addAccount: (data) => api.post('/campaigns/accounts', data),
    updateAccount: (id, data) => api.put(`/campaigns/accounts/${id}`, data),
    deleteAccount: (id) => api.delete(`/campaigns/accounts/${id}`),
    getCampaigns: () => api.get('/campaigns/list'),
    testAccount: (id) => api.post(`/campaigns/accounts/${id}/test`),
    addGmailQuick: (data) => api.post('/campaigns/accounts/gmail-quick', data),
}

// ─── Onebox (Email Threads) ───
export const oneboxAPI = {
    // Corrected to use GET with query params consistent with backend update
    list: (params) => api.get('/onebox/list', { params }),
    // Corrected to use GET with path param
    getThread: (id) => api.get(`/onebox/thread/${id}`),
    // Corrected to use POST with path param
    sendReply: (threadId, formData) => api.post(`/onebox/reply/${threadId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    getMessages: (email, params) => api.get(`/onebox/messages/${email}`, { params }),
}

// ─── SEO Assistant (RAG Agent) ───
export const seoAssistantAPI = {
    ask: (data) => api.post('/assistant/ask', data),
    clear: (sessionId) => api.post('/assistant/clear', { session_id: sessionId }),
    health: () => api.get('/assistant/health'),
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
