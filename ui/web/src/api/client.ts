import axios from 'axios'

const baseURL = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api').replace(/\/$/, '')

const apiClient = axios.create({
  baseURL,
  timeout: 0, // no timeout — LLM agents can take several minutes
})

export default apiClient
