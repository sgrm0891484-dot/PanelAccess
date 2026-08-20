import React, { useState, useMemo } from 'react';
import { 
  Users, Search, Filter, Plus, Shield, Key, Edit3, Trash2, 
  Ban, Check, CheckCircle2, AlertTriangle, Clock, DollarSign, 
  Copy, Eye, EyeOff, RefreshCw, Sparkles, X, ChevronDown, 
  ShieldAlert, Calendar, CheckSquare, Square, ToggleLeft, ToggleRight, ArrowUpDown
} from 'lucide-react';
import { UserRecord, SecurityModule, RuntimePlan, AdminStats } from '../types';
import { api } from '../services/api';
import { appStore } from '../store/appStore';
import { playCyberClick, playCyberBlip, playSuccessSound, playAlertSound } from '../utils/audio';
import { extractErrorMessage } from '../utils/errorUtils';

interface CustomerManagementSectionProps {
  users: UserRecord[];
  modules: SecurityModule[];
  plans: RuntimePlan[];
  stats: AdminStats | null;
  onRefresh: () => void;
  onShowToast: (title: string, msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export const CustomerManagementSection: React.FC<CustomerManagementSectionProps> = ({
  users,
  modules,
  plans,
  stats,
  onRefresh,
  onShowToast
}) => {
  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED' | 'EXPIRED'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'EXPIRY' | 'NAME' | 'PRICE'>('NEWEST');

  // Password visibility map for table rows
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userToBlock, setUserToBlock] = useState<UserRecord | null>(null);
  const [userToUnblock, setUserToUnblock] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [userToResetPass, setUserToResetPass] = useState<UserRecord | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{
    customerName: string;
    customerId: string;
    username: string;
    password: string;
    modules: string;
    runtime: string;
    price: string;
    expiryDate: string;
  } | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    customerName: '',
    customerId: '',
    username: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    role: 'AGENT' as 'AGENT' | 'SECURITY_OFFICER',
    status: 'ACTIVE' as 'ACTIVE' | 'BLOCKED',
    assignedModules: [] as string[],
    runtime: '30 DAYS RUNTIME',
    useDefaultPrice: true,
    customPrice: 150,
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
    })()
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<{
    customerName: string;
    customerId: string;
    username: string;
    password?: string;
    showPassword?: boolean;
    role: 'AGENT' | 'SECURITY_OFFICER';
    status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'DISABLED';
    assignedModules: string[];
    runtime: string;
    useDefaultPrice: boolean;
    customPrice: number;
    startDate: string;
    expiryDate: string;
  }>({
    customerName: '',
    customerId: '',
    username: '',
    password: '',
    showPassword: false,
    role: 'AGENT',
    status: 'ACTIVE',
    assignedModules: [],
    runtime: '30 DAYS RUNTIME',
    useDefaultPrice: true,
    customPrice: 150,
    startDate: '',
    expiryDate: ''
  });

  // Generate ID helper
  const handleGenerateId = (target: 'create' | 'edit' = 'create') => {
    playCyberBlip(750);
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const genId = `CUST-${randNum}`;
    if (target === 'create') {
      setCreateForm(prev => ({ ...prev, customerId: genId }));
    } else {
      setEditForm(prev => ({ ...prev, customerId: genId }));
    }
  };

  // Generate Password helper
  const handleGeneratePassword = (target: 'create' | 'edit' = 'create') => {
    playCyberBlip(880);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const genPass = `AEGIS-${code}-${Math.floor(100 + Math.random() * 900)}`;
    if (target === 'create') {
      setCreateForm(prev => ({ ...prev, password: genPass, confirmPassword: genPass, showPassword: true }));
    } else {
      setEditForm(prev => ({ ...prev, password: genPass, showPassword: true }));
    }
  };

  // Quick Expiry Presets
  const handleSetExpiryPreset = (days: number | 'PERMANENT', target: 'create' | 'edit' = 'create') => {
    playCyberBlip(650);
    let expStr = '';
    let runtimeStr = '';
    if (days === 'PERMANENT') {
      expStr = '2099-12-31';
      runtimeStr = 'PERMANENT RUNTIME';
    } else {
      const d = new Date();
      d.setDate(d.getDate() + days);
      expStr = d.toISOString().split('T')[0];
      runtimeStr = `${days} DAYS RUNTIME`;
    }

    if (target === 'create') {
      setCreateForm(prev => ({ ...prev, expiryDate: expStr, runtime: runtimeStr }));
    } else {
      setEditForm(prev => ({ ...prev, expiryDate: expStr, runtime: runtimeStr }));
    }
  };

  // Toggle Module Selection helper
  const handleToggleModuleSelection = (moduleId: string, target: 'create' | 'edit' = 'create') => {
    playCyberBlip(550);
    if (target === 'create') {
      setCreateForm(prev => {
        let current = [...prev.assignedModules];
        if (moduleId === 'ALL') {
          if (current.includes('ALL')) {
            return { ...prev, assignedModules: [] };
          } else {
            return { ...prev, assignedModules: ['ALL'] };
          }
        }
        // Remove ALL if selecting specific
        current = current.filter(m => m !== 'ALL');
        if (current.includes(moduleId)) {
          current = current.filter(m => m !== moduleId);
        } else {
          current.push(moduleId);
        }
        return { ...prev, assignedModules: current };
      });
    } else {
      setEditForm(prev => {
        let current = [...prev.assignedModules];
        if (moduleId === 'ALL') {
          if (current.includes('ALL')) {
            return { ...prev, assignedModules: [] };
          } else {
            return { ...prev, assignedModules: ['ALL'] };
          }
        }
        current = current.filter(m => m !== 'ALL');
        if (current.includes(moduleId)) {
          current = current.filter(m => m !== moduleId);
        } else {
          current.push(moduleId);
        }
        return { ...prev, assignedModules: current };
      });
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    playCyberClick();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

    setCreateForm({
      customerName: '',
      customerId: `CUST-${randNum}`,
      username: '',
      password: `AEGIS-${code}`,
      confirmPassword: `AEGIS-${code}`,
      showPassword: true,
      role: 'AGENT',
      status: 'ACTIVE',
      assignedModules: ['ALL'],
      runtime: '30 DAYS RUNTIME',
      useDefaultPrice: true,
      customPrice: 150,
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
      })()
    });
    setShowCreateModal(true);
  };

  // Submit Create Customer
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.customerId.trim()) {
      onShowToast('Validation Error', 'Customer ID cannot be empty', 'warn');
      return;
    }
    if (!createForm.username.trim()) {
      onShowToast('Validation Error', 'Login Username cannot be empty', 'warn');
      return;
    }
    if (!createForm.password.trim()) {
      onShowToast('Validation Error', 'Password cannot be empty', 'warn');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      onShowToast('Validation Error', 'Password and Confirm Password must match', 'warn');
      return;
    }
    if (!createForm.useDefaultPrice && (isNaN(Number(createForm.customPrice)) || Number(createForm.customPrice) < 0)) {
      onShowToast('Validation Error', 'Custom price must be a valid non-negative number', 'warn');
      return;
    }

    try {
      const res = await api.createAdminUser({
        customerName: createForm.customerName.trim() || createForm.username.trim(),
        customerId: createForm.customerId.trim().toUpperCase(),
        username: createForm.username.trim().toUpperCase(),
        password: createForm.password.trim(),
        confirmPassword: createForm.confirmPassword.trim(),
        role: createForm.role,
        status: createForm.status,
        assignedModules: createForm.assignedModules.length > 0 ? createForm.assignedModules : ['ALL'],
        useDefaultPrice: createForm.useDefaultPrice,
        customPrice: Number(createForm.customPrice) || 150,
        runtime: createForm.runtime,
        startDate: createForm.startDate,
        expiryDate: createForm.expiryDate
      });

      playSuccessSound();
      setShowCreateModal(false);
      onShowToast('USER CREATED', `Customer ${res.user.customerName} (${res.user.username}) registered`, 'success');

      // Show credentials summary card
      setCreatedCredentials({
        customerName: res.user.customerName,
        customerId: res.user.customerId,
        username: res.user.username,
        password: createForm.password.trim(),
        modules: res.user.assignedModules.includes('ALL') 
          ? 'ALL SECURITY MODULES' 
          : res.user.assignedModules.map(id => modules.find(m => m.id === id)?.name || id).join(', '),
        runtime: res.user.runtime,
        price: res.user.useDefaultPrice ? 'Default Plan Rate' : `₹${res.user.customPrice} (Custom)`,
        expiryDate: res.user.expiryDate
      });

      onRefresh();
    } catch (err: unknown) {
      playAlertSound();
      onShowToast('Creation Failed', extractErrorMessage(err, 'Failed to create customer account'), 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: UserRecord) => {
    playCyberClick();
    setEditingUser(user);
    setEditForm({
      customerName: user.customerName || user.username,
      customerId: user.customerId || user.id,
      username: user.username,
      password: user.password || '',
      showPassword: false,
      role: user.role || 'AGENT',
      status: user.status || 'ACTIVE',
      assignedModules: user.assignedModules && user.assignedModules.length > 0 ? user.assignedModules : ['ALL'],
      runtime: user.runtime || '30 DAYS RUNTIME',
      useDefaultPrice: user.useDefaultPrice ?? true,
      customPrice: user.customPrice !== undefined ? Number(user.customPrice) : 150,
      startDate: user.startDate || new Date().toISOString().split('T')[0],
      expiryDate: user.expiryDate || '2026-09-30'
    });
  };

  // Submit Edit Customer
  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editForm.username.trim()) {
      onShowToast('Validation Error', 'Login Username cannot be empty', 'warn');
      return;
    }
    if (!editForm.useDefaultPrice && (isNaN(Number(editForm.customPrice)) || Number(editForm.customPrice) < 0)) {
      onShowToast('Validation Error', 'Custom price must be a valid number', 'warn');
      return;
    }

    try {
      const updates: any = {
        customerName: editForm.customerName.trim() || editForm.username.trim(),
        username: editForm.username.trim().toUpperCase(),
        role: editForm.role,
        status: editForm.status,
        assignedModules: editForm.assignedModules.length > 0 ? editForm.assignedModules : ['ALL'],
        useDefaultPrice: editForm.useDefaultPrice,
        customPrice: Number(editForm.customPrice),
        runtime: editForm.runtime,
        startDate: editForm.startDate,
        expiryDate: editForm.expiryDate
      };

      if (editForm.password && editForm.password.trim()) {
        updates.password = editForm.password.trim();
      }

      await api.updateAdminUser(editingUser.id, updates);
      playSuccessSound();
      setEditingUser(null);
      onShowToast('USER UPDATED', `Customer ${updates.customerName} account updated`, 'success');
      onRefresh();
    } catch (err: unknown) {
      playAlertSound();
      onShowToast('Update Failed', extractErrorMessage(err, 'Failed to update customer account'), 'error');
    }
  };

  // Block Customer
  const handleBlockConfirm = async () => {
    if (!userToBlock) return;
    try {
      await api.blockAdminUser(userToBlock.id);
      playAlertSound();
      onShowToast('USER BLOCKED', `Access blocked for ${userToBlock.customerName || userToBlock.username}`, 'warn');
      setUserToBlock(null);
      onRefresh();
    } catch (err: unknown) {
      onShowToast('Error', extractErrorMessage(err, 'Failed to block customer'), 'error');
    }
  };

  // Unblock Customer
  const handleUnblockConfirm = async () => {
    if (!userToUnblock) return;
    try {
      await api.unblockAdminUser(userToUnblock.id);
      playSuccessSound();
      onShowToast('USER UNBLOCKED', `Access restored for ${userToUnblock.customerName || userToUnblock.username}`, 'success');
      setUserToUnblock(null);
      onRefresh();
    } catch (err: unknown) {
      onShowToast('Error', extractErrorMessage(err, 'Failed to unblock customer'), 'error');
    }
  };

  // Delete Customer
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      await api.deleteAdminUser(userToDelete.id);
      playSuccessSound();
      onShowToast('USER DELETED', `Customer node ${userToDelete.customerName || userToDelete.username} permanently deleted`, 'info');
      setUserToDelete(null);
      onRefresh();
    } catch (err: unknown) {
      onShowToast('Error', extractErrorMessage(err, 'Failed to delete customer'), 'error');
    }
  };

  // Reset Password
  const handleResetPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPass || !newResetPassword.trim()) {
      onShowToast('Validation Error', 'Password cannot be empty', 'warn');
      return;
    }
    try {
      await api.resetAdminUserPassword(userToResetPass.id, newResetPassword.trim());
      playSuccessSound();
      onShowToast('PRICE UPDATED / PASS RESET', `Pass key updated for ${userToResetPass.username}`, 'success');
      setUserToResetPass(null);
      setNewResetPassword('');
      onRefresh();
    } catch (err: unknown) {
      onShowToast('Error', extractErrorMessage(err, 'Failed to reset password'), 'error');
    }
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, label: string) => {
    playCyberBlip(1200);
    navigator.clipboard.writeText(text);
    onShowToast('Copied', `${label} copied to clipboard`, 'info');
  };

  // Filter & Sort computation
  const filteredAndSortedUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (u.customerName && u.customerName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.customerId && u.customerId.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Status filter
      const computedStatus = appStore.getUserStatus(u);
      if (statusFilter === 'ACTIVE') return computedStatus === 'ACTIVE';
      if (statusFilter === 'BLOCKED') return computedStatus === 'BLOCKED';
      if (statusFilter === 'EXPIRED') return computedStatus === 'EXPIRED';

      return true;
    }).sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (sortBy === 'OLDEST') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      if (sortBy === 'NAME') {
        return (a.customerName || a.username).localeCompare(b.customerName || b.username);
      }
      if (sortBy === 'EXPIRY') {
        return (a.expiryDate || '').localeCompare(b.expiryDate || '');
      }
      if (sortBy === 'PRICE') {
        const priceA = a.useDefaultPrice ? 150 : (a.customPrice ?? 150);
        const priceB = b.useDefaultPrice ? 150 : (b.customPrice ?? 150);
        return priceB - priceA;
      }
      return 0;
    });
  }, [users, searchQuery, statusFilter, sortBy]);

  // Days remaining helper
  const getExpiryDetails = (expiryDate?: string) => {
    if (!expiryDate) return { text: 'NO EXPIRY SET', isExpired: false, daysLeft: 999 };
    const exp = expiryDate.trim().toUpperCase();
    if (exp === 'PERMANENT' || exp === 'LIFETIME' || exp === '2099-12-31') {
      return { text: 'PERMANENT ACCESS', isExpired: false, daysLeft: 99999, isPermanent: true };
    }
    const expDate = new Date(expiryDate);
    if (isNaN(expDate.getTime())) return { text: expiryDate, isExpired: false, daysLeft: 0 };
    
    expDate.setHours(23, 59, 59, 999);
    const diffMs = expDate.getTime() - Date.now();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { text: `EXPIRED (${Math.abs(daysLeft)}d ago)`, isExpired: true, daysLeft };
    }
    if (daysLeft === 0) {
      return { text: 'EXPIRES TODAY', isExpiringSoon: true, daysLeft: 0 };
    }
    if (daysLeft <= 5) {
      return { text: `${daysLeft} DAYS LEFT (SOON)`, isExpiringSoon: true, daysLeft };
    }
    return { text: `${daysLeft} DAYS LEFT`, isExpired: false, daysLeft };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ==================================================== */}
      {/* SECTION HEADER & 5 TOP STATS */}
      {/* ==================================================== */}
      <div 
        id="customer-management-top-banner"
        className="rounded-2xl bg-[#081126]/90 border border-cyan-500/35 p-4 sm:p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden"
      >
        <div className="absolute inset-0 cyber-grid-bg opacity-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 mb-5 pb-4 border-b border-cyan-500/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono-tech text-cyan-400 font-bold uppercase tracking-widest">
                ADMINISTRATION // CUSTOMER MATRIX
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-cyber font-bold tracking-wider text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              CUSTOMER MANAGEMENT SYSTEM
            </h2>
            <p className="text-xs font-mono-tech text-cyan-300/80 mt-0.5">
              Provision customer access, configure custom individual pricing, assign security modules & monitor runtimes
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-customer-refresh"
              onClick={() => {
                playCyberClick();
                onRefresh();
                onShowToast('Refreshed', 'Customer cluster state synced', 'info');
              }}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>SYNC STATE</span>
            </button>

            <button
              id="btn-create-customer-primary"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>+ CREATE NEW USER</span>
            </button>
          </div>
        </div>

        {/* 5 Statistics Cards at Top */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 relative z-10">
          {/* STAT 1: TOTAL USERS */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#040817]/90 border border-cyan-500/25 relative overflow-hidden group hover:border-cyan-400/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono-tech text-slate-400 uppercase font-semibold">TOTAL USERS</span>
              <Users className="w-4 h-4 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl sm:text-2xl font-cyber font-bold text-white tracking-wider block mt-1">
              {stats?.totalUsers ?? users.length}
            </span>
            <span className="text-[9px] font-mono-tech text-cyan-400/70 block mt-0.5">Registered Nodes</span>
          </div>

          {/* STAT 2: ACTIVE USERS */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#040817]/90 border border-emerald-500/25 relative overflow-hidden group hover:border-emerald-400/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono-tech text-slate-400 uppercase font-semibold">ACTIVE USERS</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl sm:text-2xl font-cyber font-bold text-emerald-400 tracking-wider block mt-1">
              {stats?.activeUsers ?? users.filter(u => appStore.getUserStatus(u) === 'ACTIVE').length}
            </span>
            <span className="text-[9px] font-mono-tech text-emerald-400/70 block mt-0.5">Operational Nodes</span>
          </div>

          {/* STAT 3: BLOCKED USERS */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#040817]/90 border border-rose-500/25 relative overflow-hidden group hover:border-rose-400/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono-tech text-slate-400 uppercase font-semibold">BLOCKED USERS</span>
              <Ban className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl sm:text-2xl font-cyber font-bold text-rose-400 tracking-wider block mt-1">
              {stats?.blockedUsers ?? users.filter(u => u.status === 'BLOCKED' || u.status === 'DISABLED').length}
            </span>
            <span className="text-[9px] font-mono-tech text-rose-400/70 block mt-0.5">Access Restricted</span>
          </div>

          {/* STAT 4: ACTIVE ACCESS */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#040817]/90 border border-cyan-500/25 relative overflow-hidden group hover:border-cyan-400/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono-tech text-slate-400 uppercase font-semibold">ACTIVE ACCESS</span>
              <Shield className="w-4 h-4 text-cyan-300 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl sm:text-2xl font-cyber font-bold text-cyan-300 tracking-wider block mt-1">
              {stats?.activeAccess ?? users.filter(u => appStore.getUserStatus(u) === 'ACTIVE').length}
            </span>
            <span className="text-[9px] font-mono-tech text-cyan-400/70 block mt-0.5">Valid Runtimes</span>
          </div>

          {/* STAT 5: EXPIRED ACCESS */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#040817]/90 border border-amber-500/25 relative overflow-hidden group hover:border-amber-400/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono-tech text-slate-400 uppercase font-semibold">EXPIRED ACCESS</span>
              <Clock className="w-4 h-4 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl sm:text-2xl font-cyber font-bold text-amber-400 tracking-wider block mt-1">
              {stats?.expiredAccess ?? users.filter(u => appStore.isUserExpired(u)).length}
            </span>
            <span className="text-[9px] font-mono-tech text-amber-400/70 block mt-0.5">Renewal Required</span>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SEARCH, FILTER PILLS & SORTING CONTROLS */}
      {/* ==================================================== */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#060c1d] p-3.5 rounded-2xl border border-cyan-500/25">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-customers"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Customer Name, Login Username, or Customer ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-white font-mono-tech text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono-tech"
            >
              CLEAR
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#040817] p-1 rounded-xl border border-slate-800 shrink-0">
            {(['ALL', 'ACTIVE', 'BLOCKED', 'EXPIRED'] as const).map((filter) => {
              const isActive = statusFilter === filter;
              return (
                <button
                  key={filter}
                  id={`btn-filter-status-${filter.toLowerCase()}`}
                  onClick={() => {
                    playCyberBlip(550);
                    setStatusFilter(filter);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-tech font-bold transition-all ${
                    isActive
                      ? filter === 'BLOCKED'
                        ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                        : filter === 'EXPIRED'
                        ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                        : 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                      : 'text-slate-400 hover:text-cyan-300'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          {/* Sort By Dropdown */}
          <div className="relative shrink-0">
            <select
              id="select-customer-sort"
              value={sortBy}
              onChange={(e) => {
                playCyberBlip(600);
                setSortBy(e.target.value as any);
              }}
              className="px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-medium focus:outline-none focus:border-cyan-400 appearance-none pr-8 cursor-pointer"
            >
              <option value="NEWEST">SORT: NEWEST FIRST</option>
              <option value="OLDEST">SORT: OLDEST FIRST</option>
              <option value="EXPIRY">SORT: EXPIRY DATE</option>
              <option value="NAME">SORT: CUSTOMER NAME</option>
              <option value="PRICE">SORT: CUSTOM PRICE</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* CUSTOMER LIST: DESKTOP TABLE & MOBILE CARDS */}
      {/* ==================================================== */}
      {filteredAndSortedUsers.length === 0 ? (
        <div className="rounded-2xl bg-[#081024]/80 border border-cyan-500/20 p-10 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-cyan-400/50 mx-auto" />
          <h3 className="font-cyber font-bold text-lg text-white">NO CUSTOMERS MATCHING CRITERIA</h3>
          <p className="font-mono-tech text-xs text-slate-400 max-w-md mx-auto">
            No customer accounts found for the current search query and filter selection.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-semibold"
          >
            RESET FILTERS
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Hidden on Mobile) */}
          <div className="hidden lg:block rounded-2xl bg-[#081024]/90 border border-cyan-500/30 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-tech text-xs">
                <thead className="bg-[#040816] text-cyan-400 uppercase text-[10px] tracking-wider border-b border-cyan-500/25">
                  <tr>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Login ID / Pass Key</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4">Assigned Modules</th>
                    <th className="p-4">Customer Price</th>
                    <th className="p-4">Runtime & Expiry</th>
                    <th className="p-4">Created / Last Login</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredAndSortedUsers.map((u) => {
                    const status = appStore.getUserStatus(u);
                    const expiry = getExpiryDetails(u.expiryDate);
                    const isPassVisible = revealedPasswords[u.id];
                    const rawPass = u.password || (u as any).passwordHash || 'DEMO2026';

                    return (
                      <tr key={u.id} className="hover:bg-cyan-950/25 transition-colors group">
                        {/* 1. Customer Name & ID */}
                        <td className="p-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{u.customerName || u.username}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-cyan-400 font-semibold px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30">
                              {u.customerId || u.id}
                            </span>
                            <button
                              onClick={() => handleCopyText(u.customerId || u.id, 'Customer ID')}
                              title="Copy Customer ID"
                              className="text-slate-500 hover:text-cyan-300 p-0.5"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* 2. Login Username & Password */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <strong className="text-white font-mono">{u.username}</strong>
                            <button
                              onClick={() => handleCopyText(u.username, 'Login Username')}
                              title="Copy Username"
                              className="text-slate-500 hover:text-cyan-300 p-0.5"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                            <span className="text-slate-500">PASS:</span>
                            <span className="font-mono text-cyan-300 font-medium">
                              {isPassVisible ? rawPass : '••••••••'}
                            </span>
                            <button
                              onClick={() => {
                                playCyberBlip(500);
                                setRevealedPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }));
                              }}
                              className="text-slate-400 hover:text-cyan-300 p-0.5"
                              title={isPassVisible ? 'Hide password' : 'Show password'}
                            >
                              {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => handleCopyText(rawPass, 'Password')}
                              title="Copy Password"
                              className="text-slate-500 hover:text-cyan-300 p-0.5"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* 3. Account Status */}
                        <td className="p-4">
                          {status === 'ACTIVE' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          )}
                          {status === 'BLOCKED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                              <Ban className="w-3 h-3" />
                              BLOCKED
                            </span>
                          )}
                          {status === 'EXPIRED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                              <Clock className="w-3 h-3" />
                              EXPIRED
                            </span>
                          )}
                        </td>

                        {/* 4. Assigned Modules */}
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {(!u.assignedModules || u.assignedModules.length === 0 || u.assignedModules.includes('ALL')) ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                ALL MODULES
                              </span>
                            ) : (
                              u.assignedModules.map((modId) => {
                                const mod = modules.find(m => m.id === modId);
                                return (
                                  <span key={modId} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-900 text-slate-300 border border-slate-700">
                                    {mod?.name || modId}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>

                        {/* 5. Custom / Default Price */}
                        <td className="p-4">
                          {u.useDefaultPrice ? (
                            <div>
                              <span className="text-white font-bold">Standard</span>
                              <span className="text-[10px] text-slate-500 block">DEFAULT PRICE</span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-emerald-400 font-cyber font-bold text-sm">
                                ₹{u.customPrice ?? 150}
                              </span>
                              <span className="text-[9px] text-cyan-400 px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 inline-block font-semibold">
                                CUSTOM RATE
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 6. Runtime & Expiry */}
                        <td className="p-4">
                          <div className="text-white font-bold text-[11px]">
                            {u.runtime || '30 DAYS RUNTIME'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-[11px] text-slate-300">{u.expiryDate || 'N/A'}</span>
                          </div>
                          <span className={`text-[10px] font-semibold block mt-0.5 ${
                            expiry.isExpired 
                              ? 'text-rose-400' 
                              : expiry.isExpiringSoon 
                              ? 'text-amber-400' 
                              : 'text-emerald-400'
                          }`}>
                            {expiry.text}
                          </span>
                        </td>

                        {/* 7. Created & Last Login */}
                        <td className="p-4">
                          <div className="text-[11px] text-slate-400">
                            <span className="text-slate-500">Reg: </span>{u.createdAt?.split(' ')[0] || u.createdAt}
                          </div>
                          <div className="text-[10px] text-cyan-400/80 mt-0.5">
                            <span className="text-slate-500">Seen: </span>{u.lastLogin || 'NEVER'}
                          </div>
                        </td>

                        {/* 8. Action Buttons */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Block / Unblock Button */}
                            {status === 'BLOCKED' ? (
                              <button
                                id={`btn-unblock-user-${u.id}`}
                                onClick={() => {
                                  playCyberClick();
                                  setUserToUnblock(u);
                                }}
                                title="Unblock Customer"
                                className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono-tech text-[10px] font-bold flex items-center gap-1 transition-all"
                              >
                                <Check className="w-3 h-3" />
                                <span>UNBLOCK</span>
                              </button>
                            ) : (
                              <button
                                id={`btn-block-user-${u.id}`}
                                onClick={() => {
                                  playCyberClick();
                                  setUserToBlock(u);
                                }}
                                title="Block Customer"
                                className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono-tech text-[10px] font-bold flex items-center gap-1 transition-all"
                              >
                                <Ban className="w-3 h-3" />
                                <span>BLOCK</span>
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              id={`btn-edit-user-${u.id}`}
                              onClick={() => handleOpenEditModal(u)}
                              title="Edit Customer Details"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-400 text-cyan-300 transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password Button */}
                            <button
                              id={`btn-reset-pass-${u.id}`}
                              onClick={() => {
                                playCyberClick();
                                setUserToResetPass(u);
                                setNewResetPassword('');
                              }}
                              title="Reset Password"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-950 border border-slate-700 hover:border-amber-400 text-amber-300 transition-all"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              id={`btn-delete-user-${u.id}`}
                              onClick={() => {
                                playCyberClick();
                                setUserToDelete(u);
                              }}
                              title="Delete Customer Node"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 border border-slate-700 hover:border-rose-400 text-rose-400 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View (Visible on Mobile & Tablet) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3.5">
            {filteredAndSortedUsers.map((u) => {
              const status = appStore.getUserStatus(u);
              const expiry = getExpiryDetails(u.expiryDate);
              const isPassVisible = revealedPasswords[u.id];
              const rawPass = u.password || (u as any).passwordHash || 'DEMO2026';

              return (
                <div
                  key={u.id}
                  id={`customer-card-${u.id}`}
                  className="rounded-xl bg-[#081024]/90 border border-cyan-500/30 p-4 space-y-3 relative overflow-hidden backdrop-blur-md"
                >
                  {/* Top Status & Customer ID */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <div className="font-cyber font-bold text-sm text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span>{u.customerName || u.username}</span>
                      </div>
                      <span className="text-[10px] font-mono-tech text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 inline-block mt-0.5">
                        {u.customerId || u.id}
                      </span>
                    </div>

                    <div>
                      {status === 'ACTIVE' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ACTIVE
                        </span>
                      )}
                      {status === 'BLOCKED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          BLOCKED
                        </span>
                      )}
                      {status === 'EXPIRED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          EXPIRED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Credentials Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech bg-[#040816] p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block">LOGIN USERNAME</span>
                      <strong className="text-white text-xs">{u.username}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">PASS KEY</span>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-cyan-300">{isPassVisible ? rawPass : '••••••••'}</span>
                        <button
                          onClick={() => setRevealedPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                          className="text-slate-400 hover:text-cyan-300"
                        >
                          {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Expiry */}
                  <div className="flex items-center justify-between text-xs font-mono-tech pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 block">RATE</span>
                      {u.useDefaultPrice ? (
                        <span className="text-slate-300 font-bold">Standard</span>
                      ) : (
                        <span className="text-emerald-400 font-cyber font-bold">₹{u.customPrice ?? 150} (Custom)</span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">EXPIRY</span>
                      <span className={`text-[11px] font-bold ${
                        expiry.isExpired ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {u.expiryDate || 'N/A'} ({expiry.text})
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    {status === 'BLOCKED' ? (
                      <button
                        onClick={() => {
                          playCyberClick();
                          setUserToUnblock(u);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono-tech text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>UNBLOCK</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          playCyberClick();
                          setUserToBlock(u);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono-tech text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>BLOCK</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs font-mono-tech font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>EDIT</span>
                    </button>

                    <button
                      onClick={() => {
                        playCyberClick();
                        setUserToDelete(u);
                      }}
                      className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: CREATE NEW CUSTOMER (+ GENERATE ID & PASSWORD) */}
      {/* ==================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-[#081024] border border-cyan-500/40 p-5 sm:p-7 shadow-[0_0_40px_rgba(6,182,212,0.25)] relative my-8">
            <button
              onClick={() => {
                playCyberClick();
                setShowCreateModal(false);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5 pb-3 border-b border-cyan-500/20">
              <div className="text-[11px] font-mono-tech text-cyan-400 font-bold uppercase tracking-widest">
                ADMIN COMMAND // PROVISIONING
              </div>
              <h2 className="text-xl sm:text-2xl font-cyber font-bold text-white tracking-wide mt-0.5 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                CREATE NEW CUSTOMER
              </h2>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4 text-xs font-mono-tech">
              {/* Row 1: Customer Name & Customer ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                    placeholder="e.g. ALEXANDER VANCE"
                    className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">Customer ID *</label>
                    <button
                      type="button"
                      onClick={() => handleGenerateId('create')}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      GENERATE ID
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={createForm.customerId}
                    onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value.toUpperCase() })}
                    placeholder="e.g. CUST-4921"
                    className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-bold"
                  />
                </div>
              </div>

              {/* Row 2: Login Username & Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Login Username *</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toUpperCase() })}
                    placeholder="e.g. AGENT_ALEX"
                    className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">Password *</label>
                    <button
                      type="button"
                      onClick={() => handleGeneratePassword('create')}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      GENERATE PASSWORD
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={createForm.showPassword ? 'text' : 'password'}
                      required
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Pass Key"
                      className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-cyan-300 font-mono pr-8 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, showPassword: !createForm.showPassword })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {createForm.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Confirm Password *</label>
                  <input
                    type={createForm.showPassword ? 'text' : 'password'}
                    required
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    placeholder="Confirm Pass Key"
                    className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Row 3: Customer-Specific Module Access */}
              <div className="space-y-1.5 bg-[#040817] p-3 rounded-xl border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    Customer-Specific Module Access
                  </label>
                  <button
                    type="button"
                    onClick={() => handleToggleModuleSelection('ALL', 'create')}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase"
                  >
                    {createForm.assignedModules.includes('ALL') ? 'Deselect All' : 'Select All Modules'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {modules.map((m) => {
                    const isSelected = createForm.assignedModules.includes('ALL') || createForm.assignedModules.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => handleToggleModuleSelection(m.id, 'create')}
                        className={`px-2.5 py-1.5 rounded-lg text-left border flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-400/60 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate text-[11px] font-semibold">{m.name}</span>
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" /> : <Square className="w-3.5 h-3.5 text-slate-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Individual Customer Pricing */}
              <div className="space-y-2 bg-[#040817] p-3.5 rounded-xl border border-emerald-500/25">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-cyber font-bold text-xs flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      INDIVIDUAL CUSTOMER PRICING
                    </label>
                    <p className="text-[10px] font-mono-tech text-slate-400">
                      Set a custom rate for this specific customer or inherit standard pricing
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCreateForm(prev => ({ ...prev, useDefaultPrice: !prev.useDefaultPrice }))}
                    className="flex items-center gap-2 text-xs font-bold"
                  >
                    <span className={createForm.useDefaultPrice ? 'text-slate-400' : 'text-emerald-400 font-cyber'}>
                      {createForm.useDefaultPrice ? 'DEFAULT PRICE ACTIVE' : 'CUSTOM PRICE ACTIVE'}
                    </span>
                    {createForm.useDefaultPrice ? (
                      <ToggleLeft className="w-7 h-7 text-slate-500" />
                    ) : (
                      <ToggleRight className="w-7 h-7 text-emerald-400" />
                    )}
                  </button>
                </div>

                {!createForm.useDefaultPrice && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold font-cyber text-sm">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required={!createForm.useDefaultPrice}
                          value={createForm.customPrice}
                          onChange={(e) => setCreateForm({ ...createForm, customPrice: Number(e.target.value) })}
                          placeholder="Custom Price (e.g. 120, 180, 250)"
                          className="w-full pl-8 pr-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 font-cyber font-bold text-sm focus:outline-none focus:border-emerald-400"
                        />
                      </div>

                      {/* Quick Pricing Presets */}
                      <div className="flex items-center gap-1">
                        {[90, 120, 150, 180, 250].map((preset) => (
                          <button
                            type="button"
                            key={preset}
                            onClick={() => setCreateForm(prev => ({ ...prev, customPrice: preset }))}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                              createForm.customPrice === preset
                                ? 'bg-emerald-500 text-black border-emerald-400 font-cyber'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500/40'
                            }`}
                          >
                            ₹{preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 5: Runtime & Expiry Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#040817] p-3 rounded-xl border border-cyan-500/20">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Runtime Duration</label>
                  <select
                    value={createForm.runtime}
                    onChange={(e) => setCreateForm({ ...createForm, runtime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="15 DAYS RUNTIME">15 DAYS RUNTIME</option>
                    <option value="20 DAYS RUNTIME">20 DAYS RUNTIME</option>
                    <option value="30 DAYS RUNTIME">30 DAYS RUNTIME</option>
                    <option value="60 DAYS RUNTIME">60 DAYS RUNTIME</option>
                    <option value="PERMANENT RUNTIME">PERMANENT RUNTIME</option>
                    <option value="CUSTOM RUNTIME">CUSTOM RUNTIME</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">Expiry Date *</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetExpiryPreset(15, 'create')}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/30"
                      >
                        +15d
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetExpiryPreset(30, 'create')}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/30"
                      >
                        +30d
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetExpiryPreset('PERMANENT', 'create')}
                        className="text-[9px] text-emerald-400 hover:text-emerald-300 px-1 py-0.2 rounded bg-emerald-950 border border-emerald-500/30"
                      >
                        Permanent
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={createForm.expiryDate}
                    onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all"
                >
                  PROVISION & SAVE CUSTOMER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: CREATED CREDENTIALS SUMMARY (FOR ADMIN SHARING) */}
      {/* ==================================================== */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#081024] border border-emerald-500/50 p-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] relative">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-emerald-500/30">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono-tech text-emerald-400 font-bold uppercase tracking-widest">
                  PROVISIONING COMPLETE
                </span>
                <h3 className="text-xl font-cyber font-bold text-white tracking-wide">
                  CUSTOMER ACCOUNT READY
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-mono-tech bg-[#040816] p-4 rounded-xl border border-slate-800 text-slate-300">
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Customer Name:</span>
                <strong className="text-white">{createdCredentials.customerName}</strong>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Customer ID:</span>
                <strong className="text-cyan-400">{createdCredentials.customerId}</strong>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Login Username:</span>
                <strong className="text-white">{createdCredentials.username}</strong>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Pass Key:</span>
                <strong className="text-emerald-400 font-mono text-sm">{createdCredentials.password}</strong>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Assigned Modules:</span>
                <span className="text-cyan-300 font-semibold">{createdCredentials.modules}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Rate:</span>
                <span className="text-emerald-400 font-bold">{createdCredentials.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Runtime Expiry:</span>
                <span className="text-white font-bold">{createdCredentials.expiryDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => {
                  const cardText = `==============================\nAEGIS // DEFENSE ACCESS CREDENTIALS\n==============================\nCustomer: ${createdCredentials.customerName}\nCustomer ID: ${createdCredentials.customerId}\nUsername: ${createdCredentials.username}\nPass Key: ${createdCredentials.password}\nModules: ${createdCredentials.modules}\nRuntime: ${createdCredentials.runtime}\nExpiry: ${createdCredentials.expiryDate}\nRate: ${createdCredentials.price}\n==============================`;
                  handleCopyText(cardText, 'Customer credentials');
                }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                <Copy className="w-4 h-4" />
                <span>COPY CREDENTIALS</span>
              </button>

              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono-tech text-xs font-semibold"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: EDIT CUSTOMER */}
      {/* ==================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-[#081024] border border-cyan-500/40 p-5 sm:p-7 shadow-[0_0_40px_rgba(6,182,212,0.25)] relative my-8">
            <button
              onClick={() => {
                playCyberClick();
                setEditingUser(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5 pb-3 border-b border-cyan-500/20">
              <div className="text-[11px] font-mono-tech text-cyan-400 font-bold uppercase tracking-widest">
                ADMIN COMMAND // EDIT RECORD
              </div>
              <h2 className="text-xl sm:text-2xl font-cyber font-bold text-white tracking-wide mt-0.5 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                EDIT CUSTOMER: {editingUser.customerName || editingUser.username}
              </h2>
            </div>

            <form onSubmit={handleEditCustomerSubmit} className="space-y-4 text-xs font-mono-tech">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-white uppercase focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Login Username *</label>
                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Password Option */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Update Pass Key (Leave blank to keep unchanged)</label>
                  <button
                    type="button"
                    onClick={() => handleGeneratePassword('edit')}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    GENERATE NEW PASS
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={editForm.showPassword ? 'text' : 'password'}
                    value={editForm.password || ''}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="New Pass Key (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-cyan-300 font-mono pr-8 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, showPassword: !editForm.showPassword })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {editForm.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Modules selection */}
              <div className="space-y-1.5 bg-[#040817] p-3 rounded-xl border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Customer Module Access</label>
                  <button
                    type="button"
                    onClick={() => handleToggleModuleSelection('ALL', 'edit')}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase"
                  >
                    {editForm.assignedModules.includes('ALL') ? 'Deselect All' : 'Select All Modules'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {modules.map((m) => {
                    const isSelected = editForm.assignedModules.includes('ALL') || editForm.assignedModules.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => handleToggleModuleSelection(m.id, 'edit')}
                        className={`px-2.5 py-1.5 rounded-lg text-left border flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-400/60 text-cyan-300'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="truncate text-[11px] font-semibold">{m.name}</span>
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Pricing Section */}
              <div className="space-y-2 bg-[#040817] p-3.5 rounded-xl border border-emerald-500/25">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-cyber font-bold text-xs flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      INDIVIDUAL CUSTOM PRICING
                    </label>
                    <span className="text-[10px] text-slate-400 block">Configure rate per customer</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, useDefaultPrice: !prev.useDefaultPrice }))}
                    className="flex items-center gap-2 text-xs font-bold"
                  >
                    <span className={editForm.useDefaultPrice ? 'text-slate-400' : 'text-emerald-400 font-cyber'}>
                      {editForm.useDefaultPrice ? 'DEFAULT PRICE ACTIVE' : 'CUSTOM PRICE ACTIVE'}
                    </span>
                    {editForm.useDefaultPrice ? (
                      <ToggleLeft className="w-7 h-7 text-slate-500" />
                    ) : (
                      <ToggleRight className="w-7 h-7 text-emerald-400" />
                    )}
                  </button>
                </div>

                {!editForm.useDefaultPrice && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold font-cyber text-sm">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={editForm.customPrice}
                        onChange={(e) => setEditForm({ ...editForm, customPrice: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 font-cyber font-bold text-sm focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {[90, 120, 150, 180, 250].map((preset) => (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => setEditForm(prev => ({ ...prev, customPrice: preset }))}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                            editForm.customPrice === preset
                              ? 'bg-emerald-500 text-black border-emerald-400 font-cyber'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          ₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status & Expiry Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="BLOCKED">BLOCKED</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">Expiry Date</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetExpiryPreset(30, 'edit')}
                        className="text-[9px] text-cyan-400 px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/30"
                      >
                        +30d
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetExpiryPreset('PERMANENT', 'edit')}
                        className="text-[9px] text-emerald-400 px-1 py-0.2 rounded bg-emerald-950 border border-emerald-500/30"
                      >
                        Permanent
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: CONFIRM BLOCK CUSTOMER */}
      {/* ==================================================== */}
      {userToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-rose-500/50 p-6 shadow-[0_0_40px_rgba(244,63,94,0.3)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-cyber font-bold text-white">BLOCK CUSTOMER ACCESS?</h3>
                <p className="text-xs font-mono-tech text-slate-400">Immediate access termination</p>
              </div>
            </div>

            <p className="text-xs font-mono-tech text-slate-300 bg-rose-950/30 p-3 rounded-xl border border-rose-500/30">
              Are you sure you want to block <strong className="text-white">{userToBlock.customerName || userToBlock.username}</strong> ({userToBlock.customerId})?
              The customer will immediately lose access to their panel and login will be rejected.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setUserToBlock(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-mono-tech text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleBlockConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-cyber font-bold text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(244,63,94,0.5)]"
              >
                CONFIRM BLOCK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 5: CONFIRM UNBLOCK CUSTOMER */}
      {/* ==================================================== */}
      {userToUnblock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-emerald-500/50 p-6 shadow-[0_0_40px_rgba(16,185,129,0.3)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-cyber font-bold text-white">UNBLOCK CUSTOMER ACCESS</h3>
                <p className="text-xs font-mono-tech text-slate-400">Restore node authorization</p>
              </div>
            </div>

            <p className="text-xs font-mono-tech text-slate-300 bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30">
              Restore authorization for <strong className="text-white">{userToUnblock.customerName || userToUnblock.username}</strong> ({userToUnblock.customerId})?
              The customer will be able to log in again using their credentials.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setUserToUnblock(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-mono-tech text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleUnblockConfirm}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-cyber font-bold text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              >
                CONFIRM UNBLOCK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 6: CONFIRM DELETE CUSTOMER */}
      {/* ==================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-rose-500/60 p-6 shadow-[0_0_40px_rgba(244,63,94,0.4)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-cyber font-bold text-white">DELETE CUSTOMER NODE?</h3>
                <p className="text-xs font-mono-tech text-rose-400">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs font-mono-tech text-slate-300 bg-rose-950/40 p-3 rounded-xl border border-rose-500/40">
              Permanently delete customer record <strong className="text-white">{userToDelete.customerName || userToDelete.username}</strong> ({userToDelete.customerId})?
              This customer will be purged from the local store and can no longer log in.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-mono-tech text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-cyber font-bold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(244,63,94,0.6)]"
              >
                DELETE PERMANENTLY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 7: RESET PASS KEY */}
      {/* ==================================================== */}
      {userToResetPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#081024] border border-amber-500/50 p-6 shadow-[0_0_40px_rgba(245,158,11,0.3)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-cyber font-bold text-white">RESET PASS KEY</h3>
                <p className="text-xs font-mono-tech text-slate-400">{userToResetPass.customerName || userToResetPass.username}</p>
              </div>
            </div>

            <form onSubmit={handleResetPassSubmit} className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono-tech text-slate-300 font-semibold">New Pass Key</label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                      let code = '';
                      for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
                      setNewResetPassword(`AEGIS-${code}-${Math.floor(100 + Math.random() * 900)}`);
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-mono-tech font-bold uppercase flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    GENERATE
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Enter new pass key"
                  className="w-full px-3 py-2 rounded-xl bg-[#040817] border border-amber-500/40 text-amber-300 font-mono text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToResetPass(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-mono-tech text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-cyber font-bold text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                >
                  UPDATE PASSWORD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
