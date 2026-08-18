import { useState, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const API_URL = 'http://localhost:5001';

// API Fetch Helper with Credentials
const apiFetch = async (path, options = {}) => {
  const url = `${API_URL}${path}`;
  const defaultOptions = {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  if (defaultOptions.body && typeof defaultOptions.body === 'object') {
    defaultOptions.body = JSON.stringify(defaultOptions.body);
  }

  const response = await fetch(url, defaultOptions);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || data.errors?.[0]?.msg || 'API Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
};

// Expiry Date calculations helper
const getExpiryDetails = (expiryDateStr) => {
  if (!expiryDateStr) return { color: 'emerald', status: 'N/A', progress: 100, diffDays: 99 };
  
  const expiryDate = new Date(expiryDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // start of today

  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let color = 'emerald';
  let status = `${diffDays} Days Left`;
  let progress = 90;

  if (diffDays < 0) {
    color = 'red';
    status = `Expired ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'} ago`;
    progress = 0;
  } else if (diffDays === 0) {
    color = 'red';
    status = 'Expired Today';
    progress = 0;
  } else if (diffDays === 1) {
    color = 'rose';
    status = 'Expires Tomorrow';
    progress = 10;
  } else if (diffDays <= 3) {
    color = 'amber';
    status = `${diffDays} Days Left`;
    progress = 35;
  } else if (diffDays <= 7) {
    color = 'sky';
    status = `${diffDays} Days Left`;
    progress = 60;
  } else {
    color = 'emerald';
    status = `${diffDays} Days Left`;
    progress = 90;
  }

  return { color, status, progress, diffDays };
};

function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser')
    return saved ? JSON.parse(saved) : null
  })

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('login') // 'login' or 'register'
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  
  // Camera Barcode Scanner State
  const [showScanner, setShowScanner] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [scannerLoading, setScannerLoading] = useState(false)
  const [scannerInstance, setScannerInstance] = useState(null)
  
  // Form Input States (Auth)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Products List State (Dashboard)
  const [items, setItems] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingItems, setLoadingItems] = useState(false)

  // Filter & Search States
  const [search, setSearch] = useState('')
  const [expiryFilter, setExpiryFilter] = useState('') // '', '1month', '3months', 'expired'
  const [categoryFilter, setCategoryFilter] = useState('All') // 'All', 'Fridge', 'Pantry', etc. (Client-side filtered for responsiveness)

  // New/Edit Product Form State
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Fridge')
  const [newItemExpiry, setNewItemExpiry] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('1')
  const [newItemUPC, setNewItemUPC] = useState('')
  const [editingItem, setEditingItem] = useState(null)

  // Feedback Notification Alerts
  const [scannerAlert, setScannerAlert] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')

  // Verify Auth Session on Mount
  useEffect(() => {
    const verifySession = async () => {
      if (currentUser) {
        try {
          const data = await apiFetch('/auth/me');
          setCurrentUser(prev => ({ ...prev, ...data.user }));
        } catch (err) {
          console.error('Session expired or invalid, logging out.', err);
          handleLogoutLocal();
        }
      }
    };
    verifySession();
  }, []);

  // Fetch Items from Database
  const fetchProducts = async () => {
    if (!currentUser) return;
    setLoadingItems(true);
    try {
      let path = `/products?page=${page}&limit=20`;
      if (search.trim()) {
        path += `&search=${encodeURIComponent(search)}`;
      }
      if (expiryFilter) {
        path += `&expiryFilter=${expiryFilter}`;
      }

      const data = await apiFetch(path);
      setItems(data.products || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Fetch products failed:', err);
      setError('Could not load products. Please check connection.');
    } finally {
      setLoadingItems(false);
    }
  };

  // Re-fetch products when pagination, search query, or expiry filter changes
  useEffect(() => {
    fetchProducts();
  }, [currentUser, page, search, expiryFilter]);

  const handleOpenModal = (type) => {
    setError('')
    setModalType(type)
    setShowModal(true)
  }

  // Clear session data locally
  const handleLogoutLocal = () => {
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
    setItems([])
    setPage(1)
  }

  // Sign Out API Call
  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      handleLogoutLocal();
    }
  }

  // Submit Auth Form (Register / Login)
  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (modalType === 'register' && !name.trim()) {
      setError('Name is required')
      setLoading(false)
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }
    if (!password) {
      setError('Password is required')
      setLoading(false)
      return
    }

    const endpoint = modalType === 'register' ? 'register' : 'login'
    const payload = modalType === 'register' 
      ? { name, email, password }
      : { email, password }

    try {
      const data = await apiFetch(`/auth/${endpoint}`, {
        method: 'POST',
        body: payload
      });

      const sessionUser = {
        _id: data.user._id,
        name: data.user.name,
        email: data.user.email
      };

      localStorage.setItem('currentUser', JSON.stringify(sessionUser));
      setCurrentUser(sessionUser);
      
      // Close & reset
      setShowModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch product metadata from Open Food Facts API
  const handleFetchProductDetails = async (barcode) => {
    try {
      const cleanBarcode = barcode.trim().replace(/\D/g, '');
      if (!cleanBarcode) return null;
      
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`);
      if (!res.ok) return null;
      
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const product = data.product;
        
        // Smart Category parsing
        let category = 'Pantry';
        const categories = (product.categories_tags || []).join(' ').toLowerCase();
        const categoriesHierarchy = (product.categories_hierarchy || []).join(' ').toLowerCase();
        const fullCategories = `${categories} ${categoriesHierarchy}`;
        
        if (fullCategories.includes('dairy') || fullCategories.includes('milk') || 
            fullCategories.includes('cheese') || fullCategories.includes('yogurt') || 
            fullCategories.includes('beverage') || fullCategories.includes('juice') || 
            fullCategories.includes('meat') || fullCategories.includes('fish') || 
            fullCategories.includes('chilled') || fullCategories.includes('butter')) {
          category = 'Fridge';
        } else if (fullCategories.includes('frozen') || fullCategories.includes('ice cream')) {
          category = 'Freezer';
        } else if (fullCategories.includes('medicine') || fullCategories.includes('drug') || 
                   fullCategories.includes('health') || fullCategories.includes('pharma') ||
                   fullCategories.includes('syrup') || fullCategories.includes('pill')) {
          category = 'Medicine';
        }
        
        const amount = product.quantity || product.serving_size || '1 unit';
        
        let title = product.product_name || product.generic_name || 'Scanned Product';
        if (product.brands) {
          title = `${product.brands} ${title}`;
        }
        
        return { title, category, amount };
      }
    } catch (err) {
      console.error('Error lookup in Open Food Facts:', err);
    }
    return null;
  };

  // Start Camera Stream Barcode Scanner
  const startScanner = async () => {
    setScannerError('');
    setScannerLoading(true);
    setShowScanner(true);
    
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("scanner-reader");
        setScannerInstance(scanner);
        
        const qrCodeSuccessCallback = async (decodedText) => {
          console.log(`Barcode scanned: ${decodedText}`);
          setScannerLoading(true);
          
          try {
            await scanner.stop();
          } catch (err) {
            console.error('Stop scanner error:', err);
          }
          
          const details = await handleFetchProductDetails(decodedText);
          
          setNewItemUPC(decodedText);
          if (details) {
            setNewItemName(details.title);
            setNewItemCategory(details.category);
            setNewItemAmount(details.amount);
            
            // Auto calculate default dates based on categories
            const defaultDate = new Date();
            if (details.category === 'Fridge') {
              defaultDate.setDate(defaultDate.getDate() + 7);
            } else if (details.category === 'Freezer') {
              defaultDate.setDate(defaultDate.getDate() + 90);
            } else if (details.category === 'Medicine') {
              defaultDate.setDate(defaultDate.getDate() + 365);
            } else {
              defaultDate.setDate(defaultDate.getDate() + 30);
            }
            setNewItemExpiry(defaultDate.toISOString().split('T')[0]);
            setScannerAlert(`Barcode Scanned: "${details.title}" details populated!`);
          } else {
            setScannerAlert(`Barcode Scanned: ${decodedText}. No item details found.`);
          }
          
          setTimeout(() => setScannerAlert(''), 4500);
          setShowScanner(false);
          setScannerLoading(false);
        };
        
        const config = { 
          fps: 15, 
          qrbox: (width, height) => {
            const boxWidth = Math.min(width * 0.8, 300);
            const boxHeight = Math.min(height * 0.4, 150);
            return { width: boxWidth, height: boxHeight };
          }
        };
        
        await scanner.start(
          { facingMode: "environment" }, 
          config, 
          qrCodeSuccessCallback,
          () => {} // silent error logging
        );
        setScannerLoading(false);
      } catch (err) {
        console.error('Camera initialization failed:', err);
        setScannerError(err.message || 'Could not acquire camera stream. Please check permissions.');
        setScannerLoading(false);
      }
    }, 350);
  };

  // Stop Camera Stream Barcode Scanner
  const stopScanner = async () => {
    if (scannerInstance) {
      try {
        if (scannerInstance.isScanning) {
          await scannerInstance.stop();
        }
      } catch (err) {
        console.error('Failed stopping scanner:', err);
      }
    }
    setShowScanner(false);
    setScannerInstance(null);
  };

  // Release camera on unmount
  useEffect(() => {
    return () => {
      if (scannerInstance && scannerInstance.isScanning) {
        scannerInstance.stop().catch(err => console.error(err));
      }
    };
  }, [scannerInstance]);

  // Mock Barcode Scanner Action
  const handleMockScan = () => {
    const mockProducts = [
      { upc: '078742351860', name: 'Fresh Whole Milk', category: 'Fridge', amount: '1 Gallon', days: 6 },
      { upc: '012345678901', name: 'Whole Grain Bread', category: 'Pantry', amount: '1 Loaf', days: 10 },
      { upc: '098765432109', name: 'Organic Spinach', category: 'Fridge', amount: '500g', days: 3 },
      { upc: '025000047322', name: 'Strawberry Yogurt', category: 'Fridge', amount: '4 Pack', days: 8 },
      { upc: '049000028904', name: 'Cough Syrup', category: 'Medicine', amount: '150ml', days: 45 }
    ];

    // Pick a random mock item
    const picked = mockProducts[Math.floor(Math.random() * mockProducts.length)];

    setNewItemUPC(picked.upc);
    setNewItemName(picked.name);
    setNewItemCategory(picked.category);
    setNewItemAmount(picked.amount);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + picked.days);
    setNewItemExpiry(expiryDate.toISOString().split('T')[0]);

    // Flash scan alert
    setScannerAlert(`Barcode ${picked.upc} Scanned: "${picked.name}" populated successfully!`);
    setTimeout(() => {
      setScannerAlert('');
    }, 4000);
  };

  // Add Item to Database
  const handleAddItemSubmit = async (e) => {
    e.preventDefault()
    if (!newItemName.trim() || !newItemExpiry) return

    setLoading(true);
    setError('');

    try {
      await apiFetch('/products', {
        method: 'POST',
        body: {
          title: newItemName,
          upc: newItemUPC || null,
          amount: newItemAmount || '1',
          expiryDate: new Date(newItemExpiry).toISOString(),
          category: newItemCategory
        }
      });

      // Reset Form fields
      setNewItemName('');
      setNewItemCategory('Fridge');
      setNewItemAmount('1');
      setNewItemExpiry('');
      setNewItemUPC('');
      
      setShowAddModal(false);
      showFeedback('Product added successfully!');
      setPage(1); // Return to first page to see the newest entry
      await fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Open Edit Modal with Pre-populated data
  const handleEditClick = (item) => {
    setEditingItem(item);
    setNewItemName(item.title);
    setNewItemCategory(item.category);
    setNewItemAmount(item.amount || '1');
    setNewItemUPC(item.upc || '');
    
    // Format Date string to YYYY-MM-DD
    if (item.expiryDate) {
      const dateOnly = item.expiryDate.split('T')[0];
      setNewItemExpiry(dateOnly);
    } else {
      setNewItemExpiry('');
    }
    setError('');
    setShowEditModal(true);
  };

  // Update Product details in Database
  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem || !newItemName.trim() || !newItemExpiry) return;

    setLoading(true);
    setError('');

    try {
      await apiFetch(`/products/${editingItem._id}`, {
        method: 'PUT',
        body: {
          title: newItemName,
          upc: newItemUPC || null,
          amount: newItemAmount || '1',
          expiryDate: new Date(newItemExpiry).toISOString(),
          category: newItemCategory
        }
      });

      // Clear states
      setNewItemName('');
      setNewItemCategory('Fridge');
      setNewItemAmount('1');
      setNewItemExpiry('');
      setNewItemUPC('');
      setEditingItem(null);

      setShowEditModal(false);
      showFeedback('Product updated successfully!');
      await fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Item from Database
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/products/${itemToDelete.id}`, { method: 'DELETE' });
      showFeedback('Item deleted successfully.');
      
      // Adjust page if deleting the last item on a page
      if (items.length === 1 && page > 1) {
        setPage(prev => prev - 1);
      } else {
        await fetchProducts();
      }
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err) {
      console.error('Delete item failed:', err);
      alert(err.message || 'Could not delete item.');
    } finally {
      setLoading(false);
    }
  }

  // Display clean notification bar
  const showFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage('');
    }, 3000);
  };

  // Categorize items locally for responsive tab selection
  const filteredItems = items.filter(item => {
    if (categoryFilter === 'All') return true;
    return item.category === categoryFilter;
  });

  // Calculate local statistics based on fetched dashboard products
  const criticalCount = items.filter(item => {
    const { diffDays } = getExpiryDetails(item.expiryDate);
    return diffDays <= 1;
  }).length;

  const warningCount = items.filter(item => {
    const { diffDays } = getExpiryDetails(item.expiryDate);
    return diffDays > 1 && diffDays <= 5;
  }).length;

  // VIEW 1: AUTHENTICATED USER DASHBOARD
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100/30 to-white text-slate-800 flex flex-col justify-between selection:bg-blue-200/50 selection:text-slate-900">
        
        {/* HEADER BAR */}
        <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-teal-400 flex items-center justify-center shadow-md shadow-blue-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                FreshKeep
              </span>
            </div>

            {/* Profile badge and sign-out */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 font-semibold">{currentUser.email}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-100">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <button 
                id="cta-logout"
                onClick={handleLogout}
                className="text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-500 transition-all duration-200 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* FEEDBACK STATUS BAR */}
        {feedbackMessage && (
          <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 transition-all duration-300">
            {feedbackMessage}
          </div>
        )}

        {/* DASHBOARD BODY */}
        <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl space-y-6">
          
          {/* Welcome Dashboard Banner */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none"></div>
            <div className="space-y-1 relative z-10">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                Welcome back, {currentUser.name}! 👋
              </h2>
              <p className="text-slate-400 text-xs font-medium">
                Keep your products fresh and prevent food waste by checking your trackers.
              </p>
            </div>
            
            <button
              onClick={() => { setError(''); setShowAddModal(true); }}
              className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full md:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Expiring Item
            </button>
          </div>

          {/* STATISTICS STATS OVERVIEW */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm text-center">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalItems}</span>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Total Items</p>
            </div>
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm text-center border-rose-100">
              <span className="text-xl sm:text-2xl font-black text-rose-500">{criticalCount}</span>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Urgent (≤1d)</p>
            </div>
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm text-center border-amber-100">
              <span className="text-xl sm:text-2xl font-black text-amber-600">{warningCount}</span>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Warning (≤5d)</p>
            </div>
          </div>

          {/* FILTERING & SEARCH TOOLBAR */}
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by title or barcode UPC..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium text-slate-800 placeholder-slate-400 transition-colors"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Expiry filter selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Expiry Filter:</span>
              <button
                onClick={() => { setExpiryFilter(''); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  expiryFilter === '' 
                    ? 'bg-slate-900 border-slate-900 text-white' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setExpiryFilter('1month'); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  expiryFilter === '1month' 
                    ? 'bg-slate-900 border-slate-900 text-white' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                ≤ 1 Month
              </button>
              <button
                onClick={() => { setExpiryFilter('3months'); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  expiryFilter === '3months' 
                    ? 'bg-slate-900 border-slate-900 text-white' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                ≤ 3 Months
              </button>
              <button
                onClick={() => { setExpiryFilter('expired'); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  expiryFilter === 'expired' 
                    ? 'bg-rose-600 border-rose-600 text-white' 
                    : 'bg-white border-slate-200 hover:bg-rose-50 text-rose-600 hover:border-rose-100'
                }`}
              >
                Expired
              </button>
            </div>
          </div>

          {/* CATEGORY TABS (Client side filtered for reactive layout feedback) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['All', 'Fridge', 'Pantry', 'Freezer', 'Medicine', 'Other'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap border transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ACTIVE INVENTORY LIST GRID */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  Tracker List
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-sans">
                    {filteredItems.length} listed
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400 font-bold tracking-wide uppercase">Sort: Closest Expiry First</span>
              </div>

              {loadingItems ? (
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  <p className="text-xs text-slate-400 mt-3 font-semibold">Updating items list...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 border border-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm">No items tracked yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                      {search || expiryFilter || categoryFilter !== 'All' 
                        ? 'No items match your active filters or query.' 
                        : 'Get started by logging the products you want to monitor.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredItems.map((item) => {
                    const { color, status, progress } = getExpiryDetails(item.expiryDate);
                    return (
                      <div 
                        key={item._id} 
                        className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:scale-[1.005] hover:shadow-sm"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-200/70 text-slate-500 uppercase tracking-wide">
                              {item.category}
                            </span>
                            {item.amount && (
                              <span className="text-[9px] font-semibold text-slate-400">
                                ({item.amount})
                              </span>
                            )}
                            {item.upc && (
                              <span className="text-[9px] text-slate-400 font-mono tracking-tighter" title="UPC Code">
                                📟 {item.upc}
                              </span>
                            )}
                          </div>
                          
                          {/* Progress bar visual indicator */}
                          <div className="flex items-center gap-3">
                            <div className="w-full max-w-xs bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                color === 'red' || color === 'rose' ? 'bg-red-500 animate-pulse' :
                                color === 'amber' ? 'bg-amber-500' :
                                color === 'sky' ? 'bg-sky-500' : 'bg-emerald-500'
                              }`} style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold">{progress}% freshness</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-200/50">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                            color === 'red' || color === 'rose' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            color === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            color === 'sky' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                            'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {status}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEditClick(item)}
                              className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Edit Item"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                              </svg>
                            </button>

                            <button
                              onClick={() => { setItemToDelete({ id: item._id, title: item.title }); setShowDeleteModal(true); }}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-6">
                <span className="text-xs text-slate-400 font-semibold">
                  Page {page} of {totalPages} ({totalItems} total items)
                </span>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-slate-200 bg-white py-6">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
            <span className="font-bold text-slate-800 text-xs">FreshKeep</span>
            <p className="text-[10px] text-slate-400 font-semibold">
              &copy; {new Date().getFullYear()} FreshKeep. Secure Database Sync Active.
            </p>
          </div>
        </footer>

        {/* ADD ITEM MODAL OVERLAY */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
            <form onSubmit={handleAddItemSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 w-full max-w-md shadow-xl relative z-10 space-y-4">
              
              {/* Close Button */}
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Add Expiring Item</h3>
                <p className="text-[10px] text-slate-400 font-medium">Log your food, medicine, or cosmetics to track shelf life.</p>
              </div>

              {/* Error messages */}
              {error && (
                <div className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-100 p-2.5 rounded-lg">
                  {error}
                </div>
              )}

              {/* Scan Barcode mock alert */}
              {scannerAlert && (
                <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg animate-bounce">
                  {scannerAlert}
                </div>
              )}

              <div className="space-y-3.5 text-left">
                {/* Barcode scanner row */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">UPC Barcode (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 078742351860"
                      value={newItemUPC}
                      onChange={(e) => setNewItemUPC(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={startScanner}
                      className="bg-gradient-to-r from-blue-600 to-teal-500 hover:opacity-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      📷 Scan
                    </button>
                    <button
                      type="button"
                      onClick={handleMockScan}
                      className="bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      📟 Mock
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Strawberries"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-850 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="Fridge">Fridge</option>
                      <option value="Pantry">Pantry</option>
                      <option value="Freezer">Freezer</option>
                      <option value="Medicine">Medicine</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount / Quantity</label>
                    <input
                      type="text"
                      placeholder="e.g. 500g, 2 packs"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newItemExpiry}
                    onChange={(e) => setNewItemExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 text-center text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 text-center text-white bg-gradient-to-r from-blue-600 to-teal-500 hover:opacity-95 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-blue-500/10"
                >
                  {loading ? 'Adding...' : 'Add to Tracker'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* EDIT ITEM MODAL OVERLAY */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
            <form onSubmit={handleEditItemSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 w-full max-w-md shadow-xl relative z-10 space-y-4">
              
              {/* Close Button */}
              <button 
                type="button"
                onClick={() => setShowEditModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Edit Tracked Item</h3>
                <p className="text-[10px] text-slate-400 font-medium">Update the details of your expiring product.</p>
              </div>

              {/* Error messages */}
              {error && (
                <div className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-100 p-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-3.5 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">UPC Barcode (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 078742351860"
                      value={newItemUPC}
                      onChange={(e) => setNewItemUPC(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={startScanner}
                      className="bg-gradient-to-r from-blue-600 to-teal-500 hover:opacity-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      📷 Scan
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-850 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="Fridge">Fridge</option>
                      <option value="Pantry">Pantry</option>
                      <option value="Freezer">Freezer</option>
                      <option value="Medicine">Medicine</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount / Quantity</label>
                    <input
                      type="text"
                      placeholder="e.g. 500g, 2 packs"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newItemExpiry}
                    onChange={(e) => setNewItemExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-1/2 text-center text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 text-center text-white bg-gradient-to-r from-blue-600 to-teal-500 hover:opacity-95 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-blue-500/10"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL OVERLAY */}
        {showDeleteModal && itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}></div>
            <div className="bg-white border border-slate-100 rounded-2xl p-6 w-full max-w-xs shadow-xl relative z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-rose-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Stop Tracking Item?</h3>
              </div>

              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Are you sure you want to stop tracking <span className="font-bold text-slate-800">"{itemToDelete.title}"</span>? This will permanently delete it.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}
                  className="w-1/2 text-center text-slate-500 bg-slate-100 hover:bg-slate-200 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteItem}
                  className="w-1/2 text-center text-white bg-rose-600 hover:bg-rose-700 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-rose-500/10"
                >
                  Delete Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAMERA BARCODE SCANNER MODAL VIEWPORT OVERLAY */}
        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={stopScanner}></div>
            <div className="bg-white border border-slate-100 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative z-10 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900 font-display">📷 Barcode Scanner</h3>
                <p className="text-[10px] text-slate-400 font-medium">Position the barcode within the central scanner box.</p>
              </div>

              {/* Viewport Frame */}
              <div className="relative border-4 border-slate-900 rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center">
                {scannerLoading && (
                  <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center gap-1 text-white">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Accessing Stream...</span>
                  </div>
                )}
                
                {scannerError ? (
                  <div className="absolute inset-0 z-20 bg-slate-950 p-4 flex flex-col items-center justify-center text-center gap-1.5 text-rose-500 text-[10px] font-bold leading-relaxed">
                    <span>⚠️ Camera Error</span>
                    <span className="text-slate-400 font-medium">{scannerError}</span>
                    <button 
                      type="button" 
                      onClick={startScanner}
                      className="mt-1 bg-rose-950/50 text-rose-400 border border-rose-800/50 px-3 py-1 rounded-lg hover:bg-rose-900 hover:text-white transition-all cursor-pointer font-bold"
                    >
                      Try Again
                    </button>
                  </div>
                ) : null}
                
                <div id="scanner-reader" className="w-full h-full object-cover"></div>

                {/* Laser animation */}
                {!scannerLoading && !scannerError && (
                  <div className="absolute inset-x-0 top-1/2 z-10 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-sm shadow-teal-500/50 animate-scanner-laser pointer-events-none"></div>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={stopScanner}
                  className="w-full text-center text-slate-500 bg-slate-100 hover:bg-slate-200 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancel & Close Camera
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // VIEW 2: UNAUTHENTICATED PUBLIC LANDING PAGE
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100/30 to-white text-slate-850 flex flex-col justify-between selection:bg-blue-100/50 selection:text-slate-900">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-teal-400 flex items-center justify-center shadow-md shadow-blue-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              FreshKeep
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Features</a>
            <a href="#dashboard-preview" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Preview</a>
            <a href="#about" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              id="cta-login"
              onClick={() => handleOpenModal('login')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              id="cta-register"
              onClick={() => handleOpenModal('register')}
              className="text-xs font-bold bg-gradient-to-r from-blue-600 to-teal-500 text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-blue-500/15 hover:scale-102 active:scale-98 transition-all cursor-pointer shadow-md shadow-blue-500/10"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* MAIN MARKETING HERO */}
      <main className="flex-1">
        
        {/* HERO HEADER */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
          {/* Subtle design glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] bg-teal-100/40 rounded-full blur-3xl pointer-events-none"></div>

          <div className="container mx-auto px-4 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
            
            {/* HERO LEFT */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-100 bg-blue-50/80 text-blue-600 text-[10px] font-bold tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                Save Money & Reduce Trash
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-slate-900">
                Stop Throwing Away Food. <br />
                <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-teal-500 bg-clip-text text-transparent">Track Shelf-Life Effortlessly.</span>
              </h1>
              <p className="text-sm text-slate-500 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                FreshKeep helps you monitor expiry dates for groceries, pantry items, pharmaceuticals, and cosmetics. Check shelf life, organize storage, and optimize your grocery budget.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  id="cta-get-started"
                  onClick={() => handleOpenModal('register')}
                  className="w-full sm:w-auto text-xs font-bold bg-gradient-to-r from-blue-600 to-teal-500 text-white px-6 py-3.5 rounded-xl hover:shadow-xl hover:shadow-blue-500/20 hover:scale-103 active:scale-97 transition-all cursor-pointer shadow-md shadow-blue-500/10"
                >
                  Start Tracking Free
                </button>
                <a
                  href="#dashboard-preview"
                  className="w-full sm:w-auto text-center text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 px-6 py-3.5 rounded-xl text-slate-600 transition-all shadow-sm"
                >
                  Explore Tracker Demo
                </a>
              </div>
            </div>

            {/* HERO RIGHT (Static Premium Card Preview) */}
            <div id="dashboard-preview" className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-white border border-slate-100 rounded-2xl p-5 shadow-lg relative">
                
                {/* Mock Card Title */}
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Dashboard Overview</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Simulated Trackers</p>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    4 Active Items
                  </span>
                </div>

                {/* Expiry Items List */}
                <div className="space-y-3">
                  {/* Milk */}
                  <div className="bg-slate-50/50 border border-rose-100 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Fresh Whole Milk</h4>
                        <p className="text-[9px] text-slate-400 font-semibold">Fridge Category</p>
                      </div>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">
                        Expires Tomorrow
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 h-1 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full w-[10%]"></div>
                    </div>
                  </div>

                  {/* Spinach */}
                  <div className="bg-slate-50/50 border border-amber-100 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Organic Spinach</h4>
                        <p className="text-[9px] text-slate-400 font-semibold">Pantry Category</p>
                      </div>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-50 text-amber-700 border border-amber-100">
                        3 Days Left
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 h-1 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full w-[35%]"></div>
                    </div>
                  </div>

                  {/* Yogurt */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Greek Strawberry Yogurt</h4>
                        <p className="text-[9px] text-slate-400 font-semibold">Fridge Category</p>
                      </div>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                        8 Days Left
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full w-[90%]"></div>
                    </div>
                  </div>
                </div>

                {/* Ping alert indicator badge */}
                <div className="absolute -bottom-3 -right-3 bg-white border border-slate-100 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 max-w-[150px]">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                  <span className="text-[9px] font-bold text-slate-500">1 Critical Alert Triggered</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FEATURES GRID DESCRIPTION */}
        <section id="features" className="py-16 bg-slate-100/50 border-t border-slate-200/60">
          <div className="container mx-auto px-4">
            
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Core Tracking Features
              </h2>
              <p className="text-slate-400 text-xs font-semibold">
                Designed to make grocery tracking seamless, lightning fast, and highly visual.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Feature 1 */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500/20 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors border border-blue-100">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.04 9.04 0 0 1-2.857 1.186 9.04 9.04 0 0 1-2.857-1.186m11.857-8.082c0 3.3-2.006 6.082-4.857 7.082a9.04 9.04 0 0 1-7.002 0C4.006 15.082 2 12.3 2 9V8.082c0-3.3 2.006-6.082 4.857-7.082a9.04 9.04 0 0 1 7.002 0c2.85 1 4.857 3.782 4.857 7.082v.918Z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">Smart Highlighting</h3>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">
                  Automatic urgency badges shift from green to yellow, and then pulse red as the product nears expiration.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-500/20 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-5 group-hover:bg-teal-100 transition-colors border border-teal-100">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-teal-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">UPC Scanning</h3>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">
                  Enter barcode numbers manually or trigger simulated scans to rapidly populate product details with default expiry intervals.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-300/30 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-emerald-50/50 flex items-center justify-center mb-5 group-hover:bg-emerald-100 transition-colors border border-emerald-100">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5h3.75M12 9.75h3.75m6.75 3.75H18M16.5 21V3.75m0 5.25a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0 3 0m-3 0V21" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">Section Organizing</h3>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">
                  Organize storage sectors by Fridge, Pantry, Freezer, and Medicine Cabinets to quickly locate items before they spoil.
                </p>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer id="about" className="border-t border-slate-200 bg-white py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-teal-400 flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-xs">FreshKeep</span>
          </div>

          <p className="text-[10px] text-slate-400 font-semibold">
            &copy; {new Date().getFullYear()} FreshKeep. Secure session validation. All rights reserved.
          </p>
        </div>
      </footer>

      {/* LIVE REGISTER/LOGIN AUTH MODAL OVERLAY */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          
          {/* Modal Container */}
          <form onSubmit={handleAuthSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 w-full max-w-md shadow-xl relative z-10 space-y-4">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                {modalType === 'login' ? 'Welcome Back' : 'Create Account'}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {modalType === 'login' 
                  ? 'Access your product categories and shelf indicators' 
                  : 'Start monitoring your inventory and reducing food waste'}
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-left text-[10px] text-rose-600 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 mt-0.5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3.5 text-left">
              {modalType === 'register' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    disabled={loading}
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-855 focus:outline-none focus:border-blue-500 font-medium disabled:opacity-60 placeholder-slate-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  disabled={loading}
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-855 focus:outline-none focus:border-blue-500 font-medium disabled:opacity-60 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  disabled={loading}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-855 focus:outline-none focus:border-blue-500 font-medium disabled:opacity-60 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button 
                type="submit"
                disabled={loading}
                className="w-full text-center text-white bg-gradient-to-r from-blue-600 to-teal-500 font-bold py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/15 hover:scale-102 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-75 shadow-md"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>{modalType === 'login' ? 'Sign In' : 'Sign Up'}</span>
                )}
              </button>
              
              <div className="text-center text-[10px] text-slate-400 font-bold">
                {modalType === 'login' ? (
                  <span>New to FreshKeep? <button type="button" onClick={() => { setError(''); setModalType('register') }} className="text-blue-600 font-bold hover:underline cursor-pointer">Sign Up</button></span>
                ) : (
                  <span>Already have an account? <button type="button" onClick={() => { setError(''); setModalType('login') }} className="text-blue-600 font-bold hover:underline cursor-pointer">Sign In</button></span>
                )}
              </div>
            </div>

          </form>
        </div>
      )}

    </div>
  )
}

export default App
