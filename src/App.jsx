import { useState, useEffect } from 'react'

function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser')
    return saved ? JSON.parse(saved) : null
  })

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('login') // 'login' or 'register'
  
  // Form Input States
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // In-Memory Inventory State (for Dashboard)
  const [items, setItems] = useState([
    { id: 1, name: 'Fresh Whole Milk', category: 'Fridge', daysLeft: 1, status: 'Expires Tomorrow', progress: 10, color: 'red' },
    { id: 2, name: 'Organic Spinach', category: 'Pantry', daysLeft: 3, status: '3 Days Left', progress: 35, color: 'yellow' },
    { id: 3, name: 'Greek Yogurt (Strawberry)', category: 'Fridge', daysLeft: 6, status: '6 Days Left', progress: 60, color: 'cyan' },
    { id: 4, name: 'Whole Grain Bread', category: 'Pantry', daysLeft: 10, status: '10 Days Left', progress: 90, color: 'emerald' }
  ])

  // New Item Form State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Fridge')
  const [newItemDays, setNewItemDays] = useState(7)

  const handleOpenModal = (type) => {
    setError('')
    setModalType(type)
    setShowModal(true)
  }

  // Handle Log Out
  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
  }

  // Submit Registration/Login Form
  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Form Client-side Validations
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }
    if (!password) {
      setError('Password is required')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    const endpoint = modalType === 'register' ? 'register' : 'login'
    const payload = modalType === 'register' 
      ? { name, email, password }
      : { email, password }

    try {
      const response = await fetch(`http://localhost:5001/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed. Please check your credentials.')
      }

      // Successful Auth
      const sessionUser = {
        ...data.user,
        token: data.token
      }
      localStorage.setItem('currentUser', JSON.stringify(sessionUser))
      setCurrentUser(sessionUser)
      
      // Close and clear modal
      setShowModal(false)
      setName('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Add New Item
  const handleAddItemSubmit = (e) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    const days = parseInt(newItemDays)
    let color = 'emerald'
    let status = `${days} Days Left`
    let progress = 90

    if (days <= 1) {
      color = 'red'
      status = days === 0 ? 'Expired Today' : 'Expires Tomorrow'
      progress = 10
    } else if (days <= 3) {
      color = 'yellow'
      progress = 35
    } else if (days <= 6) {
      color = 'cyan'
      progress = 60
    }

    const newItem = {
      id: Date.now(),
      name: newItemName,
      category: newItemCategory,
      daysLeft: days,
      status: status,
      progress: progress,
      color: color
    }

    setItems([newItem, ...items])
    setNewItemName('')
    setNewItemCategory('Fridge')
    setNewItemDays(7)
    setShowAddModal(false)
  }

  // Handle Delete Item
  const handleDeleteItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  // Helper values for dashboard stats
  const totalCount = items.length
  const criticalCount = items.filter(item => item.daysLeft <= 1).length
  const warningCount = items.filter(item => item.daysLeft > 1 && item.daysLeft <= 5).length

  // RENDER AUTHENTICATED DASHBOARD VIEW
  if (currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-primary/20 selection:text-slate-900">
        
        {/* DASHBOARD HEADER */}
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/85 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5.5 h-5.5 text-slate-900">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                FreshKeep
              </span>
            </div>

            {/* Profile badge and logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-bold text-slate-800">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 font-medium">{currentUser.email}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <button 
                id="cta-logout"
                onClick={handleLogout}
                className="text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3.5 py-2 rounded-lg border border-red-200 transition-all duration-200 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* DASHBOARD MAIN CONTENT */}
        <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl space-y-8">
          
          {/* Welcome Banner */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="space-y-2 relative z-10">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                Welcome back, {currentUser.name}! 👋
              </h2>
              <p className="text-slate-500 text-sm font-medium">
                Here is your current inventory overview. Keep your goods fresh and prevent unnecessary food waste!
              </p>
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-blue-400 text-slate-950 font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg hover:shadow-blue-200/50 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer w-full md:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Expiring Item
            </button>
          </div>

          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-150 p-4 sm:p-6 rounded-2xl shadow-sm text-center">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalCount}</span>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Total Items</p>
            </div>
            <div className="bg-white border border-slate-150 p-4 sm:p-6 rounded-2xl shadow-sm text-center border-red-200">
              <span className="text-2xl sm:text-3xl font-black text-red-500">{criticalCount}</span>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Expires Soon</p>
            </div>
            <div className="bg-white border border-slate-150 p-4 sm:p-6 rounded-2xl shadow-sm text-center border-yellow-200">
              <span className="text-2xl sm:text-3xl font-black text-yellow-600">{warningCount}</span>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Warning State</p>
            </div>
          </div>

          {/* ACTIVE INVENTORY LIST */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-slate-900 text-lg">Current Tracker List</h3>
              <span className="text-xs text-slate-500 font-medium">Sort order: Newest first</span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h4 className="font-bold text-slate-800">No items tracked yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Get started by clicking the "Add Expiring Item" button to monitor your stock.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-transform hover:scale-[1.01] duration-150">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wider">{item.category}</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="w-full max-w-xs bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            item.color === 'red' ? 'bg-red-500 animate-pulse' :
                            item.color === 'yellow' ? 'bg-yellow-500' :
                            item.color === 'cyan' ? 'bg-cyan-400' : 'bg-emerald-500'
                          }`} style={{ width: `${item.progress}%` }}></div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{item.progress}% Fresh</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                        item.color === 'red' ? 'bg-red-50 text-red-600 border border-red-100' :
                        item.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                        item.color === 'cyan' ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' :
                        'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {item.status}
                      </span>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl transition-all cursor-pointer"
                        title="Remove Item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* DASHBOARD FOOTER */}
        <footer className="border-t border-slate-200 bg-white py-8">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-center">
            <span className="font-bold text-slate-800 text-sm">FreshKeep</span>
            <p className="text-xs text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} FreshKeep. Persisted authenticated session: {currentUser._id}.
            </p>
          </div>
        </footer>

        {/* ADD ITEM IN-MEMORY MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
            <form onSubmit={handleAddItemSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative z-10">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>

              <h3 className="text-xl font-extrabold text-slate-900 mb-6">Add Expiring Item</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Strawberries"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location/Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-primary font-medium"
                  >
                    <option value="Fridge">Fridge</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Medicine">Medicine Cabinet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Days Until Expiry</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newItemDays}
                    onChange={(e) => setNewItemDays(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 text-center text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold py-3.5 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 text-center text-slate-950 bg-primary hover:bg-blue-400 font-bold py-3.5 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Add to Tracker
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    )
  }

  // RENDER LANDING PAGE VIEW (UNAUTHENTICATED)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-primary/20 selection:text-slate-900">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5.5 h-5.5 text-slate-900">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              FreshKeep
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#dashboard-preview" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Preview</a>
            <a href="#about" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              id="cta-login"
              onClick={() => handleOpenModal('login')}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              id="cta-register"
              onClick={() => handleOpenModal('register')}
              className="text-sm font-bold bg-gradient-to-r from-primary to-secondary text-slate-900 px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
          {/* Decorative background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-secondary/15 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="container mx-auto px-4 relative z-10 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* HERO LEFT */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50/80 text-blue-600 text-xs font-bold tracking-wider uppercase mb-2 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                Reduce Food Waste Instantly
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-slate-900">
                Reduce Waste. <br />
                <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 bg-clip-text text-transparent">Save Money. Stay Fresh.</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
                FreshKeep is the ultimate companion to track expiry dates for your groceries, pantry stock, cosmetics, and medicines. Stay notified, reduce household waste, and optimize your budget effortlessly.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <button
                  id="cta-get-started"
                  onClick={() => handleOpenModal('register')}
                  className="w-full sm:w-auto text-base font-bold bg-primary text-slate-950 px-8 py-3.5 rounded-xl hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  Start Tracking Free
                </button>
                <a
                  href="#dashboard-preview"
                  className="w-full sm:w-auto text-center text-base font-bold border border-slate-300 hover:border-slate-400 hover:bg-slate-100/50 px-8 py-3.5 rounded-xl text-slate-700 transition-all duration-200"
                >
                  See Demo Card
                </a>
              </div>
            </div>

            {/* HERO RIGHT (Interactive Mockup Dashboard Card) */}
            <div id="dashboard-preview" className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-white border border-slate-150 rounded-3xl p-6 shadow-xl shadow-slate-200/60 backdrop-blur-md relative">
                
                {/* Mock card header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">My Expiry Tracker</h3>
                    <p className="text-xs text-slate-400 font-medium">Expiring Items Summary</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    4 Active Items
                  </span>
                </div>

                {/* Expiry Items List */}
                <div className="space-y-4">
                  {/* Item 1 - Critical (Red) */}
                  <div className="bg-slate-50/50 border border-red-100 rounded-2xl p-4 transition-transform hover:scale-[1.02] duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">Fresh Whole Milk</h4>
                        <p className="text-xs text-slate-500 font-medium">Fridge Category</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-50 text-red-600 border border-red-100">
                        Expires Tomorrow
                      </span>
                    </div>
                    {/* Expiry Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full w-[10%] animate-pulse"></div>
                    </div>
                  </div>

                  {/* Item 2 - Warning (Yellow) */}
                  <div className="bg-slate-50/50 border border-yellow-100 rounded-2xl p-4 transition-transform hover:scale-[1.02] duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">Organic Spinach</h4>
                        <p className="text-xs text-slate-500 font-medium">Pantry Category</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-yellow-50 text-yellow-700 border border-yellow-100">
                        3 Days Left
                      </span>
                    </div>
                    {/* Expiry Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-yellow-500 h-full rounded-full w-[35%]"></div>
                    </div>
                  </div>

                  {/* Item 3 - Safe (Secondary) */}
                  <div className="bg-slate-50/50 border border-cyan-100 rounded-2xl p-4 transition-transform hover:scale-[1.02] duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">Greek Yogurt (Strawberry)</h4>
                        <p className="text-xs text-slate-500 font-medium">Fridge Category</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-cyan-50 text-cyan-600 border border-cyan-100">
                        6 Days Left
                      </span>
                    </div>
                    {/* Expiry Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full w-[60%]"></div>
                    </div>
                  </div>

                  {/* Item 4 - Very Safe (Green) */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 transition-transform hover:scale-[1.02] duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">Whole Grain Bread</h4>
                        <p className="text-xs text-slate-500 font-medium">Pantry Category</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                        10 Days Left
                      </span>
                    </div>
                    {/* Expiry Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full w-[90%]"></div>
                    </div>
                  </div>
                </div>

                {/* Small overlay floating element */}
                <div className="absolute -bottom-4 -right-4 bg-white border border-slate-100 p-3 rounded-2xl shadow-lg flex items-center gap-2 max-w-[170px]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
                  <span className="text-[10px] font-semibold text-slate-600">1 Critical Alert Triggered</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section id="features" className="py-20 bg-slate-100/50 border-t border-slate-200/60">
          <div className="container mx-auto px-4">
            
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                Everything You Need to Reduce Waste
              </h2>
              <p className="text-slate-500 font-medium">
                Our features are carefully crafted to ensure you save money on food, remember your medications, and stay safe.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              
              {/* Feature 1 */}
              <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-md shadow-slate-200/20 hover:shadow-lg hover:shadow-slate-200/40 hover:border-primary/50 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-6 group-hover:bg-primary/25 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-800">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.04 9.04 0 0 1-2.857 1.186 9.04 9.04 0 0 1-2.857-1.186m11.857-8.082c0 3.3-2.006 6.082-4.857 7.082a9.04 9.04 0 0 1-7.002 0C4.006 15.082 2 12.3 2 9V8.082c0-3.3 2.006-6.082 4.857-7.082a9.04 9.04 0 0 1 7.002 0c2.85 1 4.857 3.782 4.857 7.082v.918Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Smart Reminders</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Receive customizable dashboard highlights and notification alerts (coming soon) before your items reach their expiration date.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-md shadow-slate-200/20 hover:shadow-lg hover:shadow-slate-200/40 hover:border-secondary/50 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center mb-6 group-hover:bg-secondary/25 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-850">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Waste Analytics</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Gain visual insights on your habits. Track what you save versus what is discarded, helping you refine shopping choices.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-md shadow-slate-200/20 hover:shadow-lg hover:shadow-slate-200/40 hover:border-emerald-300 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-emerald-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 10.5H21a7.5 7.5 0 0 0 13.5 3v7.5Z" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0 3 0m-3 0V21m0-11.25V3.75m0 6V21m6-12V3.75m0 5.25a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0 3 0m-3 0V21" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5h3.75M12 9.75h3.75m6.75 3.75H18M16.5 21V3.75m0 5.25a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0 3 0m-3 0V21" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Seamless Categorization</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Sort items into Fridge, Pantry, Freezer, and Medicine Cabinets automatically. Quickly identify locations and optimize shelf-life.
                </p>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer id="about" className="border-t border-slate-200 bg-white py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-slate-900">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800">FreshKeep</span>
          </div>

          <p className="text-xs text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} FreshKeep. All rights reserved. Keep your goods fresh, reduce trash.
          </p>

          <div className="flex gap-6">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* LIVE REGISTER/LOGIN AUTH MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          
          {/* Modal Container */}
          <form onSubmit={handleAuthSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative z-10 transition-transform duration-300 scale-100">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                {modalType === 'login' ? 'Welcome Back' : 'Create Account'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {modalType === 'login' 
                  ? 'Sign in to access your inventory and alerts' 
                  : 'Start monitoring your items and saving money today'}
              </p>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="bg-red-50 border border-red-150 p-4 rounded-xl mb-4 text-left text-xs text-red-600 flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 mt-0.5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4 mb-6">
              {modalType === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    disabled={loading}
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-primary font-medium disabled:opacity-60"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  disabled={loading}
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-primary font-medium disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  disabled={loading}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-primary font-medium disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full text-center text-slate-950 bg-gradient-to-r from-primary to-secondary font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:scale-102 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{modalType === 'login' ? 'Sign In' : 'Sign Up'}</span>
                )}
              </button>
              
              <div className="text-center text-xs text-slate-500 font-medium">
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
