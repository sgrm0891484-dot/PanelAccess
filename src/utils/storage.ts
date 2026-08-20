import { SecurityModule, RuntimePlan, OrderRecord, LogEntry, UserSession } from '../types';

export const DEFAULT_PLANS: RuntimePlan[] = [
  {
    id: 'plan-15d',
    duration: '15 DAYS RUNTIME',
    days: 15,
    price: 120,
    currency: '₹',
    description: 'Standard temporary node token with basic sandbox execution rights.',
    features: ['Node Sandbox Telemetry', 'Encrypted TLS Tunnel', '15 Days Auto-Revoke']
  },
  {
    id: 'plan-20d',
    duration: '20 DAYS RUNTIME',
    days: 20,
    price: 135,
    currency: '₹',
    description: 'Extended threat analysis license with high-frequency telemetry logging.',
    features: ['High-Frequency Polling', 'Packet Integrity Verifier', '20 Days Runtime']
  },
  {
    id: 'plan-30d',
    duration: '30 DAYS RUNTIME',
    days: 30,
    price: 150,
    currency: '₹',
    badge: 'RECOMMENDED',
    description: 'Full production-grade security deployment with quantum cipher resilience.',
    features: ['Full Quantum Shielding', 'Priority Gateway Routing', '30 Days Full Access', 'Real-time Telemetry']
  },
  {
    id: 'plan-perm',
    duration: 'PERMANENT RUNTIME',
    days: 9999,
    price: 200,
    currency: '₹',
    badge: 'LIFETIME',
    description: 'Perpetual node authorization with unrestricted continuous defense updates.',
    features: ['Perpetual Gateway License', 'Zero Auto-Expiry', 'Custom Cryptographic Root', 'Unlimited Diagnostic Cycles']
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
    tags: ['MEMORY_INTEGRITY', 'CANARY_WATCH'],
    iconType: 'radio'
  },
  {
    id: 'xyz-cheats',
    name: 'XYZ CHEATS',
    version: 'v4.0.0',
    subtitle: 'Cyber Threat Emulation & Attack Tactical Sandbox',
    description: 'Controlled security test harness simulating adversarial vectors to validate boundary resilience (Safe Testing Suite).',
    features: ['Adversarial Simulation Harness', 'Boundary Stress Suite', 'Compliance Validation Reports'],
    status: 'LOCKED',
    isAuthorized: false,
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
    tags: ['STEALTH_AUDIT', 'ENCRYPTED_LOGS'],
    iconType: 'eye'
  }
];

export const INITIAL_ORDERS: OrderRecord[] = [
  {
    id: 'TXN-9042-8819',
    user: 'AGENT_01',
    userId: 'usr-1',
    moduleId: 'bala-mod-xyz',
    moduleName: 'BALA MOD XYZ',
    planId: 'plan-30d',
    planTitle: '30 DAYS RUNTIME',
    amount: 150,
    paymentStatus: 'VERIFIED',
    accessStatus: 'ACTIVE',
    createdAt: '2026-08-19 22:15:40',
    method: 'UPI VPA (Encrypted Settlement)',
    transactionRef: 'UPI-TXN-9042-8819'
  },
  {
    id: 'TXN-8841-3310',
    user: 'AGENT_01',
    userId: 'usr-1',
    moduleId: 'rapid-core',
    moduleName: 'RAPID CORE',
    planId: 'plan-perm',
    planTitle: 'PERMANENT RUNTIME',
    amount: 200,
    paymentStatus: 'VERIFIED',
    accessStatus: 'ACTIVE',
    createdAt: '2026-08-19 18:42:11',
    method: 'UPI VPA (Encrypted Settlement)',
    transactionRef: 'UPI-TXN-8841-3310'
  },
  {
    id: 'TXN-7190-2094',
    user: 'AUDITOR_NODE_99',
    userId: 'usr-3',
    moduleId: 'angry-mod',
    moduleName: 'ANGRY MOD',
    planId: 'plan-15d',
    planTitle: '15 DAYS RUNTIME',
    amount: 120,
    paymentStatus: 'VERIFIED',
    accessStatus: 'ACTIVE',
    createdAt: '2026-08-18 14:03:55',
    method: 'UPI VPA (Encrypted Settlement)',
    transactionRef: 'UPI-TXN-7190-2094'
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
    message: 'MODULE REGISTRY SYNCHRONIZED [7 SAFE DEMO ENGINES LOADED]',
    source: 'MODULE_REGISTRY'
  },
  {
    id: 'log-4',
    timestamp: '12:41:11',
    level: 'PAY',
    message: 'UPI QR DEMO SETTLEMENT ADAPTER (SANDBOX) READY',
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

export const DEMO_USERS = [
  { id: 'USR-AGENT-0941', name: 'DEMO_AGENT_01', role: 'AGENT', ipHash: '192.168.1.*** [HASHED]', status: 'ONLINE', modulesCount: 3 },
  { id: 'USR-SEC-7712', name: 'COMMAND_SEC_OP', role: 'SECURITY_OFFICER', ipHash: '10.0.4.*** [HASHED]', status: 'IDLE', modulesCount: 5 },
  { id: 'USR-ADMIN-001', name: 'SUPER_ADMIN_AEGIS', role: 'SUPER_ADMIN', ipHash: '172.16.0.*** [HASHED]', status: 'ONLINE', modulesCount: 7 },
  { id: 'USR-GUEST-4491', name: 'AUDITOR_NODE_99', role: 'AGENT', ipHash: '192.168.8.*** [HASHED]', status: 'OFFLINE', modulesCount: 1 }
];

// LocalStorage helpers
const STORAGE_KEYS = {
  SESSION: 'aegis_session_v48',
  MODULES: 'aegis_modules_v48',
  ORDERS: 'aegis_orders_v48',
  LOGS: 'aegis_logs_v48',
  CURRENT_PATH: 'aegis_current_path_v48'
};

export function getStoredSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredSession(session: UserSession | null) {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  } catch {
    // Ignore error
  }
}

export function getStoredModules(): SecurityModule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MODULES);
    if (!raw) return INITIAL_MODULES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fallback
  }
  return INITIAL_MODULES;
}

export function saveStoredModules(modules: SecurityModule[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(modules));
  } catch {
    // Ignore error
  }
}

export function getStoredOrders(): OrderRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) return INITIAL_ORDERS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_ORDERS;
  }
}

export function saveStoredOrders(orders: OrderRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch {
    // Ignore error
  }
}

export function getStoredLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) return INITIAL_LOGS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_LOGS;
  }
}

export function saveStoredLogs(logs: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(-100))); // keep latest 100
  } catch {
    // Ignore error
  }
}

export function resetAllStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(INITIAL_MODULES));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
  } catch {
    // Ignore
  }
}
