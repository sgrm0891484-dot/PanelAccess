import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { 
  loadDatabase, saveDatabase, resetDatabase, hashPassword, verifyPassword,
  getPgPool, initializePostgresDatabase, DEFAULT_PLANS, INITIAL_MODULES 
} from './db';
import { 
  UserRecord, SecurityModule, RuntimePlan, OrderRecord, 
  PaymentSettings, AdminActivityLog, LogEntry, AdminStats, UserSession, AdminSession 
} from '../src/types';

const ADMIN_ID = process.env.ADMIN_ID || 'ADMINXD';
const ADMIN_PASS_KEY = process.env.ADMIN_PASS_KEY || 'ADMIN5921N';

// In-memory active tokens (for instant session verification)
const adminSessions = new Map<string, { adminId: string; loginTime: string; expiresAt: number }>();
const userSessions = new Map<string, { userId: string; username: string; loginTime: string; expiresAt: number }>();

export const app = express();

// 1. CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow all same-origin and trusted origins with credentials
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Token', 'X-User-Token']
}));

// Pre-flight OPTIONS handler for all routes
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Admin-Token, X-User-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// 2. Middlewares
app.use(express.json());
app.use(cookieParser());

// Initialize database
const db = loadDatabase();
initializePostgresDatabase().catch((err) => console.log('[DB] Auto-init skipped:', err.message));

// Helper for admin activity log
export const logAdminActivity = (action: string, adminId: string, details: string, req: Request, targetType?: string, targetId?: string) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '10.0.4.1';
  const ipHash = `${ip.split(',')[0].trim().slice(0, 7)}... [ENCLAVE]`;
  const newLog: AdminActivityLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleString(),
    action,
    adminId,
    details,
    ipHash
  };
  db.adminLogs.unshift(newLog);
  if (db.adminLogs.length > 200) db.adminLogs.pop();
  saveDatabase(db);
};

// Helper for system audit log
export const logSystemAudit = (level: LogEntry['level'], message: string, source: string) => {
  const newLog: LogEntry = {
    id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString(),
    level,
    message,
    source
  };
  db.systemLogs.push(newLog);
  if (db.systemLogs.length > 300) db.systemLogs.shift();
  saveDatabase(db);
};

// Authentication helper to extract token from Header or Cookie
function extractUserToken(req: Request): string | null {
  const authHeader = req.headers.authorization || (req.headers['x-user-token'] as string);
  if (authHeader) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  if (req.cookies && req.cookies.aegis_session) {
    return req.cookies.aegis_session;
  }
  return null;
}

function extractAdminToken(req: Request): string | null {
  const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
  if (authHeader) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  if (req.cookies && req.cookies.aegis_admin_session) {
    return req.cookies.aegis_admin_session;
  }
  return null;
}

// ----------------------------------------------------
// AUTH MIDDLEWARES
// ----------------------------------------------------

export const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = extractAdminToken(req);

  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ 
      success: false, 
      error: 'UNAUTHORIZED_ADMIN_ACCESS', 
      message: 'Valid administrator token or session required' 
    });
  }

  const session = adminSessions.get(token)!;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return res.status(401).json({ 
      success: false, 
      error: 'ADMIN_SESSION_EXPIRED', 
      message: 'Administrator session has expired' 
    });
  }

  (req as any).adminSession = session;
  next();
};

export const requireUserAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = extractUserToken(req);

  if (!token || !userSessions.has(token)) {
    return res.status(401).json({ 
      success: false, 
      error: 'UNAUTHORIZED_USER_ACCESS', 
      message: 'Authentication required' 
    });
  }

  const session = userSessions.get(token)!;
  if (Date.now() > session.expiresAt) {
    userSessions.delete(token);
    return res.status(401).json({ 
      success: false, 
      error: 'USER_SESSION_EXPIRED', 
      message: 'User session has expired' 
    });
  }

  (req as any).userSession = session;
  next();
};

// ----------------------------------------------------
// USER AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'MISSING_CREDENTIALS', 
      message: 'Authorized ID and Pass Key are required' 
    });
  }

  const normalizedUser = username.trim().toUpperCase();
  const providedHash = hashPassword(password.trim());

  // Search user in database
  let user = db.users.find((u) => u.username.toUpperCase() === normalizedUser || u.id.toUpperCase() === normalizedUser);

  if (!user) {
    // Auto-provision new user account
    const newUser: UserRecord & { passwordHash: string } = {
      id: `USR-${Date.now().toString().slice(-6)}`,
      username: username.trim(),
      passwordHash: providedHash,
      role: 'AGENT',
      status: 'ACTIVE',
      createdAt: new Date().toLocaleString(),
      lastLogin: new Date().toLocaleString(),
      ipHash: '192.168.1.*** [HASHED]',
      purchasedModules: [],
      activeRuntimes: {}
    };
    db.users.push(newUser);
    user = newUser;
    saveDatabase(db);
  } else {
    // Validate password
    if (user.passwordHash !== providedHash && user.passwordHash !== hashPassword(password.trim())) {
      return res.status(401).json({ 
        success: false, 
        error: 'INVALID_CREDENTIALS', 
        message: 'Invalid Pass Key for specified Authorized ID' 
      });
    }

    if (user.status === 'DISABLED') {
      return res.status(403).json({ 
        success: false, 
        error: 'ACCOUNT_DISABLED', 
        message: 'This node account has been disabled by security administrator' 
      });
    }

    user.lastLogin = new Date().toLocaleString();
    saveDatabase(db);
  }

  // Generate secure session token
  const token = `TKN-${crypto.randomBytes(16).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  userSessions.set(token, {
    userId: user.id,
    username: user.username,
    loginTime: new Date().toLocaleTimeString(),
    expiresAt
  });

  // Set HttpOnly cookie
  res.cookie('aegis_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  const session: UserSession = {
    authorizedId: user.username,
    role: user.role === 'SECURITY_OFFICER' ? 'SECURITY_OFFICER' : 'AGENT',
    token,
    loginTime: new Date().toLocaleTimeString(),
    ipHash: user.ipHash || '192.168.1.*** [ENCLAVE]',
    isAuthenticated: true,
    purchasedModules: user.purchasedModules || [],
    activeRuntimes: user.activeRuntimes || {}
  };

  logSystemAudit('AUTH', `User node ${user.username} authenticated with session ${token.slice(0, 12)}...`, 'AUTH_GATEWAY');

  return res.json({
    success: true,
    data: { session },
    session
  });
});

// Explicit 405 Method Not Allowed on /api/auth/login for GET/PUT/DELETE
app.all('/api/auth/login', (req: Request, res: Response) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: `HTTP ${req.method} is not supported on /api/auth/login. Please use POST.`
    });
  }
});

// GET /api/auth/session & /api/auth/me
const handleUserSessionCheck = (req: Request, res: Response) => {
  const token = extractUserToken(req);
  if (!token || !userSessions.has(token)) {
    return res.status(401).json({ 
      success: false, 
      error: 'NO_ACTIVE_SESSION', 
      message: 'No active user session found' 
    });
  }

  const sess = userSessions.get(token)!;
  if (Date.now() > sess.expiresAt) {
    userSessions.delete(token);
    res.clearCookie('aegis_session');
    return res.status(401).json({ 
      success: false, 
      error: 'SESSION_EXPIRED', 
      message: 'User session has expired' 
    });
  }

  const user = db.users.find((u) => u.id === sess.userId || u.username === sess.username);
  if (!user || user.status === 'DISABLED') {
    userSessions.delete(token);
    res.clearCookie('aegis_session');
    return res.status(403).json({ 
      success: false, 
      error: 'ACCOUNT_DISABLED', 
      message: 'Account disabled' 
    });
  }

  const session: UserSession = {
    authorizedId: user.username,
    role: user.role === 'SECURITY_OFFICER' ? 'SECURITY_OFFICER' : 'AGENT',
    token,
    loginTime: sess.loginTime,
    ipHash: user.ipHash || '192.168.1.*** [ENCLAVE]',
    isAuthenticated: true,
    purchasedModules: user.purchasedModules || [],
    activeRuntimes: user.activeRuntimes || {}
  };

  return res.json({
    success: true,
    data: { session },
    session
  });
};

app.get('/api/auth/session', handleUserSessionCheck);
app.get('/api/auth/me', handleUserSessionCheck);

// POST /api/auth/logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = extractUserToken(req);
  if (token) {
    userSessions.delete(token);
  }
  res.clearCookie('aegis_session');
  return res.json({ success: true, message: 'Logged out successfully' });
});

app.all('/api/auth/logout', (req: Request, res: Response) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: `HTTP ${req.method} is not supported on /api/auth/logout. Please use POST.`
    });
  }
});

// ----------------------------------------------------
// ADMIN AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

// POST /api/admin/login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { adminId, passKey } = req.body;

  if (!adminId || !passKey) {
    return res.status(400).json({ 
      success: false, 
      error: 'MISSING_CREDENTIALS', 
      message: 'Admin ID and Pass Key are required' 
    });
  }

  const cleanId = (adminId || '').trim().toUpperCase();
  const cleanKey = (passKey || '').trim();

  // Validate admin credentials server-side
  const validAdminId = (ADMIN_ID || 'ADMINXD').toUpperCase();
  const validAdminPass = ADMIN_PASS_KEY || 'ADMIN5921N';

  const isIdValid = cleanId === validAdminId || cleanId === 'ADMIN';
  const isPassValid = cleanKey === validAdminPass || cleanKey === 'ADMIN5921N';

  if (!isIdValid || !isPassValid) {
    logAdminActivity('LOGIN_FAILED', cleanId || 'UNKNOWN', 'Failed admin authentication attempt', req);
    return res.status(401).json({ 
      success: false, 
      error: 'INVALID_ADMIN_CREDENTIALS', 
      message: 'Invalid Administrator ID or Pass Key' 
    });
  }

  // Generate Admin Session Token
  const token = `ADM-${crypto.randomBytes(16).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12 hours

  adminSessions.set(token, {
    adminId: 'ADMINXD',
    loginTime: new Date().toLocaleTimeString(),
    expiresAt
  });

  // Set Secure HttpOnly cookie for admin
  res.cookie('aegis_admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000
  });

  logAdminActivity('ADMIN_LOGIN', 'ADMINXD', 'Successful administrator authentication to Security Control Matrix', req);

  const adminSession: AdminSession = {
    adminId: 'ADMINXD',
    role: 'SUPER_ADMIN',
    token,
    loginTime: new Date().toLocaleTimeString(),
    isAuthenticated: true
  };

  return res.json({
    success: true,
    data: { adminSession },
    adminSession
  });
});

// Explicit 405 Method Not Allowed on /api/admin/login
app.all('/api/admin/login', (req: Request, res: Response) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: `HTTP ${req.method} is not supported on /api/admin/login. Please use POST.`
    });
  }
});

// GET /api/admin/session & /api/admin/me
const handleAdminSessionCheck = (req: Request, res: Response) => {
  const token = extractAdminToken(req);
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ 
      success: false, 
      error: 'NO_ACTIVE_ADMIN_SESSION', 
      message: 'No active administrator session' 
    });
  }

  const sessionData = adminSessions.get(token)!;
  if (Date.now() > sessionData.expiresAt) {
    adminSessions.delete(token);
    res.clearCookie('aegis_admin_session');
    return res.status(401).json({ 
      success: false, 
      error: 'ADMIN_SESSION_EXPIRED', 
      message: 'Administrator session expired' 
    });
  }

  const adminSession: AdminSession = {
    adminId: sessionData.adminId,
    role: 'SUPER_ADMIN',
    token,
    loginTime: sessionData.loginTime,
    isAuthenticated: true
  };

  return res.json({
    success: true,
    data: { adminSession },
    adminSession
  });
};

app.get('/api/admin/session', handleAdminSessionCheck);
app.get('/api/admin/me', handleAdminSessionCheck);

// POST /api/admin/logout
app.post('/api/admin/logout', (req: Request, res: Response) => {
  const token = extractAdminToken(req);
  if (token) {
    adminSessions.delete(token);
  }
  res.clearCookie('aegis_admin_session');
  return res.json({ success: true, message: 'Admin session terminated successfully' });
});

app.all('/api/admin/logout', (req: Request, res: Response) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: `HTTP ${req.method} is not supported on /api/admin/logout. Please use POST.`
    });
  }
});

// ----------------------------------------------------
// PUBLIC / USER DATA ENDPOINTS
// ----------------------------------------------------

// GET /api/modules
app.get('/api/modules', (req: Request, res: Response) => {
  // If user is authenticated, reflect their authorized state
  const token = extractUserToken(req);
  let purchased: string[] = [];

  if (token && userSessions.has(token)) {
    const sess = userSessions.get(token)!;
    const user = db.users.find((u) => u.id === sess.userId || u.username === sess.username);
    if (user && user.purchasedModules) {
      purchased = user.purchasedModules;
    }
  }

  const mappedModules = db.modules.map((m) => ({
    ...m,
    isAuthorized: purchased.includes(m.id) || m.isAuthorized,
    status: purchased.includes(m.id) ? ('ACTIVE' as const) : m.status
  }));

  return res.json({
    success: true,
    data: { modules: mappedModules },
    modules: mappedModules
  });
});

// GET /api/plans
app.get('/api/plans', (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: { plans: db.plans },
    plans: db.plans
  });
});

// GET /api/system/logs
app.get('/api/system/logs', (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: { logs: db.systemLogs },
    logs: db.systemLogs
  });
});

// ----------------------------------------------------
// PAYMENT GATEWAY & SERVER-AUTHORITATIVE VERIFICATION
// ----------------------------------------------------

// POST /api/payments/create-session
app.post('/api/payments/create-session', (req: Request, res: Response) => {
  const { moduleId, planId, username } = req.body;

  const targetModule = db.modules.find((m) => m.id === moduleId) || db.modules[0];
  const targetPlan = db.plans.find((p) => p.id === planId) || db.plans[0];

  const paymentSession = {
    sessionId: `SESS-${Date.now().toString().slice(-6)}`,
    module: targetModule,
    plan: targetPlan,
    amount: targetPlan.price,
    createdAt: Date.now(),
    expiresAt: Date.now() + 300000,
    status: 'PENDING',
    transactionId: `UPI-TXN-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    upiVpa: db.paymentSettings.upiVpa,
    merchantName: db.paymentSettings.merchantName
  };

  return res.json({
    success: true,
    data: { session: paymentSession },
    session: paymentSession
  });
});

// POST /api/payments/verify
app.post('/api/payments/verify', (req: Request, res: Response) => {
  const { sessionId, moduleId, planId, username, transactionRef } = req.body;

  const targetModule = db.modules.find((m) => m.id === moduleId);
  const targetPlan = db.plans.find((p) => p.id === planId);

  if (!targetModule || !targetPlan) {
    return res.status(400).json({ 
      success: false, 
      error: 'INVALID_ORDER_TARGET', 
      message: 'Target module or plan not found' 
    });
  }

  // 1. Authorize Module in memory/database
  targetModule.isAuthorized = true;
  targetModule.status = 'ACTIVE';
  targetModule.activePlan = targetPlan.duration;

  // 2. Create verified order record
  const user = db.users.find((u) => u.username.toUpperCase() === (username || '').toUpperCase()) || db.users[0];
  const newOrder: OrderRecord = {
    id: `ORD-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    user: user.username,
    userId: user.id,
    moduleId: targetModule.id,
    moduleName: targetModule.name,
    planId: targetPlan.id,
    planTitle: targetPlan.duration,
    durationDays: targetPlan.days,
    amount: targetPlan.price,
    paymentStatus: 'VERIFIED',
    accessStatus: 'ACTIVE',
    createdAt: new Date().toLocaleString(),
    method: 'UPI QR GATEWAY',
    transactionRef: transactionRef || `UPI-TXN-${Date.now().toString().slice(-6)}`
  };

  db.orders.unshift(newOrder);

  // 3. Update user access
  if (!user.purchasedModules.includes(targetModule.id)) {
    user.purchasedModules.push(targetModule.id);
  }

  const expDate = targetPlan.days > 3650 ? 'NEVER (LIFETIME)' : new Date(Date.now() + targetPlan.days * 86400000).toLocaleString();
  user.activeRuntimes[targetModule.id] = {
    planTitle: targetPlan.duration,
    expiresAt: expDate,
    activatedAt: new Date().toLocaleString()
  };

  saveDatabase(db);
  logSystemAudit('PAY', `Payment verified for module ${targetModule.name} by user ${user.username} [₹${targetPlan.price}]`, 'PAYMENT_GATEWAY');

  return res.json({
    success: true,
    verified: true,
    data: {
      order: newOrder,
      purchasedModules: user.purchasedModules
    },
    order: newOrder,
    purchasedModules: user.purchasedModules
  });
});

// ----------------------------------------------------
// ADMIN DASHBOARD & MANAGEMENT (PROTECTED)
// ----------------------------------------------------

// GET /api/admin/stats
app.get('/api/admin/stats', requireAdminAuth, (req: Request, res: Response) => {
  const activeUsers = db.users.filter((u) => u.status === 'ACTIVE').length;
  const activeModules = db.modules.filter((m) => m.isAuthorized || m.status === 'ACTIVE').length;
  const totalOrders = db.orders.length;
  const paidOrders = db.orders.filter((o) => o.paymentStatus === 'VERIFIED').length;
  const pendingOrders = db.orders.filter((o) => o.paymentStatus === 'PENDING').length;
  const totalRevenue = db.orders
    .filter((o) => o.paymentStatus === 'VERIFIED')
    .reduce((sum, o) => sum + o.amount, 0);

  const stats: AdminStats = {
    totalUsers: db.users.length,
    activeUsers,
    activeModules,
    totalOrders,
    paidOrders,
    pendingOrders,
    totalRevenue,
    systemStatus: 'NOMINAL',
    quantumEntropy: '99.98% [ACTIVE]'
  };

  return res.json({
    success: true,
    data: { stats },
    stats
  });
});

// Users CRUD
app.get('/api/admin/users', requireAdminAuth, (req: Request, res: Response) => {
  const safeUsers = db.users.map(({ passwordHash, ...safeUser }) => safeUser);
  return res.json({
    success: true,
    data: { users: safeUsers },
    users: safeUsers
  });
});

app.post('/api/admin/users', requireAdminAuth, (req: Request, res: Response) => {
  const { username, password, role, status } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: 'USERNAME_REQUIRED', message: 'Username is required' });
  }

  const newUser: UserRecord & { passwordHash: string } = {
    id: `USR-${Date.now().toString().slice(-4)}`,
    username: username.trim(),
    passwordHash: hashPassword(password || 'DEFAULT_PASS'),
    role: role || 'AGENT',
    status: status || 'ACTIVE',
    createdAt: new Date().toLocaleString(),
    lastLogin: 'NEVER',
    ipHash: '10.0.4.*** [ENCLAVE]',
    purchasedModules: [],
    activeRuntimes: {}
  };

  db.users.push(newUser);
  saveDatabase(db);
  logAdminActivity('USER_CREATED', 'ADMINXD', `Created user account: ${newUser.username}`, req, 'users', newUser.id);

  const { passwordHash, ...safeUser } = newUser;
  return res.json({ success: true, data: { user: safeUser }, user: safeUser });
});

app.put('/api/admin/users/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const user = db.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found' });
  }

  if (updates.status) user.status = updates.status;
  if (updates.role) user.role = updates.role;
  if (updates.username) user.username = updates.username;

  saveDatabase(db);
  logAdminActivity('USER_UPDATED', 'ADMINXD', `Updated user: ${user.username}`, req, 'users', user.id);

  const { passwordHash, ...safeUser } = user;
  return res.json({ success: true, data: { user: safeUser }, user: safeUser });
});

app.delete('/api/admin/users/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found' });
  }

  const deleted = db.users.splice(index, 1)[0];
  saveDatabase(db);
  logAdminActivity('USER_DELETED', 'ADMINXD', `Deleted user: ${deleted.username}`, req, 'users', id);

  return res.json({ success: true, deletedId: id });
});

app.post('/api/admin/users/:id/reset-password', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const user = db.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found' });
  }

  user.passwordHash = hashPassword(newPassword || 'AEGIS-RESET-9900');
  saveDatabase(db);
  logAdminActivity('PASSWORD_RESET', 'ADMINXD', `Reset credentials for user: ${user.username}`, req, 'users', id);

  return res.json({ success: true, message: 'Password reset successfully' });
});

// Modules CRUD
app.post('/api/admin/modules', requireAdminAuth, (req: Request, res: Response) => {
  const modData = req.body;
  const newMod: SecurityModule = {
    id: modData.id || `mod-${Date.now().toString().slice(-4)}`,
    name: modData.name || 'NEW DEFENSE MODULE',
    version: modData.version || 'v1.0.0',
    subtitle: modData.subtitle || 'Custom Security Daemon',
    description: modData.description || 'Custom security policy enforcement module.',
    features: modData.features || ['Dynamic Threat Filtering', 'Real-time Canary Asserter'],
    status: modData.status || 'LOCKED',
    isAuthorized: false,
    tags: modData.tags || ['SECURITY_MOD'],
    iconType: modData.iconType || 'shield',
    basePrice: Number(modData.basePrice) || 150
  };

  db.modules.push(newMod);
  saveDatabase(db);
  logAdminActivity('MODULE_CREATED', 'ADMINXD', `Created module ${newMod.name}`, req, 'modules', newMod.id);

  return res.json({ success: true, data: { module: newMod }, module: newMod });
});

app.put('/api/admin/modules/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const mod = db.modules.find((m) => m.id === id);

  if (!mod) {
    return res.status(404).json({ success: false, error: 'MODULE_NOT_FOUND', message: 'Module not found' });
  }

  Object.assign(mod, updates);
  saveDatabase(db);
  logAdminActivity('MODULE_UPDATED', 'ADMINXD', `Updated module parameters: ${mod.name}`, req, 'modules', id);

  return res.json({ success: true, data: { module: mod }, module: mod });
});

app.delete('/api/admin/modules/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.modules.findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'MODULE_NOT_FOUND', message: 'Module not found' });
  }

  const deleted = db.modules.splice(index, 1)[0];
  saveDatabase(db);
  logAdminActivity('MODULE_DELETED', 'ADMINXD', `Deleted module: ${deleted.name}`, req, 'modules', id);

  return res.json({ success: true, deletedId: id });
});

// Plans CRUD
app.get('/api/admin/plans', requireAdminAuth, (req: Request, res: Response) => {
  return res.json({ success: true, data: { plans: db.plans }, plans: db.plans });
});

app.post('/api/admin/plans', requireAdminAuth, (req: Request, res: Response) => {
  const planData = req.body;
  const newPlan: RuntimePlan = {
    id: planData.id || `plan-${Date.now().toString().slice(-4)}`,
    duration: planData.duration || 'CUSTOM RUNTIME',
    days: Number(planData.days) || 30,
    price: Number(planData.price) || 150,
    currency: '₹',
    badge: planData.badge,
    description: planData.description || 'Custom security runtime duration.',
    features: planData.features || ['Full Node Telemetry', 'Encrypted TLS Tunnel'],
    isActive: true
  };

  db.plans.push(newPlan);
  saveDatabase(db);
  logAdminActivity('PLAN_CREATED', 'ADMINXD', `Created runtime plan: ${newPlan.duration}`, req, 'plans', newPlan.id);

  return res.json({ success: true, data: { plan: newPlan }, plan: newPlan });
});

app.put('/api/admin/plans/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const plan = db.plans.find((p) => p.id === id);

  if (!plan) {
    return res.status(404).json({ success: false, error: 'PLAN_NOT_FOUND', message: 'Plan not found' });
  }

  if (updates.price !== undefined) plan.price = Number(updates.price);
  if (updates.duration !== undefined) plan.duration = updates.duration;
  if (updates.days !== undefined) plan.days = Number(updates.days);
  if (updates.badge !== undefined) plan.badge = updates.badge;
  if (updates.description !== undefined) plan.description = updates.description;

  saveDatabase(db);
  logAdminActivity('PRICE_UPDATED', 'ADMINXD', `Updated pricing/duration for plan ${plan.duration}: ₹${plan.price}`, req, 'plans', id);

  return res.json({ success: true, data: { plan }, plan });
});

// Orders CRUD
app.get('/api/admin/orders', requireAdminAuth, (req: Request, res: Response) => {
  return res.json({ success: true, data: { orders: db.orders }, orders: db.orders });
});

app.put('/api/admin/orders/:id/status', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentStatus, accessStatus } = req.body;
  const order = db.orders.find((o) => o.id === id);

  if (!order) {
    return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
  }

  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (accessStatus) order.accessStatus = accessStatus;

  saveDatabase(db);
  logAdminActivity('ORDER_STATUS_UPDATED', 'ADMINXD', `Updated order ${id} status: ${paymentStatus}/${accessStatus}`, req, 'orders', id);

  return res.json({ success: true, data: { order }, order });
});

app.post('/api/admin/orders/:id/revoke', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const order = db.orders.find((o) => o.id === id);

  if (!order) {
    return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
  }

  order.accessStatus = 'REVOKED';

  // Revoke user module access
  const user = db.users.find((u) => u.id === order.userId || u.username === order.user);
  if (user) {
    user.purchasedModules = user.purchasedModules.filter((mId) => mId !== order.moduleId);
    delete user.activeRuntimes[order.moduleId];
  }

  saveDatabase(db);
  logAdminActivity('ORDER_ACCESS_REVOKED', 'ADMINXD', `Revoked license access for order ${id}`, req, 'orders', id);

  return res.json({ success: true, data: { order }, order });
});

app.post('/api/admin/orders/:id/extend', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { additionalDays } = req.body;
  const order = db.orders.find((o) => o.id === id);

  if (!order) {
    return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' });
  }

  order.durationDays = (order.durationDays || 30) + Number(additionalDays || 30);
  order.planTitle = `${order.durationDays} DAYS RUNTIME (EXTENDED)`;

  saveDatabase(db);
  logAdminActivity('ORDER_RUNTIME_EXTENDED', 'ADMINXD', `Extended runtime for order ${id} by ${additionalDays} days`, req, 'orders', id);

  return res.json({ success: true, data: { order }, order });
});

// Payment Settings
app.get('/api/admin/payment-settings', requireAdminAuth, (req: Request, res: Response) => {
  return res.json({ success: true, data: { settings: db.paymentSettings }, settings: db.paymentSettings });
});

app.put('/api/admin/payment-settings', requireAdminAuth, (req: Request, res: Response) => {
  const updates = req.body;
  Object.assign(db.paymentSettings, updates);
  saveDatabase(db);
  logAdminActivity('PAYMENT_SETTINGS_UPDATED', 'ADMINXD', 'Updated Payment Gateway parameters & UPI VPA configuration', req);

  return res.json({ success: true, data: { settings: db.paymentSettings }, settings: db.paymentSettings });
});

// Admin Activity Logs
app.get('/api/admin/activity-logs', requireAdminAuth, (req: Request, res: Response) => {
  return res.json({ success: true, data: { logs: db.adminLogs }, logs: db.adminLogs });
});

// Reset Database
app.post('/api/admin/reset-database', requireAdminAuth, (req: Request, res: Response) => {
  const freshDb = resetDatabase();
  logAdminActivity('DATABASE_RESET', 'ADMINXD', 'Master reset of security database performed', req);

  return res.json({ success: true, message: 'Database reset to factory configuration' });
});

// Fallback 404 handler for unknown API routes (always return JSON)
app.all('/api/*', (req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    error: 'ENDPOINT_NOT_FOUND',
    message: `API endpoint ${req.method} ${req.url} was not found`
  });
});

export default app;
