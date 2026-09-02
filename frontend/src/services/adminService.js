import apiClient from '../config/apiClient';

// ─── Admin API Client Helper ───────────────────────────────────────────────────
// All admin calls attach the admin-specific token (stored separately from staff token)
const adminRequest = async (method, url, data = null, options = {}) => {
  const token = localStorage.getItem('adminAccessToken');
  const config = {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...options
  };
  try {
    const response = method === 'get'
      ? await apiClient[method](url, config)
      : await apiClient[method](url, data, config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Admin API error [${method.toUpperCase()} ${url}]:`, error);
    return {
      success: false,
      message: error.response?.data?.detail || error.message || 'Request failed',
      status: error.response?.status,
    };
  }
};

export const adminService = {
  // ─── Auth ──────────────────────────────────────────────────────────────────

  /**
   * Initiate admin OTP login
   */
  async loginInitiate(adminId) {
    try {
      const response = await apiClient.post('/api/v1/auth/login-initiate', {
        user_id: adminId,
      });
      localStorage.setItem('adminEmployeeId', adminId);
      return { success: true, data: response.data, message: response.data.message || 'OTP sent' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Admin ID not recognized or failed to send OTP',
      };
    }
  },

  /**
   * Verify admin OTP — only allows master_admin role
   */
  async verifyOtp(otpCode) {
    const adminId = localStorage.getItem('adminEmployeeId');
    if (!adminId) return { success: false, message: 'Session expired. Please try again.' };

    try {
      const params = new URLSearchParams();
      params.append('username', adminId);
      params.append('password', otpCode);

      const response = await apiClient.post('/api/v1/auth/verify-otp', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, refresh_token, role, full_name } = response.data;

      // Enforce master_admin only
      if (role !== 'master_admin') {
        return {
          success: false,
          message: `Access denied. This portal is for Master Admins only. Your role: ${role}`,
        };
      }

      const adminUser = { id: adminId, name: full_name, role };

      // Store in SEPARATE keys from staff auth
      localStorage.setItem('adminAccessToken', access_token);
      localStorage.setItem('adminUser', JSON.stringify(adminUser));
      if (refresh_token) localStorage.setItem('adminRefreshToken', refresh_token);

      return { success: true, data: { token: access_token, admin: adminUser }, message: 'Login successful' };
    } catch (error) {
      return { success: false, message: error.response?.data?.detail || 'Invalid or expired OTP' };
    }
  },

  /**
   * Resend admin OTP
   */
  async resendOtp() {
    const adminId = localStorage.getItem('adminEmployeeId');
    if (!adminId) return { success: false, message: 'Session expired.' };
    return this.loginInitiate(adminId);
  },

  /**
   * Logout admin — only clears admin keys, staff session untouched
   */
  logout() {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminEmployeeId');
  },

  /**
   * Get current admin user
   */
  getCurrentAdmin() {
    try {
      const str = localStorage.getItem('adminUser');
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!(localStorage.getItem('adminAccessToken') && this.getCurrentAdmin());
  },

  // ─── Organizations ─────────────────────────────────────────────────────────

  async listOrganizations() {
    return adminRequest('get', '/api/v1/admin/organizations', null, { params: { include_inactive: true } });
  },

  async getOrganization(id) {
    return adminRequest('get', `/api/v1/admin/organizations/${id}`);
  },

  async createOrganization(data) {
    return adminRequest('post', '/api/v1/admin/organizations', data);
  },

  async updateOrganization(id, data) {
    return adminRequest('patch', `/api/v1/admin/organizations/${id}`, data);
  },

  async setOrganizationStatus(id, status) {
    return adminRequest('patch', `/api/v1/admin/organizations/${id}/status`, { is_active: status });
  },

  // ─── Departments ───────────────────────────────────────────────────────────

  async listDepartments(params = {}) {
    return adminRequest('get', '/api/v1/admin/departments', null, { params: { include_inactive: true, ...params } });
  },

  async getDepartment(id) {
    return adminRequest('get', `/api/v1/admin/departments/${id}`);
  },

  async createDepartment(data) {
    return adminRequest('post', '/api/v1/admin/departments', data);
  },

  async updateDepartment(id, data) {
    return adminRequest('patch', `/api/v1/admin/departments/${id}`, data);
  },

  async setDepartmentStatus(id, status) {
    return adminRequest('patch', `/api/v1/admin/departments/${id}/status`, { is_active: status });
  },

  // ─── Wards ─────────────────────────────────────────────────────────────────

  async listWards(params = {}) {
    return adminRequest('get', '/api/v1/admin/wards', null, { params: { include_inactive: true, ...params } });
  },

  async getWard(id) {
    return adminRequest('get', `/api/v1/admin/wards/${id}`);
  },

  async createWard(data) {
    return adminRequest('post', '/api/v1/admin/wards', data);
  },

  async updateWard(id, data) {
    return adminRequest('patch', `/api/v1/admin/wards/${id}`, data);
  },

  async setWardStatus(id, status) {
    return adminRequest('patch', `/api/v1/admin/wards/${id}/status`, { is_active: status });
  },

  // ─── Beds ──────────────────────────────────────────────────────────────────

  async listBeds(params = {}) {
    return adminRequest('get', '/api/v1/admin/beds', null, { params: { include_inactive: true, ...params } });
  },

  async createBed(data) {
    return adminRequest('post', '/api/v1/admin/beds', data);
  },

  async createBedsBatch(data) {
    return adminRequest('post', '/api/v1/admin/beds/batch', data);
  },

  async updateBed(id, data) {
    return adminRequest('patch', `/api/v1/admin/beds/${id}`, data);
  },

  async setBedStatus(id, status) {
    return adminRequest('patch', `/api/v1/admin/beds/${id}/status`, { is_active: status });
  },

  // ─── Rooms ─────────────────────────────────────────────────────────────────

  async listRooms(params = {}) {
    return adminRequest('get', '/api/v1/admin/rooms', null, { params: { include_inactive: true, ...params } });
  },

  async createRoom(data) {
    return adminRequest('post', '/api/v1/admin/rooms', data);
  },

  async updateRoom(id, data) {
    return adminRequest('patch', `/api/v1/admin/rooms/${id}`, data);
  },

  async setRoomStatus(id, status) {
    return adminRequest('patch', `/api/v1/admin/rooms/${id}/status`, { is_active: status });
  },

  // ─── Stations ──────────────────────────────────────────────────────────────

  async listStations(params = {}) {
    return adminRequest('get', '/api/v1/admin/stations', null, { params: { include_inactive: true, ...params } });
  },

  async createStation(data) {
    return adminRequest('post', '/api/v1/admin/stations', data);
  },

  async updateStation(id, data) {
    return adminRequest('patch', `/api/v1/admin/stations/${id}`, data);
  },

  async setStationStatus(id, status) {
    return adminRequest('patch', `/api/v1/admin/stations/${id}/status`, { is_active: status });
  },

  // ─── Doctors ───────────────────────────────────────────────────────────────

  async listDoctors(params = {}) {
    return adminRequest('get', '/api/v1/admin/doctors', null, { params: { include_inactive: true, ...params } });
  },

  async getDoctor(id) {
    return adminRequest('get', `/api/v1/admin/doctors/${id}`);
  },

  async createDoctor(data) {
    return adminRequest('post', '/api/v1/admin/doctors', data);
  },

  async updateDoctor(id, data) {
    return adminRequest('patch', `/api/v1/admin/doctors/${id}`, data);
  },

  async setDoctorStatus(id, status) {
    return adminRequest('patch', `/api/v1/admin/doctors/${id}/status`, { is_active: status });
  },

  // ─── Nurses ────────────────────────────────────────────────────────────────

  async listNurses(params = {}) {
    return adminRequest('get', '/api/v1/admin/nurses', null, { params: { include_inactive: true, ...params } });
  },

  async getNurse(id) {
    return adminRequest('get', `/api/v1/admin/nurses/${id}`);
  },

  async createNurse(data) {
    return adminRequest('post', '/api/v1/admin/nurses', data);
  },

  async updateNurse(id, data) {
    return adminRequest('patch', `/api/v1/admin/nurses/${id}`, data);
  },

  async setNurseStatus(id, status) {
    return adminRequest('patch', `/api/v1/admin/nurses/${id}/status`, { is_active: status });
  },

  // ─── Generic Entity ────────────────────────────────────────────────────────

  async listEntity(entity) {
    return adminRequest('get', `/api/v1/admin/${entity}`);
  },

  async getEntity(entity, id) {
    return adminRequest('get', `/api/v1/admin/${entity}/${id}`);
  },

  async updateEntity(entity, id, data) {
    return adminRequest('patch', `/api/v1/admin/${entity}/${id}`, data);
  },

  async setEntityStatus(entity, id, status) {
    return adminRequest('patch', `/api/v1/admin/${entity}/${id}/status`, { is_active: status });
  },

  // ─── Logging ───────────────────────────────────────────────────────────────

  async getLoggingStatus() {
    return adminRequest('get', '/api/v1/admin/logging/status');
  },

  async enableLogging() {
    return adminRequest('post', '/api/v1/admin/logging/on');
  },

  async disableLogging() {
    return adminRequest('post', '/api/v1/admin/logging/off');
  },
};
