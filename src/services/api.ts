import { 
  UserSession, AdminSession, UserRecord, SecurityModule, 
  RuntimePlan, OrderRecord, PaymentSettings, AdminActivityLog, 
  AdminStats, LogEntry 
} from '../types';

const USER_TOKEN_KEY = 'aegis_user_token';
const ADMIN_TOKEN_KEY = 'aegis_admin_token';

export const getStoredUserToken = (): string | null => {
  return localStorage.getItem(USER_TOKEN_KEY);
};

export const setStoredUserToken = (token: string) => {
  localStorage.setItem(USER_TOKEN_KEY, token);
};

export const clearStoredUserToken = () => {
  localStorage.removeItem(USER_TOKEN_KEY);
};

export const getStoredAdminToken = (): string | null => {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setStoredAdminToken = (token: string) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearStoredAdminToken = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

// Generic fetch wrapper with auth header
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  authType: 'user' | 'admin' | 'none' = 'none'
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (authType === 'user') {
    const token = getStoredUserToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } else if (authType === 'admin') {
    const token = getStoredAdminToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // USER AUTH
  async loginUser(username: string, passKey: string): Promise<{ session: UserSession }> {
    const res = await apiRequest<{ session: UserSession }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: passKey })
    });
    if (res.session?.token) {
      setStoredUserToken(res.session.token);
    }
    return res;
  },

  async getCurrentUser(): Promise<{ session: UserSession | null }> {
    const token = getStoredUserToken();
    if (!token) return { session: null };
    try {
      return await apiRequest<{ session: UserSession }>('/api/auth/me', { method: 'GET' }, 'user');
    } catch {
      clearStoredUserToken();
      return { session: null };
    }
  },

  async logoutUser(): Promise<void> {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' }, 'user');
    } catch {
      // ignore
    } finally {
      clearStoredUserToken();
    }
  },

  // ADMIN AUTH
  async loginAdmin(adminId: string, passKey: string): Promise<{ adminSession: AdminSession }> {
    const res = await apiRequest<{ adminSession: AdminSession }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ adminId, passKey })
    });
    if (res.adminSession?.token) {
      setStoredAdminToken(res.adminSession.token);
    }
    return res;
  },

  async getCurrentAdmin(): Promise<{ adminSession: AdminSession | null }> {
    const token = getStoredAdminToken();
    if (!token) return { adminSession: null };
    try {
      return await apiRequest<{ adminSession: AdminSession }>('/api/admin/me', { method: 'GET' }, 'admin');
    } catch {
      clearStoredAdminToken();
      return { adminSession: null };
    }
  },

  async logoutAdmin(): Promise<void> {
    try {
      await apiRequest('/api/admin/logout', { method: 'POST' }, 'admin');
    } catch {
      // ignore
    } finally {
      clearStoredAdminToken();
    }
  },

  // MODULES & PLANS
  async getModules(): Promise<{ modules: SecurityModule[] }> {
    return apiRequest<{ modules: SecurityModule[] }>('/api/modules');
  },

  async getPlans(): Promise<{ plans: RuntimePlan[] }> {
    return apiRequest<{ plans: RuntimePlan[] }>('/api/plans');
  },

  async getSystemLogs(): Promise<{ logs: LogEntry[] }> {
    return apiRequest<{ logs: LogEntry[] }>('/api/system/logs');
  },

  // PAYMENT GATEWAY
  async createPaymentSession(moduleId: string, planId: string, username?: string) {
    return apiRequest<{ session: any }>('/api/payments/create-session', {
      method: 'POST',
      body: JSON.stringify({ moduleId, planId, username })
    });
  },

  async verifyPayment(sessionId: string, moduleId: string, planId: string, username: string, transactionRef: string) {
    return apiRequest<{ success: boolean; verified: boolean; order: OrderRecord; purchasedModules: string[] }>(
      '/api/payments/verify',
      {
        method: 'POST',
        body: JSON.stringify({ sessionId, moduleId, planId, username, transactionRef })
      }
    );
  },

  // ADMIN DASHBOARD & CRUD
  async getAdminStats(): Promise<{ stats: AdminStats }> {
    return apiRequest<{ stats: AdminStats }>('/api/admin/stats', { method: 'GET' }, 'admin');
  },

  // Users
  async getAdminUsers(): Promise<{ users: UserRecord[] }> {
    return apiRequest<{ users: UserRecord[] }>('/api/admin/users', { method: 'GET' }, 'admin');
  },

  async createAdminUser(user: { username: string; password: string; role: string; status: string }) {
    return apiRequest<{ success: boolean; user: UserRecord }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(user)
    }, 'admin');
  },

  async updateAdminUser(id: string, updates: Partial<UserRecord>) {
    return apiRequest<{ success: boolean; user: UserRecord }>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }, 'admin');
  },

  async deleteAdminUser(id: string) {
    return apiRequest<{ success: boolean; deletedId: string }>(`/api/admin/users/${id}`, {
      method: 'DELETE'
    }, 'admin');
  },

  async resetAdminUserPassword(id: string, newPassword: string) {
    return apiRequest<{ success: boolean; message: string }>(`/api/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    }, 'admin');
  },

  // Modules
  async createAdminModule(mod: Partial<SecurityModule>) {
    return apiRequest<{ success: boolean; module: SecurityModule }>('/api/admin/modules', {
      method: 'POST',
      body: JSON.stringify(mod)
    }, 'admin');
  },

  async updateAdminModule(id: string, updates: Partial<SecurityModule>) {
    return apiRequest<{ success: boolean; module: SecurityModule }>(`/api/admin/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }, 'admin');
  },

  async deleteAdminModule(id: string) {
    return apiRequest<{ success: boolean; deletedId: string }>(`/api/admin/modules/${id}`, {
      method: 'DELETE'
    }, 'admin');
  },

  // Plans & Pricing
  async getAdminPlans(): Promise<{ plans: RuntimePlan[] }> {
    return apiRequest<{ plans: RuntimePlan[] }>('/api/admin/plans', { method: 'GET' }, 'admin');
  },

  async updateAdminPlan(id: string, updates: Partial<RuntimePlan>) {
    return apiRequest<{ success: boolean; plan: RuntimePlan }>(`/api/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }, 'admin');
  },

  async createAdminPlan(plan: Partial<RuntimePlan>) {
    return apiRequest<{ success: boolean; plan: RuntimePlan }>('/api/admin/plans', {
      method: 'POST',
      body: JSON.stringify(plan)
    }, 'admin');
  },

  // Orders
  async getAdminOrders(): Promise<{ orders: OrderRecord[] }> {
    return apiRequest<{ orders: OrderRecord[] }>('/api/admin/orders', { method: 'GET' }, 'admin');
  },

  async updateAdminOrderStatus(id: string, paymentStatus?: string, accessStatus?: string) {
    return apiRequest<{ success: boolean; order: OrderRecord }>(`/api/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ paymentStatus, accessStatus })
    }, 'admin');
  },

  async revokeAdminOrderAccess(id: string) {
    return apiRequest<{ success: boolean; order: OrderRecord }>(`/api/admin/orders/${id}/revoke`, {
      method: 'POST'
    }, 'admin');
  },

  async extendAdminOrderRuntime(id: string, additionalDays: number) {
    return apiRequest<{ success: boolean; order: OrderRecord }>(`/api/admin/orders/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ additionalDays })
    }, 'admin');
  },

  // Payment Settings
  async getAdminPaymentSettings(): Promise<{ settings: PaymentSettings }> {
    return apiRequest<{ settings: PaymentSettings }>('/api/admin/payment-settings', { method: 'GET' }, 'admin');
  },

  async updateAdminPaymentSettings(settings: Partial<PaymentSettings>) {
    return apiRequest<{ success: boolean; settings: PaymentSettings }>('/api/admin/payment-settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }, 'admin');
  },

  // Activity Logs
  async getAdminActivityLogs(): Promise<{ logs: AdminActivityLog[] }> {
    return apiRequest<{ logs: AdminActivityLog[] }>('/api/admin/activity-logs', { method: 'GET' }, 'admin');
  },

  // Reset Database
  async resetDatabase() {
    return apiRequest<{ success: boolean; message: string }>('/api/admin/reset-database', {
      method: 'POST'
    }, 'admin');
  }
};
