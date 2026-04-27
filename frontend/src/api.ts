import axios from 'axios'

const API_BASE = 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE,
})

export const downloadUrl = (path: string) => `${API_BASE}/api/download?path=${encodeURIComponent(path)}`
