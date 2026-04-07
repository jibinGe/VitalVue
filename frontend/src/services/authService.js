import apiClient from '../config/apiClient';

export const authService = {
  /**
   * Login - Initiate OTP
   */
  async login(employeeId, staySignedIn = false) {
    try {
      const response = await apiClient.post('/api/v1/auth/login-initiate', {
        user_id: employeeId,
      });

      // Store employeeId for verification step
      localStorage.setItem('employeeId', employeeId);
      // For compatibility with verify.jsx UI
      localStorage.setItem('phoneNumber', "Registered Device"); 
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || "OTP sent to your registered mobile number",
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || "User ID not recognized or failed to send OTP",
      };
    }
  },

  /**
   * Verify OTP
   */
  async verifyOtp(otpCode) {
    const employeeId = localStorage.getItem('employeeId');
    if (!employeeId) {
      return { 
        success: false, 
        message: "Session expired. Please log in again." 
      };
    }

    try {
      // Backend expects OAuth2PasswordRequestForm (form-encoded)
      const params = new URLSearchParams();
      params.append('username', employeeId);
      params.append('password', otpCode);

      const response = await apiClient.post('/api/v1/auth/verify-otp', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, role, full_name } = response.data;

      const user = {
        id: employeeId,
        name: full_name,
        role: role,
      };

      // Store auth state
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Note: Backend also sets an HttpOnly cookie 'access_token'
      // but we store it in localStorage for frontend compatibility.

      return {
        success: true,
        data: {
          token: access_token,
          staff: user
        },
        message: "Login successful",
      };
    } catch (error) {
      console.error('Verify error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || "Invalid or expired OTP",
      };
    }
  },

  /**
   * Resend OTP
   */
  async resendOtp() {
    const employeeId = localStorage.getItem('employeeId');
    if (!employeeId) {
      return { success: false, message: "Session expired. Please log in again." };
    }
    
    return this.login(employeeId);
  },

  /**
   * Refresh access token (Legacy/Placeholder)
   */
  async refreshToken(refreshToken) {
    // Currently backend uses a single token and cookie
    // This can be expanded later if refresh tokens are added.
    return {
      success: true,
      data: {
        token: localStorage.getItem('accessToken'),
        expiresIn: 3600
      },
    };
  },

  /**
   * Check and refresh token if needed
   */
  async checkAndRefreshToken() {
    // Simple check for existence of token
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    
    // We could add JWT expiry decoding here if needed
    return true;
  },

  /**
   * Logout
   */
  async logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');
    localStorage.removeItem('employeeId');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('otpExpiry');
    localStorage.removeItem('sessionId');
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = localStorage.getItem('accessToken');
    const user = this.getCurrentUser();
    return !!(token && user);
  },

  /**
   * Get access token
   */
  getAccessToken() {
    return localStorage.getItem('accessToken');
  },
};
