import { useState, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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

// Expiry Date calculations helpers
const getDaysRemaining = (expiryDateStr) => {
  if (!expiryDateStr) return 999;
  const expiryDate = new Date(expiryDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // start of today
  const diffTime = expiryDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getExpiryStatus = (diffDays) => {
  if (diffDays < 0) {
    return {
      label: 'EXPIRED',
      color: 'red',
      statusClass: 'bg-red-50 text-red-700 border-red-100'
    };
  } else if (diffDays === 0) {
    return {
      label: 'EXPIRES TODAY',
      color: 'rose',
      statusClass: 'bg-rose-50 text-rose-700 border-rose-100'
    };
  } else if (diffDays <= 7) {
    return {
      label: 'EXPIRING SOON',
      color: 'amber',
      statusClass: 'bg-amber-50 text-amber-700 border-amber-100'
    };
  } else if (diffDays <= 30) {
    return {
      label: 'UPCOMING',
      color: 'sky',
      statusClass: 'bg-sky-50 text-sky-600 border-sky-100'
    };
  } else {
    return {
      label: 'SAFE',
      color: 'emerald',
      statusClass: 'bg-emerald-50 text-emerald-650 border-emerald-100'
    };
  }
};

const getExpiryDetails = (expiryDateStr) => {
  if (!expiryDateStr) return { color: 'emerald', status: 'N/A', progress: 100, diffDays: 999, label: 'SAFE', statusClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100' };
  
  const diffDays = getDaysRemaining(expiryDateStr);
  const { label, color, statusClass } = getExpiryStatus(diffDays);

  let progress = 90;
  if (diffDays < 0) progress = 0;
  else if (diffDays === 0) progress = 0;
  else if (diffDays <= 7) progress = 30;
  else if (diffDays <= 30) progress = 65;
  else progress = 95;

  let statusText = '';
  if (diffDays < 0) {
    statusText = `Expired ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'} ago`;
  } else if (diffDays === 0) {
    statusText = 'Expires Today';
  } else if (diffDays === 1) {
    statusText = 'Expires Tomorrow';
  } else {
    statusText = `${diffDays} Days Left`;
  }

  return { color, status: statusText, progress, diffDays, label, statusClass };
};

const getCategoryStyles = (category) => {
  switch (category) {
    case 'Fridge':
      return 'bg-blue-50/70 text-blue-600 border-blue-100/50';
    case 'Pantry':
      return 'bg-amber-50/70 text-amber-700 border-amber-100/50';
    case 'Freezer':
      return 'bg-sky-50/70 text-sky-600 border-sky-100/50';
    case 'Medicine':
      return 'bg-purple-50/70 text-purple-600 border-purple-100/50';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200/60';
  }
};

const getProductEmoji = (category) => {
  switch (category) {
    case 'Fridge': return '🥛';
    case 'Pantry': return '🍞';
    case 'Freezer': return '❄️';
    case 'Medicine': return '💊';
    default: return '📦';
  }
};

const getExpiryMessage = (diffDays) => {
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return `Expired ${absDays} ${absDays === 1 ? 'day' : 'days'} ago`;
  }
  if (diffDays === 0) {
    return 'Expires today';
  }
  if (diffDays === 1) {
    return 'Expires tomorrow';
  }
  return `${diffDays} days remaining`;
};

const ExpiryBadge = ({ diffDays }) => {
  let text = 'Safe';
  let badgeClass = 'bg-emerald-50 text-emerald-650 border-emerald-100';
  let icon = '🟢';
  
  if (diffDays < 0) {
    text = 'Expired';
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
    icon = '⚫';
  } else if (diffDays === 0) {
    text = 'Expires Today';
    badgeClass = 'bg-red-50 text-red-700 border-red-100';
    icon = '🔴';
  } else if (diffDays === 1) {
    text = 'Expires Tomorrow';
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
    icon = '🔴';
  } else if (diffDays <= 7) {
    text = 'Expiring Soon';
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
    icon = '🟠';
  } else if (diffDays <= 30) {
    text = 'Upcoming';
    badgeClass = 'bg-sky-50 text-sky-600 border-sky-100';
    icon = '🟡';
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold rounded-lg border ${badgeClass}`}>
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
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

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  const expiringSoonItems = allProducts
    .filter(item => {
      const days = getDaysRemaining(item.expiryDate);
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate));

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
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
  const [expiryFilter, setExpiryFilter] = useState('') // '', '1month', '3months', 'expired', 'safe', 'expiring'
  const [categoryFilter, setCategoryFilter] = useState('All') // 'All', 'Fridge', 'Pantry', etc.
  const [sortBy, setSortBy] = useState('expiry-nearest')
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)

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
      if (categoryFilter && categoryFilter !== 'All') {
        path += `&category=${categoryFilter}`;
      }
      if (sortBy) {
        path += `&sortBy=${sortBy}`;
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

  // Fetch All Items (limit 100) for global dashboard statistics
  const fetchAllProducts = async () => {
    if (!currentUser) return;
    try {
      const data = await apiFetch('/products?limit=100');
      setAllProducts(data.products || []);
    } catch (err) {
      console.error('Fetch all products failed:', err);
    }
  };

  // Re-fetch products when pagination, search query, filters, or sorting changes
  useEffect(() => {
    fetchProducts();
    fetchAllProducts();
  }, [currentUser, page, search, expiryFilter, categoryFilter, sortBy]);

  // Click outside handler to dismiss any open product action dropdown menu
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

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
          fps: 20, 
          qrbox: (width, height) => {
            const boxWidth = Math.min(width * 0.85, 380);
            const boxHeight = Math.min(height * 0.45, 180);
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
      await fetchAllProducts();
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
      await fetchAllProducts();
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
      await fetchAllProducts();
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

  const safeCount = items.filter(item => {
    const { diffDays } = getExpiryDetails(item.expiryDate);
    return diffDays > 5;
  }).length;

  const freshnessScore = items.length === 0 ? 100 : Math.round(
    items.reduce((sum, item) => {
      return sum + getExpiryDetails(item.expiryDate).progress;
    }, 0) / items.length
  );

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (freshnessScore / 100) * circumference;

  const maxStat = Math.max(criticalCount, warningCount, safeCount, 1);
  const criticalHeight = (criticalCount / maxStat) * 44;
  const warningHeight = (warningCount / maxStat) * 44;
  const safeHeight = (safeCount / maxStat) * 44;

  // VIEW 1: AUTHENTICATED USER DASHBOARD
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const StatCard = ({ title, value, description, icon, status, onClick }) => {
    let statusClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80';
    if (status === 'positive') {
      statusClass = 'bg-emerald-50/10 dark:bg-emerald-950/10 border-emerald-105 dark:border-emerald-900/30';
    } else if (status === 'warning') {
      statusClass = 'bg-amber-50/10 dark:bg-amber-955/10 border-amber-105 dark:border-amber-900/30';
    } else if (status === 'danger') {
      statusClass = 'bg-rose-50/10 dark:bg-rose-955/10 border-rose-105 dark:border-rose-900/30';
    }
    
    return (
      <div 
        onClick={onClick}
        className={`border p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer ${statusClass}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{title}</span>
          {icon}
        </div>
        <div>
          <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">{value}</h4>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium mt-1.5">{description}</p>
        </div>
      </div>
    );
  };

  const renderDashboardView = () => {


    const expiredItemsCount = allProducts.filter(item => getDaysRemaining(item.expiryDate) < 0).length;
    const safeItemsCount = allProducts.filter(item => getDaysRemaining(item.expiryDate) > 7).length;

    return (
      <div className="space-y-6">
        {/* Dashboard Header greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              {getGreeting()}, {currentUser.name}! 👋
            </h2>
            <p className="text-slate-450 dark:text-slate-400 text-xs font-semibold">
              Keep track of your products before they expire.
            </p>
          </div>
          <button
            onClick={() => { setError(''); setShowAddModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/10 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Product
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="Total Products"
            value={allProducts.length}
            description="Your total logged inventory"
            icon={
              <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-850">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
            }
            status="neutral"
            onClick={() => setActiveTab('products')}
          />
          <StatCard
            title="Expiring Soon"
            value={expiringSoonItems.length}
            description="Expiring within 7 days"
            icon={
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-955/20 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            }
            status="warning"
            onClick={() => setActiveTab('expiring')}
          />
          <StatCard
            title="Expired"
            value={expiredItemsCount}
            description="Requires immediate attention"
            icon={
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-955/20 text-rose-500 dark:text-rose-455 flex items-center justify-center border border-rose-100 dark:border-rose-900/30">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            }
            status="danger"
            onClick={() => setActiveTab('expired')}
          />
          <StatCard
            title="Safe Products"
            value={safeItemsCount}
            description="Items with plenty of time"
            icon={
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-955/20 text-emerald-500 dark:text-emerald-455 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
            }
            status="positive"
            onClick={() => setActiveTab('products')}
          />
        </div>

        {/* Expiring Soon Slider/Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">Expiring Soon</h3>
            <button 
              onClick={() => setActiveTab('expiring')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              View All &rarr;
            </button>
          </div>

          {expiringSoonItems.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
              <span className="text-2xl">🎉</span>
              <h4 className="font-bold text-slate-850 dark:text-slate-200 text-xs">You're all caught up!</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">No products are expiring soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {expiringSoonItems.slice(0, 3).map(item => {
                const { color, progress, diffDays, label, statusClass } = getExpiryDetails(item.expiryDate);
                return (
                  <div key={item._id} className="border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 rounded-xl p-4 space-y-3 relative group">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-850 dark:text-slate-200 text-xs leading-snug truncate">{item.title}</h4>
                        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Qty: {item.amount || '1'}</p>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border shrink-0 ${getCategoryStyles(item.category)}`}>
                        {item.category}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[8px] font-bold text-slate-450 dark:text-slate-500">
                        <span>{label}</span>
                        <span className={color === 'red' || color === 'rose' ? 'text-red-500 font-black' : 'text-slate-450'}>
                          {diffDays < 0 ? 'Expired' : `${diffDays} days left`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          color === 'red' || color === 'rose' ? 'bg-red-500 animate-pulse' :
                          color === 'amber' ? 'bg-amber-500' :
                          color === 'sky' ? 'bg-sky-500' : 'bg-emerald-500'
                        }`} style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overview List Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">Inventory Overview</h3>
            <button 
              onClick={() => setActiveTab('products')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Manage Inventory &rarr;
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2.5">
              <span className="text-3xl">📦</span>
              <h4 className="font-bold text-slate-850 dark:text-slate-200 text-xs">No products yet</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Add your first product to start tracking expiry dates.</p>
              <button
                onClick={() => { setError(''); setShowAddModal(true); }}
                className="bg-blue-600 hover:bg-blue-750 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm mt-1"
              >
                + Add Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table View */}
              <table className="w-full text-left border-collapse hidden md:table">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="pb-3.5 font-bold">Product</th>
                    <th className="pb-3.5 font-bold">Category</th>
                    <th className="pb-3.5 font-bold">Expiry Date</th>
                    <th className="pb-3.5 font-bold">Remaining Time</th>
                    <th className="pb-3.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/40 text-xs">
                  {items.slice(0, 5).map(item => {
                    const { color, status, label, statusClass } = getExpiryDetails(item.expiryDate);
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-3 font-bold text-slate-805 dark:text-slate-200">{item.title}</td>
                        <td className="py-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${getCategoryStyles(item.category)}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-slate-500 dark:text-slate-450">{formatDate(item.expiryDate)}</td>
                        <td className="py-3 font-semibold text-slate-500 dark:text-slate-450">{status}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg ${statusClass}`}>
                            {label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Cards View */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {items.slice(0, 5).map(item => {
                  const { status, label, statusClass } = getExpiryDetails(item.expiryDate);
                  return (
                    <div key={item._id} className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 flex justify-between items-center gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{item.title}</h4>
                        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">Expires: {formatDate(item.expiryDate)}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg shrink-0 ${statusClass}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProductsView = () => {
    // Dynamic summary calculations based on allProducts stats list
    const totalCount = allProducts.length;
    const expiredCount = allProducts.filter(item => getDaysRemaining(item.expiryDate) < 0).length;
    const expiringSoonCount = allProducts.filter(item => {
      const days = getDaysRemaining(item.expiryDate);
      return days >= 0 && days <= 7;
    }).length;
    const safeCount = allProducts.filter(item => getDaysRemaining(item.expiryDate) > 7).length;

    return (
      <div className="space-y-6">
        {/* Products Header greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-display">
              Products
            </h2>
            <p className="text-slate-455 dark:text-slate-400 text-xs font-semibold">
              Manage and track all your products and their expiry dates.
            </p>
          </div>
          <button
            onClick={() => { setError(''); setShowAddModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/10 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Product
          </button>
        </div>

        {/* Dynamic product summary ledger */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm transition-colors duration-300">
          <div className="space-y-1 text-center sm:text-left border-r border-slate-100 dark:border-slate-800 last:border-0 pr-4">
            <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Products</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">{totalCount}</span>
          </div>
          <div className="space-y-1 text-center sm:text-left border-r border-slate-100 dark:border-slate-800 last:border-0 pr-4">
            <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">Safe</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-500">{safeCount}</span>
          </div>
          <div className="space-y-1 text-center sm:text-left border-r border-slate-100 dark:border-slate-800 last:border-0 pr-4">
            <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">Expiring Soon</span>
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-500">{expiringSoonCount}</span>
          </div>
          <div className="space-y-1 text-center sm:text-left last:border-0">
            <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider">Expired</span>
            <span className="text-lg font-extrabold text-rose-605 dark:text-rose-500">{expiredCount}</span>
          </div>
        </div>

        {/* SEARCH & FILTERS TOOLBAR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition-colors duration-300">
          
          {/* Search Bar Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search products by name, category, or UPC..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 dark:focus:border-blue-450 font-medium text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-colors"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-305 text-xs font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Tabs list */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: '', label: 'All' },
                { id: 'safe', label: 'Safe' },
                { id: 'expiring', label: 'Expiring Soon' },
                { id: 'expired', label: 'Expired' }
              ].map(f => {
                const active = expiryFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setExpiryFilter(f.id); setPage(1); }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer relative ${
                      active 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-800/85 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {f.label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Category / Sort selectors */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 font-semibold transition-all cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Fridge">Fridge</option>
                  <option value="Pantry">Pantry</option>
                  <option value="Freezer">Freezer</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Sort By selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 font-semibold transition-all cursor-pointer"
                >
                  <option value="expiry-nearest">Expiry: Nearest First</option>
                  <option value="expiry-farthest">Expiry: Farthest First</option>
                  <option value="name-az">Name: A–Z</option>
                  <option value="name-za">Name: Z–A</option>
                  <option value="recent">Recently Added</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* INVENTORY PRODUCT LIST SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6 transition-colors duration-300">
          {loadingItems ? (
            // Skeleton loader state
            <div className="space-y-4 py-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-14 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl animate-pulse flex items-center justify-between px-4">
                  <div className="space-y-1.5 w-1/3">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4"></div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-md w-1/2"></div>
                  </div>
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-md w-16"></div>
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-md w-24"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-8"></div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            // Empty State
            <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
              <span className="text-4xl">📦</span>
              <h4 className="font-bold text-slate-855 dark:text-slate-200 text-xs">
                {totalCount === 0 ? 'No products yet' : 'No products found'}
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-505 max-w-sm mx-auto font-medium leading-relaxed">
                {totalCount === 0 
                  ? 'Add your first product to start tracking expiry dates.' 
                  : 'Try changing your search keywords or resetting active filter options.'}
              </p>
              {totalCount === 0 && (
                <button
                  onClick={() => { setError(''); setShowAddModal(true); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm mt-1"
                >
                  + Add Product
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* DESKTOP PRODUCT TABLE VIEW */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <th className="pb-3.5 font-bold">Product</th>
                      <th className="pb-3.5 font-bold">Category</th>
                      <th className="pb-3.5 font-bold">UPC Barcode</th>
                      <th className="pb-3.5 font-bold">Quantity</th>
                      <th className="pb-3.5 font-bold">Expiry Date</th>
                      <th className="pb-3.5 font-bold">Freshness</th>
                      <th className="pb-3.5 font-bold">Status</th>
                      <th className="pb-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/40 text-xs">
                    {items.map(item => {
                      const daysLeft = getDaysRemaining(item.expiryDate);
                      const isExpired = daysLeft < 0;
                      const { color, progress, label, statusClass } = getExpiryDetails(item.expiryDate);
                      
                      return (
                        <tr 
                          key={item._id} 
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/20 transition-all cursor-pointer group ${
                            isExpired ? 'bg-slate-50/30 dark:bg-slate-900/20 opacity-80' : ''
                          }`}
                          onClick={() => setSelectedProductDetail(item)}
                        >
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="text-xl shrink-0">{getProductEmoji(item.category)}</span>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-450 transition-colors">
                                  {item.title}
                                </h4>
                                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                                  {item.category}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${getCategoryStyles(item.category)}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono text-[10px] text-slate-450 dark:text-slate-500">
                            {item.upc || '—'}
                          </td>
                          <td className="py-3.5 font-semibold text-slate-500 dark:text-slate-450">
                            {item.amount || '1'}
                          </td>
                          <td className="py-3.5">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(item.expiryDate)}</p>
                              <p className={`text-[9px] font-bold ${
                                isExpired ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'
                              }`}>
                                {getExpiryMessage(daysLeft)}
                              </p>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${
                                  color === 'red' || color === 'rose' ? 'bg-red-500 animate-pulse' :
                                  color === 'amber' ? 'bg-amber-500' :
                                  color === 'sky' ? 'bg-sky-500' : 'bg-emerald-500'
                                }`} style={{ width: `${progress}%` }}></div>
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550">{progress}%</span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <ExpiryBadge diffDays={daysLeft} />
                          </td>
                          <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item._id ? null : item._id); }}
                                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Actions"
                                aria-label="Action menu"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>

                              {activeMenuId === item._id && (
                                <div className="absolute right-0 mt-1.5 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 z-50 text-left">
                                  <button
                                    onClick={() => { setSelectedProductDetail(item); setActiveMenuId(null); }}
                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                                  >
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => { handleEditClick(item); setActiveMenuId(null); }}
                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                                  >
                                    Edit Product
                                  </button>
                                  <button
                                    onClick={() => { setItemToDelete({ id: item._id, title: item.title }); setShowDeleteModal(true); setActiveMenuId(null); }}
                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-rose-50/50 dark:hover:bg-red-955/20 transition-colors"
                                  >
                                    Delete Product
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE PRODUCT CARD GRID VIEW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                {items.map(item => {
                  const daysLeft = getDaysRemaining(item.expiryDate);
                  const isExpired = daysLeft < 0;
                  const { color, progress } = getExpiryDetails(item.expiryDate);
                  
                  return (
                    <div 
                      key={item._id} 
                      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm relative transition-all duration-200 hover:shadow-md cursor-pointer ${
                        isExpired ? 'opacity-90 bg-slate-50/20 dark:bg-slate-900/30' : ''
                      }`}
                      onClick={() => setSelectedProductDetail(item)}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl shrink-0">{getProductEmoji(item.category)}</span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate leading-snug">
                                {item.title}
                              </h4>
                              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                                {item.category}
                              </span>
                            </div>
                          </div>
                          
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === item._id ? null : item._id); }}
                              className="text-slate-400 hover:text-slate-600 dark:text-slate-550 dark:hover:text-slate-300 p-1 rounded-lg"
                              aria-label="Action menu"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>

                            {activeMenuId === item._id && (
                              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 z-50 text-left">
                                <button
                                  onClick={() => { setSelectedProductDetail(item); setActiveMenuId(null); }}
                                  className="w-full px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={() => { handleEditClick(item); setActiveMenuId(null); }}
                                  className="w-full px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  Edit Product
                                </button>
                                <button
                                  onClick={() => { setItemToDelete({ id: item._id, title: item.title }); setShowDeleteModal(true); setActiveMenuId(null); }}
                                  className="w-full px-3 py-1.5 text-left text-[11px] font-semibold text-red-650 hover:bg-rose-50"
                                >
                                  Delete Product
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 pt-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-450">
                          <div className="flex justify-between">
                            <span className="text-slate-400 dark:text-slate-500">Expires:</span>
                            <span className="text-slate-800 dark:text-slate-200">{formatDate(item.expiryDate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 dark:text-slate-500">Quantity:</span>
                            <span className="text-slate-800 dark:text-slate-200">{item.amount || '1'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100/80 dark:border-slate-800/40 pt-2.5 mt-1">
                        <ExpiryBadge diffDays={daysLeft} />
                        <span className={`text-[9px] font-bold ${
                          isExpired ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {getExpiryMessage(daysLeft)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAGINATION PANEL FOOTER */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-5 mt-4 transition-colors duration-300">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Page {page} of {totalPages} ({totalItems} total items)
              </span>
              
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-slate-655 dark:text-slate-450 bg-white dark:bg-slate-900"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-slate-655 dark:text-slate-450 bg-white dark:bg-slate-900"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExpiringSoonView = () => {


    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-display">Expiring Soon</h2>
          <p className="text-slate-455 dark:text-slate-400 text-xs font-semibold">
            Trackers that will expire within the next 7 days. Urgent attention is recommended.
          </p>
        </div>

        {expiringSoonItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <span className="text-4xl">🎉</span>
            <h4 className="font-bold text-slate-850 dark:text-slate-200 text-sm">You're all caught up!</h4>
            <p className="text-xs text-slate-450 dark:text-slate-500 font-medium">No products are expiring soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {expiringSoonItems.map(item => {
              const { color, progress, diffDays, label, statusClass } = getExpiryDetails(item.expiryDate);
              return (
                <div key={item._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm relative group">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-205 text-xs truncate leading-snug">{item.title}</h4>
                        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Qty: {item.amount || '1'}</p>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border shrink-0 ${getCategoryStyles(item.category)}`}>
                        {item.category}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[8px] font-bold text-slate-455 dark:text-slate-500">
                        <span>{label}</span>
                        <span className="text-red-500 font-black">{diffDays} days left</span>
                      </div>
                      <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-red-500 animate-pulse" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100/80 dark:border-slate-800/40 pt-3">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter" title={`UPC: ${item.upc}`}>
                      📟 {item.upc || 'No UPC'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setItemToDelete({ id: item._id, title: item.title }); setShowDeleteModal(true); }}
                        className="text-slate-400 dark:text-slate-505 hover:text-red-600 dark:hover:text-red-400 hover:bg-rose-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderExpiredView = () => {
    const expiredItems = allProducts
      .filter(item => getDaysRemaining(item.expiryDate) < 0)
      .sort((a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate));

    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-display">Expired Trackers</h2>
          <p className="text-slate-455 dark:text-slate-400 text-xs font-semibold">
            Trackers that are past their expiry date. Proper disposal is recommended.
          </p>
        </div>

        {expiredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <span className="text-4xl">🎉</span>
            <h4 className="font-bold text-slate-850 dark:text-slate-200 text-sm">No expired products found!</h4>
            <p className="text-xs text-slate-450 dark:text-slate-500 font-medium">Keep up the good work. 🍀</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {expiredItems.map(item => {
              const { color, progress, diffDays, label, statusClass } = getExpiryDetails(item.expiryDate);
              return (
                <div key={item._id} className="bg-white dark:bg-slate-900 border border-rose-205 dark:border-rose-900/30 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm relative group">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-205 text-xs truncate leading-snug">{item.title}</h4>
                        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Qty: {item.amount || '1'}</p>
                      </div>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border shrink-0 bg-red-50 text-red-655 border-red-100">
                        Expired
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[8px] font-bold text-slate-455 dark:text-slate-500">
                        <span className="text-red-600 font-bold">EXPIRED</span>
                        <span className="text-red-500 font-bold">{Math.abs(diffDays)} days ago</span>
                      </div>
                      <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-red-500" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100/80 dark:border-slate-800/40 pt-3">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter" title={`UPC: ${item.upc}`}>
                      📟 {item.upc || 'No UPC'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setItemToDelete({ id: item._id, title: item.title }); setShowDeleteModal(true); }}
                        className="text-slate-400 dark:text-slate-505 hover:text-red-600 dark:hover:text-red-400 hover:bg-rose-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCategoriesView = () => {
    const categories = ['Fridge', 'Pantry', 'Freezer', 'Medicine', 'Other'];
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-display">Categories Distribution</h2>
          <p className="text-slate-455 dark:text-slate-400 text-xs font-semibold">
            Trackers split by storage category location. Click a category to filter inventory.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(cat => {
            const catItems = allProducts.filter(item => item.category === cat);
            const expiredCount = catItems.filter(item => getDaysRemaining(item.expiryDate) < 0).length;
            const expiringCount = catItems.filter(item => {
              const days = getDaysRemaining(item.expiryDate);
              return days >= 0 && days <= 7;
            }).length;

            return (
              <div 
                key={cat} 
                onClick={() => { setCategoryFilter(cat); setActiveTab('products'); }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:scale-[1.01] hover:shadow-md cursor-pointer transition-all duration-300 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider border ${getCategoryStyles(cat)}`}>
                    {cat}
                  </span>
                  <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500">{catItems.length} products</span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  <div>
                    <span className="block text-sm font-extrabold text-red-655 dark:text-red-500 leading-none">{expiredCount}</span>
                    <span className="text-[8px] text-slate-400 dark:text-slate-550 font-bold uppercase">Expired</span>
                  </div>
                  <div>
                    <span className="block text-sm font-extrabold text-amber-600 dark:text-amber-500 leading-none">{expiringCount}</span>
                    <span className="text-[8px] text-slate-400 dark:text-slate-550 font-bold uppercase">Expiring</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSettingsView = () => {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-display">Account Settings</h2>
          <p className="text-slate-455 dark:text-slate-400 text-xs font-semibold">
            Manage your local user settings and connection preferences.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">User Profile</h3>
          <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold border border-blue-100 dark:border-slate-800">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">{currentUser.name}</h4>
              <p className="text-xs text-slate-400 dark:text-slate-505 font-semibold">{currentUser.email}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Visual Customization</h3>
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-xs">Dark Theme Switcher</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Toggle hardware-accelerated dark theme styles.</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              {darkMode ? '☀️ Switch Light' : '🌙 Switch Dark'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Database Sync Health</h3>
          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 dark:text-slate-450">Connection Status</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 dark:text-slate-450">API Base URL</span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{API_URL}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 dark:text-slate-450">Database Engine</span>
              <span className="font-bold text-slate-655 dark:text-slate-400">MongoDB Atlas</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // VIEW 1: AUTHENTICATED USER DASHBOARD
  if (currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        {feedbackMessage && (
          <div className="fixed top-4 right-4 z-[60] bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 transition-all duration-300">
            {feedbackMessage}
          </div>
        )}

        <div className="flex h-screen bg-primary dark:bg-slate-950 text-slate-850 dark:text-slate-200 overflow-hidden font-sans selection:bg-blue-100/50 dark:selection:bg-blue-900/40 selection:text-slate-900 dark:selection:text-slate-100 transition-colors duration-300">
          
          {/* SIDEBAR */}
          <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 transition-transform duration-300 md:relative md:translate-x-0 shrink-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Header brand logo */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-display">FreshKeep</span>
              </div>
              
              {/* Close button for mobile sidebar */}
              <button 
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sidebar Nav Links */}
            <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6">
              <div className="space-y-1.5 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1">Main</span>
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: (active) => <svg className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg> },
                  { id: 'products', label: 'Products', icon: (active) => <svg className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
                  { id: 'expiring', label: 'Expiring Soon', icon: (active) => <svg className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> },
                  { id: 'expired', label: 'Expired', icon: (active) => <svg className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
                ].map(link => {
                  const active = activeTab === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => { setActiveTab(link.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                        active 
                          ? 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {link.icon(active)}
                      {link.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5 flex flex-col pt-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1">Management</span>
                {[
                  { id: 'categories', label: 'Categories', icon: (active) => <svg className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
                  { id: 'settings', label: 'Settings', icon: (active) => <svg className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
                ].map(link => {
                  const active = activeTab === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => { setActiveTab(link.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                        active 
                          ? 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {link.icon(active)}
                      {link.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* User Profile info bottom */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-55 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-100 dark:border-slate-800">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 font-semibold truncate">{currentUser.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 py-2 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100 dark:hover:border-red-950/40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sign Out
              </button>
            </div>
          </aside>

          {/* Backdrop for mobile */}
          {sidebarOpen && (
            <div 
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden"
            ></div>
          )}

          {/* RIGHT AREA: TOPBAR + MAIN CONTENT */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
            
            {/* TOPBAR */}
            <header className="h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0 relative z-30 transition-colors duration-300">
              <div className="flex items-center gap-4 flex-1">
                {/* Hamburger Button for Mobile */}
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-205 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>

                {/* Global search in Topbar */}
                <div className="relative w-full max-w-md hidden sm:block">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Notification icon */}
                <div 
                  onClick={() => { setActiveTab('expiring'); }}
                  className="relative cursor-pointer text-slate-400 hover:text-slate-655 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title="Expiring Items Alerts"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {expiringSoonItems.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"></span>
                  )}
                </div>

                {/* Theme toggle */}
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="text-slate-400 hover:text-slate-655 dark:hover:text-amber-405 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
                  title="Toggle Theme"
                >
                  {darkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-amber-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.966-8.966h-2.25m-13.5 0h-2.25m15.364-10.864l-1.591 1.59m-11.364 11.364l-1.591 1.59m15.364 0l-1.591-1.59m-11.364-11.364l-1.591-1.59M12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden md:block">{currentUser.name}</span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-100 dark:border-slate-800">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
              </div>
            </header>

            {/* MAIN CONTENT WORKSPACE AREA */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {activeTab === 'dashboard' && renderDashboardView()}
              {activeTab === 'products' && renderProductsView()}
              {activeTab === 'expiring' && renderExpiringSoonView()}
              {activeTab === 'expired' && renderExpiredView()}
              {activeTab === 'categories' && renderCategoriesView()}
              {activeTab === 'settings' && renderSettingsView()}
            </main>
          </div>
        </div>

        {/* ADD ITEM SIDE SHEET DRAWER */}
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${showAddModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          
          {/* Slide-out Panel */}
          <form 
            onSubmit={handleAddItemSubmit} 
            className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl p-6 overflow-y-auto space-y-5 transition-transform duration-300 ease-out z-10 flex flex-col justify-between ${
              showAddModal ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="space-y-0.5">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Track New Product</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Log the details of your expiring item.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-205 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <svg xmlns="http://www.w3.org/2500/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Error messages */}
              {error && (
                <div className="text-[10px] text-red-650 font-bold bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-2.5 rounded-lg">
                  {error}
                </div>
              )}

              {/* Scan Barcode mock alert */}
              {scannerAlert && (
                <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-2.5 rounded-lg animate-bounce">
                  {scannerAlert}
                </div>
              )}

              <div className="space-y-3.5 text-left">
                {/* Barcode scanner row */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">UPC Barcode (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 078742351860"
                      value={newItemUPC}
                      onChange={(e) => setNewItemUPC(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
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
                      className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-655 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      📟 Mock
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1.5">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Strawberries"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-850 dark:text-slate-305 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
                    >
                      <option value="Fridge">Fridge</option>
                      <option value="Pantry">Pantry</option>
                      <option value="Freezer">Freezer</option>
                      <option value="Medicine">Medicine</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1.5">Amount / Quantity</label>
                    <input
                      type="text"
                      placeholder="e.g. 500g, 2 packs"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newItemExpiry}
                    onChange={(e) => setNewItemExpiry(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-805 rounded-xl px-3 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-1/2 text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-805 hover:bg-slate-205 dark:hover:bg-slate-705 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
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

        {/* EDIT ITEM SIDE SHEET DRAWER */}
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${showEditModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          
          {/* Slide-out Panel */}
          <form 
            onSubmit={handleEditItemSubmit} 
            className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl p-6 overflow-y-auto space-y-5 transition-transform duration-300 ease-out z-10 flex flex-col justify-between ${
              showEditModal ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="space-y-0.5">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Edit Tracked Item</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Update the details of your expiring product.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-205 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Error messages */}
              {error && (
                <div className="text-[10px] text-red-650 font-bold bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-3.5 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">UPC Barcode (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 078742351860"
                      value={newItemUPC}
                      onChange={(e) => setNewItemUPC(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-850 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
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
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1.5">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-850 dark:text-slate-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
                    >
                      <option value="Fridge">Fridge</option>
                      <option value="Pantry">Pantry</option>
                      <option value="Freezer">Freezer</option>
                      <option value="Medicine">Medicine</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1.5">Amount / Quantity</label>
                    <input
                      type="text"
                      placeholder="e.g. 500g, 2 packs"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newItemExpiry}
                    onChange={(e) => setNewItemExpiry(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-1/2 text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-805 hover:bg-slate-205 dark:hover:bg-slate-705 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
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

        {/* DELETE CONFIRMATION MODAL OVERLAY */}
        {showDeleteModal && itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}></div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 w-full max-w-xs shadow-xl relative z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150 transition-colors duration-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-rose-600 dark:text-rose-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">Stop Tracking Item?</h3>
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-400 font-medium leading-relaxed">
                Are you sure you want to stop tracking <span className="font-bold text-slate-800 dark:text-slate-200">"{itemToDelete.title}"</span>? This will permanently delete it.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}
                  className="w-1/2 text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteItem}
                  className="w-1/2 text-center text-white bg-rose-600 dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-600 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-rose-500/10"
                >
                  Delete Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCT DETAILS SIDE SHEET DRAWER OVERLAY */}
        {selectedProductDetail && (
          <div className="fixed inset-0 z-50 transition-opacity duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedProductDetail(null)}></div>
            
            {/* Slide-out Panel */}
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-y-auto space-y-6 transition-all duration-300 ease-out z-10 flex flex-col justify-between transition-colors duration-300">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Product Details</h3>
                  <button 
                    onClick={() => setSelectedProductDetail(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Emoji + Title Header */}
                <div className="text-center space-y-2.5">
                  <span className="text-5xl block">{getProductEmoji(selectedProductDetail.category)}</span>
                  <h4 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{selectedProductDetail.title}</h4>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wide border inline-block ${getCategoryStyles(selectedProductDetail.category)}`}>
                    {selectedProductDetail.category}
                  </span>
                </div>

                {/* Quick Expiry Status Summary card */}
                <div className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl flex items-center justify-between gap-4 transition-colors duration-300">
                  <div className="space-y-1">
                    <span className="block text-[8px] text-slate-400 dark:text-slate-505 font-bold uppercase tracking-wider">Status Indicators</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {getExpiryMessage(getDaysRemaining(selectedProductDetail.expiryDate))}
                    </p>
                  </div>
                  <ExpiryBadge diffDays={getDaysRemaining(selectedProductDetail.expiryDate)} />
                </div>

                {/* Read Only Details Grid list */}
                <div className="space-y-4 text-xs font-semibold">
                  <div className="flex justify-between py-2.5 border-b border-slate-50 dark:border-slate-850">
                    <span className="text-slate-400 dark:text-slate-500">Storage Location</span>
                    <span className="text-slate-800 dark:text-slate-200">{selectedProductDetail.category}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-50 dark:border-slate-850">
                    <span className="text-slate-400 dark:text-slate-500">Quantity / Unit</span>
                    <span className="text-slate-800 dark:text-slate-200">{selectedProductDetail.amount || '1'}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-50 dark:border-slate-850">
                    <span className="text-slate-400 dark:text-slate-500">UPC Barcode</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedProductDetail.upc || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-50 dark:border-slate-850">
                    <span className="text-slate-400 dark:text-slate-500">Expiry Date</span>
                    <span className="text-slate-800 dark:text-slate-200">{formatDate(selectedProductDetail.expiryDate)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-50 dark:border-slate-850">
                    <span className="text-slate-400 dark:text-slate-500">Logged On</span>
                    <span className="text-slate-800 dark:text-slate-200">{formatDate(selectedProductDetail.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Drawer Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  onClick={() => { handleEditClick(selectedProductDetail); setSelectedProductDetail(null); }}
                  className="w-1/2 text-center bg-slate-100 dark:bg-slate-805 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Edit Product
                </button>
                <button
                  onClick={() => { setItemToDelete({ id: selectedProductDetail._id, title: selectedProductDetail.title }); setShowDeleteModal(true); setSelectedProductDetail(null); }}
                  className="w-1/2 text-center bg-rose-600 dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-rose-500/10"
                >
                  Delete Product
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAMERA BARCODE SCANNER MODAL VIEWPORT OVERLAY */}
        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={stopScanner}></div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative z-10 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150 transition-colors duration-300">
              
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-display">📷 Barcode Scanner</h3>
                <p className="text-[10px] text-slate-405 dark:text-slate-500 font-medium">Position the barcode within the central scanner box.</p>
              </div>

              {/* Viewport Frame */}
              <div className="relative border-4 border-slate-900 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center">
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
                  className="w-full text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-202 dark:hover:bg-slate-700 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancel & Close Camera
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // VIEW 2: UNAUTHENTICATED PUBLIC LANDING PAGE
  return (
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-200 flex flex-col justify-between selection:bg-blue-100/50 dark:selection:bg-blue-900/40 selection:text-slate-900 dark:selection:text-slate-100 transition-colors duration-300">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-teal-400 flex items-center justify-center shadow-md shadow-blue-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-350 bg-clip-text text-transparent">
              FreshKeep
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#dashboard-preview" className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Preview</a>
            <a href="#about" className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Dark mode switcher */}
            <button
              onClick={toggleDarkMode}
              className="text-slate-400 hover:text-slate-655 dark:hover:text-amber-405 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all cursor-pointer shadow-sm flex items-center justify-center"
              title="Toggle Theme"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.966-8.966h-2.25m-13.5 0h-2.25m15.364-10.864l-1.591 1.59m-11.364 11.364l-1.591 1.59m15.364 0l-1.591-1.59m-11.364-11.364l-1.591-1.59M12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>

            <button 
              id="cta-login"
              onClick={() => handleOpenModal('login')}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-1.5 cursor-pointer"
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
    </div>
  )
}

export default App
