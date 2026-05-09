import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:8787/api',
  timeout: 0, // no timeout — LLM agents can take several minutes
})

export default apiClient
