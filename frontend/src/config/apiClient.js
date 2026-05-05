import axios from 'axios';

// API Base URL - Kept as placeholder for future backend integration
const API_BASE_URL = 'https://vitalvue-api.genesysailabs.com'; // Or any dummy URL

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops if the refresh token endpoint itself returns 401
    if (originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // If the error is 401 Unauthorized and we haven't retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        // Use axios directly or the apiClient. 
        // We use a separate axios call to avoid interceptor issues and ensure withCredentials
        // withCredentials must be true here so the browser sends the
        // HttpOnly refresh_token cookie set by the backend at login.
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {}, {
          withCredentials: true
        });

        // The backend swagger response shows example: "string" or an object. 
        // We handle both possibilities for safety.
        let newAccessToken = null;
        if (typeof response.data === 'string') {
          newAccessToken = response.data;
        } else if (response.data && response.data.access_token) {
          newAccessToken = response.data.access_token;
        }

        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken);
          // Update the failed request's Authorization header
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // Retry the original request
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // Refresh token failed or expired
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        // Dispatch an event to notify AuthContext to log out the user
        window.dispatchEvent(new Event('auth:unauthorized'));
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
