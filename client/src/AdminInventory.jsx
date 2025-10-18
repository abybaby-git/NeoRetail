import React, { useState, useEffect, useRef } from 'react';
import useAutoLogout from './hooks/useAutoLogout';
import Toast from './components/Toast';
import { useNavigate } from 'react-router-dom';
import logo from './assets/images/icon.png';
import AdvancedLoader from './components/AdvancedLoader';
import LogoutConfirmation from './components/LogoutConfirmation';
import { useLogout } from './components/LogoutProvider.jsx'

// Product Assignment Form Component
const ProductAssignmentForm = ({ product, purchase, onProductSelection, selectedProduct }) => {
  const [formData, setFormData] = useState({
    quantity: selectedProduct?.quantity || '',
    selling_price: selectedProduct?.selling_price || '',
    barcode: selectedProduct?.barcode || '',
    rack_location: selectedProduct?.rack_location || '',
    expiry_date: selectedProduct?.expiry_date || ''
  });

  const [errors, setErrors] = useState({});
  const [priceWarning, setPriceWarning] = useState({ show: false, purchase: null });

  // Update form data when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      setFormData({
        quantity: selectedProduct.quantity || '',
        selling_price: selectedProduct.selling_price || '',
        barcode: selectedProduct.barcode || '',
        rack_location: selectedProduct.rack_location || '',
        expiry_date: selectedProduct.expiry_date || ''
      });
    } else {
      setFormData({
        quantity: '',
        selling_price: '',
        barcode: '',
        rack_location: '',
        expiry_date: ''
      });
    }
  }, [selectedProduct]);

  const handleInputChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Real-time validation
    if (field === 'quantity') {
      const qty = parseInt(value);
      if (qty > purchase.remaining_quantity) {
        setErrors(prev => ({ ...prev, quantity: `Cannot exceed ${purchase.remaining_quantity} available` }));
      } else if (qty <= 0) {
        setErrors(prev => ({ ...prev, quantity: 'Quantity must be greater than 0' }));
      } else {
        setErrors(prev => ({ ...prev, quantity: '' }));
      }
    }

    // Check selling price against purchase price
    if (field === 'selling_price') {
      const sellingPrice = parseFloat(value);
      const purchasePrice = parseFloat(purchase.purchase_price);
      
      if (sellingPrice && purchasePrice && sellingPrice < purchasePrice) {
        setPriceWarning({ 
          show: true, 
          purchase: purchase,
          sellingPrice: sellingPrice,
          purchasePrice: purchasePrice
        });
      } else {
        setPriceWarning({ show: false, purchase: null });
      }
    }

    // Auto-select if form is valid (all mandatory fields filled)
    if (isFormValidWithData(newFormData)) {
      onProductSelection(product, purchase, newFormData.quantity, newFormData.selling_price, newFormData.barcode, newFormData.rack_location, newFormData.expiry_date);
    } else if (selectedProduct) {
      // Remove selection if form becomes invalid
      onProductSelection(product, purchase, '', '', '', '', '');
    }
  };

  const isFormValidWithData = (data) => {
    return data.quantity && 
           data.selling_price && 
           data.barcode && 
           parseInt(data.quantity) <= purchase.remaining_quantity &&
           parseInt(data.quantity) > 0 &&
           parseFloat(data.selling_price) > 0;
  };

  const isFormValid = () => {
    return formData.quantity && 
           formData.selling_price && 
           formData.barcode && 
           parseInt(formData.quantity) <= purchase.remaining_quantity &&
           parseInt(formData.quantity) > 0 &&
           parseFloat(formData.selling_price) > 0;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm">
          <span className="font-medium text-gray-700">Purchase ID: {purchase.purchase_id}</span>
          <span className="ml-2 text-gray-500">| Supplier: {purchase.seller_name}</span>
          <span className="ml-2 text-gray-500">| Purchase Price: ₹{purchase.purchase_price}</span>
          <span className="ml-2 text-green-600 font-medium">| Available: {purchase.remaining_quantity}</span>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={!!selectedProduct}
            readOnly
            className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
              isFormValid() ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            }`}
          />
          <span className={`text-sm ${isFormValid() ? 'text-gray-600' : 'text-gray-400'}`}>
            {isFormValid() ? 'Auto-selected' : 'Fill required fields'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Quantity *
            {formData.quantity && (
              <span className="ml-1 text-green-600">✓</span>
            )}
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => handleInputChange('quantity', e.target.value)}
            min="1"
            max={purchase.remaining_quantity}
            placeholder="Enter quantity"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
              errors.quantity ? 'border-red-300 focus:ring-red-500' : 
              formData.quantity ? 'border-green-300 focus:ring-green-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Selling Price (₹) *
            {formData.selling_price && (
              <span className="ml-1 text-green-600">✓</span>
            )}
          </label>
          <input
            type="number"
            value={formData.selling_price}
            onChange={(e) => handleInputChange('selling_price', e.target.value)}
            min="0"
            step="0.01"
            placeholder="Enter selling price"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
              priceWarning.show ? 'border-yellow-300 focus:ring-yellow-500' : 
              formData.selling_price ? 'border-green-300 focus:ring-green-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {priceWarning.show && (
            <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-yellow-800 font-medium">Selling price is less than purchase price</p>
                  <p className="text-yellow-700">
                    Selling: ₹{priceWarning.sellingPrice} | Purchase: ₹{priceWarning.purchasePrice}
                  </p>
                  <p className="text-yellow-700 mt-1">
                    Loss: ₹{(priceWarning.purchasePrice - priceWarning.sellingPrice).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Barcode *
            {formData.barcode && (
              <span className="ml-1 text-green-600">✓</span>
            )}
          </label>
          <input
            type="text"
            value={formData.barcode}
            onChange={(e) => handleInputChange('barcode', e.target.value)}
            placeholder="Enter barcode"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
              formData.barcode ? 'border-green-300 focus:ring-green-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Rack Location</label>
          <input
            type="text"
            value={formData.rack_location}
            onChange={(e) => handleInputChange('rack_location', e.target.value)}
            placeholder="Enter rack location"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
          <input
            type="date"
            value={formData.expiry_date}
            onChange={(e) => handleInputChange('expiry_date', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

const AdminInventory = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [saveCategoryError, setSaveCategoryError] = useState(null);
  const [categories, setCategories] = useState(['all']);
  const [categoriesData, setCategoriesData] = useState([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [editModal, setEditModal] = useState({ open: false, product: null });
  const [editFormData, setEditFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit: ''
  });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductTab, setAddProductTab] = useState('single'); // 'single' | 'bulk'
  const [addProductData, setAddProductData] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit: ''
  });
  const [bulkData, setBulkData] = useState({
    text: '',
    products: [],
    errors: []
  });
  const [productsData, setProductsData] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [showStockUpdate, setShowStockUpdate] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [newStock, setNewStock] = useState('');
  const [showAddStock, setShowAddStock] = useState(false);
  const [addStockData, setAddStockData] = useState({
    product: '',
    barcode: '',
    store: '',
    stockQuantity: '',
    stockInPrice: '',
    sellingPrice: '',
    supplier: '',
    expiryDate: '',
    batchNumber: ''
  });
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showEditSupplier, setShowEditSupplier] = useState(false);
  const [addSupplierData, setAddSupplierData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    paymentTerms: ''
  });
  const [editSupplierData, setEditSupplierData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    paymentTerms: ''
  });
  const [sellers, setSellers] = useState([]);
  const [isSellersLoading, setIsSellersLoading] = useState(false);
  const [sellersError, setSellersError] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [purchases, setPurchases] = useState([]);
  const [isPurchasesLoading, setIsPurchasesLoading] = useState(false);
  const [purchasesError, setPurchasesError] = useState(null);
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [addPurchaseData, setAddPurchaseData] = useState({
    product_id: '',
    seller_id: '',
    purchase_price: '',
    quantity: '',
    invoice_no: ''
  });
  const [stock, setStock] = useState([]);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [stockError, setStockError] = useState(null);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [storeStats, setStoreStats] = useState([]);
  const [isStoreStatsLoading, setIsStoreStatsLoading] = useState(false);
  const [storeStatsError, setStoreStatsError] = useState(null);
  const [showStockAssignment, setShowStockAssignment] = useState(false);
  const [availablePurchases, setAvailablePurchases] = useState([]);
  const [isAvailablePurchasesLoading, setIsAvailablePurchasesLoading] = useState(false);
  const [availablePurchasesError, setAvailablePurchasesError] = useState(null);
  const [stockAssignmentData, setStockAssignmentData] = useState({
    purchase_id: '',
    store_id: '',
    quantity: '',
    selling_price: '',
    barcode: '',
    rack_location: '',
    expiry_date: ''
  });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [assignmentStep, setAssignmentStep] = useState(1); // 1: Select Store, 2: Select Products, 3: Review & Submit
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [storeList, setStoreList] = useState([]);
  const [isStoresLoading, setIsStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState(null);
  const [selectedStoreDetails, setSelectedStoreDetails] = useState(null);
  const [storeStockDetails, setStoreStockDetails] = useState([]);
  const [isStoreStockLoading, setIsStoreStockLoading] = useState(false);
  const [storeStockError, setStoreStockError] = useState(null);
  const [storeStockSearchTerm, setStoreStockSearchTerm] = useState('');
  const [showNoStockModal, setShowNoStockModal] = useState(false);
  const [noStockStore, setNoStockStore] = useState(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSection, setActiveSection] = useState('inventory');
  const itemsPerPage = 10;
  
  // Stock edit functionality
  const [showEditStock, setShowEditStock] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [editStockData, setEditStockData] = useState({
    quantity: '',
    selling_price: '',
    barcode: '',
    rack_location: '',
    expiry_date: ''
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState(null);
  const [quantityValidation, setQuantityValidation] = useState({ isValid: true, message: '' });
  const dropdownRef = useRef(null);
  const { open: openLogout } = useLogout();

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

  // Fetch categories from server and populate filter options
  useEffect(() => {
    const fetchCategories = async () => {
      setIsCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const res = await fetch('http://localhost:5000/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        const rows = Array.isArray(data?.categories) ? data.categories : [];
        setCategoriesData(rows);
        const names = rows
          .map(c => c?.name)
          .filter(Boolean);
        setCategories(['all', ...Array.from(new Set(names))]);
      } catch (err) {
        setCategoriesError(err.message || 'Failed to fetch categories');
      } finally {
        setIsCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products from server
  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true);
      setProductsError(null);
      try {
        const res = await fetch('http://localhost:5000/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        const rows = Array.isArray(data?.products) ? data.products : [];
        setProductsData(rows);
      } catch (err) {
        setProductsError(err.message || 'Failed to fetch products');
      } finally {
        setIsProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch sellers data
  useEffect(() => {
    const fetchSellers = async () => {
      setIsSellersLoading(true);
      setSellersError(null);
      try {
        const res = await fetch('http://localhost:5000/sellers');
        if (!res.ok) throw new Error('Failed to fetch sellers');
        const data = await res.json();
        setSellers(data.sellers || []);
      } catch (err) {
        setSellersError(err.message || 'Failed to fetch sellers');
      } finally {
        setIsSellersLoading(false);
      }
    };

    fetchSellers();
  }, []);

  // Fetch purchases data
  useEffect(() => {
    const fetchPurchases = async () => {
      setIsPurchasesLoading(true);
      setPurchasesError(null);
      try {
        console.log('Fetching purchases from: http://localhost:5000/purchases');
        const res = await fetch('http://localhost:5000/purchases');
        console.log('Response status:', res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch purchases: ${res.status} ${errorText}`);
        }
        const data = await res.json();
        console.log('Purchases data:', data);
        setPurchases(data.purchases || []);
      } catch (err) {
        console.error('Fetch purchases error:', err);
        setPurchasesError(err.message || 'Failed to fetch purchases');
      } finally {
        setIsPurchasesLoading(false);
      }
    };

    fetchPurchases();
  }, []);

  // Fetch stores when component mounts
  useEffect(() => {
    fetchStores();
  }, []);

  // Fetch available purchases when stock section is active
  useEffect(() => {
    if (activeSection === 'stock') {
      fetchAvailablePurchases();
    }
  }, [activeSection]);

  // Fetch stock data
    const fetchStock = async () => {
      setIsStockLoading(true);
      setStockError(null);
      try {
        const res = await fetch('http://localhost:5000/stock', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        console.log('Stock response status:', res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Stock error response:', errorText);
          throw new Error(`Failed to fetch stock: ${res.status} ${errorText}`);
        }
        const data = await res.json();
        console.log('Stock data:', data);
        setStock(data.stock || []);
      } catch (err) {
        console.error('Stock fetch error:', err);
        setStockError(err.message || 'Failed to fetch stock');
      } finally {
        setIsStockLoading(false);
      }
    };

  useEffect(() => {
    fetchStock();
  }, []);

  // Fetch store statistics
  useEffect(() => {
    const fetchStoreStats = async () => {
      setIsStoreStatsLoading(true);
      setStoreStatsError(null);
      try {
        const res = await fetch('http://localhost:5000/stock/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        console.log('Store stats response status:', res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Store stats error response:', errorText);
          throw new Error(`Failed to fetch store stats: ${res.status} ${errorText}`);
        }
        const data = await res.json();
        console.log('Store stats data:', data);
        setStoreStats(data.storeStats || []);
      } catch (err) {
        console.error('Store stats fetch error:', err);
        setStoreStatsError(err.message || 'Failed to fetch store statistics');
      } finally {
        setIsStoreStatsLoading(false);
      }
    };

    fetchStoreStats();
  }, []);

  // Fetch available purchases for stock assignment
  const fetchAvailablePurchases = async () => {
    setIsAvailablePurchasesLoading(true);
    setAvailablePurchasesError(null);
    try {
      const res = await fetch('http://localhost:5000/stock/available-purchases', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Available purchases fetch error:', res.status, errorText);
        throw new Error(`Failed to fetch available purchases: ${res.status} ${errorText}`);
      }
      const data = await res.json();
      console.log('Available purchases data:', data);
      console.log('Available purchases count:', data.availablePurchases?.length || 0);
      setAvailablePurchases(data.availablePurchases || []);
    } catch (err) {
      console.error('Available purchases fetch error:', err);
      setAvailablePurchasesError(err.message || 'Failed to fetch available purchases');
    } finally {
      setIsAvailablePurchasesLoading(false);
    }
  };

  // Fetch stores for stock assignment
  const fetchStores = async () => {
    setIsStoresLoading(true);
    setStoresError(null);
    try {
      const res = await fetch('http://localhost:5000/stores', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Stores fetch error:', res.status, errorText);
        throw new Error(`Failed to fetch stores: ${res.status} ${errorText}`);
      }
      const data = await res.json();
      console.log('Stores data:', data);
      console.log('Stores count:', data.stores?.length || 0);
      setStoreList(data.stores || []);
    } catch (err) {
      console.error('Stores fetch error:', err);
      setStoresError(err.message || 'Failed to fetch stores');
    } finally {
      setIsStoresLoading(false);
    }
  };


  // Handle store card click
  const handleStoreClick = async (store) => {
    // Validate store ID
    if (!store || !store.store_id) {
      console.error('Invalid store data:', store);
      return;
    }

    setSelectedStoreDetails(store);
    setStoreStockSearchTerm(''); // Reset search when opening modal
    
    // Fetch stock details and only show modal if there's stock
    try {
      setIsStoreStockLoading(true);
      setStoreStockError(null);
      
      const res = await fetch(`http://localhost:5000/stock?store_id=${store.store_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Store stock fetch error:', res.status, errorText);
        throw new Error(`Failed to fetch store stock: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Store stock data for store_id', store.store_id, ':', data);
      console.log('Stock items count:', data.stock?.length || 0);
      const stockData = data.stock || [];
      
      // Only show modal if there's stock allocated to this store
      if (stockData.length > 0) {
        setStoreStockDetails(stockData);
      } else {
        // Don't show modal if no stock is allocated
        setSelectedStoreDetails(null);
        // Show no stock modal instead of alert
        setNoStockStore(store);
        setShowNoStockModal(true);
      }
    } catch (err) {
      console.error('Store stock fetch error:', err);
      setStoreStockError(err.message || 'Failed to fetch store stock details');
      setSelectedStoreDetails(null);
    } finally {
      setIsStoreStockLoading(false);
    }
  };

  // Filter store stock details based on search term
  const getFilteredStoreStockDetails = () => {
    if (!storeStockSearchTerm.trim()) {
      return storeStockDetails;
    }
    
    const searchTerm = storeStockSearchTerm.toLowerCase();
    return storeStockDetails.filter(stock => 
      stock.product_name?.toLowerCase().includes(searchTerm) ||
      stock.product_sku?.toLowerCase().includes(searchTerm) ||
      stock.barcode?.toLowerCase().includes(searchTerm) ||
      stock.rack_location?.toLowerCase().includes(searchTerm)
    );
  };

  // Calculate total stock value across all stores
  const getTotalStockValue = () => {
    if (!storeStats || storeStats.length === 0) return 0;
    return storeStats.reduce((total, store) => {
      return total + (parseFloat(store.stock_value) || 0);
    }, 0);
  };

  // Calculate stores with stock (stores that have stock_value > 0)
  const getStoresWithStock = () => {
    if (!storeStats || storeStats.length === 0) return { withStock: 0, total: 0 };
    const withStock = storeStats.filter(store => (parseFloat(store.stock_value) || 0) > 0).length;
    return { withStock, total: storeStats.length };
  };

  // Calculate empty stock items (products with 0 quantity)
  const getEmptyStockItems = () => {
    if (!storeStats || storeStats.length === 0) return 0;
    return storeStats.reduce((total, store) => {
      return total + (parseInt(store.out_of_stock) || 0);
    }, 0);
  };

  // Handle redirect to stock allocation
  const handleRedirectToStockAssignment = () => {
    setShowNoStockModal(false);
    setNoStockStore(null);
    setActiveSection('stock');
    // Scroll to the stock assignment section
    setTimeout(() => {
      const stockSection = document.querySelector('[data-section="stock"]');
      if (stockSection) {
        stockSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Fetch max available quantity for a product
  const fetchAvailableQuantity = async (stockItem) => {
    if (!stockItem.product_id) {
      setAvailableQuantity(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // Get total purchased quantity for this product
      const purchaseResponse = await fetch(`http://localhost:5000/purchases?product_id=${stockItem.product_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (purchaseResponse.ok) {
        const purchaseData = await purchaseResponse.json();
        const totalPurchased = purchaseData.purchases?.reduce((sum, purchase) => sum + parseFloat(purchase.quantity), 0) || 0;

        // Get total allocated quantity for this product
        const stockResponse = await fetch(`http://localhost:5000/stock?product_id=${stockItem.product_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          const totalAllocated = stockData.stock?.reduce((sum, stock) => sum + parseFloat(stock.quantity), 0) || 0;
          const currentQuantity = parseFloat(stockItem.quantity || 0);
          const maxAvailable = totalPurchased - (totalAllocated - currentQuantity);
          
          setAvailableQuantity(maxAvailable);
        } else {
          setAvailableQuantity(null);
        }
      } else {
        setAvailableQuantity(null);
      }
    } catch (error) {
      console.error('Error fetching available quantity:', error);
      setAvailableQuantity(null);
    }
  };

  // Handle stock item edit
  const handleEditStock = async (stockItem) => {
    setSelectedStockItem(stockItem);
    setEditStockData({
      quantity: stockItem.quantity || '',
      selling_price: stockItem.selling_price || '',
      barcode: stockItem.barcode || '',
      rack_location: stockItem.rack_location || '',
      expiry_date: stockItem.expiry_date || ''
    });
    setQuantityValidation({ isValid: true, message: '' });
    setShowEditStock(true);
    
    // Fetch available quantity
    await fetchAvailableQuantity(stockItem);
  };

  // Validate quantity input
  const validateQuantity = (newQuantity) => {
    if (!newQuantity || newQuantity === '') {
      setQuantityValidation({ isValid: false, message: 'Quantity is required' });
      return false;
    }

    const quantity = parseFloat(newQuantity);
    const currentQuantity = parseFloat(selectedStockItem?.quantity || 0);
    const quantityDifference = quantity - currentQuantity;

    // If quantity is being increased, check against available quantity
    if (quantityDifference > 0 && availableQuantity !== null) {
      if (quantity > availableQuantity) {
        setQuantityValidation({ 
          isValid: false, 
          message: `Quantity exceeds the max stock. Max available quantity: ${availableQuantity}` 
        });
        return false;
      }
    }

    if (quantity < 0) {
      setQuantityValidation({ isValid: false, message: 'Quantity cannot be negative' });
      return false;
    }

    setQuantityValidation({ isValid: true, message: '' });
    return true;
  };

  // Handle quantity input change
  const handleQuantityChange = (value) => {
    setEditStockData(prev => ({ ...prev, quantity: value }));
    validateQuantity(value);
  };

  // Handle stock item update
  const handleUpdateStockItem = async () => {
    if (!selectedStockItem) return;

    setIsUpdatingStock(true);
    try {
      const token = localStorage.getItem('token');
      
      // Prepare the update data with all required fields from the existing stock item
      const updateData = {
        product_id: selectedStockItem.product_id,
        store_id: selectedStockItem.store_id,
        seller_id: selectedStockItem.seller_id,
        purchase_id: selectedStockItem.purchase_id,
        quantity: editStockData.quantity,
        selling_price: editStockData.selling_price,
        barcode: editStockData.barcode,
        rack_location: editStockData.rack_location,
        expiry_date: editStockData.expiry_date
      };

      const response = await fetch(`http://localhost:5000/stock/${selectedStockItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update stock');
      }

      setToast({
        visible: true,
        message: 'Stock updated successfully',
        type: 'success'
      });

      // Refresh stock data
      fetchStock();
      
      // Close modal
      setShowEditStock(false);
      setSelectedStockItem(null);
    } catch (error) {
      console.error('Error updating stock:', error);
      setToast({
        visible: true,
        message: error.message || 'Failed to update stock',
        type: 'error'
      });
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Close edit stock modal
  const closeEditStockModal = () => {
    setShowEditStock(false);
    setSelectedStockItem(null);
    setEditStockData({
      quantity: '',
      selling_price: '',
      barcode: '',
      rack_location: '',
      expiry_date: ''
    });
    setAvailableQuantity(null);
    setQuantityValidation({ isValid: true, message: '' });
  };

  // Group available purchases by product
  const getProductsWithRemainingStock = () => {
    const productMap = new Map();
    
    availablePurchases.forEach(purchase => {
      const key = `${purchase.product_id}-${purchase.product_name}`;
      if (!productMap.has(key)) {
        productMap.set(key, {
          product_id: purchase.product_id,
          product_name: purchase.product_name,
          product_sku: purchase.product_sku,
          total_remaining: 0,
          purchases: []
        });
      }
      
      const product = productMap.get(key);
      product.total_remaining += purchase.remaining_quantity;
      product.purchases.push(purchase);
    });
    
    return Array.from(productMap.values());
  };

  // Filter products based on search term
  const getFilteredProducts = () => {
    const products = getProductsWithRemainingStock();
    
    if (!productSearchTerm.trim()) {
      return products;
    }
    
    const searchLower = productSearchTerm.toLowerCase();
    return products.filter(product => 
      product.product_name.toLowerCase().includes(searchLower) ||
      product.product_sku.toLowerCase().includes(searchLower) ||
      product.purchases.some(purchase => 
        purchase.seller_name.toLowerCase().includes(searchLower) ||
        purchase.purchase_id.toString().includes(searchLower)
      )
    );
  };

  // Handle product selection
  const handleProductSelection = (product, purchase, quantity, sellingPrice, barcode, rackLocation, expiryDate) => {
    const existingIndex = selectedProducts.findIndex(
      item => item.purchase_id === purchase.purchase_id
    );
    
    const newItem = {
      purchase_id: purchase.purchase_id,
      product_id: product.product_id,
      product_name: product.product_name,
      product_sku: product.product_sku,
      seller_name: purchase.seller_name,
      purchase_price: purchase.purchase_price,
      quantity: parseInt(quantity),
      selling_price: parseFloat(sellingPrice),
      barcode: barcode,
      rack_location: rackLocation,
      expiry_date: expiryDate,
      remaining_quantity: purchase.remaining_quantity
    };
    
    if (existingIndex >= 0) {
      const updated = [...selectedProducts];
      updated[existingIndex] = newItem;
      setSelectedProducts(updated);
    } else {
      setSelectedProducts([...selectedProducts, newItem]);
    }
  };

  // Remove product from selection
  const removeProductFromSelection = (purchaseId) => {
    setSelectedProducts(selectedProducts.filter(item => item.purchase_id !== purchaseId));
  };

  // Handle stock assignment
  const handleStockAssignment = async (e) => {
    e.preventDefault();
    
    if (selectedProducts.length === 0) {
      setToast({
        visible: true,
        message: 'Please select at least one product to assign',
        type: 'error'
      });
      return;
    }

    try {
      // Process each selected product
      const assignments = selectedProducts.map(item => ({
        purchase_id: item.purchase_id,
        store_id: stockAssignmentData.store_id,
        quantity: item.quantity,
        selling_price: item.selling_price,
        barcode: item.barcode,
        rack_location: item.rack_location
      }));

      // Submit all assignments
      const promises = assignments.map(assignment => 
        fetch('http://localhost:5000/stock/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(assignment)
        })
      );

      const results = await Promise.all(promises);
      
      // Check if all assignments were successful
      const failedAssignments = results.filter(res => !res.ok);
      if (failedAssignments.length > 0) {
        throw new Error('Some stock assignments failed');
      }

      setToast({
        visible: true,
        message: `Successfully assigned ${selectedProducts.length} product(s) to store`,
        type: 'success'
      });

      // Reset form
      setStockAssignmentData({
        purchase_id: '',
        store_id: '',
        quantity: '',
        selling_price: '',
        barcode: '',
        rack_location: '',
        expiry_date: ''
      });
      setSelectedProducts([]);
      setAssignmentStep(1);

      // Close modal
      setShowStockAssignment(false);

      // Refresh data
      fetchStock();
      fetchAvailablePurchases();

    } catch (err) {
      console.error('Stock assignment error:', err);
      setToast({
        visible: true,
        message: err.message || 'Failed to assign stock',
        type: 'error'
      });
    }
  };

  const formatDateDDMMYYYY = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'Nil';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCardBgColor = (index) => {
    const colors = [
      'bg-blue-50',
      'bg-green-50', 
      'bg-purple-50',
      'bg-orange-50',
      'bg-pink-50',
      'bg-indigo-50',
      'bg-cyan-50',
      'bg-amber-50'
    ];
    return colors[index % colors.length];
  };

  const getValueColor = (index) => {
    const colors = [
      'text-blue-600',
      'text-green-600',
      'text-purple-600', 
      'text-orange-600',
      'text-pink-600',
      'text-indigo-600',
      'text-cyan-600',
      'text-amber-600'
    ];
    return colors[index % colors.length];
  };

  const handleDeleteCategory = async (categoryId) => {
    const cat = categoriesData.find(c => c.id === categoryId);
    const catName = cat?.name || 'this category';
    try {
      const res = await fetch(`http://localhost:5000/categories/${categoryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      if (selectedCategory === catName) setSelectedCategory('all');
      // refresh categories
      const res2 = await fetch('http://localhost:5000/categories');
      if (res2.ok) {
        const data = await res2.json();
        const rows = Array.isArray(data?.categories) ? data.categories : [];
        setCategoriesData(rows);
        const names = rows.map(c => c?.name).filter(Boolean);
        setCategories(['all', ...Array.from(new Set(names))]);
      }
      setToast({ visible: true, message: `Deleted ${catName}`, type: 'success' });
    } catch (err) {
      setToast({ visible: true, message: err.message || 'Failed to delete category', type: 'error' });
    }
  };

  const openDeleteCategoryModal = (categoryId) => {
    const cat = categoriesData.find(c => c.id === categoryId);
    setDeleteModal({ open: true, id: categoryId, name: cat?.name || '' });
  };

  const confirmDeleteCategory = async () => {
    if (!deleteModal.id) return;
    const id = deleteModal.id;
    setDeleteModal({ open: false, id: null, name: '' });
    await handleDeleteCategory(id);
  };

  const openEditModal = (product) => {
    // Find the original product data from productsData
    const originalProduct = productsData.find(p => p.id === product.id);
    if (originalProduct) {
      setEditFormData({
        name: originalProduct.name,
        sku: originalProduct.sku,
        // Store as string for <select> value matching
        category_id: originalProduct.category_id ? String(originalProduct.category_id) : '',
        unit: originalProduct.unit || ''
      });
      setEditModal({ open: true, product: originalProduct });
    }
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateProduct = async () => {
    if (!editModal.product) return;
    
    try {
      const payload = {
        name: editFormData.name,
        sku: editFormData.sku,
        category_id: editFormData.category_id ? Number(editFormData.category_id) : null,
        unit: editFormData.unit || null,
      };

      const res = await fetch(`http://localhost:5000/products/${editModal.product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to update product');
      
      // Refresh products data
      const res2 = await fetch('http://localhost:5000/products');
      if (res2.ok) {
        const data = await res2.json();
        setProductsData(data.products || []);
      }
      
      setEditModal({ open: false, product: null });
      setToast({ visible: true, message: 'Product updated successfully', type: 'success' });
    } catch (err) {
      setToast({ visible: true, message: err.message || 'Failed to update product', type: 'error' });
    }
  };

  const openAddProductModal = () => {
    setAddProductTab('single');
    setAddProductData({ name: '', sku: '', category_id: '', unit: '' });
    setBulkData({ text: '', products: [], errors: [] });
    setShowAddProduct(true);
  };

  const handleAddInputChange = (field, value) => {
    setAddProductData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddProduct = async () => {
    if (!addProductData.name.trim() || !addProductData.sku.trim()) {
      setToast({ visible: true, message: 'Name and SKU are required', type: 'error' });
      return;
    }

    try {
      const payload = {
        name: addProductData.name.trim(),
        sku: addProductData.sku.trim(),
        category_id: addProductData.category_id ? Number(addProductData.category_id) : null,
        unit: addProductData.unit.trim() || null,
      };

      const res = await fetch('http://localhost:5000/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create product');
      }
      
      // Refresh products data
      const res2 = await fetch('http://localhost:5000/products');
      if (res2.ok) {
        const data = await res2.json();
        setProductsData(data.products || []);
      }
      
      setShowAddProduct(false);
      setToast({ visible: true, message: 'Product added successfully', type: 'success' });
    } catch (err) {
      setToast({ visible: true, message: err.message || 'Failed to add product', type: 'error' });
    }
  };

  const handleBulkTextChange = (text) => {
    setBulkData(prev => ({ ...prev, text }));
    
    // Parse the text into products
    const lines = text.split('\n').filter(line => line.trim());
    const products = [];
    const errors = [];
    
    lines.forEach((line, index) => {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length < 2) {
        errors.push(`Line ${index + 1}: Must have at least name and SKU`);
        return;
      }
      
      const [name, sku, categoryName, unit] = parts;
      if (!name || !sku) {
        errors.push(`Line ${index + 1}: Name and SKU are required`);
        return;
      }
      
      // Find category by name
      let category_id = null;
      if (categoryName) {
        const category = categoriesData.find(c => 
          c.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (category) {
          category_id = category.id;
        } else {
          errors.push(`Line ${index + 1}: Category "${categoryName}" not found`);
        }
      }
      
      products.push({
        name,
        sku,
        category_id,
        unit: unit || null
      });
    });
    
    setBulkData(prev => ({ ...prev, products, errors }));
  };

  const handleBulkAddProducts = async () => {
    if (bulkData.products.length === 0) {
      setToast({ visible: true, message: 'No valid products to add', type: 'error' });
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Add products one by one
      for (const product of bulkData.products) {
        try {
          const res = await fetch('http://localhost:5000/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
          });
          
          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }
      
      // Refresh products data
      const res2 = await fetch('http://localhost:5000/products');
      if (res2.ok) {
        const data = await res2.json();
        setProductsData(data.products || []);
      }
      
      setShowAddProduct(false);
      setToast({ 
        visible: true, 
        message: `Bulk add completed: ${successCount} successful, ${errorCount} failed`, 
        type: successCount > 0 ? 'success' : 'error' 
      });
    } catch (err) {
      setToast({ visible: true, message: 'Failed to add products', type: 'error' });
    }
  };

  // Auto-logout shared hook (30 minutes of actual inactivity)
  useAutoLogout({
    enabled: !!user,
    decodeToken,
    onLogout: openLogout,
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  });

  const handleLogout = () => {
    openLogout();
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

  // Transform products data for display
  const inventoryData = productsData.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category_name || 'Uncategorized',
    sku: product.sku,
    description: product.unit ? `Unit: ${product.unit}` : 'No unit specified',
    lastUpdated: formatDateDDMMYYYY(product.updated_at)
  }));

  const refreshCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      const rows = Array.isArray(data?.categories) ? data.categories : [];
      setCategoriesData(rows);
      const names = rows.map(c => c?.name).filter(Boolean);
      setCategories(['all', ...Array.from(new Set(names))]);
    } catch (err) {
      // silent; UI already has error state for initial load
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    const description = newCategoryDesc.trim() || null;
    if (!name) {
      setSaveCategoryError('Please provide a Category Name');
      return;
    }
    setIsSavingCategory(true);
    setSaveCategoryError(null);
    try {
      const res = await fetch('http://localhost:5000/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      if (!res.ok) throw new Error('Failed to create category');
      await res.json();
      await refreshCategories();
      setShowAddCategory(false);
      setNewCategory('');
      setNewCategoryDesc('');
    } catch (err) {
      setSaveCategoryError(err.message || 'Failed to create category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleStockUpdate = (product) => {
    setSelectedProduct(product);
    setSelectedStore('');
    setNewStock('');
    setShowStockUpdate(true);
  };

  const handleUpdateStock = () => {
    if (selectedProduct && selectedStore && newStock !== '') {
      // Here you would typically make an API call to update stock
      console.log(`Updating stock for ${selectedProduct.name} in ${selectedStore} to ${newStock}`);
      setShowStockUpdate(false);
      setSelectedProduct(null);
      setSelectedStore('');
      setNewStock('');
    }
  };

  const handleAddStock = () => {
    if (addStockData.product && addStockData.barcode && addStockData.store && addStockData.stockQuantity && addStockData.stockInPrice && addStockData.sellingPrice && addStockData.supplier) {
      // Here you would typically make an API call to add new stock
      console.log('Adding new stock:', addStockData);
      
      // Close modal and reset form
      setShowAddStock(false);
      setAddStockData({
        product: '',
        barcode: '',
        store: '',
        stockQuantity: '',
        stockInPrice: '',
        sellingPrice: '',
        supplier: '',
        expiryDate: '',
        batchNumber: ''
      });
    }
  };

  const handleAddStockInputChange = (field, value) => {
    setAddStockData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSupplier = async () => {
    if (!addSupplierData.name.trim()) {
      setToast({ visible: true, message: 'Company name is required', type: 'error' });
      return;
    }

    try {
      const payload = {
        company_name: addSupplierData.name.trim(),
        contact_person: addSupplierData.contactPerson.trim() || null,
        email: addSupplierData.email.trim() || null,
        phone: addSupplierData.phone.trim() || null,
        address: addSupplierData.address.trim() || null,
        city: addSupplierData.city.trim() || null,
        state: addSupplierData.state.trim() || null,
        pincode: addSupplierData.pincode.trim() || null,
        gst_number: addSupplierData.gstNumber.trim() || null,
        payment_terms: addSupplierData.paymentTerms.trim() || null,
      };

      const res = await fetch('http://localhost:5000/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create seller');
      }
      
      // Refresh sellers data
      const res2 = await fetch('http://localhost:5000/sellers');
      if (res2.ok) {
        const data = await res2.json();
        setSellers(data.sellers || []);
      }
      

      // Close modal and reset form
      setShowAddSupplier(false);
      setAddSupplierData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gstNumber: '',
        paymentTerms: ''
      });
      setToast({ visible: true, message: 'Seller added successfully', type: 'success' });
    } catch (err) {
      setToast({ visible: true, message: err.message || 'Failed to add seller', type: 'error' });
    }
  };

  const handleAddSupplierInputChange = (field, value) => {
    setAddSupplierData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const openEditSupplierModal = (supplier) => {
    setEditSupplierData({
      name: supplier.company_name || '',
      contactPerson: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      pincode: supplier.pincode || '',
      gstNumber: supplier.gst_number || '',
      paymentTerms: supplier.payment_terms || ''
    });
    setShowEditSupplier(true);
  };

  const handleEditSupplierInputChange = (field, value) => {
    setEditSupplierData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateSupplier = async () => {
    if (!editSupplierData.name.trim()) {
      setToast({ visible: true, message: 'Company name is required', type: 'error' });
      return;
    }

    if (!selectedSupplier) {
      setToast({ visible: true, message: 'No supplier selected', type: 'error' });
      return;
    }

    try {
      const payload = {
        company_name: editSupplierData.name.trim(),
        contact_person: editSupplierData.contactPerson.trim() || null,
        email: editSupplierData.email.trim() || null,
        phone: editSupplierData.phone.trim() || null,
        address: editSupplierData.address.trim() || null,
        city: editSupplierData.city.trim() || null,
        state: editSupplierData.state.trim() || null,
        pincode: editSupplierData.pincode.trim() || null,
        gst_number: editSupplierData.gstNumber.trim() || null,
        payment_terms: editSupplierData.paymentTerms.trim() || null,
      };

      const res = await fetch(`http://localhost:5000/sellers/${selectedSupplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update seller');
      }
      
      // Refresh sellers data
      const res2 = await fetch('http://localhost:5000/sellers');
      if (res2.ok) {
        const data = await res2.json();
        setSellers(data.sellers || []);
      }
      
      setShowEditSupplier(false);
      setShowSupplierDetails(false);
      setToast({ visible: true, message: 'Seller updated successfully', type: 'success' });
    } catch (err) {
      setToast({ visible: true, message: err.message || 'Failed to update seller', type: 'error' });
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    try {
      const res = await fetch(`http://localhost:5000/sellers/${supplierId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete seller');
      }
      
      // Refresh sellers data
      const res2 = await fetch('http://localhost:5000/sellers');
      if (res2.ok) {
        const data = await res2.json();
        setSellers(data.sellers || []);
      }
      
    setSupplierToDelete(null);
    if (selectedSupplier && selectedSupplier.id === supplierId) {
      setShowSupplierDetails(false);
      setSelectedSupplier(null);
      }
      setToast({ visible: true, message: 'Seller deleted successfully', type: 'success' });
    } catch (err) {
      setToast({ visible: true, message: err.message || 'Failed to delete seller', type: 'error' });
    }
  };

  // Filter suppliers based on search term
  const filteredSellers = sellers.filter(seller => {
    if (!supplierSearchTerm.trim()) return true;
    
    const searchLower = supplierSearchTerm.toLowerCase();
    return (
      seller.company_name?.toLowerCase().includes(searchLower) ||
      seller.contact_person?.toLowerCase().includes(searchLower) ||
      seller.email?.toLowerCase().includes(searchLower) ||
      seller.phone?.toLowerCase().includes(searchLower) ||
      seller.city?.toLowerCase().includes(searchLower) ||
      seller.state?.toLowerCase().includes(searchLower) ||
      seller.gst_number?.toLowerCase().includes(searchLower)
    );
  });

  // Filter purchases based on search term
  const filteredPurchases = purchases.filter(purchase => {
    if (!purchaseSearchTerm.trim()) return true;
    
    const searchLower = purchaseSearchTerm.toLowerCase();
    return (
      purchase.invoice_no?.toLowerCase().includes(searchLower) ||
      purchase.product_name?.toLowerCase().includes(searchLower) ||
      purchase.product_sku?.toLowerCase().includes(searchLower) ||
      purchase.seller_name?.toLowerCase().includes(searchLower) ||
      purchase.seller_contact?.toLowerCase().includes(searchLower) ||
      purchase.purchase_price?.toString().includes(searchLower) ||
      purchase.quantity?.toString().includes(searchLower)
    );
  });

  // Filter stock based on search term
  const filteredStock = stock.filter(stockItem => {
    if (!stockSearchTerm.trim()) return true;
    
    const searchLower = stockSearchTerm.toLowerCase();
    return (
      stockItem.barcode?.toLowerCase().includes(searchLower) ||
      stockItem.product_name?.toLowerCase().includes(searchLower) ||
      stockItem.product_sku?.toLowerCase().includes(searchLower) ||
      stockItem.category_name?.toLowerCase().includes(searchLower) ||
      stockItem.store_name?.toLowerCase().includes(searchLower) ||
      stockItem.seller_name?.toLowerCase().includes(searchLower) ||
      stockItem.rack_location?.toLowerCase().includes(searchLower) ||
      stockItem.selling_price?.toString().includes(searchLower) ||
      stockItem.quantity?.toString().includes(searchLower)
    );
  });

  // Filter categories based on search term
  const filteredCategories = categoriesData.filter(category => {
    if (!categorySearchTerm.trim()) return true;
    
    const searchLower = categorySearchTerm.toLowerCase();
    return (
      category.name?.toLowerCase().includes(searchLower) ||
      category.description?.toLowerCase().includes(searchLower) ||
      category.category_no?.toString().includes(searchLower)
    );
  });

  // Add Purchase Modal Functions
  const openAddPurchaseModal = () => {
    setAddPurchaseData({
      product_id: '',
      seller_id: '',
      purchase_price: '',
      quantity: '',
      invoice_no: ''
    });
    setShowAddPurchase(true);
  };

  const handleAddPurchaseInputChange = (e) => {
    const { name, value } = e.target;
    setAddPurchaseData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(addPurchaseData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create purchase');
      }

      const result = await response.json();
      setToast({ visible: true, message: 'Purchase created successfully!', type: 'success' });
      setShowAddPurchase(false);
      
      // Refresh purchases list
      fetchPurchases();
      
    } catch (err) {
      setToast({ visible: true, message: err.message || 'Failed to create purchase', type: 'error' });
    }
  };


  const filteredInventory = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredInventory.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };


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
            <button 
              onClick={() => setActiveSection('inventory')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'inventory' 
                  ? 'text-gray-700 bg-blue-50 border-r-2 border-blue-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
            </button>
            <button 
              onClick={() => setActiveSection('supplier')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'supplier' 
                  ? 'text-gray-700 bg-blue-50 border-r-2 border-blue-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Supplier Details
            </button>
            <button 
              onClick={() => setActiveSection('stock')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'stock' 
                  ? 'text-gray-700 bg-blue-50 border-r-2 border-blue-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Stock
            </button>
            <button 
              onClick={() => setActiveSection('purchases')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'purchases' 
                  ? 'text-gray-700 bg-blue-50 border-r-2 border-blue-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              Purchases
            </button>
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
              {activeSection === 'inventory' && 'Product Inventory Management'}
              {activeSection === 'supplier' && 'Supplier Details'}
              {activeSection === 'stock' && 'Stock Information'}
              {activeSection === 'purchases' && 'Purchase Management'}
            </h2>
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
          {activeSection === 'inventory' && (
            <>
              {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">1,247</p>
                  <p className="text-sm text-green-600">+23 this week</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-900">23</p>
                  <p className="text-sm text-yellow-600">Needs attention</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
                  <p className="text-sm text-red-600">Urgent restock</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">Rs. 45,67,800</p>
                  <p className="text-sm text-green-600">+5.2% this month</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Category</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowManageCategories(v => !v)}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-800 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span>Manage</span>
                    </button>
                    {showManageCategories && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <div className="p-2 max-h-64 overflow-auto">
                          {categoriesData.length === 0 && (
                            <div className="text-sm text-gray-600 px-2 py-1">No categories</div>
                          )}
                          {categoriesData.map(c => (
                            <div key={c.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded">
                              <span className="text-sm text-gray-800 truncate">{c.name}</span>
                              <button
                                onClick={() => openDeleteCategoryModal(c.id)}
                                title="Delete"
                                className="text-red-600 hover:text-red-700 p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                  </button>
                </div>
                          ))}
              </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
               <button 
                 onClick={openAddProductModal}
                 className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
               >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Product Inventory List</h3>
            <p className="text-sm text-gray-600">Manage your store's product catalog and basic inventory</p>
            {isProductsLoading && (
              <div className="text-sm text-blue-600 mt-2">Loading products...</div>
            )}
            {productsError && (
              <div className="text-sm text-red-600 mt-2">{productsError}</div>
            )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.length === 0 && !isProductsLoading && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        {productsError ? 'Failed to load products' : 'No products found'}
                      </td>
                    </tr>
                  )}
                  {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-mono">{item.sku}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{item.description || 'No description available'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.lastUpdated}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditModal(item)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredInventory.length)} of {filteredInventory.length} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>



          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Add Product</span>
              </button>
              
              <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Bulk Import</span>
              </button>
              
              <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Inventory Report</span>
              </button>
              
              <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                <svg className="w-8 h-8 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Low Stock Alert</span>
              </button>
            </div>
          </div>
            </>
          )}

          {activeSection === 'supplier' && (
            <div className="space-y-6">
              {/* Supplier Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Supplier Information</h3>
                    <p className="text-sm text-gray-600">Manage your product suppliers and vendors</p>
                  </div>
                  <button 
                    onClick={() => setShowAddSupplier(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Supplier</span>
                  </button>
                </div>
                
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search suppliers by company name, contact person, email, phone, city, state, or GST number..."
                      value={supplierSearchTerm}
                      onChange={(e) => setSupplierSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {supplierSearchTerm && (
                      <button
                        onClick={() => setSupplierSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {supplierSearchTerm && (
                    <div className="mt-2 text-sm text-gray-600">
                      Showing {filteredSellers.length} of {sellers.length} suppliers
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {isSellersLoading && (
                    <div className="col-span-full text-center py-8">
                      <div className="text-blue-600">Loading sellers...</div>
                    </div>
                  )}
                  {sellersError && (
                    <div className="col-span-full text-center py-8">
                      <div className="text-red-600">{sellersError}</div>
                    </div>
                  )}
                  {filteredSellers.length === 0 && !isSellersLoading && !sellersError && (
                    <div className="col-span-full text-center py-8">
                      <div className="text-gray-500">
                        {supplierSearchTerm ? 'No suppliers found matching your search' : 'No sellers found'}
                      </div>
                    </div>
                  )}
                  {filteredSellers.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSupplier(s); setShowSupplierDetails(true); }}
                      className={`text-left rounded-lg p-4 transition-colors border bg-blue-50 border-blue-100 hover:bg-blue-100`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium text-blue-700`}>{s.company_name}</p>
                          <p className="text-xs text-gray-600">Contact: {s.contact_person || 'N/A'}</p>
                          <p className="text-xs text-gray-600">Phone: {s.phone || 'N/A'}</p>
                          <p className="text-xs text-gray-600">Email: {s.email || 'N/A'}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100`}>
                          <svg className={`w-5 h-5 text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeSection === 'stock' && (
            <div className="space-y-6">
              {/* Stock Management Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Stock Management</h3>
                    <p className="text-sm text-gray-600">Track stock levels across all stores</p>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>View Stock Details</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Stock Value</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {isStoreStatsLoading ? 'Loading...' : formatCurrency(getTotalStockValue())}
                        </p>
                        <p className="text-sm text-green-600">Across all stores</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Stores with Stock</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {isStoreStatsLoading ? 'Loading...' : `${getStoresWithStock().withStock}/${getStoresWithStock().total}`}
                        </p>
                        <p className="text-sm text-gray-600">Active inventory</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">Empty Stock Items</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {isStoreStatsLoading ? 'Loading...' : getEmptyStockItems()}
                        </p>
                        <p className="text-sm text-red-600">Need restocking</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Store-wise Stock Breakdown */}
              <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Store-wise Stock Distribution</h3>
                    <p className="text-sm text-gray-600">Stock levels across individual stores</p>
                </div>
                
                 {isStoreStatsLoading && (
                   <div className="text-center py-8">
                     <div className="text-blue-600">Loading store statistics...</div>
                    </div>
                 )}

                 {storeStatsError && (
                   <div className="text-center py-8">
                     <div className="text-red-600">{storeStatsError}</div>
                      </div>
                 )}

                 {!isStoreStatsLoading && !storeStatsError && storeStats.length === 0 && (
                   <div className="text-center py-8">
                     <div className="text-gray-500">No stores found</div>
                      </div>
                 )}

                 {!isStoreStatsLoading && !storeStatsError && storeStats.length > 0 && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {storeStats.map((store, index) => (
                       <div 
                         key={store.store_id} 
                         className={`${getCardBgColor(index)} rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105`}
                         onClick={() => handleStoreClick(store)}
                       >
                    <div className="flex items-center justify-between mb-3">
                           <h4 className="font-medium text-gray-900">{store.store_name}</h4>
                           <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(store.status)}`}>
                             {store.status || 'Unknown'}
                           </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Products:</span>
                             <span className="font-medium">{store.total_products}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">In Stock:</span>
                             <span className="font-medium text-green-600">{store.in_stock}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Low Stock:</span>
                             <span className="font-medium text-yellow-600">{store.low_stock}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Out of Stock:</span>
                             <span className="font-medium text-red-600">{store.out_of_stock}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-600">Stock Value:</span>
                             <span className={getValueColor(index)}>{formatCurrency(store.stock_value)}</span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500 text-center">
                          {store.stock_value && parseFloat(store.stock_value) > 0 ? 
                            'Click to view stock details' : 
                            'No stock allocated - Click to assign stock'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                     ))}
                    </div>
                 )}

                 {/* Store Stock Details Modal */}
                 {selectedStoreDetails && storeStockDetails.length > 0 && (
                   <div className="fixed inset-0 z-50 flex items-center justify-center">
                     <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
                       <div className="p-6 border-b border-gray-200">
                         <div className="flex items-center justify-between">
                           <div>
                             <h3 className="text-xl font-semibold text-gray-900">
                               {selectedStoreDetails.store_name} - Stock Details
                             </h3>
                             <p className="text-sm text-gray-600">
                               Allocated products with quantities and pricing
                             </p>
                           </div>
                           <button
                             onClick={() => setSelectedStoreDetails(null)}
                             className="text-gray-400 hover:text-gray-600 transition-colors"
                           >
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                             </svg>
                           </button>
                         </div>
                      </div>

                       <div className="p-6">
                         {/* Search Bar */}
                         <div className="mb-6">
                           <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                               <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                               </svg>
                             </div>
                             <input
                               type="text"
                               placeholder="Search products by name, SKU, barcode, or rack location..."
                               value={storeStockSearchTerm}
                               onChange={(e) => setStoreStockSearchTerm(e.target.value)}
                               className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                             />
                           </div>
                         </div>
                         {isStoreStockLoading && (
                           <div className="text-center py-8">
                             <div className="text-blue-600">Loading stock details...</div>
                           </div>
                         )}

                         {storeStockError && (
                           <div className="text-center py-8">
                             <div className="text-red-600">{storeStockError}</div>
                           </div>
                         )}

                         {getFilteredStoreStockDetails().length === 0 && (
                           <div className="text-center py-8">
                             <div className="text-gray-500">No products found matching your search</div>
                           </div>
                         )}

                         {getFilteredStoreStockDetails().length > 0 && (
                           <div className="overflow-x-auto">
                             <table className="min-w-full divide-y divide-gray-200">
                               <thead className="bg-gray-50">
                                 <tr>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Product
                                   </th>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     SKU
                                   </th>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Allocated Qty
                                   </th>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Sold Qty
                                   </th>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Remaining Qty
                                   </th>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Purchase Price
                                   </th>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Selling Price
                                   </th>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Barcode
                                   </th>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Rack Location
                                   </th>
                                   <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     Allocated Date
                                   </th>
                                 </tr>
                               </thead>
                               <tbody className="bg-white divide-y divide-gray-200">
                                 {getFilteredStoreStockDetails().map((stock) => (
                                   <tr key={stock.id} className="hover:bg-gray-50">
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className="text-xs font-medium text-gray-900">
                                         {stock.product_name}
                                       </div>
                                     </td>
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className="text-xs text-gray-900">
                                         {stock.product_sku}
                                       </div>
                                     </td>
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className="text-xs font-medium text-gray-900">
                                         {stock.quantity}
                                       </div>
                                     </td>
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className="text-xs text-gray-900">
                                         {stock.sold_quantity || 0}
                                       </div>
                                     </td>
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className={`text-xs font-medium ${
                                         (stock.remaining_quantity || 0) <= 5 ? 'text-red-600' : 'text-gray-900'
                                       }`}>
                                         {stock.remaining_quantity || stock.quantity}
                                       </div>
                                     </td>
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className="text-xs text-gray-900">
                                         {formatCurrency(stock.purchase_price)}
                                       </div>
                                     </td>
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className="text-xs font-medium text-gray-900">
                                         {formatCurrency(stock.selling_price)}
                                       </div>
                                     </td>
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className="text-xs text-gray-900">
                                         {stock.barcode || '-'}
                                       </div>
                                     </td>
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className="text-xs text-gray-900">
                                         {stock.rack_location || '-'}
                                       </div>
                                     </td>
                                     <td className="px-3 py-2 whitespace-nowrap">
                                       <div className="text-xs text-gray-900">
                                         {new Date(stock.created_at).toLocaleDateString('en-GB')}
                                       </div>
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 )}

                 {/* No Stock Allocated Modal */}
                 {showNoStockModal && noStockStore && (
                   <div className="fixed inset-0 z-50 flex items-center justify-center">
                     <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-200">
                       <div className="p-6">
                         <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full">
                           <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                           </svg>
                         </div>
                         
                         <div className="text-center">
                           <h3 className="text-lg font-semibold text-gray-900 mb-2">
                             No Stock Allocated
                           </h3>
                           <p className="text-sm text-gray-600 mb-6">
                             No stock is currently allocated to <strong>{noStockStore.store_name}</strong>.
                             <br />
                             You can allocate products to this store using the stock assignment feature.
                           </p>
                           
                           <div className="flex space-x-3 justify-center">
                             <button
                               onClick={() => setShowNoStockModal(false)}
                               className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
                             >
                               Cancel
                             </button>
                             <button
                               onClick={handleRedirectToStockAssignment}
                               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                               </svg>
                               <span>Assign Stock</span>
                             </button>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
                      </div>

              
              
              </div>
          )}

          {activeSection === 'purchases' && (
            <div className="space-y-6">
              {/* Purchase Management Section */}
              <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Purchase Records</h3>
                    <p className="text-sm text-gray-600">Track all purchase transactions</p>
                  </div>
                  <button 
                    onClick={openAddPurchaseModal}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Purchase</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search purchases by invoice, product, supplier, price, or quantity..."
                      value={purchaseSearchTerm}
                      onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {purchaseSearchTerm && (
                      <button
                        onClick={() => setPurchaseSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                      </div>
                  {purchaseSearchTerm && (
                    <div className="mt-1 text-xs text-gray-600">
                      Showing {filteredPurchases.length} of {purchases.length} purchases
                      </div>
                  )}
                      </div>

                {/* Purchases Table */}
                <div className="overflow-x-auto">
                  {isPurchasesLoading && (
                    <div className="text-center py-8">
                      <div className="text-blue-600">Loading purchases...</div>
                      </div>
                  )}

                  {purchasesError && (
                    <div className="text-center py-8">
                      <div className="text-red-600">{purchasesError}</div>
                      </div>
                  )}

                  {!isPurchasesLoading && !purchasesError && filteredPurchases.length === 0 && (
                    <div className="text-center py-6">
                      <div className="text-gray-500 text-sm">
                        {purchaseSearchTerm ? 'No matching purchases found' : 'No purchases found'}
                    </div>
                      </div>
                  )}

                  {!isPurchasesLoading && !purchasesError && filteredPurchases.length > 0 && (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPurchases.map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                              {purchase.invoice_no || 'N/A'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-32" title={purchase.product_name || 'Unknown'}>
                                {purchase.product_name || 'Unknown'}
                    </div>
                              <div className="text-xs text-gray-500">SKU: {purchase.product_sku || 'N/A'}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-32" title={purchase.seller_name || 'Unknown'}>
                                {purchase.seller_name || 'Unknown'}
                      </div>
                              <div className="text-xs text-gray-500 truncate max-w-32" title={purchase.seller_contact || ''}>
                                {purchase.seller_contact || ''}
                      </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {purchase.quantity}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              ₹{parseFloat(purchase.purchase_price).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                              ₹{(parseFloat(purchase.purchase_price) * purchase.quantity).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {formatDateDDMMYYYY(purchase.created_at)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                              <div className="flex space-x-1">
                                <button className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50" title="Edit">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" title="Delete">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                      </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                      </div>
                      </div>
                    </div>
          )}

          {activeSection === 'stock' && (
            <div className="space-y-6" data-section="stock">
              {/* Stock Management Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Stock Allocation</h3>
                    <p className="text-sm text-gray-600">Track all stock items across stores</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => {
                        setShowStockAssignment(true);
                        fetchAvailablePurchases();
                        fetchStores();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                      <span>Assign Stock</span>
                    </button>
                    <button 
                      onClick={() => {
                        // Enable edit mode for stock items
                        setToast({
                          visible: true,
                          message: 'Click on any stock item to edit it',
                          type: 'info'
                        });
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Stock</span>
                  </button>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                          </div>
                    <input
                      type="text"
                      placeholder="Search stock by barcode, product, category, store, supplier, rack location, price, or quantity..."
                      value={stockSearchTerm}
                      onChange={(e) => setStockSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {stockSearchTerm && (
                      <button
                        onClick={() => setStockSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                        </div>
                  {stockSearchTerm && (
                    <div className="mt-1 text-xs text-gray-600">
                      Showing {filteredStock.length} of {stock.length} stock items
                      </div>
                  )}
                      </div>
                      
                {/* Stock Table */}
                <div className="overflow-x-auto">
                  {isStockLoading && (
                    <div className="text-center py-6">
                      <div className="text-blue-600">Loading stock...</div>
                          </div>
                  )}

                  {stockError && (
                    <div className="text-center py-6">
                      <div className="text-red-600">{stockError}</div>
                          </div>
                  )}

                  {!isStockLoading && !stockError && filteredStock.length === 0 && (
                    <div className="text-center py-6">
                      <div className="text-gray-500 text-sm">
                        {stockSearchTerm ? 'No matching stock items found' : 'No stock items found'}
                          </div>
                        </div>
                  )}

                  {!isStockLoading && !stockError && filteredStock.length > 0 && (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStock.map((stockItem) => (
                          <tr key={stockItem.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                              {stockItem.barcode || 'N/A'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-32" title={stockItem.product_name || 'Unknown Product'}>
                                {stockItem.product_name || 'Unknown Product'}
                          </div>
                              <div className="text-xs text-gray-500">SKU: {stockItem.product_sku || 'N/A'}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {stockItem.category_name || 'Unknown Category'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {stockItem.store_name || 'Unknown Store'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-32" title={stockItem.seller_name || 'Unknown Supplier'}>
                                {stockItem.seller_name || 'Unknown Supplier'}
                        </div>
                              <div className="text-xs text-gray-500 truncate max-w-32" title={stockItem.seller_contact || 'N/A'}>
                                {stockItem.seller_contact || 'N/A'}
                      </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {stockItem.quantity}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              ₹{parseFloat(stockItem.selling_price).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {stockItem.rack_location || 'N/A'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {formatDateDDMMYYYY(stockItem.created_at)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                              <div className="flex space-x-1">
                                <button 
                                  onClick={() => handleEditStock(stockItem)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50" 
                                  title="Edit"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                                </button>
                                <button className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" title="Delete">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                                </button>
                          </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Available Purchases for Stock Assignment */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Available for Stock Assignment</h3>
                    <p className="text-sm text-gray-600">Purchases with remaining quantities that can be assigned to stores</p>
                  </div>
                  <button 
                    onClick={fetchAvailablePurchases}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>

                {isAvailablePurchasesLoading && (
                  <div className="text-center py-6">
                    <div className="text-blue-600">Loading available purchases...</div>
                  </div>
                )}

                {availablePurchasesError && (
                  <div className="text-center py-6">
                    <div className="text-red-600">{availablePurchasesError}</div>
                  </div>
                )}

                {!isAvailablePurchasesLoading && !availablePurchasesError && availablePurchases.length === 0 && (
                  <div className="text-center py-6">
                    <div className="text-gray-500 text-sm">No purchases available for stock assignment</div>
                  </div>
                )}

                {!isAvailablePurchasesLoading && !availablePurchasesError && availablePurchases.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {availablePurchases.map((purchase) => (
                          <tr key={purchase.purchase_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-32" title={purchase.product_name || 'Unknown Product'}>
                                {purchase.product_name || 'Unknown Product'}
                              </div>
                              <div className="text-xs text-gray-500">SKU: {purchase.product_sku || 'N/A'}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-32" title={purchase.seller_name || 'Unknown Supplier'}>
                                {purchase.seller_name || 'Unknown Supplier'}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              ₹{parseFloat(purchase.purchase_price).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {purchase.total_quantity}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {purchase.assigned_quantity}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-green-600">
                              {purchase.remaining_quantity}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              {formatDateDDMMYYYY(purchase.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
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

      {/* Supplier Details Modal */}
      {showSupplierDetails && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-xl border border-gray-200 flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Supplier Details</h3>
              <button
                onClick={() => setShowSupplierDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column: Basic Information */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                  <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                    {selectedSupplier.company_name}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
                  <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                    {selectedSupplier.contact_person || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                    {selectedSupplier.email || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                    {selectedSupplier.phone || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                    {selectedSupplier.address || '—'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                      {selectedSupplier.city || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                    <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                      {selectedSupplier.state || '—'}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
                  <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                    {selectedSupplier.pincode || '—'}
                  </div>
                </div>
              </div>

              {/* Right column: Business Information */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GST Number</label>
                  <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                    {selectedSupplier.gst_number || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
                  <div className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-900">
                    {selectedSupplier.payment_terms || '—'}
                  </div>
                </div>
                
                {/* Supplier Status */}
                <div className="p-2 rounded border text-xs flex items-center justify-between"
                  style={{ borderColor: '#bbf7d0', background: '#f0fdf4', color: '#111827' }}>
                  <div>
                    <p className="font-medium">Status</p>
                    <p className="text-gray-600">Active supplier</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                </div>

                {/* Products List */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Products Supplied</label>
                  <div className="max-h-32 overflow-auto border rounded divide-y">
                    <div className="px-2 py-1.5 text-xs text-gray-500">Product information not available in current view.</div>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
            
            {/* Footer - Fixed */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  setSupplierToDelete(selectedSupplier);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Supplier
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditSupplierModal(selectedSupplier)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Edit Supplier
                </button>
                <button
                  onClick={() => setShowSupplierDetails(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirmation */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Supplier?</h3>
              <p className="text-sm text-gray-700 mb-6">This action cannot be undone. Are you sure you want to delete <span className="font-medium">{supplierToDelete.name}</span>?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSupplierToDelete(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSupplier(supplierToDelete.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 border border-gray-200 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h3>
            <div className="space-y-4">
              {/* Category No removed: auto-generated on backend */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              {saveCategoryError && (
                <div className="text-sm text-red-600">{saveCategoryError}</div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory('');
                  setNewCategoryDesc('');
                  setSaveCategoryError(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={isSavingCategory}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg transition-colors"
              >
                {isSavingCategory ? 'Saving...' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockUpdate && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 border border-gray-200 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Stock</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Product:</p>
              <p className="font-medium text-gray-900">{selectedProduct.name}</p>
              <p className="text-sm text-gray-600">SKU: {selectedProduct.sku}</p>
              <p className="text-sm text-gray-600">Category: {selectedProduct.category}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Store
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a store...</option>
                {storeList.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} - {store.location}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Stock Quantity
              </label>
              <input
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="Enter new stock quantity..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowStockUpdate(false);
                  setSelectedProduct(null);
                  setSelectedStore('');
                  setNewStock('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStock}
                disabled={!selectedStore || !newStock}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Add New Supplier</h3>
                <button
                  onClick={() => setShowAddSupplier(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={addSupplierData.name}
                      onChange={(e) => handleAddSupplierInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      value={addSupplierData.contactPerson}
                      onChange={(e) => handleAddSupplierInputChange('contactPerson', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter contact person name"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={addSupplierData.email}
                      onChange={(e) => handleAddSupplierInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={addSupplierData.phone}
                      onChange={(e) => handleAddSupplierInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    value={addSupplierData.address}
                    onChange={(e) => handleAddSupplierInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter complete address"
                    rows="3"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={addSupplierData.city}
                      onChange={(e) => handleAddSupplierInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={addSupplierData.state}
                      onChange={(e) => handleAddSupplierInputChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={addSupplierData.pincode}
                      onChange={(e) => handleAddSupplierInputChange('pincode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>

                {/* Business Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={addSupplierData.gstNumber}
                      onChange={(e) => handleAddSupplierInputChange('gstNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter GST number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Terms
                    </label>
                    <select
                      value={addSupplierData.paymentTerms}
                      onChange={(e) => handleAddSupplierInputChange('paymentTerms', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select payment terms</option>
                      <option value="COD">Cash on Delivery</option>
                      <option value="7days">7 Days</option>
                      <option value="15days">15 Days</option>
                      <option value="30days">30 Days</option>
                      <option value="45days">45 Days</option>
                      <option value="60days">60 Days</option>
                    </select>
                  </div>
                </div>

                {/* Category */}
                {/* Removed single category selection as suppliers can have multiple categories */}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => setShowAddSupplier(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSupplier}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Supplier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Edit Supplier</h3>
                <button
                  onClick={() => setShowEditSupplier(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Company Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editSupplierData.name}
                      onChange={(e) => handleEditSupplierInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                    <input
                      type="text"
                      value={editSupplierData.contactPerson}
                      onChange={(e) => handleEditSupplierInputChange('contactPerson', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editSupplierData.email}
                      onChange={(e) => handleEditSupplierInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={editSupplierData.phone}
                      onChange={(e) => handleEditSupplierInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Address Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      value={editSupplierData.address}
                      onChange={(e) => handleEditSupplierInputChange('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter complete address"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={editSupplierData.city}
                      onChange={(e) => handleEditSupplierInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={editSupplierData.state}
                      onChange={(e) => handleEditSupplierInputChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter state"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                    <input
                      type="text"
                      value={editSupplierData.pincode}
                      onChange={(e) => handleEditSupplierInputChange('pincode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Business Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                    <input
                      type="text"
                      value={editSupplierData.gstNumber}
                      onChange={(e) => handleEditSupplierInputChange('gstNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter GST number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                    <select
                      value={editSupplierData.paymentTerms}
                      onChange={(e) => handleEditSupplierInputChange('paymentTerms', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select payment terms</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="Advance Payment">Advance Payment</option>
                      <option value="Letter of Credit">Letter of Credit</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowEditSupplier(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSupplier}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Update Supplier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Add New Stock</h3>
                <button
                  onClick={() => setShowAddStock(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={addStockData.product}
                    onChange={(e) => handleAddStockInputChange('product', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter product name"
                  />
                </div>

                {/* Barcode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode Number *
                  </label>
                  <input
                    type="text"
                    value={addStockData.barcode}
                    onChange={(e) => handleAddStockInputChange('barcode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter barcode number"
                  />
                </div>

                {/* Store Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allocate to Store *
                  </label>
                  <select
                    value={addStockData.store}
                    onChange={(e) => handleAddStockInputChange('store', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Store</option>
                    {storeList.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name} - {store.location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    value={addStockData.stockQuantity}
                    onChange={(e) => handleAddStockInputChange('stockQuantity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter quantity"
                    min="1"
                  />
                </div>

                {/* Price Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock In Price (Rs.) *
                    </label>
                    <input
                      type="number"
                      value={addStockData.stockInPrice}
                      onChange={(e) => handleAddStockInputChange('stockInPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selling Price (Rs.) *
                    </label>
                    <input
                      type="number"
                      value={addStockData.sellingPrice}
                      onChange={(e) => handleAddStockInputChange('sellingPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <input
                    type="text"
                    value={addStockData.supplier}
                    onChange={(e) => handleAddStockInputChange('supplier', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter supplier name"
                  />
                </div>

                {/* Additional Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={addStockData.expiryDate}
                      onChange={(e) => handleAddStockInputChange('expiryDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={addStockData.batchNumber}
                      onChange={(e) => handleAddStockInputChange('batchNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter batch number"
                    />
                  </div>
                </div>

                {/* Profit Calculation Display */}
                {addStockData.stockInPrice && addStockData.sellingPrice && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Profit Calculation</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-600">Profit per Unit:</span>
                        <span className="font-medium ml-2">
                          Rs. {(parseFloat(addStockData.sellingPrice) - parseFloat(addStockData.stockInPrice)).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-600">Total Profit:</span>
                        <span className="font-medium ml-2">
                          Rs. {addStockData.stockQuantity ? 
                            ((parseFloat(addStockData.sellingPrice) - parseFloat(addStockData.stockInPrice)) * parseFloat(addStockData.stockQuantity)).toFixed(2) 
                            : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => setShowAddStock(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStock}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmation
        isOpen={false}
        onConfirm={openLogout}
        onCancel={() => {}}
        isLoading={false}
      />
      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 border border-gray-200 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Products</h3>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setAddProductTab('single')}
                className={`px-4 py-2 text-sm font-medium ${
                  addProductTab === 'single' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Single Entry
              </button>
              <button
                onClick={() => setAddProductTab('bulk')}
                className={`px-4 py-2 text-sm font-medium ${
                  addProductTab === 'bulk' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Bulk Entry
              </button>
            </div>

            {addProductTab === 'single' ? (
              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={addProductData.name}
                    onChange={(e) => handleAddInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter product name"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={addProductData.sku}
                    onChange={(e) => handleAddInputChange('sku', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter SKU"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={addProductData.category_id}
                    onChange={(e) => handleAddInputChange('category_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {categoriesData.map(category => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={addProductData.unit}
                    onChange={(e) => handleAddInputChange('unit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., kg, liter, pack, bottle"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bulk Entry (CSV Format)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Format: Name, SKU, Category, Unit (one per line)
                  </p>
                  <textarea
                    value={bulkData.text}
                    onChange={(e) => handleBulkTextChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={8}
                    placeholder="Apple, APP001, Fruits, kg&#10;Banana, BAN001, Fruits, kg&#10;Milk, MIL001, Dairy, liter"
                  />
                </div>

                {/* Preview */}
                {bulkData.products.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Preview ({bulkData.products.length} products)
                    </h4>
                    <div className="max-h-40 overflow-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600">Name</th>
                            <th className="px-3 py-2 text-left text-gray-600">SKU</th>
                            <th className="px-3 py-2 text-left text-gray-600">Category</th>
                            <th className="px-3 py-2 text-left text-gray-600">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkData.products.slice(0, 10).map((product, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2 text-gray-900">{product.name}</td>
                              <td className="px-3 py-2 text-gray-900 font-mono">{product.sku}</td>
                              <td className="px-3 py-2 text-gray-900">
                                {product.category_id 
                                  ? categoriesData.find(c => c.id === product.category_id)?.name || 'Unknown'
                                  : 'None'
                                }
                              </td>
                              <td className="px-3 py-2 text-gray-900">{product.unit || 'None'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {bulkData.products.length > 10 && (
                        <div className="px-3 py-2 text-xs text-gray-500 text-center">
                          ... and {bulkData.products.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {bulkData.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2">Errors:</h4>
                    <div className="max-h-20 overflow-auto text-sm text-red-600">
                      {bulkData.errors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddProduct(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              {addProductTab === 'single' ? (
                <button
                  onClick={handleAddProduct}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add Product
                </button>
              ) : (
                <button
                  onClick={handleBulkAddProducts}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  disabled={bulkData.products.length === 0}
                >
                  Add {bulkData.products.length} Products
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editModal.open && editModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 border border-gray-200 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Product</h3>
            
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => handleEditInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={editFormData.sku}
                  onChange={(e) => handleEditInputChange('sku', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter SKU"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editFormData.category_id}
                  onChange={(e) => handleEditInputChange('category_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {categoriesData.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={editFormData.unit}
                  onChange={(e) => handleEditInputChange('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., kg, liter, pack, bottle"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditModal({ open: false, product: null })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProduct}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Update Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 border border-gray-200 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Category</h3>
            <p className="text-sm text-gray-700 mb-4">Do you really want to delete <span className="font-semibold">{deleteModal.name || 'this category'}</span>? This action cannot be undone.</p>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ open: false, id: null, name: '' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAddPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Add New Purchase</h3>
                <button
                  onClick={() => setShowAddPurchase(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddPurchase} className="space-y-6">
                {/* First Row - Product and Supplier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product *
                    </label>
                    <select
                      name="product_id"
                      value={addPurchaseData.product_id}
                      onChange={handleAddPurchaseInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a product</option>
                      {productsData.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (SKU: {product.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier *
                    </label>
                    <select
                      name="seller_id"
                      value={addPurchaseData.seller_id}
                      onChange={handleAddPurchaseInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a supplier</option>
                      {sellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.company_name} - {seller.contact_person}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Second Row - Price, Quantity, and Invoice */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Purchase Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="purchase_price"
                      value={addPurchaseData.purchase_price}
                      onChange={handleAddPurchaseInputChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="Enter purchase price"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={addPurchaseData.quantity}
                      onChange={handleAddPurchaseInputChange}
                      required
                      min="1"
                      placeholder="Enter quantity"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      name="invoice_no"
                      value={addPurchaseData.invoice_no}
                      onChange={handleAddPurchaseInputChange}
                      placeholder="Enter invoice number (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Total Amount Display */}
                {addPurchaseData.purchase_price && addPurchaseData.quantity && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-lg text-blue-800 text-center">
                      <strong>Total Amount: ₹{(parseFloat(addPurchaseData.purchase_price) * parseInt(addPurchaseData.quantity)).toFixed(2)}</strong>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddPurchase(false)}
                    className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Add Purchase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Assignment Modal */}
      {showStockAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Assign Stock to Store</h3>
                <button
                  onClick={() => {
                    setShowStockAssignment(false);
                    setAssignmentStep(1);
                    setSelectedProducts([]);
                    setProductSearchTerm('');
                    setStockAssignmentData({
                      purchase_id: '',
                      store_id: '',
                      quantity: '',
                      selling_price: '',
                      barcode: '',
                      rack_location: '',
                      expiry_date: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${assignmentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    1
                  </div>
                  <div className={`w-16 h-1 ${assignmentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${assignmentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    2
                  </div>
                  <div className={`w-16 h-1 ${assignmentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${assignmentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    3
                  </div>
                </div>
              </div>

              {/* Step 1: Select Store */}
              {assignmentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Store *
                    </label>
                    {isStoresLoading ? (
                      <div className="text-center py-4">
                        <div className="text-blue-600">Loading stores...</div>
                      </div>
                    ) : storesError ? (
                      <div className="text-center py-4">
                        <div className="text-red-600">{storesError}</div>
                      </div>
                    ) : (
                      <select
                        value={stockAssignmentData.store_id}
                        onChange={(e) => setStockAssignmentData({...stockAssignmentData, store_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select a store</option>
                        {storeList.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name} - {store.location}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowStockAssignment(false)}
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!stockAssignmentData.store_id) {
                          setToast({
                            visible: true,
                            message: 'Please select a store first',
                            type: 'error'
                          });
                          return;
                        }
                        setAssignmentStep(2);
                      }}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Select Products */}
              {assignmentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Select Products to Assign</h4>
                    
                    {/* Product Search Bar */}
                    <div className="mb-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Search products by name, SKU, supplier, or purchase ID..."
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {productSearchTerm && (
                          <button
                            onClick={() => setProductSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {productSearchTerm && (
                        <div className="mt-1 text-xs text-gray-600">
                          Showing {getFilteredProducts().length} of {getProductsWithRemainingStock().length} products
                        </div>
                      )}
                    </div>
                    {isAvailablePurchasesLoading ? (
                      <div className="text-center py-4">
                        <div className="text-blue-600">Loading available products...</div>
                      </div>
                    ) : availablePurchasesError ? (
                      <div className="text-center py-4">
                        <div className="text-red-600">{availablePurchasesError}</div>
                      </div>
                    ) : getFilteredProducts().length === 0 ? (
                      <div className="text-center py-4">
                        <div className="text-gray-500">
                          {productSearchTerm ? 'No products found matching your search' : 'No products available for assignment'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {getFilteredProducts().map((product) => (
                          <div key={product.product_id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="font-medium text-gray-900">{product.product_name}</h5>
                                <p className="text-sm text-gray-500">SKU: {product.product_sku}</p>
                                <p className="text-sm text-green-600 font-medium">Total Available: {product.total_remaining} units</p>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              {product.purchases.map((purchase) => (
                                <ProductAssignmentForm
                                  key={purchase.purchase_id}
                                  product={product}
                                  purchase={purchase}
                                  onProductSelection={handleProductSelection}
                                  selectedProduct={selectedProducts.find(item => item.purchase_id === purchase.purchase_id)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentStep(1);
                        setProductSearchTerm('');
                      }}
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Back
                    </button>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowStockAssignment(false)}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedProducts.length === 0) {
                            setToast({
                              visible: true,
                              message: 'Please select at least one product',
                              type: 'error'
                            });
                            return;
                          }
                          setAssignmentStep(3);
                        }}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Review ({selectedProducts.length} selected)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Review and Submit */}
              {assignmentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Review Assignment</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedProducts.map((item) => {
                        const isLoss = parseFloat(item.selling_price) < parseFloat(item.purchase_price);
                        const lossAmount = parseFloat(item.purchase_price) - parseFloat(item.selling_price);
                        
                        return (
                          <div key={item.purchase_id} className={`border rounded-lg p-4 ${isLoss ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h5 className="font-medium text-gray-900">{item.product_name}</h5>
                                  {isLoss && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                      </svg>
                                      Loss: ₹{lossAmount.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">SKU: {item.product_sku} | Supplier: {item.seller_name}</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                                  <div>
                                    <span className="text-gray-600">Quantity:</span>
                                    <span className="ml-1 font-medium">{item.quantity}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Selling Price:</span>
                                    <span className={`ml-1 font-medium ${isLoss ? 'text-yellow-700' : ''}`}>₹{item.selling_price}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Purchase Price:</span>
                                    <span className="ml-1 font-medium">₹{item.purchase_price}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Barcode:</span>
                                    <span className="ml-1 font-medium">{item.barcode}</span>
                                  </div>
                                </div>
                                {isLoss && (
                                  <div className="mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs">
                                    <p className="text-yellow-800">
                                      <strong>Warning:</strong> Selling price is ₹{lossAmount.toFixed(2)} less than purchase price. 
                                      This will result in a loss of ₹{(lossAmount * item.quantity).toFixed(2)} for {item.quantity} units.
                                    </p>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeProductFromSelection(item.purchase_id)}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentStep(2);
                        setProductSearchTerm('');
                      }}
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Back
                    </button>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowStockAssignment(false)}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleStockAssignment}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Assign Stock
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {showEditStock && selectedStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit Stock Item</h3>
                <button
                  onClick={closeEditStockModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Product Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{selectedStockItem.product_name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">SKU:</span> {selectedStockItem.product_sku}
                  </div>
                  <div>
                    <span className="font-medium">Store:</span> {selectedStockItem.store_name}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> {selectedStockItem.category_name}
                  </div>
                  <div>
                    <span className="font-medium">Supplier:</span> {selectedStockItem.seller_name}
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                      {availableQuantity !== null && (
                        <span className="ml-2 text-xs text-gray-500">
                          (Max available: {availableQuantity})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editStockData.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        !quantityValidation.isValid ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter quantity"
                    />
                    {!quantityValidation.isValid && (
                      <p className="mt-1 text-xs text-red-600">{quantityValidation.message}</p>
                    )}
                    {quantityValidation.isValid && availableQuantity !== null && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ Quantity is within max stock limits
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selling Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editStockData.selling_price}
                      onChange={(e) => setEditStockData(prev => ({ ...prev, selling_price: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter selling price"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={editStockData.barcode}
                    onChange={(e) => setEditStockData(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter barcode"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rack Location
                  </label>
                  <input
                    type="text"
                    value={editStockData.rack_location}
                    onChange={(e) => setEditStockData(prev => ({ ...prev, rack_location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter rack location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editStockData.expiry_date}
                    onChange={(e) => setEditStockData(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={closeEditStockModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isUpdatingStock}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStockItem}
                  disabled={isUpdatingStock || !editStockData.quantity || !editStockData.selling_price || !quantityValidation.isValid}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUpdatingStock && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{isUpdatingStock ? 'Updating...' : 'Update Stock'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast(t => ({ ...t, visible: false }))}
      />
    </div>
  );
};

export default AdminInventory;
