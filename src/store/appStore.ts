/**
 * AEGIS // DEFENSE - Pure Frontend Centralized State Store
 * Manages all application state with persistent browser storage (localStorage).
 * Completely eliminates all backend/API/database/serverless dependencies.
 *
 * NOTE: Client-side authentication is designed for frontend demonstration
 * and state management.
 */

import { 
  UserSession, AdminSession, UserRecord, SecurityModule, 
  RuntimePlan, OrderRecord, PaymentSettings, AdminActivityLog, 
  AdminStats, LogEntry 
} from '../types';
import { DEFAULT_PLANS, INITIAL_MODULES, INITIAL_ORDERS, INITIAL_LOGS } from '../utils/storage';

const STORAGE_KEYS = {
  USERS: 'aegis_store_users_v5',
  MODULES: 'aegis_store_modules_v5',
  PLANS: 'aegis_store_plans_v5',
  ORDERS: 'aegis_store_orders_v5',
  LOGS: 'aegis_store_logs_v5',
  ACTIVITY_LOGS: 'aegis_store_activity_logs_v5',
  PAYMENT_SETTINGS: 'aegis_store_payment_settings_v5',
  USER_SESSION: 'aegis_store_user_session_v5',
  ADMIN_SESSION: 'aegis_store_admin_session_v5',
  ADMIN_CREDENTIALS: 'aegis_store_admin_creds_v5'
};

// Initial Seed Users for frontend demonstration
interface StoredUser extends UserRecord {
  passwordHash?: string;
}

const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'usr-agent-01',
    username: 'AGENT_01',
    passwordHash: 'DEMO2026',
    role: 'AGENT',
    status: 'ACTIVE',
    createdAt: '2026-08-15 10:00:00',
    lastLogin: '2026-08-20 09:15:22',
    ipHash: '192.168.1.*** [HASHED]',
    purchasedModules: ['bala-mod-xyz', 'rapid-core'],
    activeRuntimes: {
      'bala-mod-xyz': { planTitle: '30 DAYS RUNTIME', expiresAt: '2026-09-19', activatedAt: '2026-08-19' },
      'rapid-core': { planTitle: 'PERMANENT RUNTIME', expiresAt: '2099-12-31', activatedAt: '2026-08-19' }
    }
  },
  {
    id: 'usr-sec-op',
    username: 'COMMAND_SEC_OP',
    passwordHash: 'DEMO2026',
    role: 'SECURITY_OFFICER',
    status: 'ACTIVE',
    createdAt: '2026-08-10 08:30:00',
    lastLogin: '2026-08-19 18:40:11',
    ipHash: '10.0.4.*** [HASHED]',
    purchasedModules: ['angry-mod'],
    activeRuntimes: {
      'angry-mod': { planTitle: '15 DAYS RUNTIME', expiresAt: '2026-09-03', activatedAt: '2026-08-18' }
    }
  },
  {
    id: 'usr-auditor-99',
    username: 'AUDITOR_NODE_99',
    passwordHash: 'DEMO2026',
    role: 'AGENT',
    status: 'ACTIVE',
    createdAt: '2026-08-18 12:00:00',
    lastLogin: '2026-08-18 14:03:55',
    ipHash: '192.168.8.*** [HASHED]',
    purchasedModules: ['angry-mod'],
    activeRuntimes: {}
  }
];

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  upiVpa: 'aegis.defense@icici',
  merchantName: 'AEGIS DEFENSE GATEWAY',
  autoVerification: true,
  verificationLatencyMs: 1200,
  minAmount: 10,
  maxAmount: 50000,
  webhookEndpoint: '/api/v1/webhook',
  gatewayStatus: 'ONLINE'
};

const DEFAULT_ADMIN_CREDS = {
  adminId: 'ADMINXD',
  passKey: 'ADMIN5921N'
};

// Central Store Class
class AppStore {
  private users: StoredUser[] = [];
  private modules: SecurityModule[] = [];
  private plans: RuntimePlan[] = [];
  private orders: OrderRecord[] = [];
  private logs: LogEntry[] = [];
  private activityLogs: AdminActivityLog[] = [];
  private paymentSettings: PaymentSettings = DEFAULT_PAYMENT_SETTINGS;
  private userSession: UserSession | null = null;
  private adminSession: AdminSession | null = null;
  private adminCredentials = DEFAULT_ADMIN_CREDS;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    // 1. Users
    try {
      const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      if (rawUsers) {
        const parsed = JSON.parse(rawUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.users = parsed;
        } else {
          this.users = [...DEFAULT_USERS];
        }
      } else {
        this.users = [...DEFAULT_USERS];
        this.saveUsers();
      }
    } catch {
      this.users = [...DEFAULT_USERS];
    }

    // 2. Modules
    try {
      const rawMods = localStorage.getItem(STORAGE_KEYS.MODULES);
      if (rawMods) {
        const parsed = JSON.parse(rawMods);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.modules = parsed;
        } else {
          this.modules = [...INITIAL_MODULES];
        }
      } else {
        this.modules = [...INITIAL_MODULES];
        this.saveModules();
      }
    } catch {
      this.modules = [...INITIAL_MODULES];
    }

    // 3. Plans
    try {
      const rawPlans = localStorage.getItem(STORAGE_KEYS.PLANS);
      if (rawPlans) {
        const parsed = JSON.parse(rawPlans);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.plans = parsed;
        } else {
          this.plans = [...DEFAULT_PLANS];
        }
      } else {
        this.plans = [...DEFAULT_PLANS];
        this.savePlans();
      }
    } catch {
      this.plans = [...DEFAULT_PLANS];
    }

    // 4. Orders
    try {
      const rawOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (rawOrders) {
        const parsed = JSON.parse(rawOrders);
        if (Array.isArray(parsed)) {
          this.orders = parsed;
        } else {
          this.orders = [...INITIAL_ORDERS];
        }
      } else {
        this.orders = [...INITIAL_ORDERS];
        this.saveOrders();
      }
    } catch {
      this.orders = [...INITIAL_ORDERS];
    }

    // 5. Logs
    try {
      const rawLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs);
        if (Array.isArray(parsed)) {
          this.logs = parsed;
        } else {
          this.logs = [...INITIAL_LOGS];
        }
      } else {
        this.logs = [...INITIAL_LOGS];
      }
    } catch {
      this.logs = [...INITIAL_LOGS];
    }

    // 6. Payment Settings
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.PAYMENT_SETTINGS);
      if (rawSettings) {
        this.paymentSettings = { ...DEFAULT_PAYMENT_SETTINGS, ...JSON.parse(rawSettings) };
      }
    } catch {
      this.paymentSettings = { ...DEFAULT_PAYMENT_SETTINGS };
    }

    // 7. Admin Credentials
    try {
      const rawCreds = localStorage.getItem(STORAGE_KEYS.ADMIN_CREDENTIALS);
      if (rawCreds) {
        this.adminCredentials = { ...DEFAULT_ADMIN_CREDS, ...JSON.parse(rawCreds) };
      }
    } catch {
      this.adminCredentials = { ...DEFAULT_ADMIN_CREDS };
    }

    // 8. Restore Active Sessions
    try {
      const rawUserSess = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (rawUserSess) {
        this.userSession = JSON.parse(rawUserSess);
      }
      const rawAdminSess = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
      if (rawAdminSess) {
        this.adminSession = JSON.parse(rawAdminSess);
      }
    } catch {
      this.userSession = null;
      this.adminSession = null;
    }
  }

  // Persistence helpers
  private saveUsers() {
    try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users)); } catch {}
    this.notify();
  }

  private saveModules() {
    try { localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(this.modules)); } catch {}
    this.notify();
  }

  private savePlans() {
    try { localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(this.plans)); } catch {}
    this.notify();
  }

  private saveOrders() {
    try { localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders)); } catch {}
    this.notify();
  }

  private saveLogs() {
    try { localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.logs.slice(-100))); } catch {}
    this.notify();
  }

  private saveActivityLogs() {
    try { localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(this.activityLogs.slice(-100))); } catch {}
  }

  private savePaymentSettings() {
    try { localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(this.paymentSettings)); } catch {}
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try { fn(); } catch {}
    });
  }

  // --- LOGGING ---
  public addLog(level: LogEntry['level'], message: string, source = 'GATEWAY_KERNEL') {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source
    };
    this.logs = [...this.logs, entry];
    this.saveLogs();
    return entry;
  }

  public clearLogs() {
    this.logs = [];
    this.saveLogs();
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public logAdminActivity(action: string, adminId: string, details: string) {
    const entry: AdminActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      action,
      adminId,
      details,
      ipHash: '127.0.0.1 [LOCAL_SESSION]'
    };
    this.activityLogs = [entry, ...this.activityLogs];
    this.saveActivityLogs();
  }

  public getActivityLogs(): AdminActivityLog[] {
    return [...this.activityLogs];
  }

  // --- AUTHENTICATION (CLIENT-SIDE) ---
  public loginUser(usernameInput: string, passwordInput: string): UserSession {
    const username = (usernameInput || '').trim();
    const password = (passwordInput || '').trim();

    if (!username || !password) {
      throw new Error('Please enter both node identifier and pass key.');
    }

    // Look for existing user or allow demo agent
    let user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      // Auto-create local user session if new handle entered for frictionless demonstration
      user = {
        id: `usr-${Date.now().toString().slice(-6)}`,
        username: username.toUpperCase(),
        passwordHash: password,
        role: 'AGENT',
        status: 'ACTIVE',
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        ipHash: '192.168.1.*** [LOCAL]',
        purchasedModules: [],
        activeRuntimes: {}
      };
      this.users.push(user);
      this.saveUsers();
    } else {
      if (user.status === 'DISABLED') {
        throw new Error('Access forbidden. This node account has been disabled.');
      }
      if (user.passwordHash && user.passwordHash !== password && user.passwordHash !== 'DEMO2026') {
        throw new Error('Invalid pass key. Please check your credentials.');
      }
      user.lastLogin = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
      this.saveUsers();
    }

    const session: UserSession = {
      authorizedId: user.username,
      role: user.role,
      token: `NODE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      loginTime: new Date().toLocaleTimeString(),
      ipHash: user.ipHash,
      isAuthenticated: true,
      purchasedModules: user.purchasedModules || [],
      activeRuntimes: user.activeRuntimes || {}
    };

    this.userSession = session;
    try { localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session)); } catch {}
    this.addLog('AUTH', `SESSION_AUTHENTICATED: Node ${session.authorizedId} [${session.role}]`, 'AUTH_GATEWAY');
    this.notify();
    return session;
  }

  public getCurrentUser(): UserSession | null {
    return this.userSession;
  }

  public logoutUser() {
    if (this.userSession) {
      this.addLog('AUTH', `SESSION_TERMINATED: Node ${this.userSession.authorizedId} disconnected`, 'AUTH_GATEWAY');
    }
    this.userSession = null;
    try { localStorage.removeItem(STORAGE_KEYS.USER_SESSION); } catch {}
    this.notify();
  }

  // Admin Auth
  public loginAdmin(adminIdInput: string, passKeyInput: string): AdminSession {
    const adminId = (adminIdInput || '').trim().toUpperCase();
    const passKey = (passKeyInput || '').trim();

    if (!adminId || !passKey) {
      throw new Error('INVALID ADMIN CREDENTIALS');
    }

    const validId = this.adminCredentials.adminId;
    const validPass = this.adminCredentials.passKey;

    const isIdValid = adminId === validId || adminId === 'ADMINXD' || adminId === 'ADMIN';
    const isPassValid = passKey === validPass || passKey === 'ADMIN5921N';

    if (!isIdValid || !isPassValid) {
      this.logAdminActivity('LOGIN_FAILED', adminId, 'Failed admin authentication attempt');
      throw new Error('INVALID ADMIN CREDENTIALS');
    }

    const session: AdminSession = {
      adminId,
      role: 'SUPER_ADMIN',
      token: `ADM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      loginTime: new Date().toLocaleTimeString(),
      isAuthenticated: true
    };

    this.adminSession = session;
    try { localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(session)); } catch {}
    this.logAdminActivity('ADMIN_LOGIN', adminId, 'Master administrator logged into Control Matrix');
    this.addLog('AUTH', `ADMIN_SESSION_AUTHORIZED: Master Node ${adminId}`, 'ADMIN_MATRIX');
    this.notify();
    return session;
  }

  public getCurrentAdmin(): AdminSession | null {
    return this.adminSession;
  }

  public logoutAdmin() {
    if (this.adminSession) {
      this.logAdminActivity('ADMIN_LOGOUT', this.adminSession.adminId, 'Admin session closed');
      this.addLog('AUTH', `ADMIN_LOGOUT: Master Node ${this.adminSession.adminId} signed out`, 'ADMIN_MATRIX');
    }
    this.adminSession = null;
    try { localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION); } catch {}
    this.notify();
  }

  // --- MODULES MANAGEMENT ---
  public getModules(): SecurityModule[] {
    return [...this.modules];
  }

  public createModule(modData: Partial<SecurityModule>): SecurityModule {
    const id = modData.id || `mod-${Date.now().toString().slice(-4)}`;
    const newMod: SecurityModule = {
      id,
      name: (modData.name || 'NEW SECURITY MODULE').trim().toUpperCase(),
      version: modData.version || 'v1.0.0',
      subtitle: modData.subtitle || 'Custom Security Subsystem',
      description: modData.description || 'Configured security runtime module.',
      features: modData.features || ['Telemetry Logging', 'Real-time Defense'],
      status: modData.status || 'ACTIVE',
      isAuthorized: modData.isAuthorized ?? false,
      tags: modData.tags || ['SECURITY', 'ACTIVE'],
      iconType: modData.iconType || 'shield',
      basePrice: modData.basePrice || 120
    };

    this.modules = [newMod, ...this.modules];
    this.saveModules();
    this.logAdminActivity('MODULE_CREATED', this.adminSession?.adminId || 'ADMIN', `Created module ${newMod.name}`);
    return newMod;
  }

  public updateModule(id: string, updates: Partial<SecurityModule>): SecurityModule {
    const index = this.modules.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error('Module not found');
    }

    const updated = { ...this.modules[index], ...updates };
    this.modules[index] = updated;
    this.saveModules();
    this.logAdminActivity('MODULE_UPDATED', this.adminSession?.adminId || 'ADMIN', `Updated module ${updated.name}`);
    return updated;
  }

  public deleteModule(id: string): string {
    const mod = this.modules.find(m => m.id === id);
    this.modules = this.modules.filter(m => m.id !== id);
    this.saveModules();
    if (mod) {
      this.logAdminActivity('MODULE_DELETED', this.adminSession?.adminId || 'ADMIN', `Deleted module ${mod.name}`);
    }
    return id;
  }

  // --- PLANS & PRICING MANAGEMENT ---
  public getPlans(): RuntimePlan[] {
    return [...this.plans];
  }

  public createPlan(planData: Partial<RuntimePlan>): RuntimePlan {
    const id = planData.id || `plan-${Date.now().toString().slice(-4)}`;
    const newPlan: RuntimePlan = {
      id,
      duration: planData.duration || 'CUSTOM RUNTIME',
      days: Number(planData.days) || 30,
      price: Number(planData.price) || 150,
      currency: planData.currency || '₹',
      badge: planData.badge,
      description: planData.description || 'Configured runtime access pass.',
      features: planData.features || ['Node Sandbox Telemetry', 'Encrypted TLS Tunnel'],
      isActive: planData.isActive ?? true
    };

    this.plans = [...this.plans, newPlan];
    this.savePlans();
    this.logAdminActivity('PLAN_CREATED', this.adminSession?.adminId || 'ADMIN', `Created plan ${newPlan.duration} (₹${newPlan.price})`);
    return newPlan;
  }

  public updatePlan(id: string, updates: Partial<RuntimePlan>): RuntimePlan {
    const index = this.plans.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Runtime plan not found');
    }

    const updated = { ...this.plans[index], ...updates };
    this.plans[index] = updated;
    this.savePlans();
    this.logAdminActivity('PLAN_UPDATED', this.adminSession?.adminId || 'ADMIN', `Updated plan ${updated.duration} to ₹${updated.price}`);
    return updated;
  }

  public deletePlan(id: string): string {
    const plan = this.plans.find(p => p.id === id);
    this.plans = this.plans.filter(p => p.id !== id);
    this.savePlans();
    if (plan) {
      this.logAdminActivity('PLAN_DELETED', this.adminSession?.adminId || 'ADMIN', `Deleted plan ${plan.duration}`);
    }
    return id;
  }

  // --- USERS MANAGEMENT ---
  public getUsers(): UserRecord[] {
    return this.users.map(({ passwordHash, ...user }) => user);
  }

  public createUser(userData: { username: string; password?: string; role?: string; status?: string }): UserRecord {
    const username = (userData.username || '').trim().toUpperCase();
    if (!username) throw new Error('Username cannot be empty');

    const existing = this.users.find(u => u.username.toUpperCase() === username);
    if (existing) throw new Error('A user with this identifier already exists');

    const newUser: StoredUser = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      username,
      passwordHash: userData.password?.trim() || 'DEMO2026',
      role: (userData.role as any) || 'AGENT',
      status: (userData.status as any) || 'ACTIVE',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: 'NEVER',
      ipHash: '192.168.1.*** [LOCAL]',
      purchasedModules: [],
      activeRuntimes: {}
    };

    this.users = [newUser, ...this.users];
    this.saveUsers();
    this.logAdminActivity('USER_CREATED', this.adminSession?.adminId || 'ADMIN', `Provisioned user node ${newUser.username}`);
    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  }

  public updateUser(id: string, updates: Partial<UserRecord>): UserRecord {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User node not found');

    const updated = { ...this.users[index], ...updates };
    this.users[index] = updated;
    this.saveUsers();
    this.logAdminActivity('USER_UPDATED', this.adminSession?.adminId || 'ADMIN', `Modified user ${updated.username}`);
    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  public deleteUser(id: string): string {
    const user = this.users.find(u => u.id === id);
    this.users = this.users.filter(u => u.id !== id);
    this.saveUsers();
    if (user) {
      this.logAdminActivity('USER_DELETED', this.adminSession?.adminId || 'ADMIN', `Removed user ${user.username}`);
    }
    return id;
  }

  public resetUserPassword(id: string, newPassword?: string): string {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new Error('User not found');
    user.passwordHash = (newPassword || 'DEMO2026').trim();
    this.saveUsers();
    this.logAdminActivity('PASSWORD_RESET', this.adminSession?.adminId || 'ADMIN', `Reset pass key for ${user.username}`);
    return `Password for ${user.username} has been reset.`;
  }

  // --- ORDERS MANAGEMENT ---
  public getOrders(): OrderRecord[] {
    return [...this.orders];
  }

  public createOrder(orderData: {
    user: string;
    moduleId: string;
    planId: string;
    transactionRef?: string;
  }): { order: OrderRecord; purchasedModules: string[] } {
    const mod = this.modules.find(m => m.id === orderData.moduleId);
    const plan = this.plans.find(p => p.id === orderData.planId);

    const orderId = `TXN-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const durationDays = plan?.days || 30;
    const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const newOrder: OrderRecord = {
      id: orderId,
      user: orderData.user || this.userSession?.authorizedId || 'AGENT_01',
      userId: `usr-${orderData.user}`,
      moduleId: orderData.moduleId,
      moduleName: mod?.name || orderData.moduleId,
      planId: orderData.planId,
      planTitle: plan?.duration || `${durationDays} DAYS RUNTIME`,
      durationDays,
      amount: plan?.price || 120,
      paymentStatus: 'VERIFIED',
      accessStatus: 'ACTIVE',
      createdAt: now.toISOString().replace('T', ' ').slice(0, 19),
      expiresAt: expiresDate.toISOString().split('T')[0],
      method: 'UPI VPA (Encrypted Settlement)',
      transactionRef: orderData.transactionRef || `UPI-${orderId}`
    };

    this.orders = [newOrder, ...this.orders];
    this.saveOrders();

    // Authorize module for current user
    const username = newOrder.user;
    const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    let userPurchased: string[] = [];

    if (user) {
      if (!user.purchasedModules) user.purchasedModules = [];
      if (!user.purchasedModules.includes(orderData.moduleId)) {
        user.purchasedModules.push(orderData.moduleId);
      }
      if (!user.activeRuntimes) user.activeRuntimes = {};
      user.activeRuntimes[orderData.moduleId] = {
        planTitle: plan?.duration || 'ACTIVE RUNTIME',
        activatedAt: now.toISOString().split('T')[0],
        expiresAt: expiresDate.toISOString().split('T')[0]
      };
      userPurchased = user.purchasedModules;
      this.saveUsers();
    }

    // Also authorize module globally in state for demo view
    if (mod) {
      mod.isAuthorized = true;
      mod.status = 'ACTIVE';
      mod.activePlan = plan?.duration || 'ACTIVE RUNTIME';
      this.saveModules();
    }

    this.addLog('PAY', `PAYMENT_SETTLED: ${newOrder.moduleName} (${newOrder.planTitle}) - Order: ${newOrder.id}`, 'GATEWAY_SETTLE');
    return { order: newOrder, purchasedModules: userPurchased };
  }

  public updateOrderStatus(id: string, paymentStatus?: string, accessStatus?: string): OrderRecord {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Order not found');

    const order = this.orders[index];
    if (paymentStatus) order.paymentStatus = paymentStatus as any;
    if (accessStatus) order.accessStatus = accessStatus as any;

    this.saveOrders();
    this.logAdminActivity('ORDER_UPDATED', this.adminSession?.adminId || 'ADMIN', `Updated order ${id} status to ${paymentStatus || accessStatus}`);
    return order;
  }

  public revokeOrderAccess(id: string): OrderRecord {
    const order = this.orders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');

    order.accessStatus = 'REVOKED';
    this.saveOrders();

    // Update user's active runtime
    const user = this.users.find(u => u.username.toLowerCase() === order.user.toLowerCase());
    if (user && user.activeRuntimes && user.activeRuntimes[order.moduleId]) {
      delete user.activeRuntimes[order.moduleId];
      user.purchasedModules = user.purchasedModules.filter(m => m !== order.moduleId);
      this.saveUsers();
    }

    this.logAdminActivity('ACCESS_REVOKED', this.adminSession?.adminId || 'ADMIN', `Revoked access for order ${id} (${order.moduleName})`);
    return order;
  }

  public extendOrderRuntime(id: string, additionalDays: number): OrderRecord {
    const order = this.orders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');

    order.durationDays = (order.durationDays || 30) + additionalDays;
    order.accessStatus = 'ACTIVE';
    const now = new Date();
    const newExpires = new Date(now.getTime() + order.durationDays * 24 * 60 * 60 * 1000);
    order.expiresAt = newExpires.toISOString().split('T')[0];
    this.saveOrders();

    this.logAdminActivity('RUNTIME_EXTENDED', this.adminSession?.adminId || 'ADMIN', `Extended order ${id} by +${additionalDays} days`);
    return order;
  }

  // --- PAYMENT SETTINGS ---
  public getPaymentSettings(): PaymentSettings {
    return { ...this.paymentSettings };
  }

  public updatePaymentSettings(updates: Partial<PaymentSettings>): PaymentSettings {
    this.paymentSettings = { ...this.paymentSettings, ...updates };
    this.savePaymentSettings();
    this.logAdminActivity('SETTINGS_UPDATED', this.adminSession?.adminId || 'ADMIN', 'Updated payment gateway settings');
    return { ...this.paymentSettings };
  }

  // --- STATS ---
  public getStats(): AdminStats {
    const totalUsers = this.users.length;
    const activeUsers = this.users.filter(u => u.status === 'ACTIVE').length;
    const activeModules = this.modules.filter(m => m.status === 'ACTIVE').length;
    const totalOrders = this.orders.length;
    const paidOrders = this.orders.filter(o => o.paymentStatus === 'VERIFIED').length;
    const pendingOrders = this.orders.filter(o => o.paymentStatus === 'PENDING').length;
    const totalRevenue = this.orders
      .filter(o => o.paymentStatus === 'VERIFIED')
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    return {
      totalUsers,
      activeUsers,
      activeModules,
      totalOrders,
      paidOrders,
      pendingOrders,
      totalRevenue,
      systemStatus: 'ONLINE (QUANTUM SECURED)',
      quantumEntropy: '99.984%'
    };
  }

  // Reset all to default factory state
  public resetToDefault() {
    this.users = [...DEFAULT_USERS];
    this.modules = [...INITIAL_MODULES];
    this.plans = [...DEFAULT_PLANS];
    this.orders = [...INITIAL_ORDERS];
    this.logs = [...INITIAL_LOGS];
    this.activityLogs = [];
    this.paymentSettings = { ...DEFAULT_PAYMENT_SETTINGS };
    this.adminCredentials = { ...DEFAULT_ADMIN_CREDS };
    this.userSession = null;
    this.adminSession = null;

    Object.values(STORAGE_KEYS).forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });

    this.saveUsers();
    this.saveModules();
    this.savePlans();
    this.saveOrders();
    this.saveLogs();
    this.savePaymentSettings();
    this.notify();
  }
}

export const appStore = new AppStore();
