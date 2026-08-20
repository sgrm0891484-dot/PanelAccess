export type RoutePath = 
  | '/' 
  | '/login' 
  | '/panel' 
  | '/dashboard' 
  | '/modules' 
  | '/admin' 
  | '/admin/login' 
  | '/console' 
  | '/payment' 
  | '/payment/success';

export interface UserSession {
  authorizedId: string;
  role: 'AGENT' | 'SUPER_ADMIN' | 'SECURITY_OFFICER';
  token: string;
  loginTime: string;
  ipHash: string;
  isAuthenticated: boolean;
  purchasedModules?: string[];
  activeRuntimes?: Record<string, { planTitle: string; expiresAt: string; activatedAt: string }>;
}

export interface AdminSession {
  adminId: string;
  role: 'SUPER_ADMIN';
  token: string;
  loginTime: string;
  isAuthenticated: boolean;
}

export interface UserRecord {
  id: string;
  username: string;
  role: 'AGENT' | 'SECURITY_OFFICER';
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  lastLogin: string;
  ipHash: string;
  purchasedModules: string[];
  activeRuntimes: Record<string, { planTitle: string; expiresAt: string; activatedAt: string }>;
}

export interface SecurityModule {
  id: string;
  name: string;
  version: string;
  subtitle: string;
  description: string;
  features: string[];
  status: 'ACTIVE' | 'LOCKED' | 'MAINTENANCE';
  isAuthorized: boolean;
  activePlan?: string;
  expiresAt?: string;
  tags: string[];
  iconType: 'shield' | 'terminal' | 'cpu' | 'zap' | 'radio' | 'crosshair' | 'eye';
  basePrice?: number;
}

export interface RuntimePlan {
  id: string;
  duration: string;
  days: number;
  price: number;
  currency: string;
  badge?: 'RECOMMENDED' | 'LIFETIME';
  description: string;
  features: string[];
  isActive?: boolean;
}

export interface PaymentSession {
  sessionId: string;
  module: SecurityModule;
  plan: RuntimePlan;
  amount: number;
  createdAt: number;
  expiresAt: number;
  status: 'PENDING' | 'VERIFYING' | 'SUCCESS' | 'CANCELLED' | 'EXPIRED';
  transactionId?: string;
  upiVpa?: string;
  merchantName?: string;
}

export interface OrderRecord {
  id: string;
  user: string;
  userId: string;
  moduleId: string;
  moduleName: string;
  planId?: string;
  planTitle: string;
  durationDays?: number;
  amount: number;
  paymentStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'REFUNDED';
  accessStatus: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  createdAt: string;
  expiresAt?: string;
  method: string;
  transactionRef: string;
}

export interface PaymentSettings {
  upiVpa: string;
  merchantName: string;
  autoVerification: boolean;
  verificationLatencyMs: number;
  minAmount: number;
  maxAmount: number;
  webhookEndpoint: string;
  gatewayStatus: 'ONLINE' | 'STANDBY';
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  action: string;
  adminId: string;
  details: string;
  ipHash: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  activeModules: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  systemStatus: string;
  quantumEntropy?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SYS' | 'AUTH' | 'WARN' | 'ENCRYPT' | 'PAY';
  message: string;
  source: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
  duration?: number;
}

