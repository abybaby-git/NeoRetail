import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdvancedLoader from './components/AdvancedLoader';
import LogoutConfirmation from './components/LogoutConfirmation';
import logo from './assets/images/icon.png';

const ManagerInventory = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [storeStock, setStoreStock] = useState([]);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [stockError, setStockError] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [isLowStockLoading, setIsLowStockLoading] = useState(false);
  const [lowStockError, setLowStockError] = useState(null);
  const [lowStockSummary, setLowStockSummary] = useState({});
  const dropdownRef = useRef(null);

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

        // Verify user role is manager
        if (userFromToken.role.toLowerCase() !== 'manager') {
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
        
        console.log('User data:', userFromToken);
        console.log('Store ID from token:', userFromToken.store_id);
        
        // Fetch store-specific data if user has store_id
        if (userFromToken.store_id) {
          fetchStoreStock(userFromToken.store_id);
          fetchStoreInfo(userFromToken.store_id);
          fetchLowStockItems(userFromToken.store_id);
        } else {
          console.log('No store_id found in user token, checking database...');
          // Check if store_id exists in database but not in token
          setTimeout(async () => {
            const userInfo = await checkUserStoreAssignment();
            if (userInfo?.store_id) {
              console.log('Found store_id in database, updating user state...');
              setUser(prev => ({ ...prev, store_id: userInfo.store_id }));
              await fetchStoreStock(userInfo.store_id);
              await fetchStoreInfo(userInfo.store_id);
              await fetchLowStockItems(userInfo.store_id);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error processing token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  // Function to fetch store-specific stock data
  const fetchStoreStock = async (storeId) => {
    setIsStockLoading(true);
    setStockError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://neoretail.onrender.com//stock?store_id=${storeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch store stock');
      }

      const data = await response.json();
      setStoreStock(data.stock || []);
    } catch (error) {
      console.error('Error fetching store stock:', error);
      setStockError('Failed to load store inventory');
    } finally {
      setIsStockLoading(false);
    }
  };

  // Function to fetch low stock items
  const fetchLowStockItems = async (storeId) => {
    setIsLowStockLoading(true);
    setLowStockError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://neoretail.onrender.com//pos/low-stock/${storeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If server is not available or error, just set empty data instead of showing error
        setLowStockItems([]);
        setLowStockSummary({ total_items: 0 });
        return;
      }

      const data = await response.json();
      setLowStockItems(data.low_stock_items || []);
      setLowStockSummary({
        total_items: data.total_items || 0
      });
    } catch (error) {
      // Silently handle errors - just set empty data instead of showing error
      console.log('Low stock data not available, setting empty data');
      setLowStockItems([]);
      setLowStockSummary({ total_items: 0 });
    } finally {
      setIsLowStockLoading(false);
    }
  };

  // Function to fetch store information
  const fetchStoreInfo = async (storeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://neoretail.onrender.com//stores/${storeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch store info');
      }

      const data = await response.json();
      console.log('Store info received:', data.store);
      setStoreInfo(data.store);
    } catch (error) {
      console.error('Error fetching store info:', error);
    }
  };

  // Function to check current user's store assignment (for debugging)
  const checkUserStoreAssignment = async () => {
    try {
      const token = localStorage.getItem('token');
      const decodedToken = decodeToken(token);
      
      const response = await fetch(`https://neoretail.onrender.com//users/me?user_id=${decodedToken.user_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const data = await response.json();
      console.log('Current user info from database:', data.user);
      return data.user;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  };

  // Function to refresh all data
  const refreshData = async () => {
    if (user?.store_id) {
      console.log('Refreshing data for store_id:', user.store_id);
      await fetchStoreStock(user.store_id);
      await fetchStoreInfo(user.store_id);
      await fetchLowStockItems(user.store_id);
      await checkUserStoreAssignment();
    } else {
      console.log('No store_id found, checking user assignment...');
      const userInfo = await checkUserStoreAssignment();
      if (userInfo?.store_id) {
        console.log('Found store_id in database, updating user state...');
        setUser(prev => ({ ...prev, store_id: userInfo.store_id }));
        await fetchStoreStock(userInfo.store_id);
        await fetchStoreInfo(userInfo.store_id);
        await fetchLowStockItems(userInfo.store_id);
      }
    }
  };

  // Function to filter stock based on search term
  const getFilteredStock = () => {
    if (!searchTerm.trim()) {
      return storeStock;
    }
    
    const term = searchTerm.toLowerCase();
    return storeStock.filter(item => 
      item.product_name?.toLowerCase().includes(term) ||
      item.product_sku?.toLowerCase().includes(term) ||
      item.category_name?.toLowerCase().includes(term) ||
      item.barcode?.toLowerCase().includes(term) ||
      item.rack_location?.toLowerCase().includes(term) ||
      item.seller_name?.toLowerCase().includes(term)
    );
  };

  // Function to get paginated stock data
  const getPaginatedStock = () => {
    const filteredStock = getFilteredStock();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStock.slice(startIndex, endIndex);
  };

  // Function to get total pages
  const getTotalPages = () => {
    const filteredStock = getFilteredStock();
    return Math.ceil(filteredStock.length / itemsPerPage);
  };

  // Function to handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Function to handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

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

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show loading or redirect if user not loaded
  if (isLoading || !user) {
    return <AdvancedLoader role="manager" />;
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
              <p className="text-xs text-gray-500">Inventory Management</p>
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
            <button 
              onClick={() => navigate('/manager')}
              className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              Dashboard
            </button>
            <button 
              onClick={() => navigate('/manager/sales')}
              className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Sales & POS
            </button>
            <a href="#" className="flex items-center px-4 py-3 text-gray-700 bg-green-50 border-r-2 border-green-500 rounded-lg">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
            </a>
            <button 
              onClick={() => navigate('/manager/staff')}
              className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Staff Management
            </button>
            <button 
              onClick={() => navigate('/manager/reports')}
              className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Reports
            </button>
            <a href="#" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Schedule
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Store Settings
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
            <h2 className="text-xl font-semibold text-gray-900 ml-4 lg:ml-0">
              Inventory Management
              {storeInfo && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  - {storeInfo.name}
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">2</span>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleProfileDropdown}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
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
          {/* Store-Specific Inventory Management */}
          <div className="space-y-6">
            {/* Store Information Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  {storeInfo ? (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900">{storeInfo.name}</h2>
                      <p className="text-gray-600">{storeInfo.location}</p>
                      <p className="text-sm text-gray-500 mt-1">Store ID:STR/ {storeInfo.id}</p>
                    </>
                  ) : user?.store_id ? (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900">Loading Store Information...</h2>
                      <p className="text-gray-600">Store ID: {user.store_id}</p>
                      <p className="text-sm text-gray-500 mt-1">Fetching store details...</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900">No Store Assigned</h2>
                      <p className="text-gray-600">Contact administrator to assign a store</p>
                      <p className="text-sm text-gray-500 mt-1">No store_id found in user profile</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={refreshData}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isStockLoading ? '...' : getFilteredStock().length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isStockLoading ? '...' : getFilteredStock().reduce((sum, item) => sum + Number(item.quantity), 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isStockLoading ? '...' : 
                        `₹${getFilteredStock().reduce((sum, item) => sum + (Number(item.quantity) * Number(item.selling_price)), 0).toLocaleString()}`
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Low Stock</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isLowStockLoading ? '...' : lowStockItems.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Low Stock Alert Section */}
            {lowStockItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
                      <p className="text-sm text-gray-600 mt-1">Items with remaining quantity ≤ 5</p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="ml-2 text-sm font-medium text-yellow-600">{lowStockItems.length} items</span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lowStockItems.map((item) => (
                          <tr key={item.stock_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.product_name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {item.sku}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {item.allocated_quantity}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {item.total_sold}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              <span className={`font-medium ${
                                item.remaining_quantity <= 0 ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                {item.remaining_quantity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Stock Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Current Stock Items</h3>
                    <p className="text-sm text-gray-600 mt-1">Products allocated to your store</p>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search products, SKU, barcode..."
                      value={searchTerm}
                      onChange={handleSearch}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {isStockLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading inventory...</span>
                  </div>
                ) : stockError ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-600 font-medium">{stockError}</p>
                    <button 
                      onClick={() => user?.store_id && fetchStoreStock(user.store_id)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : storeStock.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No stock allocated to your store</p>
                    <p className="text-gray-500 text-sm mt-1">Contact admin to allocate stock to your store</p>
                  </div>
                ) : getFilteredStock().length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No products found matching your search</p>
                    <p className="text-gray-500 text-sm mt-1">Try adjusting your search terms</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getPaginatedStock().map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                                <div className="text-xs text-gray-500">{item.category_name}</div>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.product_sku}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">₹{item.purchase_price}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">₹{item.selling_price}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-mono">{item.barcode || 'N/A'}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.rack_location || 'N/A'}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {new Date(item.created_at).toLocaleDateString('en-IN', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination Controls */}
                {getFilteredStock().length > 0 && getTotalPages() > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {Math.min((currentPage - 1) * itemsPerPage + 1, getFilteredStock().length)}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, getFilteredStock().length)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">{getFilteredStock().length}</span>{' '}
                        results
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Previous Button */}
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        {/* Page Numbers */}
                        {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-2 py-1.5 text-xs font-medium rounded ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        {/* Next Button */}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === getTotalPages()}
                          className="px-2 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
          className="fixed bottom-6 right-6 z-50 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
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

export default ManagerInventory;