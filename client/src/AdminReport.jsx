import React, { useState, useEffect, useRef } from 'react';
import useAutoLogout from './hooks/useAutoLogout';
import { useNavigate } from 'react-router-dom';
import logo from './assets/images/icon.png';
import AdvancedLoader from './components/AdvancedLoader';
import LogoutConfirmation from './components/LogoutConfirmation';

const AdminReport = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);

  // Sales Reports State
  const [salesData, setSalesData] = useState([]);
  const [salesSummary, setSalesSummary] = useState({});
  const [storeSummary, setStoreSummary] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleDetails, setShowSaleDetails] = useState(false);

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

  // Fetch stores data
  const fetchStores = async () => {
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
        setStores(data.stores || []);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  // Fetch sales reports data
  const fetchSalesReports = async () => {
    setIsLoadingReports(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        limit: '10',
        offset: ((currentPage - 1) * 10).toString()
      });

      if (selectedStore) {
        params.append('store_id', selectedStore);
      }
      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }

      const response = await fetch(`https://neoretail.onrender.com//pos/admin/reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSalesData(data.sales || []);
        setSalesSummary(data.summary || {});
        setStoreSummary(data.store_summary || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching sales reports:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    if (user) {
      fetchStores();
      fetchSalesReports();
    }
  }, [user, selectedStore, dateFrom, dateTo, currentPage]);

  // Handle sale details view
  const handleViewSaleDetails = (sale) => {
    setSelectedSale(sale);
    setShowSaleDetails(true);
  };

  // Handle date range change
  const handleDateRangeChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
    setCurrentPage(1); // Reset to first page
  };

  // Handle store filter change
  const handleStoreChange = (storeId) => {
    setSelectedStore(storeId);
    setCurrentPage(1); // Reset to first page
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Download sales data as CSV
  const downloadSalesData = () => {
    const csvData = salesData.map(sale => ({
      'Sale ID': sale.sale_id,
      'Date': new Date(sale.sale_date).toLocaleDateString(),
      'Store': sale.store_name,
      'Cashier': sale.cashier_name,
      'Total Amount': sale.grand_total,
      'Discount': sale.total_discount || 0,
      'Payment Method': sale.payment_method,
      'Status': sale.payment_status
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
            <a href="/admin" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
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
            <a href="/admin/inventory" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
            </a>
            <a href="/admin/reports" className="flex items-center px-4 py-3 text-gray-700 bg-blue-50 border-r-2 border-blue-500 rounded-lg">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Sales Reports
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
            <h2 className="text-xl font-semibold text-gray-900 ml-4 lg:ml-0">Sales Reports</h2>
          </div>
          <div className="flex items-center space-x-4">
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
          {/* Sales Reports Content */}
          <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sales Reports</h3>
                  <p className="text-sm text-gray-600">View sales performance across all stores</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={downloadSalesData}
                    disabled={salesData.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                    <span>Export Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Store</label>
                  <select
                    value={selectedStore}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Stores</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name} - {store.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleDateRangeChange(e.target.value, dateTo)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
            </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleDateRangeChange(dateFrom, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Sales Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Sales Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingReports ? '...' : `₹${salesSummary.total_sales?.toLocaleString() || 0}`}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingReports ? '...' : salesSummary.total_transactions || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-600">Average Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingReports ? '...' : `₹${salesSummary.average_order_value?.toLocaleString() || 0}`}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-600">Total Discount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingReports ? '...' : `₹${salesSummary.total_discount?.toLocaleString() || 0}`}
                  </p>
              </div>
            </div>
          </div>

            {/* Store Summary */}
            {storeSummary.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Store Performance</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeSummary.map(store => (
                    <div key={store.store_id} className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900">{store.store_name}</h5>
                      <p className="text-sm text-gray-600">{store.store_location}</p>
                      <div className="mt-2 flex justify-between">
                        <span className="text-sm text-gray-500">Sales:</span>
                        <span className="font-medium">₹{parseFloat(store.total_sales).toLocaleString()}</span>
              </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Transactions:</span>
                        <span className="font-medium">{store.transaction_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Sales Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Sales Data</h4>
              {isLoadingReports ? (
                <div className="flex justify-center py-8">
                  <AdvancedLoader />
              </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cashier</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {salesData.length > 0 ? (
                          salesData.map((sale) => (
                            <tr key={sale.sale_id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {new Date(sale.sale_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {sale.store_name}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {sale.cashier_name}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                ₹{parseFloat(sale.grand_total).toLocaleString()}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {sale.payment_method}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  sale.payment_status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {sale.payment_status}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() => handleViewSaleDetails(sale)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                    </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                              No sales data available for the selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
          </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
              </button>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
              </button>
                      </div>
                    </div>
                  )}
                </>
              )}
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

      {/* Sale Details Modal */}
      {showSaleDetails && selectedSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowSaleDetails(false)}>
              <div className="absolute inset-0"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Sale Details</h3>
                  <button
                    onClick={() => setShowSaleDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sale Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Sale Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sale ID:</span>
                        <span className="font-medium">#{selectedSale.sale_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{new Date(selectedSale.sale_date).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Store:</span>
                        <span className="font-medium">{selectedSale.store_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cashier:</span>
                        <span className="font-medium">{selectedSale.cashier_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium">{selectedSale.payment_method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedSale.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedSale.payment_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Payment Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">₹{parseFloat(selectedSale.total_amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium">₹{parseFloat(selectedSale.total_discount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">₹{parseFloat(selectedSale.total_tax || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-900 font-medium">Grand Total:</span>
                        <span className="font-bold text-lg">₹{parseFloat(selectedSale.grand_total).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Items Sold</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedSale.items && selectedSale.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{item.sku}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">₹{parseFloat(item.selling_price).toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">₹{parseFloat(item.discount || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">₹{parseFloat(item.total_amount).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payments */}
                {selectedSale.payments && selectedSale.payments.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                    <div className="space-y-2">
                      {selectedSale.payments.map((payment, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{payment.payment_method}</span>
                            {payment.payment_reference && (
                              <p className="text-sm text-gray-600">Ref: {payment.payment_reference}</p>
                            )}
                          </div>
                          <span className="font-medium">₹{parseFloat(payment.amount_paid).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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

export default AdminReport; 