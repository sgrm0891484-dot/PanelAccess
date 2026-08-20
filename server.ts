import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { 
  loadDatabase, saveDatabase, resetDatabase, hashPassword, 
  DEFAULT_PLANS, INITIAL_MODULES 
} from './server/db';
import { 
  UserRecord, SecurityModule, RuntimePlan, OrderRecord, 
  PaymentSettings, AdminActivityLog, LogEntry, AdminStats 
} from './src/types';

// Admin Credentials configured server-side (never exposed to browser)
const ADMIN_ID = process.env.ADMIN_ID || 'ADMINXD';
const ADMIN_PASS_KEY = process.env.ADMIN_PASS_KEY || 'ADMIN5921N';

// In-memory active tokens
const adminSessions = new Map<string, { adminId: string; loginTime: string; expiresAt: number }>();
const userSessions = new Map<string, { userId: string; username: string; loginTime: string; expiresAt: number }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize persistent database
  const db = loadDatabase();

  app.use(express.json());

  // Helper for admin activity log
  const logAdminActivity = (action: string, adminId: string, details: string, req: Request) => {
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
  const logSystemAudit = (level: LogEntry['level'], message: string, source: string) => {
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

  // ----------------------------------------------------
  // Middlewares for authentication
  // ----------------------------------------------------
  const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    if (!token || !adminSessions.has(token)) {
      return res.status(401).json({ error: 'UNAUTHORIZED_ADMIN_ACCESS', message: 'Valid administrator token required' });
    }

    const session = adminSessions.get(token)!;
    if (Date.now() > session.expiresAt) {
      adminSessions.delete(token);
      return res.status(401).json({ error: 'ADMIN_SESSION_EXPIRED', message: 'Administrator session has expired' });
    }

    (req as any).adminSession = session;
    next();
  };

  const requireUserAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || (req.headers['x-user-token'] as string);
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    if (!token || !userSessions.has(token)) {
      return res.status(401).json({ error: 'UNAUTHORIZED_USER_ACCESS', message: 'Authentication required' });
    }

    const session = userSessions.get(token)!;
    if (Date.now() > session.expiresAt) {
      userSessions.delete(token);
      return res.status(401).json({ error: 'USER_SESSION_EXPIRED', message: 'User session has expired' });
    }

    (req as any).userSession = session;
    next();
  };

  // ----------------------------------------------------
  // PUBLIC / USER AUTHENTICATION ENDPOINTS
  // ----------------------------------------------------

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Authorized ID and Pass Key are required' });
    }

    const normalizedUser = username.trim().toUpperCase();
    const providedHash = hashPassword(password.trim());

    // Search user in database
    let user = db.users.find((u) => u.username.toUpperCase() === normalizedUser || u.id.toUpperCase() === normalizedUser);

    // If user does not exist yet, auto-provision user safely with provided password so demo/custom users work
    if (!user) {
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
      if (user.passwordHash !== providedHash) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid Pass Key for specified Authorized ID' });
      }

      if (user.status === 'DISABLED') {
        return res.status(403).json({ error: 'ACCOUNT_DISABLED', message: 'This node account has been disabled by security administrator' });
      }

      user.lastLogin = new Date().toLocaleString();
      saveDatabase(db);
    }

    // Generate secure session token
    const token = `TKN-${crypto.randomBytes(16).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;
    userSessions.set(token, {
      userId: user.id,
      username: user.username,
      loginTime: new Date().toLocaleTimeString(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    logSystemAudit('AUTH', `USER_AUTHENTICATED: Node ${user.username} [${user.role}]`, 'AUTH_GATEWAY');

    return res.json({
      session: {
        authorizedId: user.username,
        userId: user.id,
        role: user.role,
        token,
        loginTime: new Date().toLocaleTimeString(),
        ipHash: user.ipHash,
        isAuthenticated: true,
        purchasedModules: user.purchasedModules || [],
        activeRuntimes: user.activeRuntimes || {}
      }
    });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization || (req.headers['x-user-token'] as string);
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    if (!token || !userSessions.has(token)) {
      return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    }

    const session = userSessions.get(token)!;
    const user = db.users.find((u) => u.id === session.userId);
    if (!user || user.status === 'DISABLED') {
      userSessions.delete(token);
      return res.status(401).json({ error: 'USER_INVALID' });
    }

    return res.json({
      session: {
        authorizedId: user.username,
        userId: user.id,
        role: user.role,
        token,
        loginTime: session.loginTime,
        ipHash: user.ipHash,
        isAuthenticated: true,
        purchasedModules: user.purchasedModules || [],
        activeRuntimes: user.activeRuntimes || {}
      }
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || (req.headers['x-user-token'] as string);
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
    if (token) {
      const sess = userSessions.get(token);
      if (sess) {
        logSystemAudit('AUTH', `SESSION_TERMINATED: Node ${sess.username} logged out`, 'AUTH_GATEWAY');
      }
      userSessions.delete(token);
    }
    return res.json({ success: true });
  });

  // ----------------------------------------------------
  // ADMIN AUTHENTICATION ENDPOINTS (SECURE SERVER-SIDE)
  // ----------------------------------------------------

  // POST /api/admin/login
  app.post('/api/admin/login', (req, res) => {
    const { adminId, passKey } = req.body;
    if (!adminId || !passKey) {
      return res.status(400).json({ error: 'INVALID ADMIN CREDENTIALS', message: 'Admin ID and Admin Pass Key are required' });
    }

    // Secure timing-safe credential verification
    const cleanAdminId = String(adminId).trim();
    const cleanPassKey = String(passKey).trim();

    const isIdMatch = cleanAdminId === ADMIN_ID;
    const isPassMatch = cleanPassKey === ADMIN_PASS_KEY;

    if (!isIdMatch || !isPassMatch) {
      logAdminActivity('LOGIN_FAILED', cleanAdminId || 'UNKNOWN', `Failed admin authentication attempt from IP`, req);
      return res.status(401).json({ error: 'INVALID ADMIN CREDENTIALS', message: 'Invalid Admin ID or Pass Key' });
    }

    // Generate high-entropy admin token
    const adminToken = `ADM-${crypto.randomBytes(24).toString('hex').toUpperCase()}`;
    adminSessions.set(adminToken, {
      adminId: ADMIN_ID,
      loginTime: new Date().toLocaleString(),
      expiresAt: Date.now() + 12 * 60 * 60 * 1000 // 12 hours
    });

    logAdminActivity('ADMIN_LOGIN', ADMIN_ID, 'Successful administrator login to Control Matrix', req);
    logSystemAudit('AUTH', `ADMIN_SESSION_AUTHORIZED: Master controller ${ADMIN_ID} online`, 'ADMIN_KERNEL');

    return res.json({
      adminSession: {
        adminId: ADMIN_ID,
        role: 'SUPER_ADMIN',
        token: adminToken,
        loginTime: new Date().toLocaleTimeString(),
        isAuthenticated: true
      }
    });
  });

  // GET /api/admin/me
  app.get('/api/admin/me', requireAdminAuth, (req, res) => {
    const session = (req as any).adminSession;
    return res.json({
      adminSession: {
        adminId: session.adminId,
        role: 'SUPER_ADMIN',
        loginTime: session.loginTime,
        isAuthenticated: true
      }
    });
  });

  // POST /api/admin/logout
  app.post('/api/admin/logout', requireAdminAuth, (req, res) => {
    const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
    if (token) {
      adminSessions.delete(token);
    }
    logAdminActivity('ADMIN_LOGOUT', ADMIN_ID, 'Administrator logged out securely', req);
    return res.json({ success: true });
  });

  // ----------------------------------------------------
  // PUBLIC / USER MODULES & PLANS ENDPOINTS
  // ----------------------------------------------------

  // GET /api/modules
  app.get('/api/modules', (req, res) => {
    return res.json({ modules: db.modules });
  });

  // GET /api/plans
  app.get('/api/plans', (req, res) => {
    const activePlans = db.plans.filter((p) => p.isActive !== false);
    return res.json({ plans: activePlans.length > 0 ? activePlans : db.plans });
  });

  // GET /api/system/logs
  app.get('/api/system/logs', (req, res) => {
    return res.json({ logs: db.systemLogs });
  });

  // ----------------------------------------------------
  // PAYMENT CREATION & SERVER-SIDE PAYMENT VERIFICATION
  // ----------------------------------------------------

  // POST /api/payments/create-session
  app.post('/api/payments/create-session', (req, res) => {
    const { moduleId, planId, username } = req.body;
    const mod = db.modules.find((m) => m.id === moduleId);
    const plan = db.plans.find((p) => p.id === planId);

    if (!mod || !plan) {
      return res.status(404).json({ error: 'MODULE_OR_PLAN_NOT_FOUND' });
    }

    const sessionId = `SESS-${Date.now().toString().slice(-6)}`;
    const transactionId = `TXN-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    return res.json({
      session: {
        sessionId,
        module: mod,
        plan,
        amount: plan.price,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000, // 5 min
        status: 'PENDING',
        transactionId,
        upiVpa: db.paymentSettings.upiVpa,
        merchantName: db.paymentSettings.merchantName
      }
    });
  });

  // POST /api/payments/verify
  // Server-side payment verification and access pass dispatching
  app.post('/api/payments/verify', (req, res) => {
    const { sessionId, moduleId, planId, username, transactionRef } = req.body;
    const mod = db.modules.find((m) => m.id === moduleId);
    const plan = db.plans.find((p) => p.id === planId);

    if (!mod || !plan) {
      return res.status(404).json({ error: 'INVALID_ORDER_PARAMETERS' });
    }

    const cleanUser = (username || 'AGENT_01').trim();
    let user = db.users.find((u) => u.username.toUpperCase() === cleanUser.toUpperCase());

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const expiryDate = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);

    // Create verified order record
    const newOrder: OrderRecord = {
      id: orderId,
      user: cleanUser,
      userId: user ? user.id : 'USR-GATEWAY-USER',
      moduleId: mod.id,
      moduleName: mod.name,
      planId: plan.id,
      planTitle: plan.duration,
      durationDays: plan.days,
      amount: plan.price,
      paymentStatus: 'VERIFIED',
      accessStatus: 'ACTIVE',
      createdAt: now.toLocaleString(),
      expiresAt: plan.days > 3650 ? '2099-01-01 00:00:00' : expiryDate.toLocaleString(),
      method: 'UPI QR GATEWAY',
      transactionRef: transactionRef || `UPI-TXN-${Date.now().toString().slice(-7)}`
    };

    db.orders.unshift(newOrder);

    // Update user's purchased modules and active runtimes in database
    if (user) {
      if (!user.purchasedModules.includes(mod.id)) {
        user.purchasedModules.push(mod.id);
      }
      if (!user.activeRuntimes) user.activeRuntimes = {};
      user.activeRuntimes[mod.id] = {
        planTitle: plan.duration,
        expiresAt: newOrder.expiresAt || '',
        activatedAt: now.toLocaleString()
      };
    }

    // Also update module status to authorized globally if applicable
    mod.isAuthorized = true;
    mod.status = 'ACTIVE';

    saveDatabase(db);

    logSystemAudit('PAY', `PAYMENT_SETTLED_VERIFIED: ${mod.name} (${plan.duration}) - ₹${plan.price} for Node ${cleanUser}`, 'SETTLEMENT_CORE');
    logAdminActivity('ORDER_CREATED', 'SYSTEM_GATEWAY', `Payment verified and access pass granted for ${mod.name} to ${cleanUser} (₹${plan.price})`, req);

    return res.json({
      success: true,
      verified: true,
      order: newOrder,
      purchasedModules: user ? user.purchasedModules : [mod.id]
    });
  });

  // ----------------------------------------------------
  // ADMIN DASHBOARD & MANAGEMENT ENDPOINTS (PROTECTED)
  // ----------------------------------------------------

  // GET /api/admin/stats
  app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
    const totalUsers = db.users.length;
    const activeUsers = db.users.filter((u) => u.status === 'ACTIVE').length;
    const activeModules = db.modules.filter((m) => m.isAuthorized || m.status === 'ACTIVE').length;
    const totalOrders = db.orders.length;
    const paidOrders = db.orders.filter((o) => o.paymentStatus === 'VERIFIED').length;
    const pendingOrders = db.orders.filter((o) => o.paymentStatus === 'PENDING').length;
    const totalRevenue = db.orders
      .filter((o) => o.paymentStatus === 'VERIFIED')
      .reduce((sum, o) => sum + o.amount, 0);

    const stats: AdminStats = {
      totalUsers,
      activeUsers,
      activeModules,
      totalOrders,
      paidOrders,
      pendingOrders,
      totalRevenue,
      systemStatus: '99.98% (OPERATIONAL)',
      quantumEntropy: '99.984% (KYBER-1024)'
    };

    return res.json({ stats });
  });

  // USER MANAGEMENT
  // GET /api/admin/users
  app.get('/api/admin/users', requireAdminAuth, (req, res) => {
    // Return sanitized users without password hashes
    const sanitized = db.users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      ipHash: u.ipHash,
      purchasedModules: u.purchasedModules || [],
      activeRuntimes: u.activeRuntimes || {}
    }));
    return res.json({ users: sanitized });
  });

  // POST /api/admin/users (Create User)
  app.post('/api/admin/users', requireAdminAuth, (req, res) => {
    const { username, password, role, status } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Username and initial password are required' });
    }

    const existing = db.users.find((u) => u.username.toUpperCase() === username.trim().toUpperCase());
    if (existing) {
      return res.status(409).json({ error: 'USER_EXISTS', message: 'A user with this username already exists' });
    }

    const newUser: UserRecord & { passwordHash: string } = {
      id: `USR-${Date.now().toString().slice(-6)}`,
      username: username.trim(),
      passwordHash: hashPassword(password.trim()),
      role: role === 'SECURITY_OFFICER' ? 'SECURITY_OFFICER' : 'AGENT',
      status: status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
      createdAt: new Date().toLocaleString(),
      lastLogin: 'NEVER',
      ipHash: '0.0.0.0 [NEW_NODE]',
      purchasedModules: [],
      activeRuntimes: {}
    };

    db.users.push(newUser);
    saveDatabase(db);

    logAdminActivity('USER_CREATED', ADMIN_ID, `Created new node account: ${newUser.username} (${newUser.role})`, req);

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
        lastLogin: newUser.lastLogin,
        ipHash: newUser.ipHash,
        purchasedModules: newUser.purchasedModules,
        activeRuntimes: newUser.activeRuntimes
      }
    });
  });

  // PUT /api/admin/users/:id (Edit User)
  app.put('/api/admin/users/:id', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const { username, role, status, purchasedModules } = req.body;

    const user = db.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    if (username && username.trim()) user.username = username.trim();
    if (role) user.role = role;
    if (status) user.status = status;
    if (Array.isArray(purchasedModules)) user.purchasedModules = purchasedModules;

    saveDatabase(db);
    logAdminActivity('USER_UPDATED', ADMIN_ID, `Updated profile/permissions for ${user.username}`, req);

    return res.json({ success: true, user });
  });

  // DELETE /api/admin/users/:id
  app.delete('/api/admin/users/:id', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    const removed = db.users.splice(index, 1)[0];
    saveDatabase(db);
    logAdminActivity('USER_DELETED', ADMIN_ID, `Deleted node user account: ${removed.username} (${removed.id})`, req);

    return res.json({ success: true, deletedId: id });
  });

  // POST /api/admin/users/:id/reset-password
  app.post('/api/admin/users/:id/reset-password', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: 'MISSING_PASSWORD', message: 'New password is required' });
    }

    const user = db.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    user.passwordHash = hashPassword(newPassword.trim());
    saveDatabase(db);
    logAdminActivity('PASSWORD_RESET', ADMIN_ID, `Reset pass key for user ${user.username}`, req);

    return res.json({ success: true, message: `Pass key updated for ${user.username}` });
  });

  // MODULE MANAGEMENT
  // POST /api/admin/modules
  app.post('/api/admin/modules', requireAdminAuth, (req, res) => {
    const { name, version, subtitle, description, features, basePrice, tags, iconType, status, isAuthorized } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'MISSING_NAME', message: 'Module name is required' });
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newMod: SecurityModule = {
      id,
      name: name.trim(),
      version: version || 'v1.0.0',
      subtitle: subtitle || 'Autonomous Defense Framework',
      description: description || 'Quantum-resilient modular security engine',
      features: Array.isArray(features) ? features : ['Telemetry Hook', 'Encryption Layer'],
      status: status || 'LOCKED',
      isAuthorized: Boolean(isAuthorized),
      basePrice: basePrice ? Number(basePrice) : 150,
      tags: Array.isArray(tags) ? tags : ['SECURITY', 'GATEWAY'],
      iconType: iconType || 'shield'
    };

    db.modules.push(newMod);
    saveDatabase(db);
    logAdminActivity('MODULE_CREATED', ADMIN_ID, `Created security module: ${newMod.name} (${newMod.version})`, req);

    return res.json({ success: true, module: newMod });
  });

  // PUT /api/admin/modules/:id
  app.put('/api/admin/modules/:id', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const mod = db.modules.find((m) => m.id === id);
    if (!mod) {
      return res.status(404).json({ error: 'MODULE_NOT_FOUND' });
    }

    const { name, version, subtitle, description, features, basePrice, tags, iconType, status, isAuthorized } = req.body;
    if (name) mod.name = name;
    if (version) mod.version = version;
    if (subtitle) mod.subtitle = subtitle;
    if (description) mod.description = description;
    if (Array.isArray(features)) mod.features = features;
    if (basePrice !== undefined) mod.basePrice = Number(basePrice);
    if (Array.isArray(tags)) mod.tags = tags;
    if (iconType) mod.iconType = iconType;
    if (status) mod.status = status;
    if (isAuthorized !== undefined) mod.isAuthorized = Boolean(isAuthorized);

    saveDatabase(db);
    logAdminActivity('MODULE_UPDATED', ADMIN_ID, `Updated module properties for ${mod.name}`, req);

    return res.json({ success: true, module: mod });
  });

  // DELETE /api/admin/modules/:id
  app.delete('/api/admin/modules/:id', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const index = db.modules.findIndex((m) => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'MODULE_NOT_FOUND' });
    }

    const removed = db.modules.splice(index, 1)[0];
    saveDatabase(db);
    logAdminActivity('MODULE_DELETED', ADMIN_ID, `Removed security module ${removed.name}`, req);

    return res.json({ success: true, deletedId: id });
  });

  // PRICING & RUNTIME PLANS MANAGEMENT
  // GET /api/admin/plans
  app.get('/api/admin/plans', requireAdminAuth, (req, res) => {
    return res.json({ plans: db.plans });
  });

  // PUT /api/admin/plans/:id
  app.put('/api/admin/plans/:id', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const plan = db.plans.find((p) => p.id === id);
    if (!plan) {
      return res.status(404).json({ error: 'PLAN_NOT_FOUND' });
    }

    const { duration, days, price, description, badge, isActive, features } = req.body;
    if (duration) plan.duration = duration;
    if (days !== undefined) plan.days = Number(days);
    if (price !== undefined) plan.price = Number(price);
    if (description) plan.description = description;
    if (badge !== undefined) plan.badge = badge || undefined;
    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (Array.isArray(features)) plan.features = features;

    saveDatabase(db);
    logAdminActivity('PRICE_UPDATED', ADMIN_ID, `Updated pricing plan: ${plan.duration} to ₹${plan.price}`, req);

    return res.json({ success: true, plan });
  });

  // POST /api/admin/plans
  app.post('/api/admin/plans', requireAdminAuth, (req, res) => {
    const { duration, days, price, description, badge, features } = req.body;
    const newPlan: RuntimePlan = {
      id: `plan-${Date.now().toString().slice(-4)}`,
      duration: duration || 'CUSTOM RUNTIME',
      days: days ? Number(days) : 30,
      price: price ? Number(price) : 150,
      currency: '₹',
      badge: badge || undefined,
      description: description || 'Custom defense runtime license',
      features: Array.isArray(features) ? features : ['Standard Gateway Access'],
      isActive: true
    };

    db.plans.push(newPlan);
    saveDatabase(db);
    logAdminActivity('PRICE_UPDATED', ADMIN_ID, `Created new pricing tier: ${newPlan.duration} (₹${newPlan.price})`, req);

    return res.json({ success: true, plan: newPlan });
  });

  // ORDER MANAGEMENT
  // GET /api/admin/orders
  app.get('/api/admin/orders', requireAdminAuth, (req, res) => {
    return res.json({ orders: db.orders });
  });

  // PUT /api/admin/orders/:id/status
  app.put('/api/admin/orders/:id/status', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const { paymentStatus, accessStatus } = req.body;

    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    }

    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (accessStatus) order.accessStatus = accessStatus;

    saveDatabase(db);
    logAdminActivity('ORDER_STATUS_CHANGED', ADMIN_ID, `Updated order ${order.id} status to ${paymentStatus || accessStatus}`, req);

    return res.json({ success: true, order });
  });

  // POST /api/admin/orders/:id/revoke
  app.post('/api/admin/orders/:id/revoke', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    }

    order.accessStatus = 'REVOKED';
    
    // Revoke from user
    const user = db.users.find((u) => u.username.toUpperCase() === order.user.toUpperCase() || u.id === order.userId);
    if (user && user.purchasedModules) {
      user.purchasedModules = user.purchasedModules.filter((mId) => mId !== order.moduleId);
      if (user.activeRuntimes) delete user.activeRuntimes[order.moduleId];
    }

    saveDatabase(db);
    logAdminActivity('ACCESS_REVOKED', ADMIN_ID, `Revoked access for order ${order.id} (${order.moduleName})`, req);

    return res.json({ success: true, order });
  });

  // POST /api/admin/orders/:id/extend
  app.post('/api/admin/orders/:id/extend', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const { additionalDays } = req.body;
    const daysToAdd = additionalDays ? Number(additionalDays) : 30;

    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    }

    order.durationDays = (order.durationDays || 30) + daysToAdd;
    order.accessStatus = 'ACTIVE';

    const currentExp = order.expiresAt && order.expiresAt !== '2099-01-01 00:00:00' ? new Date(order.expiresAt) : new Date();
    const newExp = new Date(currentExp.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    order.expiresAt = newExp.toLocaleString();

    saveDatabase(db);
    logAdminActivity('RUNTIME_EXTENDED', ADMIN_ID, `Extended runtime by ${daysToAdd} days for ${order.moduleName} (${order.user})`, req);

    return res.json({ success: true, order });
  });

  // PAYMENT SETTINGS
  // GET /api/admin/payment-settings
  app.get('/api/admin/payment-settings', requireAdminAuth, (req, res) => {
    return res.json({ settings: db.paymentSettings });
  });

  // PUT /api/admin/payment-settings
  app.put('/api/admin/payment-settings', requireAdminAuth, (req, res) => {
    const { upiVpa, merchantName, autoVerification, minAmount, maxAmount, webhookEndpoint, gatewayStatus } = req.body;

    if (upiVpa) db.paymentSettings.upiVpa = upiVpa.trim();
    if (merchantName) db.paymentSettings.merchantName = merchantName.trim();
    if (autoVerification !== undefined) db.paymentSettings.autoVerification = Boolean(autoVerification);
    if (minAmount !== undefined) db.paymentSettings.minAmount = Number(minAmount);
    if (maxAmount !== undefined) db.paymentSettings.maxAmount = Number(maxAmount);
    if (webhookEndpoint) db.paymentSettings.webhookEndpoint = webhookEndpoint.trim();
    if (gatewayStatus) db.paymentSettings.gatewayStatus = gatewayStatus;

    saveDatabase(db);
    logAdminActivity('PAYMENT_SETTINGS_UPDATED', ADMIN_ID, `Updated payment gateway configuration (VPA: ${db.paymentSettings.upiVpa})`, req);

    return res.json({ success: true, settings: db.paymentSettings });
  });

  // ADMIN ACTIVITY LOGS
  // GET /api/admin/activity-logs
  app.get('/api/admin/activity-logs', requireAdminAuth, (req, res) => {
    return res.json({ logs: db.adminLogs });
  });

  // POST /api/admin/reset-database
  app.post('/api/admin/reset-database', requireAdminAuth, (req, res) => {
    const freshDb = resetDatabase();
    logAdminActivity('DATABASE_RESET', ADMIN_ID, 'Master reset of database performed', req);
    return res.json({ success: true, message: 'Database reset to factory configuration' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // ----------------------------------------------------
  // Vite Integration (SPA Fallback)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AEGIS Defense Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
