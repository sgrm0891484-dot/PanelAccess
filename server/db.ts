import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  UserRecord, SecurityModule, RuntimePlan, OrderRecord, 
  PaymentSettings, AdminActivityLog, LogEntry, AdminStats 
} from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Helper to hash password with salt
export function hashPassword(password: string, salt: string = 'aegis-quantum-salt-2026'): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export const DEFAULT_PLANS: RuntimePlan[] = [
  {
    id: 'plan-15d',
    duration: '15 DAYS RUNTIME',
    days: 15,
    price: 120,
    currency: '₹',
    description: 'Standard temporary node token with basic sandbox execution rights.',
    features: ['Node Sandbox Telemetry', 'Encrypted TLS Tunnel', '15 Days Auto-Revoke'],
    isActive: true
  },
  {
    id: 'plan-20d',
    duration: '20 DAYS RUNTIME',
    days: 20,
    price: 135,
    currency: '₹',
    description: 'Extended threat analysis license with high-frequency telemetry logging.',
    features: ['High-Frequency Polling', 'Packet Integrity Verifier', '20 Days Runtime'],
    isActive: true
  },
  {
    id: 'plan-30d',
    duration: '30 DAYS RUNTIME',
    days: 30,
    price: 150,
    currency: '₹',
    badge: 'RECOMMENDED',
    description: 'Full production-grade security deployment with quantum cipher resilience.',
    features: ['Full Quantum Shielding', 'Priority Gateway Routing', '30 Days Full Access', 'Real-time Telemetry'],
    isActive: true
  },
  {
    id: 'plan-perm',
    duration: 'PERMANENT RUNTIME',
    days: 9999,
    price: 200,
    currency: '₹',
    badge: 'LIFETIME',
    description: 'Perpetual node authorization with unrestricted continuous defense updates.',
    features: ['Perpetual Gateway License', 'Zero Auto-Expiry', 'Custom Cryptographic Root', 'Unlimited Diagnostic Cycles'],
    isActive: true
  }
];

export const INITIAL_MODULES: SecurityModule[] = [
  {
    id: 'angry-mod',
    name: 'ANGRY MOD',
    version: 'v3.4.1',
    subtitle: 'Adaptive Neural Guard & Resilience Yield',
    description: 'High-throughput algorithmic boundary defense framework with real-time heuristic anomaly detection.',
    features: ['Heuristic Threat Mitigation', 'Sub-millisecond Packet Triage', 'Neural Anomaly Classifier'],
    status: 'LOCKED',
    isAuthorized: false,
    basePrice: 120,
    tags: ['NEURAL_SHIELD', 'GATEWAY', 'TLS_INSPECT'],
    iconType: 'shield'
  },
  {
    id: 'bala-mod-xyz',
    name: 'BALA MOD XYZ',
    version: 'v5.2.0',
    subtitle: 'Bi-directional Automated Logic Auditor',
    description: 'Quantum-resilient cryptographic logic validator inspecting state integrity and preventing payload tampering.',
    features: ['Logic Assertion Engine', 'State Invariant Verifier', 'Zero-Knowledge Attestation'],
    status: 'LOCKED',
    isAuthorized: false,
    basePrice: 150,
    tags: ['LOGIC_AUDIT', 'ZKP', 'INTEGRITY'],
    iconType: 'cpu'
  },
  {
    id: 'gk-panel',
    name: 'GK PANEL',
    version: 'v2.8.4',
    subtitle: 'Gateway Kernel & Perimeter Analyzer',
    description: 'Kernel-level traffic governor providing ultra-dense perimeter telemetry and cryptographic session fencing.',
    features: ['Perimeter Access Fencing', 'Kernel Telemetry Hooks', 'Multi-tenant Node Isolation'],
    status: 'LOCKED',
    isAuthorized: false,
    basePrice: 135,
    tags: ['KERNEL_TELEMETRY', 'PERIMETER', 'FENCE'],
    iconType: 'zap'
  },
  {
    id: 'rapid-core',
    name: 'RAPID CORE',
    version: 'v6.1.0',
    subtitle: 'Real-time Automated Protocol Defense',
    description: 'Microsecond protocol sanitizer shielding inbound streams from malformed serialized buffer overruns.',
    features: ['Stream Sanitizer Engine', 'Buffer Overrun Shield', 'Protocol Multiplexer'],
    status: 'LOCKED',
    isAuthorized: false,
    basePrice: 200,
    tags: ['PROTOCOL_DEFENSE', 'STREAM_SANITIZER'],
    iconType: 'terminal'
  },
  {
    id: 'dripclint',
    name: 'DRIPCLINT',
    version: 'v1.9.3',
    subtitle: 'Distributed Runtime Integrity Protection',
    description: 'Decentralized host telemetry client auditing binary memory layouts for unauthorized dynamic modifications.',
    features: ['Dynamic Hash Consistency', 'Memory Layout Asserter', 'Cryptographic Canary Hooks'],
    status: 'LOCKED',
    isAuthorized: false,
    basePrice: 135,
    tags: ['MEMORY_INTEGRITY', 'CANARY_WATCH'],
    iconType: 'radio'
  },
  {
    id: 'xyz-cheats',
    name: 'XYZ CHEATS',
    version: 'v4.0.0',
    subtitle: 'Cyber Threat Emulation & Attack Tactical Sandbox',
    description: 'Controlled security test harness simulating adversarial vectors to validate boundary resilience.',
    features: ['Adversarial Simulation Harness', 'Boundary Stress Suite', 'Compliance Validation Reports'],
    status: 'LOCKED',
    isAuthorized: false,
    basePrice: 150,
    tags: ['ADVERSARIAL_TEST', 'SANDBOX_HARNESS'],
    iconType: 'crosshair'
  },
  {
    id: 'silent-cheats',
    name: 'SILENT CHEATS',
    version: 'v3.1.2',
    subtitle: 'Stealth Intelligence & Log Encryption Network Tester',
    description: 'Zero-footprint audit collector verifying that diagnostic logs are cryptographically sealed against eavesdropping.',
    features: ['Zero-Footprint Collector', 'Encrypted Diagnostic Channels', 'Log Seal Verification'],
    status: 'LOCKED',
    isAuthorized: false,
    basePrice: 120,
    tags: ['STEALTH_AUDIT', 'ENCRYPTED_LOGS'],
    iconType: 'eye'
  }
];

export const INITIAL_USERS: (UserRecord & { passwordHash: string })[] = [
  {
    id: 'USR-AGENT-0941',
    username: 'AGENT_01',
    passwordHash: hashPassword('AEGIS-KEY-9942'),
    role: 'AGENT',
    status: 'ACTIVE',
    createdAt: '2026-08-10 09:20:15',
    lastLogin: '2026-08-20 00:15:30',
    ipHash: '192.168.1.*** [HASHED]',
    purchasedModules: ['angry-mod', 'bala-mod-xyz'],
    activeRuntimes: {
      'angry-mod': { planTitle: '30 DAYS RUNTIME', expiresAt: '2026-09-19 22:15:40', activatedAt: '2026-08-19 22:15:40' },
      'bala-mod-xyz': { planTitle: 'PERMANENT RUNTIME', expiresAt: '2099-01-01 00:00:00', activatedAt: '2026-08-19 18:42:11' }
    }
  },
  {
    id: 'USR-SEC-7712',
    username: 'COMMAND_SEC_OP',
    passwordHash: hashPassword('QUANTUM-SEC-9900'),
    role: 'SECURITY_OFFICER',
    status: 'ACTIVE',
    createdAt: '2026-08-12 14:10:00',
    lastLogin: '2026-08-19 21:05:44',
    ipHash: '10.0.4.*** [HASHED]',
    purchasedModules: ['rapid-core', 'gk-panel', 'dripclint'],
    activeRuntimes: {
      'rapid-core': { planTitle: 'PERMANENT RUNTIME', expiresAt: '2099-01-01 00:00:00', activatedAt: '2026-08-18 10:00:00' }
    }
  },
  {
    id: 'USR-AUDIT-9901',
    username: 'AUDITOR_NODE_99',
    passwordHash: hashPassword('AUDIT-SEC-7741'),
    role: 'AGENT',
    status: 'ACTIVE',
    createdAt: '2026-08-15 11:30:22',
    lastLogin: '2026-08-18 16:45:10',
    ipHash: '192.168.8.*** [HASHED]',
    purchasedModules: ['silent-cheats'],
    activeRuntimes: {
      'silent-cheats': { planTitle: '15 DAYS RUNTIME', expiresAt: '2026-09-02 14:03:55', activatedAt: '2026-08-18 14:03:55' }
    }
  }
];

export const INITIAL_ORDERS: OrderRecord[] = [
  {
    id: 'ORD-9042-8819',
    user: 'AGENT_01',
    userId: 'USR-AGENT-0941',
    moduleId: 'bala-mod-xyz',
    moduleName: 'BALA MOD XYZ',
    planId: 'plan-30d',
    planTitle: '30 DAYS RUNTIME',
    durationDays: 30,
    amount: 150,
    paymentStatus: 'VERIFIED',
    accessStatus: 'ACTIVE',
    createdAt: '2026-08-19 22:15:40',
    expiresAt: '2026-09-19 22:15:40',
    method: 'UPI QR GATEWAY',
    transactionRef: 'UPI-TXN-9402810'
  },
  {
    id: 'ORD-8841-3310',
    user: 'COMMAND_SEC_OP',
    userId: 'USR-SEC-7712',
    moduleId: 'rapid-core',
    moduleName: 'RAPID CORE',
    planId: 'plan-perm',
    planTitle: 'PERMANENT RUNTIME',
    durationDays: 9999,
    amount: 200,
    paymentStatus: 'VERIFIED',
    accessStatus: 'ACTIVE',
    createdAt: '2026-08-19 18:42:11',
    expiresAt: '2099-01-01 00:00:00',
    method: 'UPI QR GATEWAY',
    transactionRef: 'UPI-TXN-8841920'
  },
  {
    id: 'ORD-7190-2094',
    user: 'AUDITOR_NODE_99',
    userId: 'USR-AUDIT-9901',
    moduleId: 'silent-cheats',
    moduleName: 'SILENT CHEATS',
    planId: 'plan-15d',
    planTitle: '15 DAYS RUNTIME',
    durationDays: 15,
    amount: 120,
    paymentStatus: 'VERIFIED',
    accessStatus: 'ACTIVE',
    createdAt: '2026-08-18 14:03:55',
    expiresAt: '2026-09-02 14:03:55',
    method: 'UPI QR GATEWAY',
    transactionRef: 'UPI-TXN-7190442'
  }
];

export const INITIAL_PAYMENT_SETTINGS: PaymentSettings = {
  upiVpa: 'aegis.defense@icici',
  merchantName: 'AEGIS QUANTUM DEFENSE',
  autoVerification: true,
  verificationLatencyMs: 1800,
  minAmount: 50,
  maxAmount: 10000,
  webhookEndpoint: '/api/webhooks/payment',
  gatewayStatus: 'ONLINE'
};

export const INITIAL_ADMIN_LOGS: AdminActivityLog[] = [
  {
    id: 'act-1',
    timestamp: '2026-08-18 10:00:00',
    action: 'SYSTEM_BOOT',
    adminId: 'ADMINXD',
    details: 'AEGIS Enterprise Security Control Matrix initialized with quantum-resistant encryption',
    ipHash: '10.0.0.1 [ENCLAVE]'
  },
  {
    id: 'act-2',
    timestamp: '2026-08-19 18:45:00',
    action: 'PRICE_UPDATED',
    adminId: 'ADMINXD',
    details: 'Updated runtime tier policies for 30 DAYS RUNTIME and PERMANENT RUNTIME',
    ipHash: '10.0.0.1 [ENCLAVE]'
  }
];

export const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: '12:41:08',
    level: 'SYS',
    message: 'AEGIS // DEFENSE v4.8 QUANTUM SECURITY GATEWAY INITIALIZED',
    source: 'CORE_KERNEL'
  },
  {
    id: 'log-2',
    timestamp: '12:41:09',
    level: 'AUTH',
    message: 'ZERO-KNOWLEDGE AUTHENTICATION ENGINE (ZKP-1024) ONLINE',
    source: 'AUTH_GATEWAY'
  },
  {
    id: 'log-3',
    timestamp: '12:41:10',
    level: 'INFO',
    message: 'MODULE REGISTRY SYNCHRONIZED [7 DEFENSE ENGINES LOADED]',
    source: 'MODULE_REGISTRY'
  },
  {
    id: 'log-4',
    timestamp: '12:41:11',
    level: 'PAY',
    message: 'UPI QR SETTLEMENT ADAPTER ONLINE AND VERIFIED',
    source: 'GATEWAY_SETTLE'
  },
  {
    id: 'log-5',
    timestamp: '12:41:12',
    level: 'ENCRYPT',
    message: 'KYBER-1024 QUANTUM RESISTANT ENCRYPTION TUNNEL SECURED',
    source: 'CRYPTO_CORE'
  }
];

export interface DatabaseSchema {
  users: (UserRecord & { passwordHash: string })[];
  modules: SecurityModule[];
  plans: RuntimePlan[];
  orders: OrderRecord[];
  paymentSettings: PaymentSettings;
  adminLogs: AdminActivityLog[];
  systemLogs: LogEntry[];
}

let dbInstance: DatabaseSchema | null = null;

export function loadDatabase(): DatabaseSchema {
  if (dbInstance) return dbInstance;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbInstance = JSON.parse(data);
      return dbInstance!;
    }
  } catch (err) {
    console.error('Error loading database file, initializing defaults:', err);
  }

  dbInstance = {
    users: [...INITIAL_USERS],
    modules: [...INITIAL_MODULES],
    plans: [...DEFAULT_PLANS],
    orders: [...INITIAL_ORDERS],
    paymentSettings: { ...INITIAL_PAYMENT_SETTINGS },
    adminLogs: [...INITIAL_ADMIN_LOGS],
    systemLogs: [...INITIAL_LOGS]
  };

  saveDatabase(dbInstance);
  return dbInstance;
}

export function saveDatabase(data: DatabaseSchema) {
  dbInstance = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

export function resetDatabase(): DatabaseSchema {
  const freshDb: DatabaseSchema = {
    users: [...INITIAL_USERS],
    modules: [...INITIAL_MODULES],
    plans: [...DEFAULT_PLANS],
    orders: [...INITIAL_ORDERS],
    paymentSettings: { ...INITIAL_PAYMENT_SETTINGS },
    adminLogs: [
      {
        id: `act-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        action: 'DATABASE_RESET',
        adminId: 'ADMINXD',
        details: 'System database restored to baseline configuration',
        ipHash: '10.0.0.1 [ENCLAVE]'
      }
    ],
    systemLogs: [...INITIAL_LOGS]
  };

  saveDatabase(freshDb);
  return freshDb;
}
