-- =========================================================
-- AEGIS // DEFENSE - PRODUCTION DATABASE SCHEMA (POSTGRESQL / SUPABASE)
-- =========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(128),
  password_hash VARCHAR(256) NOT NULL,
  role VARCHAR(32) DEFAULT 'AGENT',
  status VARCHAR(32) DEFAULT 'ACTIVE',
  ip_hash VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 2. ADMIN USERS TABLE (Isolated Admin Authentication)
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  role VARCHAR(32) DEFAULT 'SUPER_ADMIN',
  status VARCHAR(32) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- 3. SECURITY MODULES TABLE
CREATE TABLE IF NOT EXISTS modules (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  version VARCHAR(32) NOT NULL,
  subtitle TEXT,
  description TEXT,
  icon VARCHAR(64) DEFAULT 'shield',
  features JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  base_price NUMERIC(10, 2) DEFAULT 150.00,
  status VARCHAR(32) DEFAULT 'LOCKED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);

-- 4. RUNTIME PLANS TABLE
CREATE TABLE IF NOT EXISTS runtime_plans (
  id VARCHAR(64) PRIMARY KEY,
  module_id VARCHAR(64),
  name VARCHAR(128) NOT NULL,
  duration_days INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(16) DEFAULT '₹',
  badge VARCHAR(64),
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  recommended BOOLEAN DEFAULT false,
  status VARCHAR(32) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_runtime_plans_status ON runtime_plans(status);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(64),
  module_id VARCHAR(64) REFERENCES modules(id) ON DELETE SET NULL,
  module_name VARCHAR(128),
  runtime_plan_id VARCHAR(64) REFERENCES runtime_plans(id) ON DELETE SET NULL,
  plan_title VARCHAR(128),
  duration_days INTEGER,
  amount NUMERIC(10, 2) NOT NULL,
  payment_status VARCHAR(32) DEFAULT 'PENDING',
  access_status VARCHAR(32) DEFAULT 'INACTIVE',
  payment_reference VARCHAR(128),
  method VARCHAR(64) DEFAULT 'UPI QR GATEWAY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 6. USER ACCESS TABLE
CREATE TABLE IF NOT EXISTS user_access (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  module_id VARCHAR(64) REFERENCES modules(id) ON DELETE CASCADE,
  order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
  plan_title VARCHAR(128),
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(32) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_access_user_id ON user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_module_id ON user_access(module_id);
CREATE INDEX IF NOT EXISTS idx_user_access_status ON user_access(status);

-- 7. ADMIN ACTIVITY LOGS TABLE (Zero-Leak Security Logs)
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id VARCHAR(64) PRIMARY KEY,
  admin_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64),
  target_id VARCHAR(64),
  details TEXT,
  ip_hash VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);

-- 8. PAYMENT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS payment_settings (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'primary',
  upi_vpa VARCHAR(128) NOT NULL DEFAULT 'aegis.defense@icici',
  merchant_name VARCHAR(128) NOT NULL DEFAULT 'AEGIS QUANTUM DEFENSE',
  auto_verification BOOLEAN DEFAULT true,
  verification_latency_ms INTEGER DEFAULT 1800,
  min_amount NUMERIC(10, 2) DEFAULT 50.00,
  max_amount NUMERIC(10, 2) DEFAULT 10000.00,
  webhook_endpoint VARCHAR(256) DEFAULT '/api/webhooks/payment',
  gateway_status VARCHAR(32) DEFAULT 'ONLINE',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. SYSTEM LOGS TABLE
CREATE TABLE IF NOT EXISTS system_logs (
  id VARCHAR(64) PRIMARY KEY,
  level VARCHAR(16) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
