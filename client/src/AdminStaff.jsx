import React, { useEffect, useRef, useState } from 'react';
import useAutoLogout from './hooks/useAutoLogout';
import { useNavigate } from 'react-router-dom';
import AdvancedLoader from './components/AdvancedLoader';
import LogoutConfirmation from './components/LogoutConfirmation';
import Toast from './components/Toast';
import logo from './assets/images/icon.png';

const AdminStaff = () => {
  const navigate = useNavigate();

  // Layout/UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Auth & user state
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ show: true, message, type });
  const hideToast = () => setToast({ show: false, message: '', type: 'success' });

  // Export helpers
  const exportMenuRef = useRef(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportToCSV = (rows, filename = 'staff.csv') => {
    const headers = ['staff_no','name','email','role','store_id','status','created_at'];
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [headers.join(',')].concat(
      rows.map(r => headers.map(h => {
        if (h === 'staff_no') {
          return escape(`NRT/${r.id || ''}`);
        }
        return escape(r[h]);
      }).join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Staff data
  const [staff, setStaff] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  // Stores for mapping store_id -> store name
  const [stores, setStores] = useState([]);
  const storeIdToName = (id) => {
    if (id === null || id === undefined) return 'HQ (Admin)';
    const st = stores.find(s => s.id === id);
    return st ? `${st.name}` : `Store #${id}`;
  };

  const getStoreCoverage = (storeId) => {
    const people = staff.filter(u => u.store_id === storeId);
    const coverage = { hasManager: false, hasStaff: false, hasCashier: false };
    people.forEach(p => {
      const r = (p.role || '').toLowerCase();
      if (r === 'manager') coverage.hasManager = true;
      if (r === 'staff') coverage.hasStaff = true;
      if (r === 'cashier') coverage.hasCashier = true;
    });
    return coverage;
  };

  // Filters/search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterId, setFilterId] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterCreated, setFilterCreated] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Stats
  const stats = staff.reduce((acc, s) => {
    if (s.role === 'manager') acc.totalManagers += 1;
    if (s.role === 'staff' || s.role === 'cashier') acc.totalStaff += 1;
    if (s.status === 'active') acc.active += 1;
    return acc;
  }, { totalManagers: 0, totalStaff: 0, active: 0 });

  // Add/Edit/Delete state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [newStore, setNewStore] = useState('');
  const [newStatus, setNewStatus] = useState('active');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [editStore, setEditStore] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [isUpdating, setIsUpdating] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Store-wise browsing
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [viewMode, setViewMode] = useState('default'); // 'default' | 'stores' | 'roles'

  // Quick assign handling
  const reassignUserStore = async (userId, targetStoreId) => {
    try {
      const res = await fetch(`https://neoretail.onrender.com//users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: targetStoreId === '' ? null : Number(targetStoreId) })
      });
      if (!res.ok) throw new Error('Failed to assign store');
      await fetchUsers();
      showToast('Assignment updated', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to assign store', 'error');
    }
  };

  // Helpers
  const getUserInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const decodeToken = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token');
      const payload = parts[1];
      const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  };

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const isNewLogin = sessionStorage.getItem('isNewLogin');
      if (!token) { navigate('/login'); return; }

      const decoded = decodeToken(token);
      if (!decoded) { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); return; }
      const userFromToken = {
        id: decoded.user_id || decoded.userId || decoded.id || decoded.sub || decoded._id || 'N/A',
        name: decoded.name || decoded.username || decoded.email,
        role: decoded.role || decoded.userRole || 'user',
        ...decoded
      };
      if ((userFromToken.role || '').toLowerCase() !== 'admin') { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); return; }

      if (isNewLogin === 'true') {
        await new Promise(r => setTimeout(r, 1500));
        sessionStorage.removeItem('isNewLogin');
      }
      setUser(userFromToken);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileDropdownOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch users from backend
  const fetchUsers = async () => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams();
      if (filterRole !== 'all') params.append('role', filterRole);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('q', searchTerm);
      const res = await fetch(`https://neoretail.onrender.com//users?${params.toString()}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setStaff(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      console.error(e);
      setStaff([]);
      showToast('Failed to load users', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchUsers(); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch stores for mapping and dropdowns
  const fetchStores = async () => {
    try {
      const res = await fetch('https://neoretail.onrender.com//stores', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to fetch stores');
      const data = await res.json();
      setStores(Array.isArray(data.stores) ? data.stores : []);
    } catch (e) {
      console.error(e);
      setStores([]);
    }
  };

  useEffect(() => { fetchStores(); }, []);

  // Filtered list
  const filteredStaff = staff.filter((s) => {
    const idStr = String(s.id || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const role = (s.role || '').toLowerCase();
    const storeName = storeIdToName(s.store_id).toLowerCase();
    const createdAtStr = s.created_at ? new Date(s.created_at).toLocaleString().toLowerCase() : '';

    const matchesTerm = !searchTerm || name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase()) || storeName.includes(searchTerm.toLowerCase()) || idStr.includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || role === filterRole;
    const matchesStatus = filterStatus === 'all' || (s.status || '').toLowerCase() === filterStatus;
    const matchesId = !filterId || idStr.includes(filterId.toLowerCase());
    const matchesName = !filterName || name.includes(filterName.toLowerCase());
    const matchesEmail = !filterEmail || email.includes(filterEmail.toLowerCase());
    const matchesStore = !filterStore || storeName.includes(filterStore.toLowerCase());
    const matchesCreated = !filterCreated || createdAtStr.includes(filterCreated.toLowerCase());
    const matchesSelectedStore = !selectedStoreId || s.store_id === selectedStoreId;
    return matchesTerm && matchesRole && matchesStatus && matchesId && matchesName && matchesEmail && matchesStore && matchesCreated && matchesSelectedStore;
  });

  // Sort by role priority: admin -> manager -> staff -> cashier
  const getRolePriority = (role) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return 0;
    if (r === 'manager') return 1;
    if (r === 'staff') return 2;
    if (r === 'cashier') return 3;
    return 4;
  };

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    const pa = getRolePriority(a.role);
    const pb = getRolePriority(b.role);
    if (pa !== pb) return pa - pb;
    // Secondary sort by name
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  // Actions
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = async () => { setIsLoggingOut(true); await new Promise(r => setTimeout(r, 1200)); localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); };
  const cancelLogout = () => { setShowLogoutConfirm(false); setIsLoggingOut(false); };

  // Auto-logout shared hook (30 minutes of actual inactivity)
  useAutoLogout({
    enabled: !!user,
    decodeToken,
    onLogout: confirmLogout,
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  });

  const openEditModal = (s) => { setEditingStaff(s); setEditName(s.name || ''); setEditEmail(s.email || ''); setEditRole(s.role || 'staff'); setEditStore(s.store || ''); setEditStatus(s.status || 'active'); setShowEditModal(true); };
  const openDeleteConfirm = (s) => { setDeletingStaff(s); setShowDeleteConfirm(true); };

  const addStaff = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('https://neoretail.onrender.com//users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), role: newRole, store_id: newStore ? Number(newStore) : null, status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to create user');
      await fetchUsers();
      setShowAddModal(false);
      setNewName(''); setNewEmail(''); setNewRole('staff'); setNewStore(''); setNewStatus('active');
      showToast('Staff created successfully', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to create staff', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateStaff = async () => {
    if (!editingStaff) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`https://neoretail.onrender.com//users/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim(), role: editRole, store_id: editStore ? Number(editStore) : null, status: editStatus })
      });
      if (!res.ok) throw new Error('Failed to update user');
      await fetchUsers();
      setShowEditModal(false);
      setEditingStaff(null);
      showToast('Staff updated successfully', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to update staff', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteStaff = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`https://neoretail.onrender.com//users/${deletingStaff.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      await fetchUsers();
      setShowDeleteConfirm(false);
      setDeletingStaff(null);
      showToast('Staff deleted', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to delete staff', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !user) return <AdvancedLoader role="admin" />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center">
              <img src={logo} alt="NeoRetail Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NeoRetail</h1>
              <p className="text-xs text-gray-500">Super Admin Dashboard</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-6 px-4 overflow-y-auto h-[calc(100vh-4rem)] pb-6">
          <div className="space-y-2">
            <a href="/admin" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              Dashboard
            </a>
            {/* <a href="/admin/store" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Store Management
            </a> */}
            <a href="/admin/staff" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${viewMode === 'stores' || viewMode === 'roles' ? 'text-gray-600 hover:bg-gray-50' : 'text-gray-700 bg-blue-50 border-r-2 border-blue-500'}`}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Staff Management
            </a>
            {/* Store-wise navigation entry */}
            <button
              onClick={() => { setViewMode('stores'); setSelectedStoreId(null); }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${viewMode === 'stores' ? 'text-gray-700 bg-blue-50 border-r-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Browse by Stores
            </button>
            <button
              onClick={() => { setViewMode('roles'); setSelectedStoreId(null); }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${viewMode === 'roles' ? 'text-gray-700 bg-blue-50 border-r-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Sort by Roles
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 lg:left-64 z-40 mx-2 mt-2 bg-white shadow-lg rounded-2xl border border-gray-200 flex items-center justify-between h-16 px-6 transition-all duration-300">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-gray-900 ml-4 lg:ml-0">Staff Management</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setProfileDropdownOpen(v => !v)} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{getUserInitials(user.name)}</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </a>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 pt-24">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Managers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalManagers}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStaff}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm" />
                </div>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm">
                  <option value="all">All roles</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="cashier">Cashier</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm">
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="disabled">Disabled</option>
                </select>
                <button onClick={() => setShowAdvancedFilters(v => !v)} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">{showAdvancedFilters ? 'Hide filters' : 'More filters'}</button>
                <div className="relative" ref={exportMenuRef}>
                  <button onClick={() => setExportMenuOpen(v => !v)} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm inline-flex items-center gap-2">
                    <span className="px-1 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-700 border border-green-200">CSV</span>
                    <span>Export</span>
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button onClick={() => { exportToCSV(sortedStaff, 'staff_export.csv'); setExportMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">All</button>
                      <button onClick={() => { exportToCSV(sortedStaff.filter(r => (r.role || '').toLowerCase() === 'admin'), 'admins_export.csv'); setExportMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Admin</button>
                      <button onClick={() => { exportToCSV(sortedStaff.filter(r => (r.role || '').toLowerCase() === 'staff'), 'staff_export.csv'); setExportMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Staff</button>
                      <button onClick={() => { exportToCSV(sortedStaff.filter(r => (r.role || '').toLowerCase() === 'cashier'), 'cashiers_export.csv'); setExportMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Cashier</button>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowAddModal(true)} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">Add Employee</button>
              </div>

              {showAdvancedFilters && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  <input placeholder="Staff No" value={filterId} onChange={(e) => setFilterId(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <input placeholder="Name" value={filterName} onChange={(e) => setFilterName(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <input placeholder="Email" value={filterEmail} onChange={(e) => setFilterEmail(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <input placeholder="Store" value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <input placeholder="Created At" value={filterCreated} onChange={(e) => setFilterCreated(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <button onClick={() => { setFilterId(''); setFilterName(''); setFilterEmail(''); setFilterStore(''); setFilterCreated(''); setFilterRole('all'); setFilterStatus('all'); setSearchTerm(''); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Clear</button>
                </div>
              )}
            </div>
          </div>

          {/* Staff List or Store-wise grouping */}
          {viewMode === 'stores' ? (
            <div className="space-y-4">
              {/* Admin Accounts (HQ) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Admin Accounts (HQ)</h3>
                  <span className="text-xs text-gray-500">{sortedStaff.filter(p => (p.role || '').toLowerCase() === 'admin').length} admin(s)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sortedStaff.filter(p => (p.role || '').toLowerCase() === 'admin').map(a => (
                    <div key={a.id} onClick={() => openEditModal(a)} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-3 cursor-pointer hover:shadow-sm transition">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{a.name}</p>
                        <p className="text-xs text-gray-600 truncate max-w-[200px]">{a.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'active' ? 'bg-green-100 text-green-700' : a.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{a.status}</span>
                    </div>
                  ))}
                  {sortedStaff.filter(p => (p.role || '').toLowerCase() === 'admin').length === 0 && (
                    <p className="text-sm text-gray-500">No admin accounts found.</p>
                  )}
                </div>
              </div>
              {/* Store selector */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center flex-wrap gap-2">
                  <button onClick={() => setSelectedStoreId(null)} className={`px-3 py-1.5 rounded-lg border text-sm ${selectedStoreId === null ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>All</button>
                  {stores.map(st => (
                    <button key={st.id} onClick={() => setSelectedStoreId(st.id)} className={`px-3 py-1.5 rounded-lg border text-sm ${selectedStoreId === st.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} title={st.location}>
                      {st.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Store-wise table with rowspans + recommendations */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="px-3 py-2">Store</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(() => {
                      const storesToShow = selectedStoreId ? stores.filter(s => s.id === selectedStoreId) : stores;
                      const rows = [];
                      storesToShow.forEach(st => {
                        const people = sortedStaff.filter(p => p.store_id === st.id);
                        const cov = getStoreCoverage(st.id);
                        const needed = [
                          !cov.hasManager ? 'Manager' : null,
                          !cov.hasStaff ? 'Staff' : null,
                          !cov.hasCashier ? 'Cashier' : null,
                        ].filter(Boolean);
                        if (people.length === 0) {
                          rows.push(
                            <tr key={`st-${st.id}-empty`} className="align-top">
                              <td className="px-3 py-2 font-medium text-gray-900">{st.name}</td>
                              <td className="px-3 py-2 text-gray-500" colSpan={4}>No users assigned</td>
                              <td className="px-3 py-2">
                                {needed.length ? (
                                  <div className="flex flex-wrap gap-1">
                                    {needed.map(n => (
                                      <span key={n} className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Need {n}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Complete</span>
                                )}
                              </td>
                            </tr>
                          );
                          return;
                        }
                        people.forEach((p, idx) => {
                          rows.push(
                            <tr key={`st-${st.id}-p-${p.id}`} className="align-top">
                              {idx === 0 && (
                                <td className="px-3 py-2 font-medium text-gray-900" rowSpan={people.length}>{st.name}</td>
                              )}
                              <td className="px-3 py-2 capitalize">{p.role}</td>
                              <td className="px-3 py-2">
                                <button onClick={() => openEditModal(p)} className="text-blue-600 hover:underline">{p.name}</button>
                              </td>
                              <td className="px-3 py-2 text-gray-700">{p.email}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-800' : p.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {p.status}
                                </span>
                              </td>
                              {idx === 0 && (
                                <td className="px-3 py-2" rowSpan={people.length}>
                                  {needed.length ? (
                                    <div className="flex flex-wrap gap-1">
                                      {needed.map(n => (
                                        <span key={n} className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Need {n}</span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Complete</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        });
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
              <div>
                <button onClick={() => setViewMode('default')} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Back to default view</button>
              </div>
            </div>
          ) : viewMode === 'roles' ? (
            <div className="space-y-6">
              {/* Helper to render role table */}
              {['admin','manager','staff','cashier'].map(roleKey => {
                const roleTitle = roleKey.charAt(0).toUpperCase() + roleKey.slice(1) + (roleKey === 'staff' ? '' : roleKey === 'cashier' ? 's' : 's');
                const people = sortedStaff.filter(p => (p.role || '').toLowerCase() === roleKey);
                return (
                  <div key={roleKey} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{roleTitle}</h4>
                      <span className="text-xs text-gray-500">{people.length}</span>
                    </div>
                    {people.length === 0 ? (
                      <p className="text-sm text-gray-500">No {roleKey} found.</p>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="px-3 py-2">Staff No</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Store</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Created At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {people.map(s => (
                            <tr key={s.id} className="align-top">
                              <td className="px-3 py-2">NRT/{s.id}</td>
                              <td className="px-3 py-2"><button onClick={() => openEditModal(s)} className="text-blue-600 hover:underline">{s.name}</button></td>
                              <td className="px-3 py-2 text-gray-700">{s.email}</td>
                              <td className="px-3 py-2">{storeIdToName(s.store_id)}</td>
                              <td className="px-3 py-2"><span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-800' : s.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{s.status}</span></td>
                              <td className="px-3 py-2">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">Staff No</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Store</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedStaff.map((s) => (
                    <tr key={s.id} className="align-top">
                      <td className="px-3 py-2">NRT/{s.id}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => openEditModal(s)} className="text-blue-600 hover:underline">{s.name}</button>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{s.email}</td>
                      <td className="px-3 py-2 capitalize">{s.role}</td>
                      <td className="px-3 py-2">{storeIdToName(s.store_id)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-800' : s.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{s.status}</span>
                      </td>
                      <td className="px-3 py-2">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredStaff.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No staff found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isSaving && setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-md mx-4 rounded-xl shadow-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Add Employee</h3>
              <button disabled={isSaving} onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Enter full name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Role</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="staff">Staff</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Store</label>
                <select value={newStore} onChange={(e) => setNewStore(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">HQ (No store)</option>
                  {stores.map(st => (
                    <option key={st.id} value={st.id}>{st.name} ({st.location})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button disabled={isSaving} onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isSaving || !newName.trim() || !newEmail.trim()} onClick={addStaff} className={`px-4 py-2 rounded-lg text-white ${isSaving || !newName.trim() || !newEmail.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{isSaving ? 'Saving...' : 'Save Employee'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isUpdating && setShowEditModal(false)} />
          <div className="relative bg-white w-full max-w-md mx-4 rounded-xl shadow-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Edit Employee</h3>
              <button disabled={isUpdating} onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter full name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Enter email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Role</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="staff">Staff</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Store</label>
                <select value={editStore} onChange={(e) => setEditStore(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">HQ (No store)</option>
                  {stores.map(st => (
                    <option key={st.id} value={st.id}>{st.name} ({st.location})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button disabled={isUpdating} onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isUpdating || !editName.trim() || !editEmail.trim()} onClick={updateStaff} className={`px-4 py-2 rounded-lg text-white ${isUpdating || !editName.trim() || !editEmail.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{isUpdating ? 'Updating...' : 'Update Employee'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
          <div className="relative bg-white w-full max-w-md mx-4 rounded-xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Employee</h3>
              <button disabled={isDeleting} onClick={() => setShowDeleteConfirm(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-2">Are you sure you want to delete <strong>"{deletingStaff.name}"</strong>?</p>
              <p className="text-sm text-red-600">This action cannot be undone. The staff record will be permanently removed.</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button disabled={isDeleting} onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isDeleting} onClick={deleteStaff} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed">{isDeleting ? 'Deleting...' : 'Delete Employee'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} isVisible={toast.show} onClose={hideToast} />

      {/* Logout Confirmation */}
      <LogoutConfirmation isOpen={showLogoutConfirm} onConfirm={confirmLogout} onCancel={cancelLogout} isLoading={isLoggingOut} />
    </div>
  );
};

export default AdminStaff;


