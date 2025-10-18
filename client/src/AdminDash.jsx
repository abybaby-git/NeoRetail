import React, { useState, useEffect, useRef } from 'react';
import useAutoLogout from './hooks/useAutoLogout';
import { useNavigate } from 'react-router-dom';
import logo from './assets/images/icon.png';
import AdvancedLoader from './components/AdvancedLoader';
import LogoutConfirmation from './components/LogoutConfirmation';

const AdminDash = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    totalStores: 0,
    totalStaff: 0,
    systemRevenue: 0
  });
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  
  // Stores and staff data for detailed sections
  const [storesData, setStoresData] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Function to decode JWT token
  const decodeToken = (token) => {
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
      
      return JSON.parse(decodedPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

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
        // Decode the JWT token to get user details
        const decodedToken = decodeToken(token);
        
        if (!decodedToken) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        // Extract user details from token payload
        const userFromToken = {
          id: decodedToken.user_id || decodedToken.userId || decodedToken.id || decodedToken.sub || decodedToken._id || 'N/A',
          name: decodedToken.name || decodedToken.username || decodedToken.email,
          role: decodedToken.role || decodedToken.userRole || 'user',
          // Add any other fields that might be in the token
          ...decodedToken
        };

        // Log the decoded token for debugging
        console.log('Decoded Token:', decodedToken);
        console.log('User from Token:', userFromToken);

        // Verify user role is admin
        if (userFromToken.role.toLowerCase() !== 'admin') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        // Only show loader delay if this is a new login
        if (isNewLogin === 'true') {
          // Add artificial delay to show loader only for new logins
          await new Promise(resolve => setTimeout(resolve, 3000));
          // Clear the new login flag
          sessionStorage.removeItem('isNewLogin');
        }
        
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

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    
    // Simulate logout process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Navigate to login
    navigate('/login');
  };

  // Auto-logout shared hook (30 minutes of actual inactivity)
  useAutoLogout({
    enabled: !!user,
    decodeToken,
    onLogout: confirmLogout,
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  });

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(false);
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show back to top button on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoadingDashboard(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch stores data
      const storesResponse = await fetch('https://neoretail.onrender.com//stores', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Fetch users data
      const usersResponse = await fetch('https://neoretail.onrender.com//users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Fetch sales data for revenue calculation
      const salesResponse = await fetch('https://neoretail.onrender.com//pos/admin/reports?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (storesResponse.ok && usersResponse.ok && salesResponse.ok) {
        const storesData = await storesResponse.json();
        const usersData = await usersResponse.json();
        const salesData = await salesResponse.json();
        
        const totalStores = storesData.stores?.length || 0;
        const totalStaff = usersData.users?.length || 0;
        const systemRevenue = salesData.summary?.total_sales || 0;
        
        setDashboardData({
          totalStores,
          totalStaff,
          systemRevenue
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Fetch stores data for Store Management section
  const fetchStoresData = async () => {
    setIsLoadingStores(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://neoretail.onrender.com//stores', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStoresData(data.stores || []);
      }
    } catch (error) {
      console.error('Error fetching stores data:', error);
    } finally {
      setIsLoadingStores(false);
    }
  };

  // Fetch staff data for Staff Overview section
  const fetchStaffData = async () => {
    setIsLoadingStaff(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://neoretail.onrender.com//users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStaffData(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // Load dashboard data when user is authenticated
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchStoresData();
      fetchStaffData();
    }
  }, [user]);

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show loading or redirect if user not loaded
  if (isLoading || !user) {
    return <AdvancedLoader role="admin" />;
  }

  // Get user initials for avatar
  const getUserInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {/* Logo Placeholder */}
            <div className="w-11 h-11 rounded-full  flex items-center justify-center">
              {/* Replace with your logo image if available */}
              <img src={logo} alt="NeoRetail Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NeoRetail</h1>
              <p className="text-xs text-gray-500">Super Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="mt-6 px-4">
          <div className="space-y-2">
            <a href="/admin" className="flex items-center px-4 py-3 text-gray-700 bg-blue-50 border-r-2 border-blue-500 rounded-lg">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              Dashboard
            </a>
            <a href="/admin/store" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Store Management
            </a>
            <a href="/admin/staff" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Staff Management
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Payroll
            </a>
            <a href="/admin/reports" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Sales Reports
            </a>
            <a href="/admin/inventory" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.6A9 9 0 1021 16.4a9 9 0 00-9-9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 2.5a5 5 0 015 5v2a5 5 0 01-5 5h-2a5 5 0 01-5-5v-2a5 5 0 015-5h2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              Marketing 
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              System Settings
            </a>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Floating Header */}
        <header className="fixed top-0 left-0 right-0 lg:left-64 z-40 mx-2 mt-2 bg-white shadow-lg rounded-2xl border border-gray-200 flex items-center justify-between h-16 px-6 transition-all duration-300">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-gray-900 ml-4 lg:ml-0">Dashboard</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleProfileDropdown}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
              >
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
              {/* Dropdown Menu */}
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
                  
                  <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </a>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
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
        {/* Add top padding so content is not hidden behind header */}
        <main className="p-6 pt-24">
          {/* User Info Card - Token Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-600">Name</p>
                <p className="text-lg font-semibold text-gray-900">{user.name}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm font-medium text-green-600">Role</p>
                <p className="text-lg font-semibold text-gray-900">{user.role}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-600">Staff No</p>
                <p className="text-lg font-semibold text-gray-900">NRT/{user.id || 'N/A'}</p>
              </div>
            </div>
            {/* <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Available Token Fields:</strong>
              </p>
              <div className="text-xs font-mono bg-white p-2 rounded border overflow-auto max-h-32">
                {Object.keys(user).map(key => (
                  <div key={key} className="mb-1">
                    <span className="text-blue-600">{key}:</span> {JSON.stringify(user[key])}
                  </div>
                ))}
              </div>
            </div> */}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Stores</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingDashboard ? '...' : dashboardData.totalStores}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingDashboard ? '...' : dashboardData.totalStaff}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingDashboard ? '...' : `₹${dashboardData.systemRevenue.toLocaleString()}`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

          </div>

          {/* Charts and Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Store Management */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Store Management</h3>
                <a href="/admin/store" className="text-sm text-blue-600 hover:text-blue-700">Manage all</a>
              </div>
              {isLoadingStores ? (
                <div className="flex justify-center py-8">
                  <div className="text-blue-600">Loading stores...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {storesData.slice(0, 4).map((store) => {
                    // Count staff for this store
                    const storeStaffCount = staffData.filter(staff => staff.store_id === store.id).length;
                    
                    return (
                      <div key={store.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{store.name}</p>
                          <p className="text-sm text-gray-600">{store.location} • {storeStaffCount} staff</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            store.status === 'active' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {store.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {storesData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No stores found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Staff Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Staff Overview</h3>
                <a href="/admin/staff" className="text-sm text-blue-600 hover:text-blue-700">View all</a>
              </div>
              {isLoadingStaff ? (
                <div className="flex justify-center py-8">
                  <div className="text-blue-600">Loading staff...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Group staff by role
                    const roleGroups = staffData.reduce((acc, staff) => {
                      const role = staff.role || 'Staff';
                      if (!acc[role]) {
                        acc[role] = { count: 0, active: 0, inactive: 0 };
                      }
                      acc[role].count++;
                      if (staff.status === 'active') {
                        acc[role].active++;
                      } else {
                        acc[role].inactive++;
                      }
                      return acc;
                    }, {});

                    // Convert to array and sort by count
                    const roleArray = Object.entries(roleGroups)
                      .map(([role, data]) => ({
                        role: role.charAt(0).toUpperCase() + role.slice(1) + 's',
                        count: data.count,
                        active: data.active,
                        inactive: data.inactive,
                        status: data.inactive > 0 ? `${data.inactive} Inactive` : 'All Active'
                      }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 4);

                    return roleArray.map((staff, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-medium">{staff.count}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{staff.role}</p>
                            <p className="text-sm text-gray-600">{staff.status}</p>
                          </div>
                        </div>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Manage
                        </button>
                      </div>
                    ));
                  })()}
                  {staffData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No staff found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Add Store</span>
              </button>
              
              <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Manage Staff</span>
              </button>
              
              <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Payroll</span>
              </button>
              
              <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                <svg className="w-8 h-8 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">System Reports</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={handleBackToTop}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Back to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

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

export default AdminDash; 