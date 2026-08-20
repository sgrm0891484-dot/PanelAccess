import React, { useState, useEffect } from 'react';
import { 
  RoutePath, UserSession, SecurityModule, RuntimePlan, 
  PaymentSession, OrderRecord, LogEntry, ToastMessage, AdminSession 
} from './types';
import { api } from './services/api';
import { getAudioEnabled, setAudioEnabled, playCyberClick, playSuccessSound, playAlertSound } from './utils/audio';

import { Header } from './components/Header';
import { AuthCard } from './components/AuthCard';
import { ModuleDashboard } from './components/ModuleDashboard';
import { RuntimeModal } from './components/RuntimeModal';
import { CheckoutModal } from './components/CheckoutModal';
import { PaymentQRPage } from './components/PaymentQRPage';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ConsolePanel } from './components/ConsolePanel';
import { ModuleInspectorModal } from './components/ModuleInspectorModal';
import { ToastContainer } from './components/Toast';

export default function App() {
  // Navigation State - default to '/' (PANEL ACCESS login page)
  const [currentPath, setCurrentPath] = useState<RoutePath>('/');
  
  // App Domain State
  const [session, setSession] = useState<UserSession | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [modules, setModules] = useState<SecurityModule[]>([]);
  const [plans, setPlans] = useState<RuntimePlan[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [soundEnabled, setSoundState] = useState<boolean>(() => getAudioEnabled());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Active Modals & Session State
  const [selectedModuleForPlan, setSelectedModuleForPlan] = useState<SecurityModule | null>(null);
  const [isRuntimeModalOpen, setIsRuntimeModalOpen] = useState(false);

  const [selectedModuleForCheckout, setSelectedModuleForCheckout] = useState<SecurityModule | null>(null);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<RuntimePlan | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const [activePaymentSession, setActivePaymentSession] = useState<PaymentSession | null>(null);

  const [inspectedModule, setInspectedModule] = useState<SecurityModule | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Toast Helper
  const showToast = (title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Add a system log entry
  const addLog = (level: LogEntry['level'], message: string, source = 'GATEWAY_KERNEL') => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source
    };
    setLogs((prev) => [...prev, newEntry]);
  };

  // Audio Toggle
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundState(next);
    setAudioEnabled(next);
  };

  // Load Initial Server Data & Restore Valid Sessions
  const loadInitialData = async () => {
    try {
      // 1. Fetch public modules & plans & logs from backend
      const [modRes, plansRes, logsRes] = await Promise.all([
        api.getModules().catch(() => ({ modules: [] })),
        api.getPlans().catch(() => ({ plans: [] })),
        api.getSystemLogs().catch(() => ({ logs: [] }))
      ]);

      if (modRes.modules) setModules(modRes.modules);
      if (plansRes.plans) setPlans(plansRes.plans);
      if (logsRes.logs) setLogs(logsRes.logs);

      // 2. Check for active admin session
      const adminRes = await api.getCurrentAdmin();
      if (adminRes && adminRes.adminSession) {
        setAdminSession(adminRes.adminSession);
      } else {
        setAdminSession(null);
      }

      // 3. Check for active user session
      const userRes = await api.getCurrentUser();
      if (userRes && userRes.session) {
        setSession(userRes.session);
        // Only if valid session exists on refresh and currently at root, route to panel
        if (window.location.pathname === '/panel' || currentPath === '/panel') {
          setCurrentPath('/panel');
        }
      } else {
        setSession(null);
        // If not logged in, ensure we are on root / login screen
        if (currentPath !== '/admin') {
          setCurrentPath('/');
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Login handler
  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    addLog('AUTH', `SESSION_AUTHENTICATED: Node ${newSession.authorizedId} [${newSession.role}]`, 'AUTH_GATEWAY');
    setCurrentPath('/panel');
  };

  // Logout handler
  const handleLogout = () => {
    if (session) {
      addLog('AUTH', `SESSION_TERMINATED: Node ${session.authorizedId} signed out`, 'AUTH_GATEWAY');
    }
    api.logoutUser();
    setSession(null);
    setCurrentPath('/');
    showToast('Session Closed', 'You have been disconnected from the gateway', 'info');
  };

  // Admin Login success handler
  const handleAdminLoginSuccess = (admSession: AdminSession) => {
    setAdminSession(admSession);
    setIsAdminLoginModalOpen(false);
    addLog('AUTH', `ADMIN_SESSION_AUTHORIZED: Master Node ${admSession.adminId}`, 'ADMIN_MATRIX');
    setCurrentPath('/admin');
    showToast('Admin Access Granted', `Welcome back, ${admSession.adminId}`, 'success');
  };

  // Admin Logout handler
  const handleAdminLogout = () => {
    if (adminSession) {
      addLog('AUTH', `ADMIN_LOGOUT: Master Node ${adminSession.adminId} signed out`, 'ADMIN_MATRIX');
    }
    api.logoutAdmin();
    setAdminSession(null);
    setCurrentPath('/');
    showToast('Admin Logged Out', 'Admin session terminated safely', 'info');
  };

  // Open Runtime Modal for module
  const handleRequestAccess = (module: SecurityModule) => {
    setSelectedModuleForPlan(module);
    setIsRuntimeModalOpen(true);
  };

  // Selected Plan -> Open Checkout Modal
  const handleSelectPlan = (module: SecurityModule, plan: RuntimePlan) => {
    setIsRuntimeModalOpen(false);
    setSelectedModuleForCheckout(module);
    setSelectedPlanForCheckout(plan);
    setIsCheckoutModalOpen(true);
  };

  // Proceed from Checkout to Payment QR Page
  const handleProceedToPayment = () => {
    if (!selectedModuleForCheckout || !selectedPlanForCheckout) return;
    setIsCheckoutModalOpen(false);

    const paymentSession: PaymentSession = {
      sessionId: `SESS-${Date.now().toString().slice(-6)}`,
      module: selectedModuleForCheckout,
      plan: selectedPlanForCheckout,
      amount: selectedPlanForCheckout.price,
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000,
      status: 'PENDING',
      transactionId: `UPI-TXN-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      upiVpa: 'aegis.defense@icici'
    };

    setActivePaymentSession(paymentSession);
    setCurrentPath('/payment');
    addLog('PAY', `PAYMENT_SESSION_INITIATED: ${paymentSession.module.name} (${paymentSession.plan.duration}) - ₹${paymentSession.amount}`, 'SETTLE_GATEWAY');
  };

  // Payment Verification Success
  const handlePaymentSuccess = (pSession: PaymentSession, order: OrderRecord) => {
    // 1. Authorize module in state
    setModules((prev) =>
      prev.map((m) => {
        if (m.id === pSession.module.id) {
          return {
            ...m,
            isAuthorized: true,
            status: 'ACTIVE',
            activePlan: pSession.plan.duration
          };
        }
        return m;
      })
    );

    // 2. Add system logs
    addLog('PAY', `PAYMENT_SETTLED: ${pSession.module.name} Pass Activated (${pSession.plan.duration}) - Order: ${order.id}`, 'SETTLE_GATEWAY');
    addLog('SYS', `DISPATCH: ${pSession.module.name} runtime daemon online`, 'MODULE_DAEMON');

    // 3. Toast notification
    showToast('Payment Verified!', `${pSession.module.name} access pass authorized successfully`, 'success');

    // 4. Navigate back to panel
    setActivePaymentSession(null);
    setCurrentPath('/panel');
  };

  // Cancel Payment
  const handleCancelPayment = () => {
    if (activePaymentSession) {
      addLog('PAY', `PAYMENT_SESSION_CANCELLED: ${activePaymentSession.module.name}`, 'SETTLE_GATEWAY');
    }
    setActivePaymentSession(null);
    setCurrentPath(session ? '/panel' : '/');
    showToast('Payment Cancelled', 'Payment session cancelled', 'info');
  };

  // Toggle Module Status (Active/Standby)
  const handleToggleModuleStatus = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id === moduleId) {
          const nextStatus = m.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
          addLog('SYS', `STATUS_TOGGLE: ${m.name} switched to ${nextStatus}`, 'POLICY_AGENT');
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
  };

  // Open Sandbox Inspector
  const handleOpenInspector = (module: SecurityModule) => {
    setInspectedModule(module);
    setIsInspectorOpen(true);
    addLog('SYS', `DIAGNOSTIC_SESSION_OPENED: ${module.name} (${module.version})`, 'INSPECTOR_CORE');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative selection:bg-cyan-500 selection:text-black">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-900/15 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[500px] bg-blue-900/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-10 right-0 w-[500px] h-[400px] bg-cyan-950/20 blur-[130px] rounded-full" />
      </div>

      {/* Header - AEGIS Logo triggers Admin Login Modal */}
      <Header
        currentPath={currentPath}
        onNavigate={(path) => setCurrentPath(path)}
        session={session}
        onLogout={handleLogout}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        logCount={logs.length}
        onOpenAdminLogin={() => {
          playCyberClick();
          setIsAdminLoginModalOpen(true);
        }}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 relative z-10">
        {/* VIEW 1: LOGIN GATEWAY (Always starts on login if unauthenticated) */}
        {currentPath === '/' && (
          <AuthCard
            onLoginSuccess={handleLoginSuccess}
            onShowToast={showToast}
          />
        )}

        {/* VIEW 2: ACCESS MODULES / MAIN PANEL */}
        {(currentPath === '/panel' || currentPath === '/dashboard' || currentPath === '/modules') && (
          <ModuleDashboard
            modules={modules}
            session={session}
            onNavigate={(path) => setCurrentPath(path)}
            onRequestAccess={handleRequestAccess}
            onOpenInspector={handleOpenInspector}
            onToggleModuleStatus={handleToggleModuleStatus}
            onLogout={handleLogout}
          />
        )}

        {/* VIEW 3: ADMIN CONTROL MATRIX (Protected) */}
        {currentPath === '/admin' && (
          adminSession ? (
            <AdminDashboard
              adminSession={adminSession}
              onNavigate={(path) => setCurrentPath(path)}
              onAdminLogout={handleAdminLogout}
              onShowToast={showToast}
              onRefreshData={loadInitialData}
            />
          ) : (
            <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-4">
              <div className="p-6 rounded-2xl bg-[#081024] border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <h2 className="font-cyber font-bold text-xl text-white mb-2">ADMIN AUTHENTICATION REQUIRED</h2>
                <p className="text-xs font-mono-tech text-slate-400 mb-6">
                  Please authenticate with valid administrator credentials to access the Control Matrix.
                </p>
                <button
                  onClick={() => setIsAdminLoginModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs uppercase tracking-wider"
                >
                  OPEN ADMIN LOGIN
                </button>
              </div>
            </div>
          )
        )}

        {/* VIEW 4: CONSOLE TERMINAL */}
        {currentPath === '/console' && (
          <ConsolePanel
            logs={logs}
            modules={modules}
            onClearLogs={() => setLogs([])}
            onAddLog={addLog}
            onNavigate={(path) => setCurrentPath(path)}
            onShowToast={showToast}
          />
        )}

        {/* VIEW 5: SECURE PAYMENT SESSION (QR) */}
        {currentPath === '/payment' && activePaymentSession && (
          <PaymentQRPage
            session={activePaymentSession}
            username={session ? session.authorizedId : 'AGENT_01'}
            onPaymentSuccess={handlePaymentSuccess}
            onCancel={handleCancelPayment}
          />
        )}
      </main>

      {/* Footer info bar */}
      <footer className="w-full border-t border-slate-900 bg-[#02050e]/90 py-3 px-4 text-center font-mono-tech text-[11px] text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AEGIS // DEFENSE &copy; 2026 QUANTUM SECURITY ARCHITECTURE. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>TLS 1.3</span>
            <span>•</span>
            <span>ZKP-1024</span>
            <span>•</span>
            <span>SOC2 TYPE II</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Admin Login Modal (Triggered by clicking AEGIS logo in header) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
        onShowToast={showToast}
      />

      {/* 2. Runtime Selection Modal */}
      <RuntimeModal
        module={selectedModuleForPlan}
        plans={plans}
        isOpen={isRuntimeModalOpen}
        onClose={() => setIsRuntimeModalOpen(false)}
        onSelectPlan={handleSelectPlan}
      />

      {/* 3. Checkout Gateway Modal */}
      <CheckoutModal
        module={selectedModuleForCheckout}
        plan={selectedPlanForCheckout}
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onProceedToPayment={handleProceedToPayment}
      />

      {/* 4. Safe Module Sandbox Inspector */}
      <ModuleInspectorModal
        module={inspectedModule}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
