/**
 * AEGIS // DEFENSE - Pure Frontend Service Layer
 * Fully decoupled from backend APIs, databases, and serverless functions.
 * All operations execute locally in the client and persist in browser storage.
 */

import { 
  UserSession, AdminSession, UserRecord, SecurityModule, 
  RuntimePlan, OrderRecord, PaymentSettings, AdminActivityLog, 
  AdminStats, LogEntry 
} from '../types';
import { appStore } from '../store/appStore';
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
    const safeMessage = extractErrorMessage(message, 'An application error occurred');
    super(safeMessage);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.data = data;
  }
}

// Frontend-only client-side API facade
export const api = {
  // 1. HEALTH CHECK (Client-only status)
  async getHealth(): Promise<{ success: boolean; database: string; environment: string }> {
    return {
      success: true,
      database: 'LOCAL_STORAGE_ENCLAVE',
      environment: 'FRONTEND_STANDALONE'
    };
  },

  // 2. USER AUTHENTICATION
  async loginUser(username: string, passKey: string): Promise<{ session: UserSession }> {
    try {
      const session = appStore.loginUser(username, passKey);
      return { session };
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Invalid credentials');
      throw new ApiError(msg, 401, 'INVALID_CREDENTIALS');
    }
  },

  async getCurrentUser(): Promise<{ session: UserSession | null }> {
    const session = appStore.getCurrentUser();
    return { session };
  },

  async logoutUser(): Promise<void> {
    appStore.logoutUser();
  },

  // 3. ADMIN AUTHENTICATION
  async loginAdmin(adminId: string, passKey: string): Promise<{ success: boolean; adminSession: AdminSession }> {
    try {
      const adminSession = appStore.loginAdmin(adminId, passKey);
      return { success: true, adminSession };
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'INVALID ADMIN CREDENTIALS');
      throw new ApiError(msg, 401, 'INVALID_ADMIN_CREDENTIALS');
    }
  },

  async getCurrentAdmin(): Promise<{ adminSession: AdminSession | null }> {
    const adminSession = appStore.getCurrentAdmin();
    return { adminSession };
  },

  async logoutAdmin(): Promise<void> {
    appStore.logoutAdmin();
  },

  // 4. MODULES & PLANS
  async getModules(): Promise<{ modules: SecurityModule[] }> {
    const modules = appStore.getModules();
    return { modules };
  },

  async getPlans(): Promise<{ plans: RuntimePlan[] }> {
    const plans = appStore.getPlans();
    return { plans };
  },

  async getSystemLogs(): Promise<{ logs: LogEntry[] }> {
    const logs = appStore.getLogs();
    return { logs };
  },

  // 5. PAYMENT GATEWAY (Frontend Sandbox Simulation)
  async createPaymentSession(moduleId: string, planId: string, username?: string) {
    const mod = appStore.getModules().find(m => m.id === moduleId);
    const plan = appStore.getPlans().find(p => p.id === planId);
    const session = {
      sessionId: `SESS-${Date.now().toString().slice(-6)}`,
      module: mod,
      plan: plan,
      amount: plan?.price || 120,
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000,
      status: 'PENDING' as const,
      transactionId: `UPI-TXN-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      upiVpa: appStore.getPaymentSettings().upiVpa
    };
    return { session };
  },

  async verifyPayment(sessionId: string, moduleId: string, planId: string, username: string, transactionRef: string) {
    const result = appStore.createOrder({
      user: username,
      moduleId,
      planId,
      transactionRef
    });

    return {
      success: true,
      verified: true,
      order: result.order,
      purchasedModules: result.purchasedModules
    };
  },

  // 6. ADMIN DASHBOARD & CRUD
  async getAdminStats(): Promise<{ stats: AdminStats }> {
    const stats = appStore.getStats();
    return { stats };
  },

  // Users CRUD
  async getAdminUsers(): Promise<{ users: UserRecord[] }> {
    const users = appStore.getUsers();
    return { users };
  },

  async createAdminUser(user: { username: string; password?: string; role?: string; status?: string }) {
    try {
      const newUser = appStore.createUser(user);
      return { success: true, user: newUser };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to create user'), 400);
    }
  },

  async updateAdminUser(id: string, updates: Partial<UserRecord>) {
    try {
      const updatedUser = appStore.updateUser(id, updates);
      return { success: true, user: updatedUser };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to update user'), 400);
    }
  },

  async deleteAdminUser(id: string) {
    try {
      const deletedId = appStore.deleteUser(id);
      return { success: true, deletedId };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to delete user'), 400);
    }
  },

  async resetAdminUserPassword(id: string, newPassword?: string) {
    try {
      const message = appStore.resetUserPassword(id, newPassword);
      return { success: true, message };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to reset password'), 400);
    }
  },

  // Modules CRUD
  async createAdminModule(mod: Partial<SecurityModule>) {
    try {
      const newMod = appStore.createModule(mod);
      return { success: true, module: newMod };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to create module'), 400);
    }
  },

  async updateAdminModule(id: string, updates: Partial<SecurityModule>) {
    try {
      const updatedMod = appStore.updateModule(id, updates);
      return { success: true, module: updatedMod };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to update module'), 400);
    }
  },

  async deleteAdminModule(id: string) {
    try {
      const deletedId = appStore.deleteModule(id);
      return { success: true, deletedId };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to delete module'), 400);
    }
  },

  // Plans & Pricing
  async getAdminPlans(): Promise<{ plans: RuntimePlan[] }> {
    const plans = appStore.getPlans();
    return { plans };
  },

  async updateAdminPlan(id: string, updates: Partial<RuntimePlan>) {
    try {
      const updatedPlan = appStore.updatePlan(id, updates);
      return { success: true, plan: updatedPlan };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to update plan'), 400);
    }
  },

  async createAdminPlan(plan: Partial<RuntimePlan>) {
    try {
      const newPlan = appStore.createPlan(plan);
      return { success: true, plan: newPlan };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to create plan'), 400);
    }
  },

  // Orders
  async getAdminOrders(): Promise<{ orders: OrderRecord[] }> {
    const orders = appStore.getOrders();
    return { orders };
  },

  async updateAdminOrderStatus(id: string, paymentStatus?: string, accessStatus?: string) {
    try {
      const updatedOrder = appStore.updateOrderStatus(id, paymentStatus, accessStatus);
      return { success: true, order: updatedOrder };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to update order status'), 400);
    }
  },

  async revokeAdminOrderAccess(id: string) {
    try {
      const revokedOrder = appStore.revokeOrderAccess(id);
      return { success: true, order: revokedOrder };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to revoke order access'), 400);
    }
  },

  async extendAdminOrderRuntime(id: string, additionalDays: number) {
    try {
      const extendedOrder = appStore.extendOrderRuntime(id, additionalDays);
      return { success: true, order: extendedOrder };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to extend order runtime'), 400);
    }
  },

  // Payment Settings
  async getAdminPaymentSettings(): Promise<{ settings: PaymentSettings }> {
    const settings = appStore.getPaymentSettings();
    return { settings };
  },

  async updateAdminPaymentSettings(settings: Partial<PaymentSettings>) {
    try {
      const updated = appStore.updatePaymentSettings(settings);
      return { success: true, settings: updated };
    } catch (err: unknown) {
      throw new ApiError(extractErrorMessage(err, 'Failed to update payment settings'), 400);
    }
  },

  // Activity Logs
  async getAdminActivityLogs(): Promise<{ logs: AdminActivityLog[] }> {
    const logs = appStore.getActivityLogs();
    return { logs };
  },

  // Factory Reset
  async resetDatabase() {
    appStore.resetToDefault();
    return { success: true, message: 'All local state reset to factory defaults' };
  }
};
