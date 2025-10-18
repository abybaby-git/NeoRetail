import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdvancedLoader from './components/AdvancedLoader';
import LogoutConfirmation from './components/LogoutConfirmation';
import logo from './assets/images/icon.png';

const ManagerSalePos = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // POS State
  const [products, setProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);
  const [changeAmount, setChangeAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' or 'percentage'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
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
        
        // Fetch store info and products if user has store_id
        if (userFromToken.store_id) {
          fetchStoreInfo(userFromToken.store_id);
          fetchProducts(userFromToken.store_id);
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

  // Fetch store information
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
      setStoreInfo(data.store);
    } catch (error) {
      console.error('Error fetching store info:', error);
    }
  };

  // Fetch products for POS
  const fetchProducts = async (storeId, search = '') => {
    setIsProductsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = search 
        ? `https://neoretail.onrender.com//pos/products?store_id=${storeId}&search=${encodeURIComponent(search)}`
        : `https://neoretail.onrender.com//pos/products?store_id=${storeId}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsProductsLoading(false);
    }
  };

  // Search products by barcode
  const searchByBarcode = async (barcode) => {
    if (!barcode.trim() || !user?.store_id) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://neoretail.onrender.com//pos/products/barcode/${barcode}?store_id=${user.store_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        addToCart(data.product);
        setBarcodeInput('');
      } else {
        alert('Product not found or out of stock');
      }
    } catch (error) {
      console.error('Error searching by barcode:', error);
      alert('Error searching product');
    }
  };

  // Add product to cart
  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.stock_id === product.stock_id);
      
      if (existingItem) {
        // Check if adding quantity exceeds available stock
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.available_quantity) {
          alert(`Only ${product.available_quantity} units available`);
          return prevCart;
        }
        
        return prevCart.map(item =>
          item.stock_id === product.stock_id
            ? { ...item, quantity: newQuantity, total_amount: newQuantity * item.selling_price }
            : item
        );
      } else {
        // Check if quantity exceeds available stock
        if (quantity > product.available_quantity) {
          alert(`Only ${product.available_quantity} units available`);
          return prevCart;
        }
        
        return [...prevCart, {
          ...product,
          quantity,
          total_amount: quantity * product.selling_price,
          discount: 0
        }];
      }
    });
  };

  // Remove item from cart
  const removeFromCart = (stockId) => {
    setCart(prevCart => prevCart.filter(item => item.stock_id !== stockId));
  };

  // Update cart item quantity
  const updateCartQuantity = (stockId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(stockId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.stock_id === stockId) {
          if (newQuantity > item.available_quantity) {
            alert(`Only ${item.available_quantity} units available`);
            return item;
          }
          return {
            ...item,
            quantity: newQuantity,
            total_amount: newQuantity * item.selling_price - item.discount
          };
        }
        return item;
      })
    );
  };

  // Calculate cart totals
  const getCartTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);
    const itemDiscount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
    
    // Calculate additional discount from payment modal
    let additionalDiscount = 0;
    if (discountType === 'percentage') {
      additionalDiscount = (subtotal * discountAmount) / 100;
    } else {
      additionalDiscount = discountAmount;
    }
    
    const totalDiscount = itemDiscount + additionalDiscount;
    const totalTax = 0; // Can be implemented later
    const grandTotal = subtotal - totalDiscount + totalTax;
    
    return { subtotal, itemDiscount, additionalDiscount, totalDiscount, totalTax, grandTotal };
  };

  // Show payment modal
  const showPaymentModalHandler = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    
    setPaymentReference('');
    setShowPaymentModal(true);
  };

  // Process sale with payment details
  const processSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    
    const { grandTotal } = getCartTotals();
    
    setIsProcessingSale(true);
    try {
      const { subtotal, totalDiscount, totalTax } = getCartTotals();
      
      const saleData = {
        store_id: user.store_id,
        user_id: user.user_id,
        items: cart.map(item => ({
          product_id: item.product_id,
          stock_id: item.stock_id,
          quantity: item.quantity,
          discount: item.discount || 0,
          total_amount: item.total_amount
        })),
        total_amount: subtotal,
        total_discount: totalDiscount,
        total_tax: totalTax,
        grand_total: grandTotal,
        payment_method: paymentMethod,
        payments: [{
          payment_method: paymentMethod,
          amount_paid: grandTotal, // Amount paid equals grand total
          payment_reference: paymentReference || null
        }]
      };
      
      const token = localStorage.getItem('token');
      const response = await fetch('https://neoretail.onrender.com//pos/sales', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to process sale');
      }
      
      const data = await response.json();
      setLastSale(data.sale);
      setShowReceipt(true);
      setCart([]);
      setShowPaymentModal(false);
      setShowSuccessModal(true);
      
      // Reset payment form
      setPaymentMethod('Cash');
      setPaymentReference('');
      
      // Refresh products to update stock
      fetchProducts(user.store_id, searchTerm);
      
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Failed to process sale. Please try again.');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (user?.store_id) {
      fetchProducts(user.store_id, value);
    }
  };

  // Handle barcode input
  const handleBarcodeInput = (e) => {
    setBarcodeInput(e.target.value);
  };

  // Handle barcode submit
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    searchByBarcode(barcodeInput);
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
  };


  // Close payment modal
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod('Cash');
    setPaymentReference('');
  };

  // Close success modal
  const closeSuccessModal = () => {
    setShowSuccessModal(false);
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
              <p className="text-xs text-gray-500">Sales & POS System</p>
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
            <a href="#" className="flex items-center px-4 py-3 text-gray-700 bg-green-50 border-r-2 border-green-500 rounded-lg">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Sales & POS
            </a>
            <button 
              onClick={() => navigate('/manager/inventory')}
              className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
            </button>
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
            <h2 className="text-xl font-semibold text-gray-900 ml-4 lg:ml-0">Sales & POS System</h2>
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
          {/* Store Information Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                {storeInfo ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900">{storeInfo.name}</h2>
                    <p className="text-gray-600">{storeInfo.location}</p>
                    <p className="text-sm text-gray-500 mt-1">Store ID: STR/{storeInfo.id}</p>
                  </>
                ) : user?.store_id ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900">Loading Store Information...</h2>
                    <p className="text-gray-600">Store ID: STR/{user.store_id}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900">No Store Assigned</h2>
                    <p className="text-gray-600">Contact administrator to assign a store</p>
                  </>
                )}
              </div>
              <div className="text-right">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
              </div>
              </div>
            </div>
            </div>

          {/* POS Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Search and Selection */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Product Search</h3>
          </div>

                <div className="p-6">
                  {/* Barcode Scanner */}
                  <div className="mb-6">
                    <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Scan or enter barcode..."
                          value={barcodeInput}
                          onChange={handleBarcodeInput}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                </div>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                      </button>
                    </form>
            </div>

                  {/* Product Search */}
                  <div className="mb-6">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                      <input
                        type="text"
                        placeholder="Search products by name, SKU, or barcode..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
              </div>
            </div>

                  {/* Products Grid */}
                  <div className="max-h-96 overflow-y-auto">
                    {isProductsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        <span className="ml-3 text-gray-600">Loading products...</span>
                </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                        <p className="text-gray-600 font-medium">No products found</p>
                        <p className="text-gray-500 text-sm mt-1">Try adjusting your search terms</p>
              </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {products.map((product) => (
                          <div key={product.stock_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900 text-sm">{product.product_name}</h4>
                              <span className="text-xs text-gray-500">{product.sku}</span>
            </div>
                            <p className="text-xs text-gray-600 mb-2">{product.category_name}</p>
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-lg font-bold text-green-600">₹{product.selling_price}</span>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">
                                  Remaining: <span className="font-medium text-gray-700">{product.available_quantity}</span>
                </div>
                                {product.allocated_quantity && product.total_sold !== undefined && (
                                  <div className="text-xs text-gray-400">
                                    (Allocated: {product.allocated_quantity}, Sold: {product.total_sold})
                </div>
                                )}
              </div>
            </div>
                            <button
                              onClick={() => addToCart(product)}
                              className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Add to Cart
                            </button>
          </div>
                        ))}
              </div>
                    )}
                    </div>
                    </div>
                  </div>
              </div>

            {/* Shopping Cart */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Shopping Cart</h3>
                  <p className="text-sm text-gray-600">Items: {cart.length}</p>
            </div>

                <div className="p-6">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                        </svg>
              </div>
                      <p className="text-gray-600 font-medium">Cart is empty</p>
                      <p className="text-gray-500 text-sm mt-1">Add products to get started</p>
                    </div>
                  ) : (
                    <>
                      {/* Cart Items */}
                      <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                        {cart.map((item) => (
                          <div key={item.stock_id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900 text-sm">{item.product_name}</h4>
                              <button
                                onClick={() => removeFromCart(item.stock_id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                    </div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-gray-600">₹{item.selling_price} each</span>
                              <span className="text-sm font-bold text-green-600">₹{item.total_amount}</span>
                  </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateCartQuantity(item.stock_id, item.quantity - 1)}
                                className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-300"
                              >
                                -
                              </button>
                              <span className="text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.stock_id, item.quantity + 1)}
                                className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-300"
                              >
                                +
                              </button>
              </div>
            </div>
                        ))}
          </div>

                      {/* Discount Section */}
                      <div className="border-t border-gray-200 pt-4 mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Apply Discount</h4>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDiscountType('amount')}
                              className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs ${
                                discountType === 'amount'
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              Amount
              </button>
                            <button
                              onClick={() => setDiscountType('percentage')}
                              className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs ${
                                discountType === 'percentage'
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              Percentage
              </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step={discountType === 'percentage' ? '0.01' : '0.01'}
                              min="0"
                              max={discountType === 'percentage' ? '100' : undefined}
                              value={discountAmount}
                              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                              placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter ₹'}
                            />
                            <span className="px-3 py-2 text-gray-500 bg-gray-100 rounded-lg text-sm">
                              {discountType === 'percentage' ? '%' : '₹'}
                            </span>
                          </div>
                          {discountAmount > 0 && (
                            <div className="text-xs text-green-600">
                              Discount: {discountType === 'percentage' ? `${discountAmount}%` : `₹${discountAmount.toFixed(2)}`}
                              {discountType === 'percentage' && (
                                <span className="ml-2">
                                  (₹{((getCartTotals().subtotal * discountAmount) / 100).toFixed(2)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cart Totals */}
                      <div className="border-t border-gray-200 pt-4 mb-6">
                        {(() => {
                          const { subtotal, itemDiscount, additionalDiscount, totalDiscount, totalTax, grandTotal } = getCartTotals();
                          return (
                            <>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Subtotal:</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                              </div>
                              {itemDiscount > 0 && (
                                <div className="flex justify-between text-sm mb-2">
                                  <span>Item Discount:</span>
                                  <span>-₹{itemDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              {additionalDiscount > 0 && (
                                <div className="flex justify-between text-sm mb-2">
                                  <span>Additional Discount:</span>
                                  <span>-₹{additionalDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              {totalDiscount > 0 && (
                                <div className="flex justify-between text-sm mb-2 text-green-600">
                                  <span>Total Discount:</span>
                                  <span>-₹{totalDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm mb-2">
                                <span>Tax:</span>
                                <span>₹{totalTax.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                                <span>Total:</span>
                                <span>₹{grandTotal.toFixed(2)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Checkout Button */}
                      <button
                        onClick={showPaymentModalHandler}
                        disabled={isProcessingSale}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessingSale ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          'Checkout'
                        )}
              </button>
                    </>
                  )}
                </div>
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto border border-gray-200">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                <button
                  onClick={closePaymentModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Order Summary */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
                    {(() => {
                      const { subtotal, itemDiscount, additionalDiscount, totalDiscount, totalTax, grandTotal } = getCartTotals();
                      return (
                        <>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Subtotal:</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                          </div>
                          {itemDiscount > 0 && (
                            <div className="flex justify-between text-sm mb-2">
                              <span>Item Discount:</span>
                              <span>-₹{itemDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          {additionalDiscount > 0 && (
                            <div className="flex justify-between text-sm mb-2">
                              <span>Additional Discount:</span>
                              <span>-₹{additionalDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          {totalDiscount > 0 && (
                            <div className="flex justify-between text-sm mb-2 text-green-600">
                              <span>Total Discount:</span>
                              <span>-₹{totalDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm mb-2">
                            <span>Tax:</span>
                            <span>₹{totalTax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                            <span>Total:</span>
                            <span>₹{grandTotal.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Right Column - Payment Options */}
                <div className="space-y-4">
                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Wallet'].map((method) => (
                        <button
                          key={method}
                          onClick={() => handlePaymentMethodChange(method)}
                          className={`p-2 rounded-lg border-2 transition-colors text-sm ${
                            paymentMethod === method
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-medium">{method}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Reference (for non-cash payments) */}
                  {paymentMethod !== 'Cash' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Reference
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        placeholder="Enter UPI ID, card number, or reference"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={closePaymentModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={processSale}
                      disabled={isProcessingSale}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isProcessingSale ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        'Complete Sale'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sale Completed!</h3>
              <p className="text-gray-600 mb-6">
                Transaction has been processed successfully.
              </p>
              
              {lastSale && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Sale ID:</span>
                    <span className="font-medium">#{lastSale.id}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Total Amount:</span>
                    <span className="font-medium">₹{lastSale.grand_total}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Payment Method:</span>
                    <span className="font-medium">{lastSale.payment_method}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Date:</span>
                    <span className="font-medium">
                      {new Date(lastSale.sale_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={closeSuccessModal}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerSalePos;