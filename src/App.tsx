import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  Calendar, 
  BrainCircuit,
  TrendingUp,
  Database,
  RefreshCw,
  PlusCircle,
  FolderOpen,
  Settings,
  Plus,
  Trash2,
  X,
  Cloud,
  CloudOff,
  LogOut,
  LogIn,
  UserCheck,
  Sparkles,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Trade, TradePlan, TradingAccount } from './types';
import { INITIAL_TRADE_PLANS, INITIAL_TRADES, INITIAL_ACCOUNTS } from './mockData';

// Import Firebase config & helpers
import { 
  auth, 
  db, 
  googleProvider, 
  isFirebaseConfigured, 
  signInWithPopup, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch
} from './lib/firebase';

// Import sub-components
import Dashboard from './components/Dashboard';
import TradePlanView from './components/TradePlanView';
import JournalView from './components/JournalView';
import PnLCalendar from './components/PnLCalendar';
import InsightsView from './components/InsightsView';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Cloud Sync & Firebase states
  const [user, setUser] = useState<any>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);

  // Email/Password sign-in states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Accounts State with LocalStorage
  const [accounts, setAccounts] = useState<TradingAccount[]>(() => {
    const saved = localStorage.getItem('TRADEPLAN_ACCOUNTS');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_ACCOUNTS;
      }
    }
    return INITIAL_ACCOUNTS;
  });

  // Selected Account State
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const saved = localStorage.getItem('TRADEPLAN_SELECTED_ACCOUNT_ID');
    return saved || 'ALL';
  });

  // Show account management modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccBroker, setNewAccBroker] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('100000');
  const [newAccCurrency, setNewAccCurrency] = useState('USD');

  // Trades State with LocalStorage
  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem('TRADEPLAN_TRADES');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_TRADES;
      }
    }
    return INITIAL_TRADES;
  });

  // Plans State with LocalStorage
  const [plans, setPlans] = useState<TradePlan[]>(() => {
    const saved = localStorage.getItem('TRADEPLAN_PLANS');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_TRADE_PLANS;
      }
    }
    return INITIAL_TRADE_PLANS;
  });

  // Prefilled state for executing plans
  const [prefillTrade, setPrefillTrade] = useState<Partial<Trade> | null>(null);

  // Synchronize Accounts to LocalStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('TRADEPLAN_ACCOUNTS', JSON.stringify(accounts));
    }
  }, [accounts, user]);

  // Synchronize Selected Account ID to LocalStorage
  useEffect(() => {
    localStorage.setItem('TRADEPLAN_SELECTED_ACCOUNT_ID', selectedAccountId);
  }, [selectedAccountId]);

  // Synchronize Trades to LocalStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('TRADEPLAN_TRADES', JSON.stringify(trades));
    }
  }, [trades, user]);

  // Synchronize Plans to LocalStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('TRADEPLAN_PLANS', JSON.stringify(plans));
    }
  }, [plans, user]);

  // Fetch data from firestore
  const loadUserData = async (userId: string) => {
    if (!isFirebaseConfigured || !db) return;
    setIsCloudSyncing(true);
    setAuthError(null);
    try {
      // 1. Fetch accounts
      const accRef = collection(db, 'users', userId, 'accounts');
      const accSnap = await getDocs(accRef);
      let loadedAccounts: TradingAccount[] = [];
      accSnap.forEach(docSnap => {
        loadedAccounts.push({ id: docSnap.id, ...docSnap.data() } as TradingAccount);
      });

      // 2. Fetch trades
      const tradesRef = collection(db, 'users', userId, 'trades');
      const tradesSnap = await getDocs(tradesRef);
      let loadedTrades: Trade[] = [];
      tradesSnap.forEach(docSnap => {
        loadedTrades.push({ id: docSnap.id, ...docSnap.data() } as Trade);
      });

      // 3. Fetch plans
      const plansRef = collection(db, 'users', userId, 'plans');
      const plansSnap = await getDocs(plansRef);
      let loadedPlans: TradePlan[] = [];
      plansSnap.forEach(docSnap => {
        loadedPlans.push({ id: docSnap.id, ...docSnap.data() } as TradePlan);
      });

      // Seeding logic if empty
      if (loadedAccounts.length === 0 && loadedTrades.length === 0 && loadedPlans.length === 0) {
        console.log("Empty profile detected. Initializing database with current active lists...");
        const batch = writeBatch(db);
        
        accounts.forEach(acc => {
          batch.set(doc(db, 'users', userId, 'accounts', acc.id), acc);
        });
        trades.forEach(t => {
          batch.set(doc(db, 'users', userId, 'trades', t.id), t);
        });
        plans.forEach(p => {
          batch.set(doc(db, 'users', userId, 'plans', p.id), p);
        });

        await batch.commit();
      } else {
        // Update local React state with loaded variables
        if (loadedAccounts.length > 0) setAccounts(loadedAccounts);
        setTrades(loadedTrades);
        setPlans(loadedPlans);
      }
    } catch (err: any) {
      console.error("Firebase cloud sync failed:", err);
      setAuthError("Failed to synchronize with Firebase. Using local sandbox fallback.");
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    // If not configured, look for mock user login in localStorage
    const savedMock = localStorage.getItem('TRADEPLAN_MOCK_USER');
    if (savedMock) {
      try {
        const parsedMock = JSON.parse(savedMock);
        setUser(parsedMock);
        setIsDemoUser(true);
      } catch (e) {
        localStorage.removeItem('TRADEPLAN_MOCK_USER');
      }
    }

    if (!isFirebaseConfigured || !auth) {
      setFirebaseLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser: any) => {
      if (currentUser) {
        setUser(currentUser);
        setIsDemoUser(false);
        await loadUserData(currentUser.uid);
      } else {
        // Revert to local cache if no mock is present
        if (!localStorage.getItem('TRADEPLAN_MOCK_USER')) {
          setUser(null);
          const savedAccounts = localStorage.getItem('TRADEPLAN_ACCOUNTS');
          const savedTrades = localStorage.getItem('TRADEPLAN_TRADES');
          const savedPlans = localStorage.getItem('TRADEPLAN_PLANS');
          
          if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
          if (savedTrades) setTrades(JSON.parse(savedTrades));
          if (savedPlans) setPlans(JSON.parse(savedPlans));
        }
      }
      setFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync operations handlers
  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured || !auth) {
      setAuthError("Firebase is not fully configured yet. Please enter Guest Mode instead.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setAuthError("Please fill out both email and password fields.");
      return;
    }
    if (authMode === 'signup' && !authDisplayName.trim()) {
      setAuthError("Please provide a display name for your profile.");
      return;
    }

    setAuthError(null);
    setAuthSubmitting(true);

    try {
      if (authMode === 'signup') {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, {
          displayName: authDisplayName
        });
        setUser({ ...res.user, displayName: authDisplayName });
      } else {
        const res = await signInWithEmailAndPassword(auth, email, password);
        setUser(res.user);
      }
      setIsDemoUser(false);
      setShowAuthModal(false);
      // Reset form fields
      setEmail('');
      setPassword('');
      setAuthDisplayName('');
    } catch (err: any) {
      console.error("Email/Password authentication failed:", err);
      let errMsg = err.message || "An authentication error occurred.";
      if (err.code === 'auth/weak-password') {
        errMsg = "Password should be at least 6 characters.";
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = "An account with this email address already exists.";
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errMsg = "Invalid email or password. Please verify and try again.";
      } else if (err.code === 'auth/invalid-email') {
        errMsg = "The email address is not formatted correctly.";
      }
      setAuthError(errMsg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignInGoogle = async () => {
    if (!isFirebaseConfigured || !auth) return;
    setAuthError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setUser(res.user);
      setIsDemoUser(false);
      setShowAuthModal(false);
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setAuthError(err.message || "Failed to log in with Google.");
    }
  };

  const handleSignInGuest = async () => {
    setAuthError(null);
    if (isFirebaseConfigured && auth) {
      try {
        const res = await signInAnonymously(auth);
        setUser(res.user);
        setIsDemoUser(false);
        setShowAuthModal(false);
      } catch (err: any) {
        console.error("Anonymous login failed:", err);
        setAuthError(err.message || "Failed to log in anonymously.");
      }
    } else {
      // Setup demo offline mock user
      const demoUser = {
        uid: 'demo-user-123',
        displayName: 'Demo Guest Trader',
        email: 'guest@tradeplan.io',
        photoURL: null
      };
      localStorage.setItem('TRADEPLAN_MOCK_USER', JSON.stringify(demoUser));
      setUser(demoUser);
      setIsDemoUser(true);
      setShowAuthModal(false);
    }
  };

  const handleAuthSignOut = async () => {
    setAuthError(null);
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Sign out failed", err);
      }
    }
    
    // Clear mock user state
    localStorage.removeItem('TRADEPLAN_MOCK_USER');
    setUser(null);
    setIsDemoUser(false);

    // Reset local data from cache
    const savedAccounts = localStorage.getItem('TRADEPLAN_ACCOUNTS');
    const savedTrades = localStorage.getItem('TRADEPLAN_TRADES');
    const savedPlans = localStorage.getItem('TRADEPLAN_PLANS');
    
    setAccounts(savedAccounts ? JSON.parse(savedAccounts) : INITIAL_ACCOUNTS);
    setTrades(savedTrades ? JSON.parse(savedTrades) : INITIAL_TRADES);
    setPlans(savedPlans ? JSON.parse(savedPlans) : INITIAL_TRADE_PLANS);
  };

  // Event Handlers for Trades
  const handleAddTrade = async (newTrade: Omit<Trade, 'id'>) => {
    const trade: Trade = {
      ...newTrade,
      id: `trade-${Date.now()}`
    };
    setTrades(prev => [trade, ...prev]);

    if (user && db && !isDemoUser) {
      setIsCloudSyncing(true);
      try {
        await setDoc(doc(db, 'users', user.uid, 'trades', trade.id), trade);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/trades/${trade.id}`);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleEditTrade = async (id: string, updatedFields: Partial<Trade>) => {
    setTrades(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updatedFields } : t);
      const updatedTrade = updated.find(t => t.id === id);
      
      if (user && db && !isDemoUser && updatedTrade) {
        setDoc(doc(db, 'users', user.uid, 'trades', id), updatedTrade).catch(e => {
          handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/trades/${id}`);
        });
      }
      return updated;
    });
  };

  const handleDeleteTrade = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this trade from your journal?')) {
      setTrades(prev => prev.filter(t => t.id !== id));
      
      if (user && db && !isDemoUser) {
        setIsCloudSyncing(true);
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'trades', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/trades/${id}`);
        } finally {
          setIsCloudSyncing(false);
        }
      }
    }
  };

  // Event Handlers for Setup Plans
  const handleAddPlan = async (newPlan: Omit<TradePlan, 'id' | 'createdAt'>) => {
    const plan: TradePlan = {
      ...newPlan,
      id: `plan-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setPlans(prev => [plan, ...prev]);

    if (user && db && !isDemoUser) {
      setIsCloudSyncing(true);
      try {
        await setDoc(doc(db, 'users', user.uid, 'plans', plan.id), plan);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/plans/${plan.id}`);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleArchivePlan = async (id: string) => {
    setPlans(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status: 'ARCHIVED' as const } : p);
      const updatedPlan = updated.find(p => p.id === id);
      
      if (user && db && !isDemoUser && updatedPlan) {
        setDoc(doc(db, 'users', user.uid, 'plans', id), updatedPlan).catch(e => {
          handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/plans/${id}`);
        });
      }
      return updated;
    });
  };

  const handleDeletePlan = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this setup plan?')) {
      setPlans(prev => prev.filter(p => p.id !== id));

      if (user && db && !isDemoUser) {
        setIsCloudSyncing(true);
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'plans', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/plans/${id}`);
        } finally {
          setIsCloudSyncing(false);
        }
      }
    }
  };

  // Execute plan action (pre-fills trade logger and redirects tab)
  const handleExecutePlan = (plan: TradePlan) => {
    setPrefillTrade({
      asset: plan.asset,
      setup: plan.triggers ? 'BoS Downside' : 'Highs Rejection',
      direction: plan.bias === 'BULLISH' ? 'BUY' : 'SELL'
    });
    setCurrentTab('journal');
  };

  // Resets the state back to defaults
  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to reset all data back to the default Gold Spot / FX template? Your current custom logs will be overwritten.')) {
      setTrades(INITIAL_TRADES);
      setPlans(INITIAL_TRADE_PLANS);
      setAccounts(INITIAL_ACCOUNTS);
      setSelectedAccountId('ALL');
      localStorage.removeItem('TRADEPLAN_TRADES');
      localStorage.removeItem('TRADEPLAN_PLANS');
      localStorage.removeItem('TRADEPLAN_ACCOUNTS');
      localStorage.removeItem('TRADEPLAN_SELECTED_ACCOUNT_ID');
      setCurrentTab('dashboard');

      if (user && db && !isDemoUser) {
        setIsCloudSyncing(true);
        try {
          const batch = writeBatch(db);
          
          // Seed the reset data directly
          INITIAL_ACCOUNTS.forEach(acc => {
            batch.set(doc(db, 'users', user.uid, 'accounts', acc.id), acc);
          });
          INITIAL_TRADES.forEach(t => {
            batch.set(doc(db, 'users', user.uid, 'trades', t.id), t);
          });
          INITIAL_TRADE_PLANS.forEach(p => {
            batch.set(doc(db, 'users', user.uid, 'plans', p.id), p);
          });

          await batch.commit();
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/batch_reset`);
        } finally {
          setIsCloudSyncing(false);
        }
      }
    }
  };

  const handleImportBackup = (backupTrades: Trade[]) => {
    setTrades(backupTrades);
  };

  // Account Management handlers
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const newAcc: TradingAccount = {
      id: `acc-${Date.now()}`,
      name: newAccName,
      broker: newAccBroker || 'Unknown Broker',
      initialBalance: parseFloat(newAccBalance) || 0,
      currency: newAccCurrency || 'USD'
    };

    setAccounts(prev => [...prev, newAcc]);
    setSelectedAccountId(newAcc.id);
    
    // Reset Form
    setNewAccName('');
    setNewAccBroker('');
    setNewAccBalance('100000');
    setNewAccCurrency('USD');

    if (user && db && !isDemoUser) {
      setIsCloudSyncing(true);
      try {
        await setDoc(doc(db, 'users', user.uid, 'accounts', newAcc.id), newAcc);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/accounts/${newAcc.id}`);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleDeleteAccount = async (accId: string) => {
    if (accounts.length <= 1) {
      alert('You must have at least one trading account remaining.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this trading account? Deleting the account will also filter out its linked trades from your journal views.')) {
      setAccounts(prev => prev.filter(a => a.id !== accId));
      setTrades(prev => prev.filter(t => t.accountId !== accId));
      if (selectedAccountId === accId) {
        setSelectedAccountId('ALL');
      }

      if (user && db && !isDemoUser) {
        setIsCloudSyncing(true);
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'accounts', accId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/accounts/${accId}`);
        } finally {
          setIsCloudSyncing(false);
        }
      }
    }
  };

  // Filter trades dynamically by active account
  const activeAccount = accounts.find(a => a.id === selectedAccountId);
  
  const filteredTrades = trades.filter(t => {
    if (selectedAccountId === 'ALL') return true;
    return t.accountId === selectedAccountId;
  });

  // Calculate account stats or defaults
  const totalAccountInitialBalance = selectedAccountId === 'ALL' 
    ? accounts.reduce((sum, a) => sum + a.initialBalance, 0)
    : activeAccount?.initialBalance || 100000;

  const currentAccountCurrency = selectedAccountId === 'ALL'
    ? 'USD'
    : activeAccount?.currency || 'USD';

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-800 antialiased font-sans">
      
      {/* Upper Navigation Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/10">
                <TrendingUp size={18} className="text-white" />
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-slate-900 text-sm block">TRADEPLAN</span>
                <span className="text-4xs font-bold text-blue-600 font-mono tracking-widest uppercase block">SYSTEM INTERFACE</span>
              </div>
            </div>

            {/* Account Switcher Component */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                <Database size={13} className="text-blue-600" />
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="text-2xs font-extrabold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer font-sans"
                >
                  <option value="ALL">Consolidated Views (All Accounts)</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — {acc.broker} ({acc.currency})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="p-1 hover:bg-slate-200/60 rounded-md text-slate-400 hover:text-slate-600 transition"
                  title="Configure Accounts"
                >
                  <Settings size={13} />
                </button>
              </div>
            </div>

            {/* Main Tabs Navigation */}
            <nav className="hidden lg:flex space-x-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'plans', label: 'Setup Plans', icon: FileText },
                { id: 'journal', label: 'Journal Logs', icon: BookOpen },
                { id: 'calendar', label: 'PnL Calendar', icon: Calendar },
                { id: 'insights', label: 'Tactical Insights', icon: BrainCircuit }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-btn-${tab.id}`}
                    onClick={() => {
                      setCurrentTab(tab.id);
                      if (tab.id !== 'journal') setPrefillTrade(null);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

             {/* Reset helper bar */}
            <div className="flex items-center gap-2">
              {/* Cloud Sync Button */}
              {firebaseLoading ? (
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 text-slate-400 text-3xs font-extrabold rounded-lg">
                  <Loader2 size={10} className="animate-spin" />
                  <span>Checking...</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border text-3xs font-extrabold uppercase tracking-wider rounded-lg hover:bg-opacity-80 transition cursor-pointer ${
                      isDemoUser 
                        ? 'bg-amber-50 border-amber-200 text-amber-700' 
                        : 'bg-green-50 border-green-200 text-green-700'
                    }`}
                    title={isDemoUser ? "Connected in local Guest Mode" : `Connected and Synced: ${user.displayName || user.email}`}
                  >
                    <div className="relative flex h-1.5 w-1.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDemoUser ? 'bg-amber-400' : 'bg-green-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isDemoUser ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                    </div>
                    <span>{isDemoUser ? "Guest Mode" : `${user.displayName || user.email?.split('@')[0] || 'Cloud Active'}`}</span>
                    {isCloudSyncing && <RefreshCw size={9} className="animate-spin ml-0.5" />}
                  </button>

                  <button
                    onClick={handleAuthSignOut}
                    className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 text-3xs font-extrabold uppercase tracking-wider rounded-lg transition cursor-pointer"
                    title="Sign out of current account"
                  >
                    <LogOut size={10} />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-mono font-bold uppercase tracking-wider">
                    Guest Mode
                  </span>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-3xs font-extrabold uppercase tracking-wider rounded-lg transition cursor-pointer shadow-xs"
                    title="Sign in or register an account to backup data"
                  >
                    <LogIn size={10} />
                    <span>User Login</span>
                  </button>
                </div>
              )}

              <button
                onClick={handleResetData}
                className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 text-3xs font-extrabold uppercase tracking-wider rounded-lg transition cursor-pointer"
                title="Reset to preloaded Gold demo data"
              >
                <RefreshCw size={10} />
                Reset Demo
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Account Switcher / Management Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-100 p-6 space-y-5 shadow-2xl animate-scaleUp">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-150">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <Database size={18} className="text-blue-600" />
                  Trading Accounts Manager
                </h3>
                <p className="text-3xs text-slate-400 font-sans">
                  Monitor distinct balances and metrics. Create evaluation or live accounts below.
                </p>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* List of existing accounts */}
            <div className="space-y-2">
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Active Portfolio Accounts</span>
              <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                {accounts.map(acc => {
                  const accTrades = trades.filter(t => t.accountId === acc.id);
                  const accNetPnl = accTrades.reduce((sum, t) => sum + t.pnl, 0);
                  const isSelected = selectedAccountId === acc.id;

                  return (
                    <div 
                      key={acc.id} 
                      className={`p-3 rounded-xl border flex justify-between items-center text-xs transition ${
                        isSelected 
                          ? 'bg-blue-50/40 border-blue-200' 
                          : 'bg-slate-50/50 border-slate-150'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-800">{acc.name}</strong>
                          <span className="text-4xs bg-slate-200/80 px-1 py-0.5 rounded text-slate-500 font-bold uppercase">{acc.broker}</span>
                        </div>
                        <div className="text-3xs text-slate-500 font-mono">
                          Start Balance: ${acc.initialBalance.toLocaleString()} • Current P&L:{' '}
                          <span className={accNetPnl >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {accNetPnl >= 0 ? '+' : ''}${accNetPnl.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedAccountId(acc.id)}
                          className={`px-2 py-1 text-3xs font-extrabold tracking-wider uppercase rounded-md transition ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                          }`}
                        >
                          {isSelected ? 'Active' : 'Select'}
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Account and linked trades"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create New Account form */}
            <form onSubmit={handleCreateAccount} className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3.5">
              <span className="text-3xs text-slate-500 font-bold uppercase tracking-wider block">Provision New Trading Account</span>
              <div className="grid grid-cols-2 gap-3 text-2xs">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Account Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. $100k FTMO Challenge"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Broker / Provider</label>
                  <input
                    type="text"
                    placeholder="e.g. Funding Pips, IC Markets"
                    value={newAccBroker}
                    onChange={(e) => setNewAccBroker(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Initial Balance</label>
                  <input
                    type="number"
                    required
                    placeholder="100000"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Base Currency</label>
                  <select
                    value={newAccCurrency}
                    onChange={(e) => setNewAccCurrency(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
              >
                Create and Switch Account
              </button>
            </form>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition"
              >
                Close Manager
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Cloud Sync (Auth) Setup Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-6 space-y-5 shadow-2xl animate-scaleUp">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-150">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Cloud size={18} className="text-blue-600" />
                  Cloud Sync & Backup
                </h3>
                <p className="text-3xs text-slate-400 font-sans">
                  Synchronize your active setups and journals securely across multiple browsers.
                </p>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            {user ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50/50 border border-green-200/80 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-green-900">Successfully Connected</h4>
                    <p className="text-4xs text-green-700 mt-0.5">
                      {isDemoUser ? "Operating in Local Demo Guest sandbox" : `Signed in as ${user.email}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="text-3xs font-extrabold text-slate-450 uppercase tracking-widest font-mono">Sync Telemetry</div>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-2xs font-sans text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>Cloud Status:</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Active
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Sync Engine:</span>
                      <span className="font-mono text-3xs font-semibold text-slate-500">
                        {isDemoUser ? "LOCAL_SANDBOX" : "FIRESTORE_DB"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Accounts:</span>
                      <span className="font-mono text-3xs font-bold text-slate-800">{accounts.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Logged Trades:</span>
                      <span className="font-mono text-3xs font-bold text-slate-800">{trades.length}</span>
                    </div>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-3xs font-sans">
                    {authError}
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 gap-3">
                  <button
                    onClick={handleAuthSignOut}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-2xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut size={12} />
                    Disconnect Sync
                  </button>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-2xs rounded-lg transition cursor-pointer"
                  >
                    Keep Sync Active
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Segment tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-3xs font-extrabold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                    className={`flex-1 py-1.5 text-center rounded-lg transition cursor-pointer ${authMode === 'signin' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-850'}`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                    className={`flex-1 py-1.5 text-center rounded-lg transition cursor-pointer ${authMode === 'signup' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-850'}`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Form */}
                {!isFirebaseConfigured ? (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1.5 text-3xs text-amber-800">
                    <div className="font-extrabold flex items-center gap-1 text-[10px] text-amber-900">
                      <ShieldAlert size={12} className="text-amber-600" />
                      Firebase Backend Unconfigured
                    </div>
                    <p className="leading-relaxed font-sans text-slate-600">
                      The Firebase database configuration is not yet fully loaded or provisioned. 
                      You can enter <strong className="text-amber-900">Guest Mode (Demo Offline)</strong> below to log trades, manage your account, and test the AI Coach in-browser right now!
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleEmailPasswordAuth} className="space-y-3">
                    {authMode === 'signup' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Your Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Shubh Trader"
                          value={authDisplayName}
                          onChange={(e) => setAuthDisplayName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-750 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-750 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-750 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    {authError && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-3xs font-sans">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-2xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {authSubmitting ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>{authMode === 'signin' ? 'Sign In to Sync' : 'Create Real Account'}</span>
                      )}
                    </button>
                  </form>
                )}

                {/* Separator */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-150"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Or Alternatives</span>
                  <div className="flex-grow border-t border-slate-150"></div>
                </div>

                {/* Alternative Logins */}
                <div className="space-y-2">
                  {isFirebaseConfigured ? (
                    <button
                      onClick={handleSignInGoogle}
                      className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-2xs rounded-xl transition flex items-center justify-center gap-2 shadow-3xs cursor-pointer"
                    >
                      <Sparkles size={12} className="text-amber-500" />
                      <span>Continue with Google Login</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1 text-3xs text-amber-800">
                      <div className="font-extrabold flex items-center gap-1 text-[10px] text-amber-900">
                        <ShieldAlert size={12} className="text-amber-600" />
                        Google Sign-In Unconfigured
                      </div>
                      <p className="leading-relaxed font-sans text-slate-500">
                        Firebase Client Config is not yet fully loaded. Enter Guest Mode or use Email/Password sign-up to test accounts.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleSignInGuest}
                    className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-2xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer font-sans"
                  >
                    <LogIn size={12} className="text-slate-500" />
                    <span>Enter Guest Mode (Demo Offline)</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Mobile Sticky Tab bar */}
      <div className="md:hidden bg-white border-b border-slate-100 py-2 px-4 sticky top-16 z-40 overflow-x-auto flex gap-1 scrollbar-none">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'plans', label: 'Plans', icon: FileText },
          { id: 'journal', label: 'Journal', icon: BookOpen },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
          { id: 'insights', label: 'Insights', icon: BrainCircuit }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setCurrentTab(tab.id);
                if (tab.id !== 'journal') setPrefillTrade(null);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-2xs font-bold whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {currentTab === 'dashboard' && (
          <Dashboard
            trades={filteredTrades}
            plans={plans}
            onNavigate={(tab) => setCurrentTab(tab)}
            onExecutePlan={handleExecutePlan}
            onOpenNewTrade={() => {
              setPrefillTrade(null);
              setCurrentTab('journal');
            }}
            initialCapital={totalAccountInitialBalance}
            currencySymbol={currentAccountCurrency}
          />
        )}

        {currentTab === 'plans' && (
          <TradePlanView
            plans={plans}
            onAddPlan={handleAddPlan}
            onDeletePlan={handleDeletePlan}
            onArchivePlan={handleArchivePlan}
            onExecutePlan={handleExecutePlan}
          />
        )}

        {currentTab === 'journal' && (
          <JournalView
            trades={filteredTrades}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onAddTrade={handleAddTrade}
            onEditTrade={handleEditTrade}
            onDeleteTrade={handleDeleteTrade}
            prefillTrade={prefillTrade}
            onClearPrefill={() => setPrefillTrade(null)}
            onImportBackup={handleImportBackup}
          />
        )}

        {currentTab === 'calendar' && (
          <PnLCalendar trades={filteredTrades} />
        )}

        {currentTab === 'insights' && (
          <InsightsView 
            trades={filteredTrades} 
            selectedAccountId={selectedAccountId} 
            accounts={accounts} 
          />
        )}

      </main>

      {/* Footer credits bar */}
      <footer className="bg-white border-t border-slate-100 py-5 mt-12 text-center text-3xs text-slate-400 font-mono">
        <div>TRADEPLAN & EXECUTIVE TRADING JOURNAL • CLIENT-SIDE PERSISTENCE SECURED</div>
        <div className="mt-1 flex justify-center items-center gap-1.5 text-slate-350">
          <Database size={10} />
          <span>Local Storage Cache Active • Live UTC Session Feed</span>
        </div>
      </footer>

    </div>
  );
}
