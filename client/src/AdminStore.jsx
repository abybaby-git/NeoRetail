import React, { useState, useEffect, useRef } from 'react';
import useAutoLogout from './hooks/useAutoLogout';
import { useNavigate } from 'react-router-dom';
import AdvancedLoader from './components/AdvancedLoader';
import LogoutConfirmation from './components/LogoutConfirmation';
import Toast from './components/Toast';
import logo from './assets/images/icon.png';

const AdminStore = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterId, setFilterId] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCreated, setFilterCreated] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreLocation, setNewStoreLocation] = useState('');
  const [newStoreStatus, setNewStoreStatus] = useState('online');
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const dropdownRef = useRef(null);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [editStoreName, setEditStoreName] = useState('');
  const [editStoreLocation, setEditStoreLocation] = useState('');
  const [editStoreStatus, setEditStoreStatus] = useState('online');
  const [editStoreManagerId, setEditStoreManagerId] = useState('');
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const [managers, setManagers] = useState([]);

  // Toast notification states
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Delete confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingStore, setDeletingStore] = useState(null);
  const [isDeletingStore, setIsDeletingStore] = useState(false);

  // Stores from backend
  const [stores, setStores] = useState([]);
  const [usersByStore, setUsersByStore] = useState({});
  const [users, setUsers] = useState([]);
  
  // Statistics state
  const [stats, setStats] = useState({
    totalStores: 0,
    totalManagers: 0,
    totalStaff: 0
  });

  // Function to decode JWT token
  const decodeToken = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      const payload = parts[1];
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodedPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };
// new comment added
  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const isNewLogin = sessionStorage.getItem('isNewLogin');
      
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const decodedToken = decodeToken(token);
        
        if (!decodedToken) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        const userFromToken = {
          id: decodedToken.user_id || decodedToken.userId || decodedToken.id || decodedToken.sub || decodedToken._id || 'N/A',
          name: decodedToken.name || decodedToken.username || decodedToken.email,
          role: decodedToken.role || decodedToken.userRole || 'user',
          ...decodedToken
        };

        if (userFromToken.role.toLowerCase() !== 'admin') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        if (isNewLogin === 'true') {
          await new Promise(resolve => setTimeout(resolve, 3000));
          sessionStorage.removeItem('isNewLogin');
        }

        // Load stores from backend with strict JSON checks
        try {
          const response = await fetch('https://neoretail.onrender.com//stores', {
            headers: { Accept: 'application/json' }
          });
          if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.error('Stores fetch failed with status', response.status, text?.slice(0, 200));
            setStores([]);
          } else {
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
              const text = await response.text().catch(() => '');
              throw new Error(`Unexpected content-type: ${contentType}. Body: ${text?.slice(0, 200)}`);
            }
            const data = await response.json();
            setStores(Array.isArray(data.stores) ? data.stores : []);
          }
        } catch (fetchErr) {
          console.error('Failed to fetch stores:', fetchErr);
          setStores([]);
        }

        // Load users to compute role coverage per store
        try {
          const usersRes = await fetch('https://neoretail.onrender.com//users', {
            headers: { Accept: 'application/json' }
          });
          if (usersRes.ok) {
            const uData = await usersRes.json();
            const list = Array.isArray(uData.users) ? uData.users : [];
            setUsers(list);
            const mapping = list.reduce((acc, u) => {
              const sid = u.store_id;
              if (sid == null) return acc; // skip HQ/admin
              if (!acc[sid]) acc[sid] = { hasManager: false, hasStaff: false, hasCashier: false };
              const role = (u.role || '').toLowerCase();
              if (role === 'manager') acc[sid].hasManager = true;
              if (role === 'staff') acc[sid].hasStaff = true;
              if (role === 'cashier') acc[sid].hasCashier = true;
              return acc;
            }, {});
            setUsersByStore(mapping);
          } else {
            setUsersByStore({});
            setUsers([]);
          }
        } catch (err) {
          console.error('Failed to fetch users for store coverage:', err);
          setUsersByStore({});
          setUsers([]);
        }

        // Fetch statistics
        await fetchStats();

        setUser(userFromToken);
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Auto-logout shared hook (30 minutes of actual inactivity)
  useAutoLogout({
    enabled: !!user,
    decodeToken,
    onLogout: confirmLogout,
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  });

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  // Hide toast notification
  const hideToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('https://neoretail.onrender.com//stores/stats', {
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || { totalStores: 0, totalManagers: 0, totalStaff: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch managers for edit modal
  const fetchManagers = async () => {
    try {
      const response = await fetch('https://neoretail.onrender.com//stores/managers', {
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setManagers(data.managers || []);
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  // Open edit modal for a store
  const openEditModal = async (store) => {
    setEditingStore(store);
    setEditStoreName(store.name || '');
    setEditStoreLocation(store.location || '');
    setEditStoreStatus(store.status || 'online');
    setEditStoreManagerId(store.manager_id || '');
    setShowEditModal(true);
    await fetchManagers();
  };

  // Update store
  const updateStore = async () => {
    if (!editingStore) return;
    
    setIsUpdatingStore(true);
    try {
      const response = await fetch(`https://neoretail.onrender.com//stores/${editingStore.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editStoreName.trim(),
          location: editStoreLocation.trim(),
          status: editStoreStatus,
          manager_id: editStoreManagerId || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update store');
      }

      const result = await response.json();
      
      // Update the store in the local state
      setStores(prevStores => 
        prevStores.map(store => 
          store.id === editingStore.id ? result.store : store
        )
      );

      setShowEditModal(false);
      setEditingStore(null);
      setEditStoreName('');
      setEditStoreLocation('');
      setEditStoreStatus('online');
      setEditStoreManagerId('');
      
      showToast('Store updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating store:', error);
      showToast('Failed to update store: ' + error.message, 'error');
    } finally {
      setIsUpdatingStore(false);
    }
  };

  // Delete store
  const deleteStore = async () => {
    if (!deletingStore) return;
    
    setIsDeletingStore(true);
    try {
      const response = await fetch(`https://neoretail.onrender.com//stores/${deletingStore.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete store');
      }

      const result = await response.json();
      
      // Remove the store from the local state
      setStores(prevStores => 
        prevStores.filter(store => store.id !== deletingStore.id)
      );

      setShowDeleteConfirm(false);
      setDeletingStore(null);
      
      // Refresh stats after deleting store
      await fetchStats();
      
      showToast('Store deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting store:', error);
      showToast('Failed to delete store: ' + error.message, 'error');
    } finally {
      setIsDeletingStore(false);
    }
  };

  // Open delete confirmation
  const openDeleteConfirm = (store) => {
    setDeletingStore(store);
    setShowDeleteConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(false);
  };

  const toggleProfileDropdown = () => setProfileDropdownOpen(!profileDropdownOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserInitials = (name) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const normalizeStatus = (rawStatus) => {
    const s = (rawStatus || '').toLowerCase();
    if (s === 'offline') return 'closed';
    return s;
  };

  const getStatusColor = (status) => {
    const s = normalizeStatus(status);
    switch (s) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    const s = normalizeStatus(status);
    switch (s) {
      case 'online': return '🟢';
      case 'closed': return '🔴';
      case 'maintenance': return '🟡';
      default: return '⚪';
    }
  };

  const filteredStores = stores.filter(store => {
    const idStr = String(store.id || '').toLowerCase();
    const name = (store.name || '').toLowerCase();
    const location = (store.location || '').toLowerCase();
    const managerName = (store.manager_name || '').toLowerCase();
    const createdAtStr = store.created_at ? new Date(store.created_at).toLocaleString().toLowerCase() : '';
    const status = normalizeStatus(store.status);

    const matchesId = !filterId || idStr.includes(filterId.toLowerCase());
    const matchesName = !filterName || name.includes(filterName.toLowerCase());
    const matchesManager = !filterManager || managerName.includes(filterManager.toLowerCase());
    const matchesLocation = !filterLocation || location.includes(filterLocation.toLowerCase());
    const matchesCreated = !filterCreated || createdAtStr.includes(filterCreated.toLowerCase());
    const matchesStatus = filterStatus === 'all' || status === filterStatus;

    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || name.includes(term) || location.includes(term) || managerName.includes(term) || idStr.includes(term);

    const roleCoverage = usersByStore[store.id] || { hasManager: !!store.manager_name, hasStaff: false, hasCashier: false };
    const isComplete = roleCoverage.hasManager && roleCoverage.hasStaff && roleCoverage.hasCashier;
    const matchesIncomplete = !showIncompleteOnly || !isComplete;

    return matchesId && matchesName && matchesManager && matchesLocation && matchesCreated && matchesStatus && matchesSearch && matchesIncomplete;
  });

  // Calculate stats from stores array as fallback
  const totalStats = stores.reduce((acc) => {
    acc.totalStores++;
    return acc;
  }, { totalStores: 0 });

  if (isLoading || !user) {
    return <AdvancedLoader role="admin" />;
  }

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
        
        <nav className="mt-6 px-4">
          <div className="space-y-2">
            <a href="/admin" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              Dashboard
            </a>
            <a href="/admin/store" className="flex items-center px-4 py-3 text-gray-700 bg-blue-50 border-r-2 border-blue-500 rounded-lg">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Store Management
            </a>
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
            <h2 className="text-xl font-semibold text-gray-900 ml-4 lg:ml-0">Store Management</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative" ref={dropdownRef}>
              <button onClick={toggleProfileDropdown} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none">
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

        {/* Main Content */}
        <main className="p-6 pt-24">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Total Stores */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Stores</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStores}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Managers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Managers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalManagers}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Staff */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStaff}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters - Compact */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col gap-3">
              {/* Top toolbar: search + status + advanced toggle */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search stores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">All</option>
                  <option value="online">Online</option>
                  <option value="closed">Closed</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <button
                  onClick={() => setShowAdvancedFilters(v => !v)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  {showAdvancedFilters ? 'Hide filters' : 'More filters'}
                </button>
                <button
                  onClick={() => setShowIncompleteOnly(v => !v)}
                  className={`px-3 py-2 border rounded-lg text-sm ${showIncompleteOnly ? 'border-red-300 text-red-700 bg-red-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  title="Show stores missing manager, staff, or cashier"
                >
                  {showIncompleteOnly ? 'Showing Incomplete' : 'Incomplete only'}
                </button>
                <button onClick={() => setShowAddModal(true)} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Add Store
                </button>
              </div>

              {showAdvancedFilters && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  <input placeholder="ID" value={filterId} onChange={(e) => setFilterId(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <input placeholder="Name" value={filterName} onChange={(e) => setFilterName(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <input placeholder="Manager" value={filterManager} onChange={(e) => setFilterManager(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <input placeholder="Location" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <input placeholder="Created At" value={filterCreated} onChange={(e) => setFilterCreated(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm" />
                  <button
                    onClick={() => { setFilterId(''); setFilterName(''); setFilterManager(''); setFilterLocation(''); setFilterCreated(''); setFilterStatus('all'); setSearchTerm(''); }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stores Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStores.map((store) => (
              <div 
                key={store.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditModal(store)}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">Store ID: NR/STRNM/{store.id}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(store.status)}`}>
                      <span className="mr-1">{getStatusIcon(store.status)}</span>
                      {(() => { const s = normalizeStatus(store.status); return s.charAt(0).toUpperCase() + s.slice(1); })()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirm(store);
                      }}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Delete store"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Manager</span>
                    <span className="font-medium text-gray-900">{store.manager_name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Location</span>
                    <span className="font-medium text-gray-900">{store.location || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Recruitment</span>
                    {(() => {
                      const rc = usersByStore[store.id] || { hasManager: !!store.manager_name, hasStaff: false, hasCashier: false };
                      const complete = rc.hasManager && rc.hasStaff && rc.hasCashier;
                      return (
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${complete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {complete ? 'Complete' : 'Incomplete'}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Created At</span>
                    <span className="font-medium text-gray-900">{store.created_at ? new Date(store.created_at).toLocaleString() : '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredStores.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Add Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isSavingStore && setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-md mx-4 rounded-xl shadow-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Add Store</h3>
              <button disabled={isSavingStore} onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Store Name</label>
                <input
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="Enter store name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Location</label>
                <input
                  value={newStoreLocation}
                  onChange={(e) => setNewStoreLocation(e.target.value)}
                  placeholder="Enter location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select
                  value={newStoreStatus}
                  onChange={(e) => setNewStoreStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="online">Online</option>
                  <option value="closed">Closed</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button disabled={isSavingStore} onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={isSavingStore || !newStoreName.trim() || !newStoreLocation.trim()}
                onClick={async () => {
                  setIsSavingStore(true);
                  try {
                    const response = await fetch('https://neoretail.onrender.com//stores', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        name: newStoreName.trim(),
                        location: newStoreLocation.trim(),
                        status: newStoreStatus
                      })
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.message || 'Failed to create store');
                    }

                    const result = await response.json();
                    
                    // Refresh stores list
                    const storesResponse = await fetch('https://neoretail.onrender.com//stores', {
                      headers: { Accept: 'application/json' }
                    });
                    
                    if (storesResponse.ok) {
                      const data = await storesResponse.json();
                      setStores(Array.isArray(data.stores) ? data.stores : []);
                    }

                    setShowAddModal(false);
                    setNewStoreName('');
                    setNewStoreLocation('');
                    setNewStoreStatus('online');
                    
                    // Refresh stats after creating store
                    await fetchStats();
                    
                    showToast('Store created successfully!', 'success');
                  } catch (error) {
                    console.error('Error creating store:', error);
                    showToast('Failed to create store: ' + error.message, 'error');
                  } finally {
                    setIsSavingStore(false);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-white ${isSavingStore || !newStoreName.trim() || !newStoreLocation.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSavingStore ? 'Saving...' : 'Save Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Store Modal */}
      {showEditModal && editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isUpdatingStore && setShowEditModal(false)} />
          <div className="relative bg-white w-full max-w-3xl mx-4 rounded-xl shadow-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Store</h3>
              <button disabled={isUpdatingStore} onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column: Editable form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Store Name</label>
                  <input
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    placeholder="Enter store name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Location</label>
                  <input
                    value={editStoreLocation}
                    onChange={(e) => setEditStoreLocation(e.target.value)}
                    placeholder="Enter location"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select
                    value={editStoreStatus}
                    onChange={(e) => setEditStoreStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="online">Online</option>
                    <option value="closed">Closed</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Manager</label>
                  <select
                    value={editStoreManagerId}
                    onChange={(e) => setEditStoreManagerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No Manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name} ({manager.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right column: Suggestions + Current Staff */}
              <div className="space-y-3">
                {/* Suggested Recruitments */}
                {(() => {
                  const rc = usersByStore[editingStore.id] || { hasManager: !!editingStore.manager_name, hasStaff: false, hasCashier: false };
                  const missing = [
                    !rc.hasManager ? 'Manager' : null,
                    !rc.hasStaff ? 'Staff' : null,
                    !rc.hasCashier ? 'Cashier' : null,
                  ].filter(Boolean);
                  return (
                    <div className="p-3 rounded-lg border text-sm flex items-start justify-between"
                      style={{ borderColor: missing.length ? '#fecaca' : '#bbf7d0', background: missing.length ? '#fef2f2' : '#f0fdf4', color: '#111827' }}>
                      <div>
                        <p className="font-medium mb-1">Recruitment status</p>
                        {missing.length === 0 ? (
                          <p className="text-gray-700">All required roles are filled.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {missing.map(role => (
                              <span key={role} className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Need {role}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <a href="/admin/staff" className="ml-3 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700">Manage staff</a>
                    </div>
                  );
                })()}

                {/* Current Staff List */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Current Staff</label>
                  <div className="max-h-56 overflow-auto border rounded-lg divide-y">
                    {users.filter(u => u.store_id === editingStore.id).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No staff assigned to this store.</div>
                    )}
                    {users
                      .filter(u => u.store_id === editingStore.id)
                      .sort((a, b) => String(a.role).localeCompare(String(b.role)) || String(a.name).localeCompare(String(b.name)))
                      .map(u => (
                        <div key={u.id} className="px-3 py-2 text-sm flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{u.name}</p>
                            <p className="text-gray-600 text-xs">{u.email}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 capitalize">{u.role}</span>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button disabled={isUpdatingStore} onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={isUpdatingStore || !editStoreName.trim() || !editStoreLocation.trim()}
                onClick={updateStore}
                className={`px-4 py-2 rounded-lg text-white ${isUpdatingStore || !editStoreName.trim() || !editStoreLocation.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isUpdatingStore ? 'Updating...' : 'Update Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeletingStore && setShowDeleteConfirm(false)} />
          <div className="relative bg-white w-full max-w-md mx-4 rounded-xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Store</h3>
              <button disabled={isDeletingStore} onClick={() => setShowDeleteConfirm(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete the store <strong>"{deletingStore.name}"</strong>?
              </p>
              <p className="text-sm text-red-600">
                This action cannot be undone. The store and all associated data will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button 
                disabled={isDeletingStore} 
                onClick={() => setShowDeleteConfirm(false)} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingStore}
                onClick={deleteStore}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
              >
                {isDeletingStore ? 'Deleting...' : 'Delete Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={hideToast}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmation
        isOpen={showLogoutConfirm}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
        isLoading={isLoggingOut}
      />
    </div>
  );
};

export default AdminStore;
