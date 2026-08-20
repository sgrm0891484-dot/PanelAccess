import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Cpu, ShoppingCart, Activity, Terminal, 
  Settings, CheckCircle2, AlertTriangle, RefreshCw, Plus, 
  ArrowLeft, Search, Filter, Lock, Unlock, Download, Trash2, 
  Key, Edit3, DollarSign, Eye, Clock, LogOut, Check, X, 
  ChevronRight, ShieldAlert, Sparkles, Sliders, Server, CreditCard, Ban
} from 'lucide-react';
import { 
  SecurityModule, RuntimePlan, OrderRecord, PaymentSettings, 
  AdminActivityLog, LogEntry, RoutePath, UserRecord, AdminStats, AdminSession 
} from '../types';
import { api } from '../services/api';
import { playCyberClick, playCyberBlip, playSuccessSound, playAlertSound } from '../utils/audio';

interface AdminDashboardProps {
  adminSession: AdminSession;
  onNavigate: (path: RoutePath) => void;
  onAdminLogout: () => void;
  onShowToast: (title: string, msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
  onRefreshData?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminSession,
  onNavigate,
  onAdminLogout,
  onShowToast,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'MODULES' | 'PRICING' | 'ORDERS' | 'PAYMENTS' | 'ACTIVITY' | 'SYSTEM_LOGS'>('OVERVIEW');
  
  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [modules, setModules] = useState<SecurityModule[]>([]);
  const [plans, setPlans] = useState<RuntimePlan[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<string>('ALL');

  // Modal States
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [resetPassUser, setResetPassUser] = useState<UserRecord | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserRecord | null>(null);

  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false);
  const [editModule, setEditModule] = useState<SecurityModule | null>(null);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState<SecurityModule | null>(null);

  const [editPlan, setEditPlan] = useState<RuntimePlan | null>(null);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);

  const [extendOrder, setExtendOrder] = useState<OrderRecord | null>(null);
  const [confirmRevokeOrder, setConfirmRevokeOrder] = useState<OrderRecord | null>(null);

  // Form Temp States
  const [newUsername, setNewUsername] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'AGENT' | 'SECURITY_OFFICER'>('AGENT');
  const [newUserStatus, setNewUserStatus] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');
  const [resetPassValue, setResetPassValue] = useState('');

  const [moduleForm, setModuleForm] = useState<Partial<SecurityModule>>({
    name: '',
    version: 'v1.0.0',
    subtitle: '',
    description: '',
    features: ['Real-time Telemetry', 'Encryption Core'],
    basePrice: 150,
    status: 'LOCKED',
    isAuthorized: false,
    iconType: 'shield'
  });

  const [planForm, setPlanForm] = useState<Partial<RuntimePlan>>({
    duration: '',
    days: 30,
    price: 150,
    description: '',
    badge: undefined,
    features: ['Gateway Telemetry', 'Encrypted TLS Tunnel'],
    isActive: true
  });

  const [extendDays, setExtendDays] = useState(30);

  // Load All Admin Data
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [
        statsRes, usersRes, modRes, plansRes, ordersRes, settingsRes, actRes, sysRes
      ] = await Promise.all([
        api.getAdminStats().catch(() => ({ stats: null })),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getModules().catch(() => ({ modules: [] })),
        api.getAdminPlans().catch(() => ({ plans: [] })),
        api.getAdminOrders().catch(() => ({ orders: [] })),
        api.getAdminPaymentSettings().catch(() => ({ settings: null })),
        api.getAdminActivityLogs().catch(() => ({ logs: [] })),
        api.getSystemLogs().catch(() => ({ logs: [] }))
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (usersRes.users) setUsers(usersRes.users);
      if (modRes.modules) setModules(modRes.modules);
      if (plansRes.plans) setPlans(plansRes.plans);
      if (ordersRes.orders) setOrders(ordersRes.orders);
      if (settingsRes.settings) setPaymentSettings(settingsRes.settings);
      if (actRes.logs) setActivityLogs(actRes.logs);
      if (sysRes.logs) setSystemLogs(sysRes.logs);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ----------------------------------------------------
  // USER ACTIONS
  // ----------------------------------------------------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPass.trim()) {
      onShowToast('Validation Error', 'Username and password are required', 'warn');
      return;
    }
    try {
      await api.createAdminUser({
        username: newUsername.trim(),
        password: newUserPass.trim(),
        role: newUserRole,
        status: newUserStatus
      });
      playSuccessSound();
      onShowToast('User Created', `Node user ${newUsername} registered successfully`, 'success');
      setShowCreateUserModal(false);
      setNewUsername('');
      setNewUserPass('');
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to create user', err.message, 'error');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      await api.updateAdminUser(editUser.id, {
        username: editUser.username,
        role: editUser.role,
        status: editUser.status
      });
      playSuccessSound();
      onShowToast('User Updated', `Node user ${editUser.username} saved`, 'success');
      setEditUser(null);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to update user', err.message, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      await api.deleteAdminUser(confirmDeleteUser.id);
      playSuccessSound();
      onShowToast('User Deleted', `User ${confirmDeleteUser.username} permanently deleted`, 'info');
      setConfirmDeleteUser(null);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to delete user', err.message, 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser || !resetPassValue.trim()) {
      onShowToast('Validation Error', 'Please enter a new password', 'warn');
      return;
    }
    try {
      await api.resetAdminUserPassword(resetPassUser.id, resetPassValue.trim());
      playSuccessSound();
      onShowToast('Pass Key Reset', `New pass key assigned to ${resetPassUser.username}`, 'success');
      setResetPassUser(null);
      setResetPassValue('');
      fetchAllData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to reset pass key', err.message, 'error');
    }
  };

  const handleToggleUserStatus = async (user: UserRecord) => {
    const nextStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.updateAdminUser(user.id, { status: nextStatus });
      playCyberClick();
      onShowToast('Status Updated', `${user.username} is now ${nextStatus}`, 'info');
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to update status', err.message, 'error');
    }
  };

  // ----------------------------------------------------
  // MODULE ACTIONS
  // ----------------------------------------------------
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.name?.trim()) {
      onShowToast('Validation Error', 'Module name is required', 'warn');
      return;
    }
    try {
      await api.createAdminModule(moduleForm);
      playSuccessSound();
      onShowToast('Module Created', `${moduleForm.name} added to security registry`, 'success');
      setShowCreateModuleModal(false);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to create module', err.message, 'error');
    }
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModule) return;
    try {
      await api.updateAdminModule(editModule.id, editModule);
      playSuccessSound();
      onShowToast('Module Updated', `${editModule.name} updated successfully`, 'success');
      setEditModule(null);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to update module', err.message, 'error');
    }
  };

  const handleDeleteModule = async () => {
    if (!confirmDeleteModule) return;
    try {
      await api.deleteAdminModule(confirmDeleteModule.id);
      playSuccessSound();
      onShowToast('Module Removed', `${confirmDeleteModule.name} removed from registry`, 'info');
      setConfirmDeleteModule(null);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to delete module', err.message, 'error');
    }
  };

  const handleToggleModuleAuth = async (mod: SecurityModule) => {
    try {
      const nextAuth = !mod.isAuthorized;
      await api.updateAdminModule(mod.id, { 
        isAuthorized: nextAuth,
        status: nextAuth ? 'ACTIVE' : 'LOCKED'
      });
      playCyberClick();
      onShowToast('Module Authorization Changed', `${mod.name} is now ${nextAuth ? 'AUTHORIZED' : 'LOCKED'}`, 'info');
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Error updating module auth', err.message, 'error');
    }
  };

  // ----------------------------------------------------
  // PRICING & PLANS ACTIONS
  // ----------------------------------------------------
  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlan) return;
    try {
      await api.updateAdminPlan(editPlan.id, editPlan);
      playSuccessSound();
      onShowToast('Plan Updated', `${editPlan.duration} pricing updated to ₹${editPlan.price}`, 'success');
      setEditPlan(null);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to update plan', err.message, 'error');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.duration?.trim()) {
      onShowToast('Validation Error', 'Plan duration title is required', 'warn');
      return;
    }
    try {
      await api.createAdminPlan(planForm);
      playSuccessSound();
      onShowToast('Pricing Plan Added', `${planForm.duration} tier created`, 'success');
      setShowCreatePlanModal(false);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to create plan', err.message, 'error');
    }
  };

  // ----------------------------------------------------
  // ORDER ACTIONS
  // ----------------------------------------------------
  const handleRevokeOrder = async () => {
    if (!confirmRevokeOrder) return;
    try {
      await api.revokeAdminOrderAccess(confirmRevokeOrder.id);
      playAlertSound();
      onShowToast('Access Revoked', `Access revoked for order ${confirmRevokeOrder.id}`, 'warn');
      setConfirmRevokeOrder(null);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to revoke order', err.message, 'error');
    }
  };

  const handleExtendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendOrder) return;
    try {
      await api.extendAdminOrderRuntime(extendOrder.id, extendDays);
      playSuccessSound();
      onShowToast('Runtime Extended', `Added +${extendDays} days runtime to order ${extendOrder.id}`, 'success');
      setExtendOrder(null);
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to extend order', err.message, 'error');
    }
  };

  const handleUpdateOrderStatus = async (order: OrderRecord, pStatus?: string, aStatus?: string) => {
    try {
      await api.updateAdminOrderStatus(order.id, pStatus, aStatus);
      playCyberClick();
      onShowToast('Order Updated', `Order ${order.id} status modified`, 'info');
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to update order', err.message, 'error');
    }
  };

  // ----------------------------------------------------
  // PAYMENT SETTINGS ACTIONS
  // ----------------------------------------------------
  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSettings) return;
    try {
      await api.updateAdminPaymentSettings(paymentSettings);
      playSuccessSound();
      onShowToast('Settings Saved', 'Payment gateway configuration updated successfully', 'success');
      fetchAllData();
    } catch (err: any) {
      playAlertSound();
      onShowToast('Failed to update payment settings', err.message, 'error');
    }
  };

  // ----------------------------------------------------
  // FILTERED DATA
  // ----------------------------------------------------
  const filteredUsers = users.filter((u) => 
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredModules = modules.filter((m) => 
    m.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    m.subtitle.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    m.description.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  const filteredOrders = orders.filter((o) => {
    const matchSearch = 
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.user.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.moduleName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.transactionRef.toLowerCase().includes(orderSearch.toLowerCase());
    if (!matchSearch) return false;
    if (orderFilter === 'VERIFIED') return o.paymentStatus === 'VERIFIED';
    if (orderFilter === 'PENDING') return o.paymentStatus === 'PENDING';
    if (orderFilter === 'ACTIVE_ACCESS') return o.accessStatus === 'ACTIVE';
    if (orderFilter === 'REVOKED') return o.accessStatus === 'REVOKED';
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">
      {/* Top Header Card */}
      <div 
        id="admin-header-panel"
        className="w-full rounded-2xl bg-[#081126]/90 border border-cyan-500/35 p-5 sm:p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden"
      >
        <div className="absolute inset-0 cyber-grid-bg opacity-20 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <button
                id="btn-admin-return-gateway"
                onClick={() => {
                  playCyberClick();
                  onNavigate('/panel');
                }}
                className="flex items-center gap-1.5 text-xs font-mono-tech text-cyan-400 hover:text-cyan-300 transition-colors mr-2 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>USER ACCESS PANEL</span>
              </button>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono-tech text-emerald-400 font-bold uppercase tracking-widest">
                ADMIN // MASTER CONTROL MATRIX
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-cyber font-bold tracking-wider text-white flex items-center gap-2.5">
              <ShieldAlert className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              AEGIS // ADMIN CONTROL
            </h1>
            <p className="text-xs sm:text-sm font-mono-tech text-cyan-300/80 mt-0.5">
              SYSTEM MANAGEMENT CONSOLE | Authenticated as <strong className="text-white">{adminSession.adminId}</strong>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-admin-refresh-data"
              onClick={() => {
                playCyberClick();
                fetchAllData();
                onShowToast('Refreshed', 'Admin cluster state refreshed from database', 'info');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>REFRESH DATA</span>
            </button>

            <button
              id="btn-admin-logout"
              onClick={() => {
                playCyberClick();
                onAdminLogout();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 font-mono-tech text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(244,63,94,0.25)]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>SECURE LOGOUT</span>
            </button>
          </div>
        </div>

        {/* 8 Statistics Cards with Real Values */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3 mt-6 pt-5 border-t border-cyan-500/20 relative z-10">
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#040817]/90 border border-cyan-500/20">
            <span className="text-[10px] font-mono-tech text-slate-400 uppercase block">TOTAL USERS</span>
            <span className="text-lg sm:text-xl font-cyber font-bold text-white tracking-wider">
              {stats?.totalUsers ?? users.length}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#040817]/90 border border-cyan-500/20">
            <span className="text-[10px] font-mono-tech text-slate-400 uppercase block">ACTIVE USERS</span>
            <span className="text-lg sm:text-xl font-cyber font-bold text-emerald-400 tracking-wider">
              {stats?.activeUsers ?? users.filter((u) => u.status === 'ACTIVE').length}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#040817]/90 border border-cyan-500/20">
            <span className="text-[10px] font-mono-tech text-slate-400 uppercase block">ACTIVE MODULES</span>
            <span className="text-lg sm:text-xl font-cyber font-bold text-cyan-300 tracking-wider">
              {stats?.activeModules ?? modules.filter((m) => m.isAuthorized).length}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#040817]/90 border border-cyan-500/20">
            <span className="text-[10px] font-mono-tech text-slate-400 uppercase block">TOTAL ORDERS</span>
            <span className="text-lg sm:text-xl font-cyber font-bold text-white tracking-wider">
              {stats?.totalOrders ?? orders.length}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#040817]/90 border border-cyan-500/20">
            <span className="text-[10px] font-mono-tech text-slate-400 uppercase block">PAID ORDERS</span>
            <span className="text-lg sm:text-xl font-cyber font-bold text-emerald-400 tracking-wider">
              {stats?.paidOrders ?? orders.filter((o) => o.paymentStatus === 'VERIFIED').length}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#040817]/90 border border-cyan-500/20">
            <span className="text-[10px] font-mono-tech text-slate-400 uppercase block">PENDING ORDERS</span>
            <span className="text-lg sm:text-xl font-cyber font-bold text-amber-400 tracking-wider">
              {stats?.pendingOrders ?? orders.filter((o) => o.paymentStatus === 'PENDING').length}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#040817]/90 border border-cyan-500/20">
            <span className="text-[10px] font-mono-tech text-slate-400 uppercase block">TOTAL REVENUE</span>
            <span className="text-lg sm:text-xl font-cyber font-bold text-emerald-400 tracking-wider">
              ₹{stats?.totalRevenue ?? orders.filter((o) => o.paymentStatus === 'VERIFIED').reduce((sum, o) => sum + o.amount, 0)}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#040817]/90 border border-cyan-500/20">
            <span className="text-[10px] font-mono-tech text-slate-400 uppercase block">SYSTEM STATUS</span>
            <span className="text-xs font-mono-tech font-bold text-emerald-400 leading-tight block mt-1">
              99.98% OK
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: 'OVERVIEW', label: 'OVERVIEW', icon: Activity },
          { id: 'USERS', label: `USERS (${users.length})`, icon: Users },
          { id: 'MODULES', label: `MODULES (${modules.length})`, icon: Cpu },
          { id: 'PRICING', label: `PRICING (${plans.length})`, icon: DollarSign },
          { id: 'ORDERS', label: `ORDERS (${orders.length})`, icon: ShoppingCart },
          { id: 'PAYMENTS', label: 'PAYMENT SETTINGS', icon: CreditCard },
          { id: 'ACTIVITY', label: `ACTIVITY LOGS (${activityLogs.length})`, icon: Clock },
          { id: 'SYSTEM_LOGS', label: 'SYSTEM LOGS', icon: Terminal }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id.toLowerCase()}`}
              onClick={() => {
                playCyberBlip(600);
                setActiveTab(tab.id as any);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono-tech font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'bg-[#060c1d] border border-cyan-500/20 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ==================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Quick Actions Card */}
            <div className="rounded-2xl bg-[#081024]/90 border border-cyan-500/30 p-5 space-y-4">
              <h3 className="font-cyber font-bold text-base text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                ADMIN ACTIONS
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    playCyberClick();
                    setShowCreateUserModal(true);
                  }}
                  className="w-full p-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    CREATE NEW USER NODE
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    playCyberClick();
                    setShowCreateModuleModal(true);
                  }}
                  className="w-full p-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    ADD SECURITY MODULE
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    playCyberClick();
                    setActiveTab('PRICING');
                  }}
                  className="w-full p-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    EDIT RUNTIME PRICES
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    playCyberClick();
                    setActiveTab('PAYMENTS');
                  }}
                  className="w-full p-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                    CONFIGURE UPI VPA
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Gateway Status Summary */}
            <div className="rounded-2xl bg-[#081024]/90 border border-cyan-500/30 p-5 space-y-4">
              <h3 className="font-cyber font-bold text-base text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                GATEWAY ENVIRONMENT
              </h3>
              <div className="space-y-2.5 text-xs font-mono-tech">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Payment Gateway UPI:</span>
                  <span className="text-cyan-300 font-bold">{paymentSettings?.upiVpa || 'aegis.defense@icici'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Auto Verification:</span>
                  <span className="text-emerald-400 font-bold">{paymentSettings?.autoVerification ? 'ENABLED' : 'MANUAL'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Database Engine:</span>
                  <span className="text-white font-bold">PERSISTENT JSON STORAGE</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Security Cipher:</span>
                  <span className="text-cyan-300 font-bold">KYBER-1024 ENCLAVE</span>
                </div>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="rounded-2xl bg-[#081024]/90 border border-cyan-500/30 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-cyber font-bold text-base text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-cyan-400" />
                  LATEST ORDERS
                </h3>
                <button
                  onClick={() => setActiveTab('ORDERS')}
                  className="text-xs font-mono-tech text-cyan-400 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {orders.slice(0, 4).map((o) => (
                  <div key={o.id} className="p-2 rounded-lg bg-[#040817] border border-cyan-500/20 text-xs font-mono-tech flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">{o.moduleName}</div>
                      <div className="text-[10px] text-slate-400">{o.user} • {o.planTitle}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-bold">₹{o.amount}</div>
                      <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {o.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: USERS MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-users"
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by ID, username, or role..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#060c1d] border border-cyan-500/30 text-white font-mono-tech text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              id="btn-create-user-modal"
              onClick={() => {
                playCyberClick();
                setShowCreateUserModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>CREATE NEW USER</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl bg-[#081024]/90 border border-cyan-500/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-tech text-xs">
                <thead className="bg-[#040816] text-cyan-400 uppercase text-[10px] tracking-wider border-b border-cyan-500/20">
                  <tr>
                    <th className="p-3.5">User / Node ID</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Purchased Modules</th>
                    <th className="p-3.5">Registration Date</th>
                    <th className="p-3.5">Last Login</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-cyan-950/20 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          {u.username}
                        </div>
                        <span className="text-[10px] text-slate-500">{u.id}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          u.role === 'SECURITY_OFFICER' 
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 transition-all ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? <Check className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          <span>{u.status}</span>
                        </button>
                      </td>
                      <td className="p-3.5">
                        <span className="text-white font-bold">{u.purchasedModules?.length || 0}</span>
                        <span className="text-slate-500 text-[10px]"> active modules</span>
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-400">{u.createdAt}</td>
                      <td className="p-3.5 text-[11px] text-slate-400">{u.lastLogin}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              playCyberClick();
                              setEditUser({ ...u });
                            }}
                            title="Edit User"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-400 text-cyan-300 transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberClick();
                              setResetPassUser(u);
                              setResetPassValue('');
                            }}
                            title="Reset Password"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-950 border border-slate-700 hover:border-amber-400 text-amber-300 transition-all"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberClick();
                              setConfirmDeleteUser(u);
                            }}
                            title="Delete User"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 border border-slate-700 hover:border-rose-400 text-rose-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: MODULES MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === 'MODULES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-modules-admin"
                type="text"
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
                placeholder="Search modules by name, subtitle, or description..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#060c1d] border border-cyan-500/30 text-white font-mono-tech text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              id="btn-add-module-modal"
              onClick={() => {
                playCyberClick();
                setModuleForm({
                  name: '',
                  version: 'v1.0.0',
                  subtitle: '',
                  description: '',
                  features: ['Real-time Telemetry', 'Encryption Core'],
                  basePrice: 150,
                  status: 'LOCKED',
                  isAuthorized: false,
                  iconType: 'shield'
                });
                setShowCreateModuleModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ADD SECURITY MODULE</span>
            </button>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((mod) => (
              <div 
                key={mod.id}
                className="rounded-2xl bg-[#081024]/90 border border-cyan-500/30 p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-cyber font-bold text-white text-base">{mod.name}</span>
                      <span className="text-[10px] font-mono-tech px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                        {mod.version}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleModuleAuth(mod)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold border transition-all ${
                        mod.isAuthorized
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {mod.isAuthorized ? 'AUTHORIZED' : 'LOCKED'}
                    </button>
                  </div>

                  <p className="text-xs font-mono-tech text-cyan-300/80 mt-2 font-medium">{mod.subtitle}</p>
                  <p className="text-[11px] font-mono-tech text-slate-400 mt-1 line-clamp-2">{mod.description}</p>

                  <div className="flex items-center justify-between mt-3 text-xs font-mono-tech">
                    <span className="text-slate-400">Base Price:</span>
                    <span className="font-cyber font-bold text-emerald-400">₹{mod.basePrice || 150}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      playCyberClick();
                      setEditModule({ ...mod });
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>EDIT</span>
                  </button>

                  <button
                    onClick={() => {
                      playCyberClick();
                      setConfirmDeleteModule(mod);
                    }}
                    className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-300 transition-all"
                    title="Delete Module"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: PRICING MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === 'PRICING' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-cyber font-bold text-white">RUNTIME LICENSES & PRICING PLANS</h2>
              <p className="text-xs font-mono-tech text-slate-400">Manage duration, prices, and features for each runtime license tier</p>
            </div>

            <button
              onClick={() => {
                playCyberClick();
                setPlanForm({
                  duration: '',
                  days: 30,
                  price: 150,
                  description: '',
                  badge: undefined,
                  features: ['Gateway Telemetry', 'Encrypted TLS Tunnel'],
                  isActive: true
                });
                setShowCreatePlanModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>NEW PLAN TIER</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div 
                key={p.id}
                className="rounded-2xl bg-[#081024]/90 border border-cyan-500/30 p-5 space-y-4 flex flex-col justify-between relative overflow-hidden"
              >
                {p.badge && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-mono-tech font-bold bg-cyan-500 text-black">
                    {p.badge}
                  </div>
                )}

                <div>
                  <div className="text-xs font-mono-tech text-cyan-400 uppercase font-bold tracking-wider">
                    {p.duration}
                  </div>
                  <div className="text-3xl font-cyber font-bold text-emerald-400 mt-1">
                    {p.currency}{p.price}
                  </div>
                  <p className="text-xs font-mono-tech text-slate-400 mt-2">{p.description}</p>
                  
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                    {p.features?.map((f, i) => (
                      <div key={i} className="text-[11px] font-mono-tech text-slate-300 flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    playCyberClick();
                    setEditPlan({ ...p });
                  }}
                  className="w-full py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono-tech text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>EDIT PRICE & PLAN</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: ORDERS MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-orders"
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search orders by ID, user, module or txn..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#060c1d] border border-cyan-500/30 text-white font-mono-tech text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'VERIFIED', 'PENDING', 'ACTIVE_ACCESS', 'REVOKED'].map((flt) => (
                <button
                  key={flt}
                  onClick={() => setOrderFilter(flt)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-tech font-bold transition-all ${
                    orderFilter === flt
                      ? 'bg-cyan-500 text-black'
                      : 'bg-[#060c1d] border border-slate-800 text-slate-400 hover:text-cyan-300'
                  }`}
                >
                  {flt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#081024]/90 border border-cyan-500/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-tech text-xs">
                <thead className="bg-[#040816] text-cyan-400 uppercase text-[10px] tracking-wider border-b border-cyan-500/20">
                  <tr>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Module & Runtime</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Payment Status</th>
                    <th className="p-3.5">Access Status</th>
                    <th className="p-3.5">Order Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-cyan-950/20 transition-colors">
                      <td className="p-3.5 font-bold text-white">{o.id}</td>
                      <td className="p-3.5">{o.user}</td>
                      <td className="p-3.5">
                        <div className="text-white font-bold">{o.moduleName}</div>
                        <span className="text-[10px] text-cyan-400">{o.planTitle}</span>
                      </td>
                      <td className="p-3.5 font-bold text-emerald-400">₹{o.amount}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          o.paymentStatus === 'VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          o.accessStatus === 'ACTIVE'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}>
                          {o.accessStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-400">{o.createdAt}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {o.accessStatus === 'ACTIVE' ? (
                            <button
                              onClick={() => {
                                playCyberClick();
                                setConfirmRevokeOrder(o);
                              }}
                              className="px-2 py-1 rounded bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[10px] font-bold transition-all"
                            >
                              REVOKE
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateOrderStatus(o, undefined, 'ACTIVE')}
                              className="px-2 py-1 rounded bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold transition-all"
                            >
                              RESTORE
                            </button>
                          )}

                          <button
                            onClick={() => {
                              playCyberClick();
                              setExtendOrder(o);
                            }}
                            className="px-2 py-1 rounded bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-all"
                          >
                            + EXTEND
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: PAYMENT SETTINGS */}
      {/* ==================================================== */}
      {activeTab === 'PAYMENTS' && paymentSettings && (
        <div className="max-w-2xl mx-auto rounded-2xl bg-[#081024]/90 border border-cyan-500/35 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-cyber font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              PAYMENT GATEWAY CONFIGURATION
            </h2>
            <p className="text-xs font-mono-tech text-slate-400 mt-0.5">
              Manage merchant credentials and auto-verification policies
            </p>
          </div>

          <form onSubmit={handleSavePaymentSettings} className="space-y-4 font-mono-tech text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">UPI VPA ADDRESS:</label>
              <input
                type="text"
                value={paymentSettings.upiVpa}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, upiVpa: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">MERCHANT NAME:</label>
              <input
                type="text"
                value={paymentSettings.merchantName}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, merchantName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#040816] border border-cyan-500/20">
              <div>
                <span className="font-bold text-white block">AUTO-VERIFICATION:</span>
                <span className="text-[11px] text-slate-400">Instantly grant module passes upon valid UPI receipt validation</span>
              </div>
              <input
                type="checkbox"
                checked={paymentSettings.autoVerification}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, autoVerification: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">MIN AMOUNT (₹):</label>
                <input
                  type="number"
                  value={paymentSettings.minAmount}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, minAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">MAX AMOUNT (₹):</label>
                <input
                  type="number"
                  value={paymentSettings.maxAmount}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, maxAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>SAVE PAYMENT GATEWAY SETTINGS</span>
            </button>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 7: ACTIVITY LOGS */}
      {/* ==================================================== */}
      {activeTab === 'ACTIVITY' && (
        <div className="rounded-2xl bg-[#081024]/90 border border-cyan-500/30 p-5 space-y-4">
          <h2 className="text-base font-cyber font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            ADMINISTRATIVE AUDIT LOG
          </h2>

          <div className="space-y-2 max-h-[600px] overflow-y-auto font-mono-tech text-xs">
            {activityLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-[#040816] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300">{log.action}</span>
                    <span className="text-[10px] text-slate-500">by {log.adminId}</span>
                  </div>
                  <p className="text-slate-300 mt-0.5">{log.details}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500">{log.timestamp}</span>
                  <div className="text-[10px] text-slate-600">{log.ipHash}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 8: SYSTEM LOGS */}
      {/* ==================================================== */}
      {activeTab === 'SYSTEM_LOGS' && (
        <div className="rounded-2xl bg-[#040816] border border-cyan-500/30 p-5 font-mono-tech text-xs space-y-2">
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 text-cyan-400 font-bold">
            <span>KERNEL SECURITY STREAM</span>
            <span>LIVE AUDIT</span>
          </div>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {systemLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 py-1 border-b border-slate-900">
                <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                  log.level === 'WARN' ? 'bg-amber-500/20 text-amber-300' :
                  log.level === 'PAY' ? 'bg-emerald-500/20 text-emerald-300' :
                  log.level === 'AUTH' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-cyan-500/20 text-cyan-300'
                }`}>
                  {log.level}
                </span>
                <span className="text-slate-300 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS */}
      {/* ==================================================== */}

      {/* MODAL 1: CREATE USER */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-cyan-500/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-white">CREATE NEW USER</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3 font-mono-tech text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">USERNAME / AUTHORIZED ID:</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. AGENT_02"
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">INITIAL PASS KEY:</label>
                <input
                  type="password"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  placeholder="e.g. AEGIS-KEY-1122"
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">ROLE:</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                >
                  <option value="AGENT">AGENT</option>
                  <option value="SECURITY_OFFICER">SECURITY_OFFICER</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-black font-cyber font-bold text-xs uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                CREATE USER
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-cyan-500/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-white">EDIT USER: {editUser.username}</h3>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-3 font-mono-tech text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">USERNAME:</label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">ROLE:</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                >
                  <option value="AGENT">AGENT</option>
                  <option value="SECURITY_OFFICER">SECURITY_OFFICER</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">STATUS:</label>
                <select
                  value={editUser.status}
                  onChange={(e) => setEditUser({ ...editUser, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-black font-cyber font-bold text-xs uppercase"
              >
                SAVE CHANGES
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-amber-500/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-white">RESET PASS KEY: {resetPassUser.username}</h3>
              <button onClick={() => setResetPassUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-3 font-mono-tech text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">NEW PASS KEY:</label>
                <input
                  type="password"
                  value={resetPassValue}
                  onChange={(e) => setResetPassValue(e.target.value)}
                  placeholder="Enter new pass key"
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-amber-500/30 text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-cyber font-bold text-xs uppercase"
              >
                CONFIRM RESET PASS KEY
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE USER CONFIRMATION */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-rose-500/40 p-6 space-y-4">
            <h3 className="font-cyber font-bold text-lg text-rose-400">CONFIRM USER DELETION</h3>
            <p className="text-xs font-mono-tech text-slate-300">
              Are you sure you want to permanently delete user <strong className="text-white">{confirmDeleteUser.username}</strong> ({confirmDeleteUser.id})? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-mono-tech text-xs font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-cyber font-bold text-xs uppercase"
              >
                PERMANENTLY DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE / EDIT MODULE */}
      {(showCreateModuleModal || editModule) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#081024] border border-cyan-500/40 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-white">
                {editModule ? `EDIT MODULE: ${editModule.name}` : 'ADD SECURITY MODULE'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModuleModal(false);
                  setEditModule(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={editModule ? handleUpdateModule : handleCreateModule} className="space-y-3 font-mono-tech text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">MODULE NAME:</label>
                <input
                  type="text"
                  value={editModule ? editModule.name : moduleForm.name}
                  onChange={(e) => editModule 
                    ? setEditModule({ ...editModule, name: e.target.value })
                    : setModuleForm({ ...moduleForm, name: e.target.value })}
                  placeholder="e.g. ULTRA GUARD"
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">VERSION:</label>
                <input
                  type="text"
                  value={editModule ? editModule.version : moduleForm.version}
                  onChange={(e) => editModule 
                    ? setEditModule({ ...editModule, version: e.target.value })
                    : setModuleForm({ ...moduleForm, version: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">SUBTITLE:</label>
                <input
                  type="text"
                  value={editModule ? editModule.subtitle : moduleForm.subtitle}
                  onChange={(e) => editModule 
                    ? setEditModule({ ...editModule, subtitle: e.target.value })
                    : setModuleForm({ ...moduleForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">DESCRIPTION:</label>
                <textarea
                  value={editModule ? editModule.description : moduleForm.description}
                  onChange={(e) => editModule 
                    ? setEditModule({ ...editModule, description: e.target.value })
                    : setModuleForm({ ...moduleForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">BASE PRICE (₹):</label>
                <input
                  type="number"
                  value={editModule ? editModule.basePrice : moduleForm.basePrice}
                  onChange={(e) => editModule 
                    ? setEditModule({ ...editModule, basePrice: Number(e.target.value) })
                    : setModuleForm({ ...moduleForm, basePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-black font-cyber font-bold text-xs uppercase"
              >
                {editModule ? 'SAVE MODULE' : 'CREATE MODULE'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: EDIT PRICING PLAN */}
      {(editPlan || showCreatePlanModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-cyan-500/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-white">
                {editPlan ? `EDIT PLAN: ${editPlan.duration}` : 'NEW PRICING PLAN'}
              </h3>
              <button
                onClick={() => {
                  setEditPlan(null);
                  setShowCreatePlanModal(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={editPlan ? handleUpdatePlan : handleCreatePlan} className="space-y-3 font-mono-tech text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">PLAN DURATION TITLE:</label>
                <input
                  type="text"
                  value={editPlan ? editPlan.duration : planForm.duration}
                  onChange={(e) => editPlan
                    ? setEditPlan({ ...editPlan, duration: e.target.value })
                    : setPlanForm({ ...planForm, duration: e.target.value })}
                  placeholder="e.g. 45 DAYS RUNTIME"
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">PRICE (₹):</label>
                <input
                  type="number"
                  value={editPlan ? editPlan.price : planForm.price}
                  onChange={(e) => editPlan
                    ? setEditPlan({ ...editPlan, price: Number(e.target.value) })
                    : setPlanForm({ ...planForm, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">DURATION IN DAYS:</label>
                <input
                  type="number"
                  value={editPlan ? editPlan.days : planForm.days}
                  onChange={(e) => editPlan
                    ? setEditPlan({ ...editPlan, days: Number(e.target.value) })
                    : setPlanForm({ ...planForm, days: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">BADGE:</label>
                <select
                  value={(editPlan ? editPlan.badge : planForm.badge) || ''}
                  onChange={(e) => {
                    const b = e.target.value ? (e.target.value as any) : undefined;
                    if (editPlan) setEditPlan({ ...editPlan, badge: b });
                    else setPlanForm({ ...planForm, badge: b });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-cyan-500/30 text-white"
                >
                  <option value="">None</option>
                  <option value="RECOMMENDED">RECOMMENDED</option>
                  <option value="LIFETIME">LIFETIME</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-black font-cyber font-bold text-xs uppercase"
              >
                {editPlan ? 'SAVE PLAN' : 'CREATE PLAN'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: EXTEND RUNTIME ORDER */}
      {extendOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-emerald-500/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-white">EXTEND RUNTIME: {extendOrder.id}</h3>
              <button onClick={() => setExtendOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleExtendOrder} className="space-y-3 font-mono-tech text-xs">
              <p className="text-slate-300">
                Extend active defense runtime pass for <strong className="text-white">{extendOrder.moduleName}</strong> assigned to <strong className="text-white">{extendOrder.user}</strong>.
              </p>
              <div>
                <label className="block text-slate-300 font-bold mb-1">ADDITIONAL DAYS:</label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#040816] border border-emerald-500/30 text-white font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-black font-cyber font-bold text-xs uppercase"
              >
                APPLY +{extendDays} DAYS RUNTIME
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: CONFIRM REVOKE ORDER */}
      {confirmRevokeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-rose-500/40 p-6 space-y-4">
            <h3 className="font-cyber font-bold text-lg text-rose-400">REVOKE MODULE ACCESS</h3>
            <p className="text-xs font-mono-tech text-slate-300">
              Revoke access for order <strong className="text-white">{confirmRevokeOrder.id}</strong> ({confirmRevokeOrder.moduleName}) from user <strong className="text-white">{confirmRevokeOrder.user}</strong> immediately?
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmRevokeOrder(null)}
                className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-mono-tech text-xs font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={handleRevokeOrder}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-cyber font-bold text-xs uppercase"
              >
                CONFIRM REVOCATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
