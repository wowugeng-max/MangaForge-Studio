import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:8787/api',
  timeout: 30000,
})

export default apiClient
