import axios from 'axios';

// API Base URL - Kept as placeholder for future backend integration
const API_BASE_URL = 'http://localhost:8000'; // Or any dummy URL

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors removed to clean up API dependencies for the new backend transition

export default apiClient;
