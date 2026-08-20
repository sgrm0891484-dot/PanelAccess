import { 
  UserSession, AdminSession, UserRecord, SecurityModule, 
  RuntimePlan, OrderRecord, PaymentSettings, AdminActivityLog, 
  AdminStats, LogEntry 
} from '../types';
import { extractErrorMessage } from '../utils/errorUtils';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  errorCode: string;
  data?: any;

  constructor(message: string, status: number = 500, errorCode: string = 'API_ERROR', data?: any) {
    const safeMessage = extractErrorMessage(message, 'Unable to authenticate at this time');
    super(safeMessage);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.data = data;
  }
}

// Request helper targeting the same-origin production API with HttpOnly cookie credentials
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include' // Transmit and receive HttpOnly session cookies automatically
    });
  } catch (netErr: any) {
    throw new ApiError(
      'Unable to connect to AEGIS Defense Gateway. Please verify your network connection.',
      0,
      'NETWORK_ERROR'
    );
  }

  // Handle non-JSON or HTML error responses
  const contentType = response.headers.get('content-type') || '';
  let responseData: any = null;

  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    let defaultMsg = `Request failed with status ${response.status}`;
    let errorCode = responseData?.error || 'HTTP_ERROR';

    if (response.status === 400) {
      defaultMsg = 'Invalid login request';
      errorCode = 'INVALID_REQUEST';
    } else if (response.status === 401) {
      defaultMsg = 'Invalid admin credentials';
      errorCode = 'INVALID_CREDENTIALS';
    } else if (response.status === 403) {
      defaultMsg = 'Access forbidden. Node account disabled or insufficient clearance.';
      errorCode = 'FORBIDDEN';
    } else if (response.status === 404) {
      defaultMsg = 'The requested resource or endpoint was not found.';
      errorCode = 'NOT_FOUND';
    } else if (response.status === 405) {
      defaultMsg = 'This endpoint only accepts POST requests';
      errorCode = 'METHOD_NOT_ALLOWED';
    } else if (response.status === 409) {
      defaultMsg = 'Resource conflict detected in defense registry.';
      errorCode = 'CONFLICT';
    } else if (response.status === 422) {
      defaultMsg = 'Validation error: Unprocessable entity payload.';
      errorCode = 'UNPROCESSABLE_ENTITY';
    } else if (response.status === 429) {
      defaultMsg = 'Rate limit exceeded. Please back off before retrying.';
      errorCode = 'RATE_LIMITED';
    } else if (response.status === 500) {
      defaultMsg = 'Authentication service is not configured correctly';
      errorCode = 'SERVER_CONFIGURATION_ERROR';
    } else if (response.status === 503) {
      defaultMsg = 'Authentication service is temporarily unavailable';
      errorCode = 'DATABASE_UNAVAILABLE';
    } else if (response.status > 500) {
      defaultMsg = 'Unable to authenticate at this time';
      errorCode = 'SERVER_ERROR';
    }

    // Safely extract error message without string coercing objects
    let finalMessage = defaultMsg;
    if (responseData) {
      finalMessage = extractErrorMessage(responseData, defaultMsg);
    }

    throw new ApiError(finalMessage, response.status, typeof errorCode === 'string' ? errorCode : 'HTTP_ERROR', responseData);
  }

  return (responseData !== null ? responseData : {}) as T;
}

export const api = {
  // 14. HEALTH CHECK
  async getHealth(): Promise<{ success: boolean; database: string; environment: string }> {
    return await apiRequest<{ success: boolean; database: string; environment: string }>(
      '/api/health',
      { method: 'GET' }
    );
  },

  // USER AUTH
  async loginUser(username: string, passKey: string): Promise<{ session: UserSession }> {
    const res = await apiRequest<{ success: boolean; data?: { session: UserSession }; session?: UserSession }>(
      '/api/auth/login', 
      {
        method: 'POST',
        body: JSON.stringify({ username, password: passKey })
      }
    );

    const session = res.data?.session || res.session;
    if (!session) {
      throw new ApiError('Invalid response payload received from authentication gateway', 500);
    }
    return { session };
  },

  async getCurrentUser(): Promise<{ session: UserSession | null }> {
    try {
      const res = await apiRequest<{ success: boolean; data?: { session: UserSession }; session?: UserSession }>(
        '/api/auth/session', 
        { method: 'GET' }
      );
      const session = res.data?.session || res.session || null;
      return { session };
    } catch {
      return { session: null };
    }
  },

  async logoutUser(): Promise<void> {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {}
  },

  // ADMIN AUTH
  async loginAdmin(adminId: string, passKey: string): Promise<{ success: boolean; adminSession: AdminSession }> {
    const res = await apiRequest<{ 
      success: boolean; 
      data?: { authenticated?: boolean; adminSession?: AdminSession }; 
      adminSession?: AdminSession 
    }>(
      '/api/admin/login', 
      {
        method: 'POST',
        body: JSON.stringify({ adminId, passKey })
      }
    );

    const adminSession = res.data?.adminSession || res.adminSession || (res.success && res.data?.authenticated ? {
      adminId: adminId.trim().toUpperCase(),
      role: 'SUPER_ADMIN' as const,
      token: 'AUTHENTICATED',
      loginTime: new Date().toLocaleTimeString(),
      isAuthenticated: true
    } : undefined);

    if (!res.success || !adminSession) {
      throw new ApiError('Invalid admin credentials', 401, 'INVALID_CREDENTIALS');
    }
    return { success: true, adminSession };
  },

  async getCurrentAdmin(): Promise<{ adminSession: AdminSession | null }> {
    try {
      const res = await apiRequest<{ success: boolean; data?: { adminSession: AdminSession }; adminSession?: AdminSession }>(
        '/api/admin/session', 
        { method: 'GET' }
      );
      const adminSession = res.data?.adminSession || res.adminSession || null;
      return { adminSession };
    } catch {
      return { adminSession: null };
    }
  },

  async logoutAdmin(): Promise<void> {
    try {
      await apiRequest('/api/admin/logout', { method: 'POST' });
    } catch {}
  },

  // MODULES & PLANS
  async getModules(): Promise<{ modules: SecurityModule[] }> {
    const res = await apiRequest<{ success: boolean; data?: { modules: SecurityModule[] }; modules?: SecurityModule[] }>(
      '/api/modules',
      { method: 'GET' }
    );
    return { modules: res.data?.modules || res.modules || [] };
  },

  async getPlans(): Promise<{ plans: RuntimePlan[] }> {
    const res = await apiRequest<{ success: boolean; data?: { plans: RuntimePlan[] }; plans?: RuntimePlan[] }>(
      '/api/plans',
      { method: 'GET' }
    );
    return { plans: res.data?.plans || res.plans || [] };
  },

  async getSystemLogs(): Promise<{ logs: LogEntry[] }> {
    const res = await apiRequest<{ success: boolean; data?: { logs: LogEntry[] }; logs?: LogEntry[] }>(
      '/api/system/logs',
      { method: 'GET' }
    );
    return { logs: res.data?.logs || res.logs || [] };
  },

  // PAYMENT GATEWAY
  async createPaymentSession(moduleId: string, planId: string, username?: string) {
    const res = await apiRequest<{ success: boolean; data?: { session: any }; session?: any }>(
      '/api/payments/create-session', 
      {
        method: 'POST',
        body: JSON.stringify({ moduleId, planId, username })
      }
    );
    return { session: res.data?.session || res.session };
  },

  async verifyPayment(sessionId: string, moduleId: string, planId: string, username: string, transactionRef: string) {
    const res = await apiRequest<{ 
      success: boolean; 
      verified: boolean; 
      data?: { order: OrderRecord; purchasedModules: string[] }; 
      order?: OrderRecord; 
      purchasedModules?: string[] 
    }>(
      '/api/payments/verify',
      {
        method: 'POST',
        body: JSON.stringify({ sessionId, moduleId, planId, username, transactionRef })
      }
    );

    const order = res.data?.order || res.order!;
    const purchasedModules = res.data?.purchasedModules || res.purchasedModules || [];

    return {
      success: res.success,
      verified: res.verified,
      order,
      purchasedModules
    };
  },

  // ADMIN DASHBOARD & CRUD
  async getAdminStats(): Promise<{ stats: AdminStats }> {
    const res = await apiRequest<{ success: boolean; data?: { stats: AdminStats }; stats?: AdminStats }>(
      '/api/admin/stats', 
      { method: 'GET' }
    );
    return { stats: res.data?.stats || res.stats! };
  },

  // Users CRUD
  async getAdminUsers(): Promise<{ users: UserRecord[] }> {
    const res = await apiRequest<{ success: boolean; data?: { users: UserRecord[] }; users?: UserRecord[] }>(
      '/api/admin/users', 
      { method: 'GET' }
    );
    return { users: res.data?.users || res.users || [] };
  },

  async createAdminUser(user: { username: string; password?: string; role?: string; status?: string }) {
    const res = await apiRequest<{ success: boolean; data?: { user: UserRecord }; user?: UserRecord }>(
      '/api/admin/users', 
      {
        method: 'POST',
        body: JSON.stringify(user)
      }
    );
    return { success: true, user: res.data?.user || res.user! };
  },

  async updateAdminUser(id: string, updates: Partial<UserRecord>) {
    const res = await apiRequest<{ success: boolean; data?: { user: UserRecord }; user?: UserRecord }>(
      `/api/admin/users/${id}`, 
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
    return { success: true, user: res.data?.user || res.user! };
  },

  async deleteAdminUser(id: string) {
    const res = await apiRequest<{ success: boolean; deletedId?: string }>(
      `/api/admin/users/${id}`, 
      { method: 'DELETE' }
    );
    return { success: true, deletedId: res.deletedId || id };
  },

  async resetAdminUserPassword(id: string, newPassword?: string) {
    const res = await apiRequest<{ success: boolean; message?: string }>(
      `/api/admin/users/${id}/reset-password`, 
      {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      }
    );
    return { success: true, message: res.message || 'Password reset successfully' };
  },

  // Modules CRUD
  async createAdminModule(mod: Partial<SecurityModule>) {
    const res = await apiRequest<{ success: boolean; data?: { module: SecurityModule }; module?: SecurityModule }>(
      '/api/admin/modules', 
      {
        method: 'POST',
        body: JSON.stringify(mod)
      }
    );
    return { success: true, module: res.data?.module || res.module! };
  },

  async updateAdminModule(id: string, updates: Partial<SecurityModule>) {
    const res = await apiRequest<{ success: boolean; data?: { module: SecurityModule }; module?: SecurityModule }>(
      `/api/admin/modules/${id}`, 
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
    return { success: true, module: res.data?.module || res.module! };
  },

  async deleteAdminModule(id: string) {
    const res = await apiRequest<{ success: boolean; deletedId?: string }>(
      `/api/admin/modules/${id}`, 
      { method: 'DELETE' }
    );
    return { success: true, deletedId: res.deletedId || id };
  },

  // Plans & Pricing
  async getAdminPlans(): Promise<{ plans: RuntimePlan[] }> {
    const res = await apiRequest<{ success: boolean; data?: { plans: RuntimePlan[] }; plans?: RuntimePlan[] }>(
      '/api/admin/plans', 
      { method: 'GET' }
    );
    return { plans: res.data?.plans || res.plans || [] };
  },

  async updateAdminPlan(id: string, updates: Partial<RuntimePlan>) {
    const res = await apiRequest<{ success: boolean; data?: { plan: RuntimePlan }; plan?: RuntimePlan }>(
      `/api/admin/plans/${id}`, 
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
    return { success: true, plan: res.data?.plan || res.plan! };
  },

  async createAdminPlan(plan: Partial<RuntimePlan>) {
    const res = await apiRequest<{ success: boolean; data?: { plan: RuntimePlan }; plan?: RuntimePlan }>(
      '/api/admin/plans', 
      {
        method: 'POST',
        body: JSON.stringify(plan)
      }
    );
    return { success: true, plan: res.data?.plan || res.plan! };
  },

  // Orders
  async getAdminOrders(): Promise<{ orders: OrderRecord[] }> {
    const res = await apiRequest<{ success: boolean; data?: { orders: OrderRecord[] }; orders?: OrderRecord[] }>(
      '/api/admin/orders', 
      { method: 'GET' }
    );
    return { orders: res.data?.orders || res.orders || [] };
  },

  async updateAdminOrderStatus(id: string, paymentStatus?: string, accessStatus?: string) {
    const res = await apiRequest<{ success: boolean; data?: { order: OrderRecord }; order?: OrderRecord }>(
      `/api/admin/orders/${id}/status`, 
      {
        method: 'PUT',
        body: JSON.stringify({ paymentStatus, accessStatus })
      }
    );
    return { success: true, order: res.data?.order || res.order! };
  },

  async revokeAdminOrderAccess(id: string) {
    const res = await apiRequest<{ success: boolean; data?: { order: OrderRecord }; order?: OrderRecord }>(
      `/api/admin/orders/${id}/revoke`, 
      { method: 'POST' }
    );
    return { success: true, order: res.data?.order || res.order! };
  },

  async extendAdminOrderRuntime(id: string, additionalDays: number) {
    const res = await apiRequest<{ success: boolean; data?: { order: OrderRecord }; order?: OrderRecord }>(
      `/api/admin/orders/${id}/extend`, 
      {
        method: 'POST',
        body: JSON.stringify({ additionalDays })
      }
    );
    return { success: true, order: res.data?.order || res.order! };
  },

  // Payment Settings
  async getAdminPaymentSettings(): Promise<{ settings: PaymentSettings }> {
    const res = await apiRequest<{ success: boolean; data?: { settings: PaymentSettings }; settings?: PaymentSettings }>(
      '/api/admin/payment-settings', 
      { method: 'GET' }
    );
    return { settings: res.data?.settings || res.settings! };
  },

  async updateAdminPaymentSettings(settings: Partial<PaymentSettings>) {
    const res = await apiRequest<{ success: boolean; data?: { settings: PaymentSettings }; settings?: PaymentSettings }>(
      '/api/admin/payment-settings', 
      {
        method: 'PUT',
        body: JSON.stringify(settings)
      }
    );
    return { success: true, settings: res.data?.settings || res.settings! };
  },

  // Activity Logs
  async getAdminActivityLogs(): Promise<{ logs: AdminActivityLog[] }> {
    const res = await apiRequest<{ success: boolean; data?: { logs: AdminActivityLog[] }; logs?: AdminActivityLog[] }>(
      '/api/admin/activity-logs', 
      { method: 'GET' }
    );
    return { logs: res.data?.logs || res.logs || [] };
  },

  // Reset Database
  async resetDatabase() {
    return await apiRequest<{ success: boolean; message: string }>(
      '/api/admin/reset-database', 
      { method: 'POST' }
    );
  }
};
