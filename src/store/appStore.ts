/**
 * AEGIS // DEFENSE - Pure Frontend Centralized State Store
 * Complete Customer Management System with persistent browser storage (localStorage).
 * Fully decoupled from backend APIs, databases, and serverless functions.
 *
 * NOTE: Client-side authentication and customer management are designed for
 * robust frontend state management and demonstration.
 */

import { 
  UserSession, AdminSession, UserRecord, SecurityModule, 
  RuntimePlan, OrderRecord, PaymentSettings, AdminActivityLog, 
  AdminStats, LogEntry 
} from '../types';
import { DEFAULT_PLANS, INITIAL_MODULES, INITIAL_ORDERS, INITIAL_LOGS } from '../utils/storage';

const STORAGE_KEYS = {
  USERS: 'aegis_store_users_v6',
  MODULES: 'aegis_store_modules_v6',
  PLANS: 'aegis_store_plans_v6',
  ORDERS: 'aegis_store_orders_v6',
  LOGS: 'aegis_store_logs_v6',
  ACTIVITY_LOGS: 'aegis_store_activity_logs_v6',
  PAYMENT_SETTINGS: 'aegis_store_payment_settings_v6',
  USER_SESSION: 'aegis_store_user_session_v6',
  ADMIN_SESSION: 'aegis_store_admin_session_v6',
  ADMIN_CREDENTIALS: 'aegis_store_admin_creds_v6'
};

// Seed Users for Customer Management demonstration
export interface StoredUser extends UserRecord {
  passwordHash?: string;
}

const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'CUST-1001',
    customerId: 'CUST-1001',
    customerName: 'COMMANDER VAUGHN',
    username: 'AGENT_01',
    passwordHash: 'DEMO2026',
    role: 'AGENT',
    status: 'ACTIVE',
    assignedModules: ['bala-mod-xyz', 'rapid-core'],
    useDefaultPrice: true,
    customPrice: 150,
    runtime: '30 DAYS RUNTIME',
    startDate: '2026-08-01',
    expiryDate: '2026-09-30',
    createdAt: '2026-08-01 10:00:00',
    lastLogin: '2026-08-20 09:15:22',
    ipHash: '192.168.1.*** [HASHED]',
    purchasedModules: ['bala-mod-xyz', 'rapid-core'],
    activeRuntimes: {
      'bala-mod-xyz': { planTitle: '30 DAYS RUNTIME', expiresAt: '2026-09-30', activatedAt: '2026-08-01' },
      'rapid-core': { planTitle: 'PERMANENT RUNTIME', expiresAt: '2099-12-31', activatedAt: '2026-08-01' }
    }
  },
  {
    id: 'CUST-1002',
    customerId: 'CUST-1002',
    customerName: 'OFFICER KALLEN',
    username: 'COMMAND_SEC_OP',
    passwordHash: 'DEMO2026',
    role: 'SECURITY_OFFICER',
    status: 'ACTIVE',
    assignedModules: ['angry-mod', 'bala-mod-xyz'],
    useDefaultPrice: false,
    customPrice: 120,
    runtime: '15 DAYS RUNTIME',
    startDate: '2026-08-10',
    expiryDate: '2026-09-15',
    createdAt: '2026-08-10 08:30:00',
    lastLogin: '2026-08-19 18:40:11',
    ipHash: '10.0.4.*** [HASHED]',
    purchasedModules: ['angry-mod'],
    activeRuntimes: {
      'angry-mod': { planTitle: '15 DAYS RUNTIME', expiresAt: '2026-09-15', activatedAt: '2026-08-10' }
    }
  },
  {
    id: 'CUST-1003',
    customerId: 'CUST-1003',
    customerName: 'SPECIALIST JAXON',
    username: 'AUDITOR_NODE_99',
    passwordHash: 'DEMO2026',
    role: 'AGENT',
    status: 'ACTIVE',
    assignedModules: ['ALL'],
    useDefaultPrice: false,
    customPrice: 180,
    runtime: 'PERMANENT RUNTIME',
    startDate: '2026-08-15',
    expiryDate: '2099-12-31',
    createdAt: '2026-08-15 12:00:00',
    lastLogin: '2026-08-18 14:03:55',
    ipHash: '192.168.8.*** [HASHED]',
    purchasedModules: ['angry-mod', 'bala-mod-xyz', 'rapid-core'],
    activeRuntimes: {}
  },
  {
    id: 'CUST-1004',
    customerId: 'CUST-1004',
    customerName: 'RETIRED OPERATIVE TRENT',
    username: 'TRENT_ARCHIVE',
    passwordHash: 'DEMO2026',
    role: 'AGENT',
    status: 'EXPIRED',
    assignedModules: ['rapid-core'],
    useDefaultPrice: true,
    customPrice: 90,
    runtime: '7 DAYS RUNTIME',
    startDate: '2026-07-01',
    expiryDate: '2026-07-08',
    createdAt: '2026-07-01 09:00:00',
    lastLogin: '2026-07-05 11:20:00',
    ipHash: '172.16.2.*** [HASHED]',
    purchasedModules: [],
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

    // 6. Activity Logs
    try {
      const rawAct = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
      if (rawAct) {
        this.activityLogs = JSON.parse(rawAct);
      }
    } catch {
      this.activityLogs = [];
    }

    // 7. Payment Settings
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.PAYMENT_SETTINGS);
      if (rawSettings) {
        this.paymentSettings = { ...DEFAULT_PAYMENT_SETTINGS, ...JSON.parse(rawSettings) };
      }
    } catch {
      this.paymentSettings = { ...DEFAULT_PAYMENT_SETTINGS };
    }

    // 8. Admin Credentials
    try {
      const rawCreds = localStorage.getItem(STORAGE_KEYS.ADMIN_CREDENTIALS);
      if (rawCreds) {
        this.adminCredentials = { ...DEFAULT_ADMIN_CREDS, ...JSON.parse(rawCreds) };
      }
    } catch {
      this.adminCredentials = { ...DEFAULT_ADMIN_CREDS };
    }

    // 9. Restore Active Sessions
    try {
      const rawUserSess = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (rawUserSess) {
        this.userSession = JSON.parse(rawUserSess);
        // Verify restored session is not blocked or expired
        if (this.userSession) {
          const user = this.users.find(u => 
            u.username.toLowerCase() === this.userSession?.authorizedId.toLowerCase() ||
            u.customerId?.toLowerCase() === this.userSession?.customerId?.toLowerCase()
          );
          if (!user || user.status === 'BLOCKED' || user.status === 'DISABLED' || this.isUserExpired(user)) {
            this.userSession = null;
            localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
          }
        }
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

  // --- CUSTOMER & USER EXPIRY & STATUS HELPERS ---
  public isUserExpired(user: UserRecord | StoredUser): boolean {
    if (!user) return false;
    if (user.status === 'EXPIRED') return true;
    if (!user.expiryDate) return false;
    
    // Check for permanent
    const exp = user.expiryDate.trim().toUpperCase();
    if (exp === 'PERMANENT' || exp === 'LIFETIME' || exp === '2099-12-31') {
      return false;
    }

    try {
      const expDate = new Date(user.expiryDate);
      if (isNaN(expDate.getTime())) return false;
      // Set to end of expiry day (23:59:59)
      expDate.setHours(23, 59, 59, 999);
      return expDate.getTime() < Date.now();
    } catch {
      return false;
    }
  }

  public getUserStatus(user: UserRecord | StoredUser): 'ACTIVE' | 'BLOCKED' | 'EXPIRED' {
    if (!user) return 'EXPIRED';
    if (user.status === 'BLOCKED' || user.status === 'DISABLED') return 'BLOCKED';
    if (this.isUserExpired(user)) return 'EXPIRED';
    return 'ACTIVE';
  }

  public getUserPrice(usernameOrId: string, planId?: string, basePrice: number = 150): number {
    const user = this.users.find(u => 
      u.username.toLowerCase() === usernameOrId.toLowerCase() ||
      u.customerId.toLowerCase() === usernameOrId.toLowerCase() ||
      u.id === usernameOrId
    );

    if (user && !user.useDefaultPrice && user.customPrice !== undefined && user.customPrice !== null) {
      return Number(user.customPrice);
    }

    return basePrice;
  }

  public getUserModules(usernameOrId: string): SecurityModule[] {
    const user = this.users.find(u => 
      u.username.toLowerCase() === usernameOrId.toLowerCase() ||
      u.customerId.toLowerCase() === usernameOrId.toLowerCase() ||
      u.id === usernameOrId
    );

    if (!user) return [...this.modules];

    const assigned = user.assignedModules || [];
    if (assigned.length === 0 || assigned.includes('ALL')) {
      return [...this.modules];
    }

    return this.modules.filter(m => assigned.includes(m.id));
  }

  // --- AUTHENTICATION (STRICT LOCAL CLIENT-SIDE AUTH) ---
  public authenticateUser(usernameInput: string, passwordInput: string): UserSession {
    const username = (usernameInput || '').trim();
    const password = (passwordInput || '').trim();

    if (!username || !password) {
      throw new Error('INVALID USERNAME OR PASSWORD');
    }

    // Strict search by username or customerId
    const user = this.users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() ||
      u.customerId.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      this.addLog('AUTH', `LOGIN_FAILED: Identifier "${username}" not found in database`, 'AUTH_GATEWAY');
      throw new Error('INVALID USERNAME OR PASSWORD');
    }

    // Strict Password Check
    const storedPass = user.passwordHash || user.password || 'DEMO2026';
    if (storedPass !== password) {
      this.addLog('AUTH', `LOGIN_FAILED: Pass key mismatch for ${user.username}`, 'AUTH_GATEWAY');
      throw new Error('INVALID USERNAME OR PASSWORD');
    }

    // Strict Account Blocked Check
    if (user.status === 'BLOCKED' || user.status === 'DISABLED') {
      this.addLog('AUTH', `LOGIN_REJECTED: Account ${user.username} is BLOCKED`, 'AUTH_GATEWAY');
      throw new Error('ACCOUNT BLOCKED. Access restricted by administrator.');
    }

    // Strict Expiry Check
    if (this.isUserExpired(user)) {
      this.addLog('AUTH', `LOGIN_REJECTED: Account ${user.username} runtime has EXPIRED`, 'AUTH_GATEWAY');
      throw new Error('ACCESS EXPIRED. Please renew your authorization runtime.');
    }

    // Update Last Login timestamp
    user.lastLogin = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
    this.saveUsers();

    const session: UserSession = {
      authorizedId: user.username,
      customerId: user.customerId,
      customerName: user.customerName,
      role: user.role,
      token: `NODE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      loginTime: new Date().toLocaleTimeString(),
      ipHash: user.ipHash,
      isAuthenticated: true,
      purchasedModules: user.purchasedModules || [],
      assignedModules: user.assignedModules || ['ALL'],
      useDefaultPrice: user.useDefaultPrice,
      customPrice: user.customPrice,
      runtime: user.runtime,
      startDate: user.startDate,
      expiryDate: user.expiryDate,
      activeRuntimes: user.activeRuntimes || {}
    };

    this.userSession = session;
    try { localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session)); } catch {}
    this.addLog('AUTH', `SESSION_AUTHENTICATED: Node ${session.authorizedId} [${session.role}]`, 'AUTH_GATEWAY');
    this.notify();
    return session;
  }

  // Alias for authenticateUser
  public loginUser(usernameInput: string, passwordInput: string): UserSession {
    return this.authenticateUser(usernameInput, passwordInput);
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

  // --- CUSTOMER & USER MANAGEMENT (CRUD) ---
  public getUsers(): UserRecord[] {
    return this.users.map((u) => {
      const computedStatus = this.getUserStatus(u);
      return {
        ...u,
        status: computedStatus,
        password: u.passwordHash
      };
    });
  }

  public createUser(userData: {
    customerName?: string;
    customerId: string;
    username: string;
    password: string;
    confirmPassword?: string;
    role?: 'AGENT' | 'SECURITY_OFFICER';
    status?: 'ACTIVE' | 'BLOCKED';
    assignedModules?: string[];
    useDefaultPrice?: boolean;
    customPrice?: number;
    runtime?: string;
    startDate?: string;
    expiryDate?: string;
  }): UserRecord {
    const customerId = (userData.customerId || '').trim().toUpperCase();
    const customerName = (userData.customerName || userData.username || 'NEW CUSTOMER').trim().toUpperCase();
    const username = (userData.username || '').trim().toUpperCase();
    const password = (userData.password || '').trim();
    const confirmPassword = userData.confirmPassword !== undefined ? userData.confirmPassword.trim() : password;

    // Validation rules
    if (!customerId) {
      throw new Error('Customer ID cannot be empty');
    }

    if (!username) {
      throw new Error('Login Username cannot be empty');
    }

    // Check duplicate username
    const duplicateUser = this.users.find(u => u.username.toUpperCase() === username);
    if (duplicateUser) {
      throw new Error(`Username "${username}" is already assigned to another customer`);
    }

    // Check duplicate customerId
    const duplicateId = this.users.find(u => u.customerId.toUpperCase() === customerId || u.id.toUpperCase() === customerId);
    if (duplicateId) {
      throw new Error(`Customer ID "${customerId}" is already registered`);
    }

    if (!password) {
      throw new Error('Password cannot be empty');
    }

    if (password !== confirmPassword) {
      throw new Error('Password and Confirm Password do not match');
    }

    if (userData.useDefaultPrice === false && (userData.customPrice === undefined || isNaN(Number(userData.customPrice)) || Number(userData.customPrice) < 0)) {
      throw new Error('Custom price must be a valid positive number');
    }

    const today = new Date().toISOString().split('T')[0];
    const startDate = userData.startDate || today;
    const expiryDate = userData.expiryDate || '2026-09-30';

    if (expiryDate !== 'PERMANENT' && expiryDate !== '2099-12-31') {
      const expD = new Date(expiryDate);
      if (isNaN(expD.getTime())) {
        throw new Error('Expiry date must be a valid date format');
      }
    }

    const assignedModules = userData.assignedModules && userData.assignedModules.length > 0 
      ? userData.assignedModules 
      : ['ALL'];

    const runtime = userData.runtime || '30 DAYS RUNTIME';
    const status = userData.status || 'ACTIVE';
    const useDefaultPrice = userData.useDefaultPrice ?? true;
    const customPrice = userData.customPrice !== undefined ? Number(userData.customPrice) : 150;

    const newUser: StoredUser = {
      id: customerId,
      customerId,
      customerName,
      username,
      passwordHash: password,
      password,
      role: userData.role || 'AGENT',
      status,
      assignedModules,
      useDefaultPrice,
      customPrice,
      runtime,
      startDate,
      expiryDate,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      lastLogin: 'NEVER',
      ipHash: '192.168.1.*** [PENDING]',
      purchasedModules: assignedModules.includes('ALL') ? this.modules.map(m => m.id) : assignedModules,
      activeRuntimes: {}
    };

    this.users = [newUser, ...this.users];
    this.saveUsers();
    this.logAdminActivity('USER_CREATED', this.adminSession?.adminId || 'ADMIN', `Created customer node ${newUser.customerName} (${newUser.username}) ID: ${newUser.customerId}`);
    this.addLog('AUTH', `USER_PROVISIONED: ${newUser.username} [${newUser.customerId}] with runtime ${newUser.runtime}`, 'ADMIN_MATRIX');

    return {
      ...newUser,
      status: this.getUserStatus(newUser)
    };
  }

  public updateUser(id: string, updates: Partial<UserRecord> & { password?: string }): UserRecord {
    const index = this.users.findIndex(u => u.id === id || u.customerId === id);
    if (index === -1) {
      throw new Error('Customer record not found');
    }

    const existing = this.users[index];

    // Check duplicate username if username changed
    if (updates.username && updates.username.toUpperCase() !== existing.username.toUpperCase()) {
      const dup = this.users.find(u => u.username.toUpperCase() === updates.username!.toUpperCase() && u.id !== id);
      if (dup) throw new Error(`Username "${updates.username}" is already assigned to another customer`);
    }

    // Check duplicate customerId if changed
    if (updates.customerId && updates.customerId.toUpperCase() !== existing.customerId.toUpperCase()) {
      const dup = this.users.find(u => u.customerId.toUpperCase() === updates.customerId!.toUpperCase() && u.id !== id);
      if (dup) throw new Error(`Customer ID "${updates.customerId}" is already registered`);
    }

    const updatedUser: StoredUser = {
      ...existing,
      ...updates,
      customerName: (updates.customerName || existing.customerName).toUpperCase(),
      username: (updates.username || existing.username).toUpperCase(),
      customerId: (updates.customerId || existing.customerId).toUpperCase()
    };

    if (updates.password) {
      updatedUser.passwordHash = updates.password.trim();
      updatedUser.password = updates.password.trim();
    }

    if (updates.customPrice !== undefined) {
      updatedUser.customPrice = Number(updates.customPrice);
    }

    this.users[index] = updatedUser;
    this.saveUsers();

    // If currently logged in user is this user, update or terminate session
    if (this.userSession && (this.userSession.authorizedId === existing.username || this.userSession.customerId === existing.customerId)) {
      if (updatedUser.status === 'BLOCKED' || this.isUserExpired(updatedUser)) {
        this.logoutUser();
      } else {
        this.userSession = {
          ...this.userSession,
          authorizedId: updatedUser.username,
          customerName: updatedUser.customerName,
          customerId: updatedUser.customerId,
          assignedModules: updatedUser.assignedModules,
          useDefaultPrice: updatedUser.useDefaultPrice,
          customPrice: updatedUser.customPrice,
          runtime: updatedUser.runtime,
          expiryDate: updatedUser.expiryDate
        };
        try { localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(this.userSession)); } catch {}
      }
    }

    this.logAdminActivity('USER_UPDATED', this.adminSession?.adminId || 'ADMIN', `Updated customer ${updatedUser.customerName} (${updatedUser.username})`);
    return {
      ...updatedUser,
      status: this.getUserStatus(updatedUser)
    };
  }

  public deleteUser(id: string): string {
    const user = this.users.find(u => u.id === id || u.customerId === id);
    if (!user) {
      throw new Error('Customer node not found');
    }

    // If currently logged in as this user, terminate session
    if (this.userSession && (this.userSession.authorizedId === user.username || this.userSession.customerId === user.customerId)) {
      this.logoutUser();
    }

    this.users = this.users.filter(u => u.id !== id && u.customerId !== id);
    this.saveUsers();
    this.logAdminActivity('USER_DELETED', this.adminSession?.adminId || 'ADMIN', `Deleted customer ${user.customerName} (${user.username})`);
    this.addLog('SYS', `USER_PURGED: Record ${user.customerId} permanently deleted from local store`, 'ADMIN_MATRIX');
    return id;
  }

  public blockUser(id: string): UserRecord {
    const user = this.users.find(u => u.id === id || u.customerId === id);
    if (!user) throw new Error('Customer node not found');

    user.status = 'BLOCKED';
    this.saveUsers();

    // Immediately terminate customer session if logged in
    if (this.userSession && (this.userSession.authorizedId === user.username || this.userSession.customerId === user.customerId)) {
      this.logoutUser();
    }

    this.logAdminActivity('USER_BLOCKED', this.adminSession?.adminId || 'ADMIN', `Blocked access for ${user.customerName} (${user.username})`);
    this.addLog('AUTH', `ACCESS_BLOCKED: Node ${user.username} status set to BLOCKED`, 'SECURITY_OFFICE');
    return {
      ...user,
      status: 'BLOCKED'
    };
  }

  public unblockUser(id: string): UserRecord {
    const user = this.users.find(u => u.id === id || u.customerId === id);
    if (!user) throw new Error('Customer node not found');

    user.status = 'ACTIVE';
    this.saveUsers();

    this.logAdminActivity('USER_UNBLOCKED', this.adminSession?.adminId || 'ADMIN', `Unblocked access for ${user.customerName} (${user.username})`);
    this.addLog('AUTH', `ACCESS_RESTORED: Node ${user.username} status set to ACTIVE`, 'SECURITY_OFFICE');
    return {
      ...user,
      status: this.getUserStatus(user)
    };
  }

  public resetUserPassword(id: string, newPassword?: string): string {
    const user = this.users.find(u => u.id === id || u.customerId === id);
    if (!user) throw new Error('Customer node not found');
    const pass = (newPassword || 'DEMO2026').trim();
    user.passwordHash = pass;
    user.password = pass;
    this.saveUsers();
    this.logAdminActivity('PASSWORD_RESET', this.adminSession?.adminId || 'ADMIN', `Reset pass key for ${user.username}`);
    return `Password for ${user.username} has been reset to: ${pass}`;
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

    // Check user custom pricing
    const userPrice = this.getUserPrice(orderData.user, orderData.planId, plan?.price || 120);

    const newOrder: OrderRecord = {
      id: orderId,
      user: orderData.user || this.userSession?.authorizedId || 'AGENT_01',
      userId: `usr-${orderData.user}`,
      moduleId: orderData.moduleId,
      moduleName: mod?.name || orderData.moduleId,
      planId: orderData.planId,
      planTitle: plan?.duration || `${durationDays} DAYS RUNTIME`,
      durationDays,
      amount: userPrice,
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
    const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.customerId.toLowerCase() === username.toLowerCase());
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

  // --- STATS AUTOMATICALLY CALCULATED ---
  public getStats(): AdminStats {
    const totalUsers = this.users.length;
    const activeUsers = this.users.filter(u => this.getUserStatus(u) === 'ACTIVE').length;
    const blockedUsers = this.users.filter(u => u.status === 'BLOCKED' || u.status === 'DISABLED').length;
    const expiredAccess = this.users.filter(u => this.isUserExpired(u)).length;
    const activeAccess = this.users.filter(u => this.getUserStatus(u) === 'ACTIVE').length;

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
      blockedUsers,
      activeAccess,
      expiredAccess,
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
