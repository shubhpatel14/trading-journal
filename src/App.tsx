import React, { useState, useEffect, Suspense } from 'react';
import {
  LayoutDashboard,
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
  Loader2,
  ClipboardCheck,
  Coins,
  Heart,
  Brain
} from 'lucide-react';
import { Trade, TradePlan, TradingAccount, DailyReview, WeeklyReview, JournalRule, getTradeNetPnl, SetupDefinition } from './types';
import { INITIAL_TRADE_PLANS, INITIAL_TRADES, INITIAL_ACCOUNTS, DEFAULT_JOURNAL_RULES, DEFAULT_SETUP_DEFINITIONS } from './mockData';

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
  writeBatch,
  cleanForFirestore,
  onSnapshot
} from './lib/firebase';
import { getAllIDB, saveAllIDB, saveIDB, deleteIDB, STORES } from './lib/indexedDB';
import { getTradeGrade } from './utils/tradeGrade';

// Import core sub-components
import Dashboard from './components/Dashboard';
import BrandLogo from './components/BrandLogo';
import LoginPage from './components/LoginPage';

// Lazy-loaded view components for bundle optimization
const JournalView = React.lazy(() => import('./components/JournalView'));
const PnLCalendar = React.lazy(() => import('./components/PnLCalendar'));
const InsightsView = React.lazy(() => import('./components/InsightsView'));
const PlanningReviewView = React.lazy(() => import('./components/PlanningReviewView'));
const SetupLibraryView = React.lazy(() => import('./components/SetupLibraryView'));

const ViewLoadingFallback = () => (
  <div className="clay-surface min-h-[360px] p-12 flex flex-col items-center justify-center gap-3 animate-pulse my-4">
    <Loader2 size={26} className="text-clay-accent animate-spin stroke-[2.5px]" />
    <span className="text-xs font-bold uppercase tracking-wider text-clay-muted font-mono">Optimizing Workspace View...</span>
  </div>
);

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

const isNonEmptyText = (value?: string) => typeof value === 'string' && value.trim().length > 0;

const hasMeaningfulMistakes = (mistakes?: string[]) => (
  Array.isArray(mistakes) && mistakes.some(m => m && m !== 'None')
);

const isTradeJournalComplete = (trade: Partial<Trade>) => (
  trade.journalingStatus === 'COMPLETE' ||
  Boolean(getTradeGrade(trade))
);

const normalizeFirestoreTrade = (trade: Trade): Trade => ({
  ...trade,
  tradeGrade: getTradeGrade(trade),
  notes: trade.notes || '',
  mistakes: Array.isArray(trade.mistakes) ? trade.mistakes : [],
  htfScreenshot: trade.htfScreenshot || '',
  ltfScreenshot: trade.ltfScreenshot || '',
  journalingStatus: trade.journalingStatus || (isTradeJournalComplete(trade) ? 'COMPLETE' : 'PENDING')
});

const mergeRemoteTradeWithLocalJournal = (remoteTrade: Trade, localTrade: Trade): { trade: Trade; shouldWriteBack: boolean } => {
  const merged: Trade = { ...remoteTrade };
  let shouldWriteBack = false;

  if (isNonEmptyText(localTrade.notes) && !isNonEmptyText(remoteTrade.notes)) {
    merged.notes = localTrade.notes;
    shouldWriteBack = true;
  }

  if (isNonEmptyText(localTrade.htfScreenshot) && !isNonEmptyText(remoteTrade.htfScreenshot)) {
    merged.htfScreenshot = localTrade.htfScreenshot;
    shouldWriteBack = true;
  }

  if (isNonEmptyText(localTrade.ltfScreenshot) && !isNonEmptyText(remoteTrade.ltfScreenshot)) {
    merged.ltfScreenshot = localTrade.ltfScreenshot;
    shouldWriteBack = true;
  }

  if (hasMeaningfulMistakes(localTrade.mistakes) && !hasMeaningfulMistakes(remoteTrade.mistakes)) {
    merged.mistakes = localTrade.mistakes;
    shouldWriteBack = true;
  }

  const localGrade = getTradeGrade(localTrade);
  const remoteGrade = getTradeGrade(remoteTrade);
  if (localGrade && !remoteGrade) {
    merged.tradeGrade = localGrade;
    shouldWriteBack = true;
  }

  if (isTradeJournalComplete(localTrade) && !isTradeJournalComplete(remoteTrade)) {
    merged.journalingStatus = 'COMPLETE';
    shouldWriteBack = true;
  }

  return { trade: normalizeFirestoreTrade(merged), shouldWriteBack };
};

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedJournalDate, setSelectedJournalDate] = useState<string | null>(null);

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

  // Helper to read initial state: Real Accounts use localStorage, Guest Mode uses sessionStorage (ephemeral)
  const isRealAccountSession = () => localStorage.getItem('TRADEPLAN_LOGGED_IN') === 'true' && !sessionStorage.getItem('TRADEPLAN_IS_GUEST');

  // Accounts State
  const [accounts, setAccounts] = useState<TradingAccount[]>(() => {
    const isReal = isRealAccountSession();
    const saved = isReal ? localStorage.getItem('TRADEPLAN_ACCOUNTS') : sessionStorage.getItem('TRADEPLAN_GUEST_ACCOUNTS');
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
    const isReal = isRealAccountSession();
    const saved = isReal ? localStorage.getItem('TRADEPLAN_SELECTED_ACCOUNT_ID') : sessionStorage.getItem('TRADEPLAN_GUEST_SELECTED_ACCOUNT_ID');
    return saved || 'ALL';
  });

  // Show account management modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccBroker, setNewAccBroker] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('100000');
  const [newAccCurrency, setNewAccCurrency] = useState('USD');
  const [newAccCommission, setNewAccCommission] = useState('7.00');

  // Trades State
  const [trades, setTrades] = useState<Trade[]>(() => {
    const isGuest = sessionStorage.getItem('TRADEPLAN_IS_GUEST') === 'true';
    if (isGuest) {
      const savedGuest = sessionStorage.getItem('TRADEPLAN_GUEST_TRADES');
      if (savedGuest) {
        try { return JSON.parse(savedGuest).map(normalizeFirestoreTrade); } catch (e) {}
      }
    }
    const savedLocal = localStorage.getItem('TRADEPLAN_TRADES');
    if (savedLocal) {
      try { return JSON.parse(savedLocal).map(normalizeFirestoreTrade); } catch (e) {}
    }
    return INITIAL_TRADES.map(normalizeFirestoreTrade);
  });

  // Plans State
  const [plans, setPlans] = useState<TradePlan[]>(() => {
    const isReal = isRealAccountSession();
    const saved = isReal ? localStorage.getItem('TRADEPLAN_PLANS') : sessionStorage.getItem('TRADEPLAN_GUEST_PLANS');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_TRADE_PLANS;
      }
    }
    return INITIAL_TRADE_PLANS;
  });

  // Daily Reviews State
  const [dailyReviews, setDailyReviews] = useState<DailyReview[]>(() => {
    const isReal = isRealAccountSession();
    const saved = isReal ? localStorage.getItem('TRADEPLAN_DAILY_REVIEWS') : sessionStorage.getItem('TRADEPLAN_GUEST_DAILY_REVIEWS');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Weekly Reviews State
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>(() => {
    const isReal = isRealAccountSession();
    const saved = isReal ? localStorage.getItem('TRADEPLAN_WEEKLY_REVIEWS') : sessionStorage.getItem('TRADEPLAN_GUEST_WEEKLY_REVIEWS');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Journal Rules State
  const [journalRules, setJournalRules] = useState<JournalRule[]>(() => {
    const isReal = isRealAccountSession();
    const saved = isReal ? localStorage.getItem('TRADEPLAN_JOURNAL_RULES') : sessionStorage.getItem('TRADEPLAN_GUEST_JOURNAL_RULES');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        return DEFAULT_JOURNAL_RULES;
      }
    }
    return DEFAULT_JOURNAL_RULES;
  });

  // Reusable setup playbooks. Trades hold an optional stable setupId, while the
  // visible setup name remains a historical snapshot for legacy imports.
  const [setupDefinitions, setSetupDefinitions] = useState<SetupDefinition[]>(() => {
    const isReal = isRealAccountSession();
    const saved = isReal ? localStorage.getItem('TRADEPLAN_SETUP_DEFINITIONS') : sessionStorage.getItem('TRADEPLAN_GUEST_SETUP_DEFINITIONS');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return DEFAULT_SETUP_DEFINITIONS;
  });

  const makeSetupId = () => (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `setup-${crypto.randomUUID()}`
      : `setup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  const handleAddSetup = async (setup: Omit<SetupDefinition, 'id' | 'createdAt' | 'updatedAt'>) => {
    const normalizedName = setup.name.trim();
    if (!normalizedName) return;
    if (setupDefinitions.some(item => item.name.trim().toLowerCase() === normalizedName.toLowerCase())) {
      setAuthError(`A setup named "${normalizedName}" already exists. Choose a distinct playbook name.`);
      return;
    }

    const timestamp = new Date().toISOString();
    const newSetup: SetupDefinition = {
      ...setup,
      id: makeSetupId(),
      name: normalizedName,
      description: setup.description.trim(),
      preferredAssets: setup.preferredAssets.map(value => value.trim().toUpperCase()).filter(Boolean),
      marketConditions: setup.marketConditions.trim(),
      entryRules: setup.entryRules.map(value => value.trim()).filter(Boolean),
      invalidationRules: setup.invalidationRules.map(value => value.trim()).filter(Boolean),
      managementRules: setup.managementRules.map(value => value.trim()).filter(Boolean),
      tags: setup.tags.map(value => value.trim()).filter(Boolean),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setSetupDefinitions(prev => [newSetup, ...prev]);
    if (user && db && !isDemoUser) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'setups', newSetup.id), cleanForFirestore(newSetup));
      } catch (error) {
        setAuthError('The setup was saved locally, but cloud sync could not be completed.');
        console.error('Setup cloud create failed:', error);
      }
    }
  };

  const handleUpdateSetup = async (id: string, update: Partial<SetupDefinition>) => {
    const existing = setupDefinitions.find(item => item.id === id);
    if (!existing) return;
    const nextName = update.name?.trim() || existing.name;
    if (setupDefinitions.some(item => item.id !== id && item.name.trim().toLowerCase() === nextName.toLowerCase())) {
      setAuthError(`A setup named "${nextName}" already exists. Choose a distinct playbook name.`);
      return;
    }
    const nextSetup: SetupDefinition = {
      ...existing,
      ...update,
      name: nextName,
      preferredAssets: update.preferredAssets ? update.preferredAssets.map(value => value.trim().toUpperCase()).filter(Boolean) : existing.preferredAssets,
      entryRules: update.entryRules ? update.entryRules.map(value => value.trim()).filter(Boolean) : existing.entryRules,
      invalidationRules: update.invalidationRules ? update.invalidationRules.map(value => value.trim()).filter(Boolean) : existing.invalidationRules,
      managementRules: update.managementRules ? update.managementRules.map(value => value.trim()).filter(Boolean) : existing.managementRules,
      tags: update.tags ? update.tags.map(value => value.trim()).filter(Boolean) : existing.tags,
      updatedAt: new Date().toISOString(),
    };
    setSetupDefinitions(prev => prev.map(item => item.id === id ? nextSetup : item));
    if (user && db && !isDemoUser) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'setups', id), cleanForFirestore(nextSetup));
      } catch (error) {
        setAuthError('The setup update was saved locally, but cloud sync could not be completed.');
        console.error('Setup cloud update failed:', error);
      }
    }
  };

  const handleArchiveSetup = (id: string) => handleUpdateSetup(id, { status: 'ARCHIVED' });

  const handleDeleteSetup = async (id: string) => {
    const targetSetup = setupDefinitions.find(setup => setup.id === id);
    const normalizedSetupName = targetSetup?.name.trim().toLowerCase();
    // Protect legacy journals as well as new stable-id links.  Old trades can
    // still be resolved by their historical setup name, so deleting that
    // playbook would make the evidence harder to interpret.
    const linkedTrades = trades.filter(trade =>
      trade.setupId === id ||
      (!trade.setupId && Boolean(normalizedSetupName) && trade.setup.trim().toLowerCase() === normalizedSetupName)
    ).length;
    const linkedPlans = plans.filter(plan => plan.setupId === id).length;
    if (linkedTrades || linkedPlans) {
      setAuthError(`This setup is linked to ${linkedTrades} trade${linkedTrades === 1 ? '' : 's'} and ${linkedPlans} plan${linkedPlans === 1 ? '' : 's'}. Archive it to preserve the history.`);
      return;
    }
    if (!window.confirm('Delete this unused setup playbook? This cannot be undone.')) return;
    setSetupDefinitions(prev => prev.filter(item => item.id !== id));
    if (user && db && !isDemoUser) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'setups', id));
      } catch (error) {
        setAuthError('The setup was removed locally, but cloud sync could not be completed.');
        console.error('Setup cloud delete failed:', error);
      }
    }
  };

  const handleAddJournalRule = async (rule: Omit<JournalRule, 'id'>) => {
    const newRule: JournalRule = {
      ...rule,
      id: `rule-${Date.now()}`
    };
    setJournalRules(prev => [...prev, newRule]);
    if (user && db && !isDemoUser) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'rules', newRule.id), cleanForFirestore(newRule));
      } catch (e) {}
    }
  };

  const handleEditJournalRule = async (id: string, updated: Partial<JournalRule>) => {
    let updatedRule: JournalRule | undefined;
    setJournalRules(prev => prev.map(r => {
      if (r.id === id) {
        const merged = { ...r, ...updated };
        updatedRule = merged;
        return merged;
      }
      return r;
    }));
    if (user && db && !isDemoUser && updatedRule) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'rules', id), cleanForFirestore(updatedRule), { merge: true });
      } catch (e) {}
    }
  };

  const handleDeleteJournalRule = async (id: string) => {
    setJournalRules(prev => prev.filter(r => r.id !== id));
    if (user && db && !isDemoUser) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'rules', id));
      } catch (e) {}
    }
  };

  const handleResetJournalRules = async () => {
    setJournalRules(DEFAULT_JOURNAL_RULES);
    if (user && db && !isDemoUser) {
      try {
        const batch = writeBatch(db);
        DEFAULT_JOURNAL_RULES.forEach(r => {
          batch.set(doc(db, 'users', user.uid, 'rules', r.id), cleanForFirestore(r));
        });
        await batch.commit();
      } catch (e) {}
    }
  };

  const handleAddDailyReview = async (newReview: Omit<DailyReview, 'id' | 'createdAt'>) => {
    const rev: DailyReview = {
      ...newReview,
      id: `drev-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setDailyReviews(prev => [rev, ...prev.filter(r => r.date !== newReview.date)]);

    if (user && db && !isDemoUser) {
      setIsCloudSyncing(true);
      try {
        await setDoc(doc(db, 'users', user.uid, 'daily_reviews', rev.id), cleanForFirestore(rev));
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/daily_reviews/${rev.id}`);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleDeleteDailyReview = async (id: string) => {
    setDailyReviews(prev => prev.filter(r => r.id !== id));

    if (user && db && !isDemoUser) {
      setIsCloudSyncing(true);
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'daily_reviews', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/daily_reviews/${id}`);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleAddWeeklyReview = async (newReview: Omit<WeeklyReview, 'id' | 'createdAt'>) => {
    const rev: WeeklyReview = {
      ...newReview,
      id: `wrev-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setWeeklyReviews(prev => [rev, ...prev.filter(r => r.weekStartDate !== newReview.weekStartDate)]);

    if (user && db && !isDemoUser) {
      setIsCloudSyncing(true);
      try {
        await setDoc(doc(db, 'users', user.uid, 'weekly_reviews', rev.id), cleanForFirestore(rev));
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/weekly_reviews/${rev.id}`);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleDeleteWeeklyReview = async (id: string) => {
    setWeeklyReviews(prev => prev.filter(r => r.id !== id));

    if (user && db && !isDemoUser) {
      setIsCloudSyncing(true);
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'weekly_reviews', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/weekly_reviews/${id}`);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  // Prefilled state for executing plans
  const [prefillTrade, setPrefillTrade] = useState<Partial<Trade> | null>(null);
  const [prefillPlanSetup, setPrefillPlanSetup] = useState<SetupDefinition | null>(null);

  // Permanent IndexedDB Initialization Effect on Mount
  useEffect(() => {
    async function loadFromIndexedDB() {
      try {
        const [idbTrades, idbPlans, idbAccounts, idbDaily, idbWeekly, idbRules, idbSetups] = await Promise.all([
          getAllIDB<Trade>(STORES.TRADES),
          getAllIDB<TradePlan>(STORES.PLANS),
          getAllIDB<TradingAccount>(STORES.ACCOUNTS),
          getAllIDB<DailyReview>(STORES.DAILY_REVIEWS),
          getAllIDB<WeeklyReview>(STORES.WEEKLY_REVIEWS),
          getAllIDB<JournalRule>(STORES.JOURNAL_RULES),
          getAllIDB<SetupDefinition>(STORES.SETUPS),
        ]);

        if (idbTrades.length > 0) {
          setTrades(idbTrades.map(normalizeFirestoreTrade));
        } else if (INITIAL_TRADES.length > 0) {
          const normalizedInitialTrades = INITIAL_TRADES.map(normalizeFirestoreTrade);
          await saveAllIDB(STORES.TRADES, normalizedInitialTrades);
          setTrades(normalizedInitialTrades);
        }

        if (idbPlans.length > 0) {
          setPlans(idbPlans);
        } else if (INITIAL_TRADE_PLANS.length > 0) {
          await saveAllIDB(STORES.PLANS, INITIAL_TRADE_PLANS);
          setPlans(INITIAL_TRADE_PLANS);
        }

        if (idbAccounts.length > 0) {
          setAccounts(idbAccounts);
        } else if (INITIAL_ACCOUNTS.length > 0) {
          await saveAllIDB(STORES.ACCOUNTS, INITIAL_ACCOUNTS);
          setAccounts(INITIAL_ACCOUNTS);
        }

        if (idbDaily.length > 0) setDailyReviews(idbDaily);
        if (idbWeekly.length > 0) setWeeklyReviews(idbWeekly);
        if (idbRules.length > 0) setJournalRules(idbRules);
        if (idbSetups.length > 0) {
          setSetupDefinitions(idbSetups);
        } else if (DEFAULT_SETUP_DEFINITIONS.length > 0) {
          await saveAllIDB(STORES.SETUPS, DEFAULT_SETUP_DEFINITIONS);
          setSetupDefinitions(DEFAULT_SETUP_DEFINITIONS);
        }
      } catch (err) {
        console.error("Failed to initialize state from IndexedDB:", err);
      }
    }
    loadFromIndexedDB();
  }, []);

  // Synchronize Accounts (IndexedDB + localStorage/sessionStorage)
  useEffect(() => {
    saveAllIDB(STORES.ACCOUNTS, accounts);
    if (isDemoUser) {
      sessionStorage.setItem('TRADEPLAN_GUEST_ACCOUNTS', JSON.stringify(accounts));
    } else {
      localStorage.setItem('TRADEPLAN_ACCOUNTS', JSON.stringify(accounts));
    }
  }, [accounts, isDemoUser]);

  // Synchronize Selected Account ID
  useEffect(() => {
    if (isDemoUser) {
      sessionStorage.setItem('TRADEPLAN_GUEST_SELECTED_ACCOUNT_ID', selectedAccountId);
    } else {
      localStorage.setItem('TRADEPLAN_SELECTED_ACCOUNT_ID', selectedAccountId);
    }
  }, [selectedAccountId, isDemoUser]);

  // Synchronize Trades (IndexedDB + localStorage + Express API backup)
  const prevTradesStringRef = React.useRef<string>('');
  useEffect(() => {
    saveAllIDB(STORES.TRADES, trades);
    if (isDemoUser) {
      sessionStorage.setItem('TRADEPLAN_GUEST_TRADES', JSON.stringify(trades));
    }
    try {
      localStorage.setItem('TRADEPLAN_TRADES', JSON.stringify(trades));
    } catch (e) {
      console.warn("LocalStorage full, trades saved permanently in IndexedDB");
    }

    const currentStr = JSON.stringify(trades);
    if (prevTradesStringRef.current === currentStr) {
      return;
    }
    prevTradesStringRef.current = currentStr;

    // Server-side json backup sync
    fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades })
    }).catch(() => {});
  }, [trades, isDemoUser]);

  // Synchronize Plans
  useEffect(() => {
    saveAllIDB(STORES.PLANS, plans);
    if (isDemoUser) {
      sessionStorage.setItem('TRADEPLAN_GUEST_PLANS', JSON.stringify(plans));
    } else {
      localStorage.setItem('TRADEPLAN_PLANS', JSON.stringify(plans));
    }
  }, [plans, isDemoUser]);

  // Synchronize Daily Reviews
  useEffect(() => {
    saveAllIDB(STORES.DAILY_REVIEWS, dailyReviews);
    if (isDemoUser) {
      sessionStorage.setItem('TRADEPLAN_GUEST_DAILY_REVIEWS', JSON.stringify(dailyReviews));
    } else {
      localStorage.setItem('TRADEPLAN_DAILY_REVIEWS', JSON.stringify(dailyReviews));
    }
  }, [dailyReviews, isDemoUser]);

  // Synchronize Weekly Reviews
  useEffect(() => {
    saveAllIDB(STORES.WEEKLY_REVIEWS, weeklyReviews);
    if (isDemoUser) {
      sessionStorage.setItem('TRADEPLAN_GUEST_WEEKLY_REVIEWS', JSON.stringify(weeklyReviews));
    } else {
      localStorage.setItem('TRADEPLAN_WEEKLY_REVIEWS', JSON.stringify(weeklyReviews));
    }
  }, [weeklyReviews, isDemoUser]);

  // Synchronize Journal Rules
  useEffect(() => {
    saveAllIDB(STORES.JOURNAL_RULES, journalRules);
    if (isDemoUser) {
      sessionStorage.setItem('TRADEPLAN_GUEST_JOURNAL_RULES', JSON.stringify(journalRules));
    } else {
      localStorage.setItem('TRADEPLAN_JOURNAL_RULES', JSON.stringify(journalRules));
    }
  }, [journalRules, isDemoUser]);

  // Synchronize Setup Playbooks
  useEffect(() => {
    saveAllIDB(STORES.SETUPS, setupDefinitions);
    if (isDemoUser) {
      sessionStorage.setItem('TRADEPLAN_GUEST_SETUP_DEFINITIONS', JSON.stringify(setupDefinitions));
    } else {
      localStorage.setItem('TRADEPLAN_SETUP_DEFINITIONS', JSON.stringify(setupDefinitions));
    }
  }, [setupDefinitions, isDemoUser]);

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

      // 4. Fetch reusable setup playbooks
      const setupsRef = collection(db, 'users', userId, 'setups');
      const setupsSnap = await getDocs(setupsRef);
      const loadedSetups: SetupDefinition[] = [];
      setupsSnap.forEach(docSnap => {
        loadedSetups.push({ id: docSnap.id, ...docSnap.data() } as SetupDefinition);
      });

      // 5. Fetch daily_reviews
      const dailyRevRef = collection(db, 'users', userId, 'daily_reviews');
      const dailyRevSnap = await getDocs(dailyRevRef);
      let loadedDailyReviews: DailyReview[] = [];
      dailyRevSnap.forEach(docSnap => {
        loadedDailyReviews.push({ id: docSnap.id, ...docSnap.data() } as DailyReview);
      });

      // 6. Fetch weekly_reviews
      const weeklyRevRef = collection(db, 'users', userId, 'weekly_reviews');
      const weeklyRevSnap = await getDocs(weeklyRevRef);
      let loadedWeeklyReviews: WeeklyReview[] = [];
        weeklyRevSnap.forEach(docSnap => {
        loadedWeeklyReviews.push({ id: docSnap.id, ...docSnap.data() } as WeeklyReview);
      });

      // Normalize trades loaded from Firestore (default status to PENDING unless checklist evaluated)
      const normalizedLoadedTrades = loadedTrades.map(normalizeFirestoreTrade);

      const batch = writeBatch(db);
      let needsBatchCommit = false;

      // Persist grades derived from the retired generic checklist so every
      // device and tab reads the same field after the first sync.
      normalizedLoadedTrades.forEach((trade, index) => {
        if (trade.tradeGrade && !loadedTrades[index]?.tradeGrade) {
          batch.set(doc(db, 'users', userId, 'trades', trade.id), cleanForFirestore(trade), { merge: true });
          needsBatchCommit = true;
        }
      });

      // Smart collection sync: if Firestore is empty for a collection, sync local items up to Firestore
      if (loadedAccounts.length > 0) {
        setAccounts(loadedAccounts);
      } else if (accounts.length > 0) {
        accounts.forEach(acc => {
          batch.set(doc(db, 'users', userId, 'accounts', acc.id), cleanForFirestore(acc));
        });
        needsBatchCommit = true;
      }

      // Smart trades merge: merge Firestore trades with IndexedDB & LocalStorage trades
      let localTrades: Trade[] = await getAllIDB<Trade>(STORES.TRADES);
      if (localTrades.length === 0) {
        const savedLocalStr = localStorage.getItem('TRADEPLAN_TRADES');
        if (savedLocalStr) {
          try { localTrades = JSON.parse(savedLocalStr); } catch (e) {}
        }
      }
      if (localTrades.length === 0 && trades.length > 0) {
        localTrades = trades;
      }
      localTrades = localTrades.map(normalizeFirestoreTrade);

      const tradeMap = new Map<string, Trade>();
      normalizedLoadedTrades.forEach(t => {
        tradeMap.set(t.id, t);
      });

      localTrades.forEach(localT => {
        const remoteT = tradeMap.get(localT.id);
        if (!remoteT) {
          tradeMap.set(localT.id, localT);
          batch.set(doc(db, 'users', userId, 'trades', localT.id), cleanForFirestore(localT));
          needsBatchCommit = true;
        } else {
          const { trade: merged, shouldWriteBack } = mergeRemoteTradeWithLocalJournal(remoteT, localT);

          tradeMap.set(localT.id, merged);
          if (shouldWriteBack) {
            batch.set(doc(db, 'users', userId, 'trades', localT.id), cleanForFirestore(merged));
            needsBatchCommit = true;
          }
        }
      });

      const finalMergedTrades = Array.from(tradeMap.values());
      if (finalMergedTrades.length > 0) {
        setTrades(finalMergedTrades);
        await saveAllIDB(STORES.TRADES, finalMergedTrades);
        try {
          localStorage.setItem('TRADEPLAN_TRADES', JSON.stringify(finalMergedTrades));
        } catch (e) {}
      }

      if (loadedPlans.length > 0) {
        setPlans(loadedPlans);
      } else if (plans.length > 0) {
        plans.forEach(p => {
          batch.set(doc(db, 'users', userId, 'plans', p.id), cleanForFirestore(p));
        });
        needsBatchCommit = true;
      }

      if (loadedSetups.length > 0) {
        setSetupDefinitions(loadedSetups);
      } else if (setupDefinitions.length > 0) {
        setupDefinitions.forEach(setup => {
          batch.set(doc(db, 'users', userId, 'setups', setup.id), cleanForFirestore(setup));
        });
        needsBatchCommit = true;
      }

      if (loadedDailyReviews.length > 0) {
        setDailyReviews(loadedDailyReviews);
      } else if (dailyReviews.length > 0) {
        dailyReviews.forEach(r => {
          batch.set(doc(db, 'users', userId, 'daily_reviews', r.id), cleanForFirestore(r));
        });
        needsBatchCommit = true;
      }

      if (loadedWeeklyReviews.length > 0) {
        setWeeklyReviews(loadedWeeklyReviews);
      } else if (weeklyReviews.length > 0) {
        weeklyReviews.forEach(r => {
          batch.set(doc(db, 'users', userId, 'weekly_reviews', r.id), cleanForFirestore(r));
        });
        needsBatchCommit = true;
      }

      if (needsBatchCommit) {
        await batch.commit();
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
    // Check for explicit mock user in localStorage
    const savedMock = localStorage.getItem('TRADEPLAN_MOCK_USER');
    const isGuestSession = sessionStorage.getItem('TRADEPLAN_IS_GUEST') === 'true';

    if (savedMock) {
      try {
        const parsedMock = JSON.parse(savedMock);
        setUser(parsedMock);
        setIsDemoUser(false);
      } catch (e) {
        localStorage.removeItem('TRADEPLAN_MOCK_USER');
      }
    } else if (isGuestSession) {
      setUser({
        uid: 'guest-demo-sandbox',
        displayName: 'Guest Demo Trader',
        email: 'guest@demo.local',
        photoURL: null
      });
      setIsDemoUser(true);
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
      } else if (!localStorage.getItem('TRADEPLAN_MOCK_USER') && !sessionStorage.getItem('TRADEPLAN_IS_GUEST')) {
        // Unauthenticated: render LoginPage
        setUser(null);
        setIsDemoUser(false);
      }
      setFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync Listener across devices & tabs
  const hasReceivedSetupSnapshotRef = React.useRef(false);
  useEffect(() => {
    if (!user || !user.uid || !db || isDemoUser || !isFirebaseConfigured) return;

    const userId = user.uid;
    hasReceivedSetupSnapshotRef.current = false;

    // Real-time listener for Trades
    const unsubTrades = onSnapshot(collection(db, 'users', userId, 'trades'), (snap) => {
      const remoteTrades: Trade[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data() as Trade;
        remoteTrades.push(normalizeFirestoreTrade({
          ...data,
          id: docSnap.id
        }));
      });
      if (remoteTrades.length > 0) {
        setTrades(remoteTrades);
        saveAllIDB(STORES.TRADES, remoteTrades);
      }
    }, (err) => console.warn("Realtime trades listener:", err.message));

    // Real-time listener for Accounts
    const unsubAccounts = onSnapshot(collection(db, 'users', userId, 'accounts'), (snap) => {
      const remoteAccs: TradingAccount[] = [];
      snap.forEach(docSnap => {
        remoteAccs.push({ ...docSnap.data(), id: docSnap.id } as TradingAccount);
      });
      if (remoteAccs.length > 0) {
        setAccounts(remoteAccs);
        saveAllIDB(STORES.ACCOUNTS, remoteAccs);
      }
    }, (err) => console.warn("Realtime accounts listener:", err.message));

    // Real-time listener for Plans
    const unsubPlans = onSnapshot(collection(db, 'users', userId, 'plans'), (snap) => {
      const remotePlans: TradePlan[] = [];
      snap.forEach(docSnap => {
        remotePlans.push({ ...docSnap.data(), id: docSnap.id } as TradePlan);
      });
      if (remotePlans.length > 0) {
        setPlans(remotePlans);
        saveAllIDB(STORES.PLANS, remotePlans);
      }
    }, (err) => console.warn("Realtime plans listener:", err.message));

    // Real-time listener for Rules
    const unsubRules = onSnapshot(collection(db, 'users', userId, 'rules'), (snap) => {
      const remoteRules: JournalRule[] = [];
      snap.forEach(docSnap => {
        remoteRules.push({ ...docSnap.data(), id: docSnap.id } as JournalRule);
      });
      if (remoteRules.length > 0) {
        setJournalRules(remoteRules);
        saveAllIDB(STORES.JOURNAL_RULES, remoteRules);
      }
    }, (err) => console.warn("Realtime rules listener:", err.message));

    // Setup playbooks are safe to archive and are synchronized independently of
    // trade history. After the first snapshot, an empty remote collection is a
    // real deletion and should be reflected locally.
    const unsubSetups = onSnapshot(collection(db, 'users', userId, 'setups'), (snap) => {
      const remoteSetups: SetupDefinition[] = [];
      snap.forEach(docSnap => {
        remoteSetups.push({ ...docSnap.data(), id: docSnap.id } as SetupDefinition);
      });
      if (remoteSetups.length > 0 || hasReceivedSetupSnapshotRef.current) {
        setSetupDefinitions(remoteSetups);
        saveAllIDB(STORES.SETUPS, remoteSetups);
      }
      hasReceivedSetupSnapshotRef.current = true;
    }, (err) => console.warn("Realtime setups listener:", err.message));

    return () => {
      unsubTrades();
      unsubAccounts();
      unsubPlans();
      unsubRules();
      unsubSetups();
    };
  }, [user?.uid, isDemoUser]);

  // Sync operations handlers
  const handleEmailPasswordAuthWithParams = async (
    mode: 'signin' | 'signup',
    emailInput: string,
    passInput: string,
    nameInput?: string
  ) => {
    setAuthError(null);
    setAuthSubmitting(true);

    if (isFirebaseConfigured && auth) {
      try {
        if (mode === 'signup') {
          const res = await createUserWithEmailAndPassword(auth, emailInput, passInput);
          if (nameInput) {
            await updateProfile(res.user, { displayName: nameInput });
          }
          setUser({ ...res.user, displayName: nameInput || res.user.displayName });
        } else {
          const res = await signInWithEmailAndPassword(auth, emailInput, passInput);
          setUser(res.user);
        }
        setIsDemoUser(false);
        localStorage.setItem('TRADEPLAN_LOGGED_IN', 'true');
        setShowAuthModal(false);
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
        throw new Error(errMsg);
      } finally {
        setAuthSubmitting(false);
      }
    } else {
      const mockUser = {
        uid: `user-${Date.now()}`,
        displayName: nameInput || emailInput.split('@')[0] || 'Trader',
        email: emailInput,
        photoURL: null
      };
      localStorage.setItem('TRADEPLAN_MOCK_USER', JSON.stringify(mockUser));
      localStorage.setItem('TRADEPLAN_LOGGED_IN', 'true');
      setUser(mockUser);
      setIsDemoUser(false);
      setAuthSubmitting(false);
      setShowAuthModal(false);
    }
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleEmailPasswordAuthWithParams(authMode, email, password, authDisplayName);
  };

  const handleSignInGoogle = async () => {
    if (!isFirebaseConfigured || !auth) return;
    setAuthError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setUser(res.user);
      setIsDemoUser(false);
      localStorage.setItem('TRADEPLAN_LOGGED_IN', 'true');
      setShowAuthModal(false);
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setAuthError(err.message || "Failed to log in with Google.");
    }
  };

  const handleSignInGuest = async () => {
    setAuthError(null);
    setIsDemoUser(true);
    sessionStorage.setItem('TRADEPLAN_IS_GUEST', 'true');
    localStorage.removeItem('TRADEPLAN_LOGGED_IN');
    localStorage.removeItem('TRADEPLAN_MOCK_USER');

    const demoUser = {
      uid: 'guest-demo-sandbox',
      displayName: 'Guest Demo Trader',
      email: 'guest@demo.local',
      photoURL: null
    };
    setUser(demoUser);
    setShowAuthModal(false);
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

    // Clear user state & session tokens
    localStorage.removeItem('TRADEPLAN_MOCK_USER');
    localStorage.removeItem('TRADEPLAN_LOGGED_IN');
    sessionStorage.removeItem('TRADEPLAN_IS_GUEST');
    
    // Clear ephemeral guest session memory
    sessionStorage.removeItem('TRADEPLAN_GUEST_ACCOUNTS');
    sessionStorage.removeItem('TRADEPLAN_GUEST_TRADES');
    sessionStorage.removeItem('TRADEPLAN_GUEST_PLANS');
    sessionStorage.removeItem('TRADEPLAN_GUEST_DAILY_REVIEWS');
    sessionStorage.removeItem('TRADEPLAN_GUEST_WEEKLY_REVIEWS');
    sessionStorage.removeItem('TRADEPLAN_GUEST_JOURNAL_RULES');
    sessionStorage.removeItem('TRADEPLAN_GUEST_SETUP_DEFINITIONS');

    setUser(null);
    setIsDemoUser(false);
    setShowAuthModal(false);

    // Reset state to clean initial demo data
    setAccounts(INITIAL_ACCOUNTS);
    setTrades(INITIAL_TRADES.map(normalizeFirestoreTrade));
    setPlans(INITIAL_TRADE_PLANS);
    setJournalRules(DEFAULT_JOURNAL_RULES);
    setSetupDefinitions(DEFAULT_SETUP_DEFINITIONS);
    setDailyReviews([]);
    setWeeklyReviews([]);
    setSelectedAccountId('ALL');
  };

  // Event Handlers for Trades
  const handleAddTrade = async (newTrade: Omit<Trade, 'id'>) => {
    const trade: Trade = normalizeFirestoreTrade({
      ...newTrade,
      id: `trade-${Date.now()}`,
      accountId: newTrade.accountId || (selectedAccountId !== 'ALL' ? selectedAccountId : accounts[0]?.id || 'acc-1'),
      journalingStatus: newTrade.journalingStatus || 'COMPLETE'
    });

    await saveIDB(STORES.TRADES, trade);

    setTrades(prev => {
      const next = [trade, ...prev];
      if (isDemoUser) {
        sessionStorage.setItem('TRADEPLAN_GUEST_TRADES', JSON.stringify(next));
      } else {
        try { localStorage.setItem('TRADEPLAN_TRADES', JSON.stringify(next)); } catch (e) {}
      }
      return next;
    });

    if (user && db && !isDemoUser) {
      setIsCloudSyncing(true);
      try {
        await setDoc(doc(db, 'users', user.uid, 'trades', trade.id), cleanForFirestore(trade));
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/trades/${trade.id}`);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleEditTrade = async (id: string, updatedFields: Partial<Trade>) => {
    let updatedTrade: Trade | undefined;
    setTrades(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
          const merged = normalizeFirestoreTrade({ ...t, ...updatedFields });
          updatedTrade = merged;
          return merged;
        }
        return t;
      });
      if (isDemoUser) {
        sessionStorage.setItem('TRADEPLAN_GUEST_TRADES', JSON.stringify(next));
      } else {
        try { localStorage.setItem('TRADEPLAN_TRADES', JSON.stringify(next)); } catch (e) {}
      }
      return next;
    });

    if (updatedTrade) {
      await saveIDB(STORES.TRADES, updatedTrade);
    }

    if (user && db && !isDemoUser && updatedTrade) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'trades', id), cleanForFirestore(updatedTrade));
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/trades/${id}`);
      }
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this trade from your journal?')) {
      await deleteIDB(STORES.TRADES, id);

      setTrades(prev => {
        const next = prev.filter(t => t.id !== id);
        if (isDemoUser) {
          sessionStorage.setItem('TRADEPLAN_GUEST_TRADES', JSON.stringify(next));
        } else {
          try { localStorage.setItem('TRADEPLAN_TRADES', JSON.stringify(next)); } catch (e) {}
        }
        return next;
      });

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
        await setDoc(doc(db, 'users', user.uid, 'plans', plan.id), cleanForFirestore(plan));
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
        setDoc(doc(db, 'users', user.uid, 'plans', id), cleanForFirestore(updatedPlan)).catch(e => {
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
    const linkedSetup = plan.setupId ? setupDefinitions.find(setup => setup.id === plan.setupId) : undefined;
    setPrefillTrade({
      asset: plan.asset,
      setupId: linkedSetup?.id,
      setup: linkedSetup?.name || (plan.triggers ? 'BoS Downside' : 'Highs Rejection'),
      direction: linkedSetup?.direction === 'BUY'
        ? 'BUY'
        : linkedSetup?.direction === 'SELL'
          ? 'SELL'
          : plan.bias === 'BULLISH' ? 'BUY' : 'SELL'
    });
    setCurrentTab('journal');
  };

  // Resets the state back to defaults
  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to reset all data back to the default Gold Spot / FX template? Your current custom logs will be overwritten.')) {
      setTrades(INITIAL_TRADES.map(normalizeFirestoreTrade));
      setPlans(INITIAL_TRADE_PLANS);
      setSetupDefinitions(DEFAULT_SETUP_DEFINITIONS);
      setAccounts(INITIAL_ACCOUNTS);
      setSelectedAccountId('ALL');
      localStorage.removeItem('TRADEPLAN_TRADES');
      localStorage.removeItem('TRADEPLAN_PLANS');
      localStorage.removeItem('TRADEPLAN_ACCOUNTS');
      localStorage.removeItem('TRADEPLAN_SELECTED_ACCOUNT_ID');
      localStorage.removeItem('TRADEPLAN_SETUP_DEFINITIONS');
      setCurrentTab('dashboard');

      if (user && db && !isDemoUser) {
        setIsCloudSyncing(true);
        try {
          const batch = writeBatch(db);

          // Seed the reset data directly
          INITIAL_ACCOUNTS.forEach(acc => {
            batch.set(doc(db, 'users', user.uid, 'accounts', acc.id), cleanForFirestore(acc));
          });
          INITIAL_TRADES.forEach(t => {
            batch.set(doc(db, 'users', user.uid, 'trades', t.id), cleanForFirestore(t));
          });
          INITIAL_TRADE_PLANS.forEach(p => {
            batch.set(doc(db, 'users', user.uid, 'plans', p.id), cleanForFirestore(p));
          });
          DEFAULT_SETUP_DEFINITIONS.forEach(setup => {
            batch.set(doc(db, 'users', user.uid, 'setups', setup.id), cleanForFirestore(setup));
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

  const handleImportBackup = (backupTrades: Trade[], backupSetups: SetupDefinition[] = []) => {
    // Imports are merged by id instead of replacing the current journal. This
    // protects newer local work when a user restores an older backup file.
    const existingById = new Map(trades.map(trade => [trade.id, trade]));
    let updated = 0;
    let added = 0;

    const importedIds: string[] = [];
    backupTrades.forEach((rawTrade, index) => {
      const id = rawTrade.id || `import-${Date.now()}-${index}`;
      importedIds.push(id);
      if (existingById.has(id)) updated++;
      else added++;

      existingById.set(id, normalizeFirestoreTrade({
        ...rawTrade,
        id,
        accountId: rawTrade.accountId || (selectedAccountId !== 'ALL' ? selectedAccountId : accounts[0]?.id || 'acc-1'),
        time: rawTrade.time || '00:00',
        setup: rawTrade.setup || 'Imported trade',
        direction: rawTrade.direction === 'BUY' ? 'BUY' : 'SELL',
        entryPrice: Number(rawTrade.entryPrice) || 0,
        exitPrice: Number(rawTrade.exitPrice) || 0,
        size: Number(rawTrade.size) || 0,
        sl: Number(rawTrade.sl) || 0,
        tp: Number(rawTrade.tp) || 0,
        pnl: Number(rawTrade.pnl) || 0,
        status: rawTrade.status || 'BREAKEVEN',
        session: rawTrade.session || 'NEW YORK',
      }));
    });

    const mergedTrades = Array.from(existingById.values());
    setTrades(mergedTrades);

    const existingSetupsById = new Map<string, SetupDefinition>(setupDefinitions.map(setup => [setup.id, setup]));
    let setupsAdded = 0;
    let setupsUpdated = 0;
    backupSetups.forEach(rawSetup => {
      if (!rawSetup?.id || !rawSetup?.name) return;
      if (existingSetupsById.has(rawSetup.id)) setupsUpdated++;
      else setupsAdded++;
      existingSetupsById.set(rawSetup.id, {
        ...rawSetup,
        name: rawSetup.name.trim(),
        preferredAssets: Array.isArray(rawSetup.preferredAssets) ? rawSetup.preferredAssets : [],
        preferredSessions: Array.isArray(rawSetup.preferredSessions) ? rawSetup.preferredSessions : [],
        entryRules: Array.isArray(rawSetup.entryRules) ? rawSetup.entryRules : [],
        invalidationRules: Array.isArray(rawSetup.invalidationRules) ? rawSetup.invalidationRules : [],
        managementRules: Array.isArray(rawSetup.managementRules) ? rawSetup.managementRules : [],
        tags: Array.isArray(rawSetup.tags) ? rawSetup.tags : [],
        status: rawSetup.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
        createdAt: rawSetup.createdAt || new Date().toISOString(),
        updatedAt: rawSetup.updatedAt || new Date().toISOString(),
      });
    });
    const mergedSetups = Array.from(existingSetupsById.values());
    if (backupSetups.length > 0) setSetupDefinitions(mergedSetups);

    // Keep a signed-in journal portable: the local restore is immediate and the
    // imported records are also written back to the user's cloud collection.
    if (user && db && !isDemoUser) {
      setIsCloudSyncing(true);
      const cloudWrites: Promise<unknown>[] = importedIds.map(id => {
        const trade = existingById.get(id);
        return trade
          ? setDoc(doc(db, 'users', user.uid, 'trades', id), cleanForFirestore(trade))
          : Promise.resolve();
      });
      backupSetups.forEach(setup => {
        const normalizedSetup = existingSetupsById.get(setup.id);
        if (normalizedSetup) {
          cloudWrites.push(setDoc(doc(db, 'users', user.uid, 'setups', normalizedSetup.id), cleanForFirestore(normalizedSetup)));
        }
      });
      void Promise.all(cloudWrites)
        .catch(error => {
          console.error('Backup cloud sync failed:', error);
          setAuthError('Backup restored locally, but its cloud sync could not be completed.');
        })
        .finally(() => setIsCloudSyncing(false));
    }

    return { added, updated, total: mergedTrades.length, setupsAdded, setupsUpdated, setupTotal: mergedSetups.length };
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
      currency: newAccCurrency || 'USD',
      commissionPerLot: parseFloat(newAccCommission) || 7
    };

    setAccounts(prev => [...prev, newAcc]);
    setSelectedAccountId(newAcc.id);

    // Reset Form
    setNewAccName('');
    setNewAccBroker('');
    setNewAccBalance('100000');
    setNewAccCurrency('USD');
    setNewAccCommission('7.00');

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

  const handleUpdateAccountCommission = async (accId: string, commissionPerLot: number) => {
    setAccounts(prev => {
      const updated = prev.map(a => a.id === accId ? { ...a, commissionPerLot } : a);
      const updatedAcc = updated.find(a => a.id === accId);
      if (user && db && !isDemoUser && updatedAcc) {
        setDoc(doc(db, 'users', user.uid, 'accounts', accId), updatedAcc, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/accounts/${accId}`);
        });
      }
      return updated;
    });
  };

  const handleDeleteAccount = async (accId: string) => {
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

  if (firebaseLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0b0f19] flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <BrandLogo size={32} showText={false} />
          </div>
        </div>
        <div className="text-xs font-bold text-slate-300 tracking-wider uppercase font-mono animate-pulse">
          Launching TradeForge Session...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onEmailAuth={handleEmailPasswordAuthWithParams}
        onGoogleAuth={handleSignInGoogle}
        onGuestAuth={handleSignInGuest}
        authError={authError}
        authSubmitting={authSubmitting}
        isFirebaseConfigured={isFirebaseConfigured}
      />
    );
  }

  return (
    <div className="clay-scene min-h-screen flex flex-col text-clay-foreground antialiased font-sans">

      {/* Upper Navigation Header */}
      <header className="relative z-30 px-2 sm:px-3 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="clay-surface flex flex-wrap justify-between items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-5 sm:py-3">

            {/* Logo brand */}
            <BrandLogo size={36} />

            {/* Account Switcher Component */}
            <div className="flex items-center gap-2 order-3 w-full sm:w-auto sm:order-none">
              <div className="clay-pressed flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 w-full sm:w-auto">
                <Database size={13} className="text-clay-accent stroke-[3px] shrink-0" />
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="text-2xs font-bold text-clay-foreground bg-transparent border-none focus:outline-none cursor-pointer font-sans w-full sm:max-w-[280px] md:max-w-[320px] truncate"
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
                  className="rounded-full p-1.5 text-clay-muted hover:bg-white hover:text-clay-accent transition cursor-pointer shrink-0"
                  title="Configure Accounts"
                >
                  <Settings size={13} />
                </button>
              </div>
            </div>

            {/* Main Tabs Navigation (Desktop) */}
            <nav className="hidden lg:flex gap-1.5 xl:gap-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'setups', label: 'Playbooks', icon: FolderOpen },
                { id: 'plans', label: 'Planning & Reviews', icon: ClipboardCheck },
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
                      if (tab.id !== 'journal') {
                        setPrefillTrade(null);
                        setSelectedJournalDate(null);
                      }
                      if (tab.id !== 'plans') setPrefillPlanSetup(null);
                    }}
                    className={`flex items-center gap-1.5 rounded-[20px] px-3 py-1.5 xl:px-3.5 xl:py-2 text-2xs xl:text-xs font-bold transition-all duration-200 cursor-pointer ${isActive
                      ? 'bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clayButton active:scale-[0.92]'
                      : 'text-clay-muted hover:bg-white/70 hover:text-clay-accent hover:-translate-y-1'
                      }`}
                  >
                    <Icon size={13} className="stroke-[3px]" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Reset & Sync Helper Bar */}
            <div className="flex items-center gap-1.5 sm:gap-2 order-2 sm:order-none">
              {/* Cloud Sync Button */}
              {firebaseLoading ? (
                <div className="clay-pressed flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 text-clay-muted text-3xs font-bold uppercase">
                  <Loader2 size={10} className="animate-spin" />
                  <span className="hidden sm:inline">Checking...</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className={`flex items-center gap-1.5 rounded-[18px] px-2.5 py-1.5 sm:px-3 sm:py-2 text-3xs font-bold uppercase transition-all duration-200 cursor-pointer shadow-clayButton hover:-translate-y-1 ${isDemoUser
                      ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white'
                      : 'bg-gradient-to-br from-emerald-300 to-emerald-500 text-white'
                      }`}
                    title={isDemoUser ? "Connected in local Guest Mode" : `Connected and Synced: ${user.displayName || user.email}`}
                  >
                    <div className="relative flex h-1.5 w-1.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDemoUser ? 'bg-amber-400' : 'bg-green-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isDemoUser ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                    </div>
                    <span>{isDemoUser ? "Guest" : `${user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Sync'}`}</span>
                    {isCloudSyncing && <RefreshCw size={9} className="animate-spin ml-0.5" />}
                  </button>

                  <button
                    onClick={handleAuthSignOut}
                    className="clay-button clay-button-secondary min-h-0 px-2 py-1.5 sm:px-3 sm:py-2 text-3xs uppercase"
                    title="Sign out of current account"
                  >
                    <LogOut size={10} />
                    <span className="hidden md:inline">Log Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="clay-pill text-[9px] sm:text-[10px] font-mono uppercase hidden sm:inline-flex">
                    Guest
                  </span>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="clay-button clay-button-primary min-h-0 px-2.5 py-1.5 sm:px-3 sm:py-2 text-3xs uppercase"
                    title="Sign in or register an account to backup data"
                  >
                    <LogIn size={10} />
                    <span>Login</span>
                  </button>
                </div>
              )}

              <button
                onClick={handleResetData}
                className="clay-button clay-button-secondary min-h-0 px-2 py-1.5 sm:px-3 sm:py-2 text-3xs uppercase"
                title="Reset to preloaded Gold demo data"
              >
                <RefreshCw size={10} />
                <span className="hidden sm:inline">Reset Demo</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Dock Navigation */}
      <div className="mobile-bottom-dock lg:hidden">
        <div className="flex min-w-max justify-around items-center px-1 py-1.5">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'setups', label: 'Playbooks', icon: FolderOpen },
            { id: 'plans', label: 'Plan + Review', icon: ClipboardCheck },
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
                  if (tab.id !== 'journal') {
                    setPrefillTrade(null);
                    setSelectedJournalDate(null);
                  }
                  if (tab.id !== 'plans') setPrefillPlanSetup(null);
                }}
                className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all duration-200 cursor-pointer ${isActive
                  ? 'text-clay-accent scale-105 font-black'
                  : 'text-clay-muted hover:text-clay-foreground opacity-80'
                  }`}
              >
                <div className={`p-1.5 rounded-full transition-all ${isActive ? 'bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clayButton' : 'bg-transparent'}`}>
                  <Icon size={16} className="stroke-[2.5px]" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account Switcher / Management Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-[#332F3A]/35 z-50 flex items-center justify-center p-4">
          <div className="clay-surface max-w-xl w-full p-6 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">

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
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider block">Active Portfolio Accounts & Fee Structure</span>
              <div className="max-h-[210px] overflow-y-auto space-y-2 pr-1">
                {accounts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    No trading accounts provisioned yet. Use the form below to add your account.
                  </div>
                ) : (
                  accounts.map(acc => {
                  const accTrades = trades.filter(t => t.accountId === acc.id);
                  const accNetPnl = accTrades.reduce((sum, t) => sum + getTradeNetPnl(t, acc.commissionPerLot ?? 7), 0);
                  const isSelected = selectedAccountId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      className={`p-3 rounded-xl border space-y-2 transition ${isSelected
                        ? 'bg-blue-50/40 border-blue-200'
                        : 'bg-slate-50/50 border-slate-150'
                        }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-800 text-xs">{acc.name}</strong>
                            <span className="text-4xs bg-slate-200/80 px-1 py-0.5 rounded text-slate-500 font-bold uppercase">{acc.broker}</span>
                          </div>
                          <div className="text-3xs text-slate-500 font-mono">
                            Start: ${acc.initialBalance.toLocaleString()} ({acc.currency}) • Net P&L:{' '}
                            <span className={accNetPnl >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {accNetPnl >= 0 ? '+' : ''}${accNetPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedAccountId(acc.id)}
                            className={`px-2 py-1 text-3xs font-extrabold tracking-wider uppercase rounded-md transition cursor-pointer ${isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                              }`}
                          >
                            {isSelected ? 'Active' : 'Select'}
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Delete Account and linked trades"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Fee Structure Per Lot Setting */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-2xs">
                        <span className="text-slate-500 font-semibold flex items-center gap-1">
                          <Coins size={12} className="text-amber-600" />
                          Fee Structure per Lot:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-mono text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={acc.commissionPerLot !== undefined ? acc.commissionPerLot : 7}
                            onChange={(e) => handleUpdateAccountCommission(acc.id, parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            title="Edit trading commission charged per standard lot ($/lot)"
                          />
                          <span className="text-3xs text-slate-400 font-mono">/ lot</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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
                    placeholder="e.g. Funding Pips, BlueBerry"
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
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-500 font-bold flex items-center justify-between">
                    <span>Commission Fee Structure</span>
                    <span className="text-[10px] text-amber-700 font-mono">($ / standard lot)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="7.00"
                      value={newAccCommission}
                      onChange={(e) => setNewAccCommission(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-amber-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 bg-[#332F3A]/35 z-50 flex items-center justify-center p-4">
          <div className="clay-surface max-w-md w-full p-6 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">

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
                      You can enter <strong className="text-amber-900">Guest Mode (Demo Offline)</strong> below to log trades, manage your account, and explore the journal in-browser right now!
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
                          placeholder="shubh patel"
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
                        placeholder="shubhpatel@gmail.com"
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

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 lg:pb-8">

        <Suspense fallback={<ViewLoadingFallback />}>
          {currentTab === 'dashboard' && (
            <Dashboard
              trades={filteredTrades}
              plans={plans}
              setups={setupDefinitions}
              onNavigate={(tab) => setCurrentTab(tab)}
              onExecutePlan={handleExecutePlan}
              onOpenNewTrade={() => {
                setPrefillTrade(null);
                setSelectedJournalDate(null);
                setCurrentTab('journal');
              }}
              initialCapital={totalAccountInitialBalance}
              currencySymbol={currentAccountCurrency}
            />
          )}

          {currentTab === 'setups' && (
            <SetupLibraryView
              setups={setupDefinitions}
              trades={filteredTrades}
              plans={plans}
              onAddSetup={handleAddSetup}
              onUpdateSetup={handleUpdateSetup}
              onArchiveSetup={handleArchiveSetup}
              onDeleteSetup={handleDeleteSetup}
              onStartTrade={(setup) => {
                setPrefillTrade({
                  setupId: setup.id,
                  setup: setup.name,
                  asset: setup.preferredAssets[0] || 'XAUUSD',
                  direction: setup.direction === 'BUY' ? 'BUY' : 'SELL'
                });
                setCurrentTab('journal');
              }}
              onStartPlan={(setup) => {
                setPrefillPlanSetup(setup);
                setCurrentTab('plans');
              }}
              getNetPnl={(trade) => {
                const account = accounts.find(item => item.id === trade.accountId);
                return getTradeNetPnl(trade, account?.commissionPerLot ?? 7);
              }}
            />
          )}

          {currentTab === 'plans' && (
            <PlanningReviewView
              trades={filteredTrades}
              plans={plans}
              setups={setupDefinitions}
              dailyReviews={dailyReviews}
              weeklyReviews={weeklyReviews}
              onAddPlan={handleAddPlan}
              onDeletePlan={handleDeletePlan}
              onArchivePlan={handleArchivePlan}
              onExecutePlan={handleExecutePlan}
              onAddDailyReview={handleAddDailyReview}
              onDeleteDailyReview={handleDeleteDailyReview}
              onAddWeeklyReview={handleAddWeeklyReview}
              onDeleteWeeklyReview={handleDeleteWeeklyReview}
              prefillSetup={prefillPlanSetup}
              onClearPrefillSetup={() => setPrefillPlanSetup(null)}
            />
          )}

          {currentTab === 'journal' && (
            <JournalView
              trades={filteredTrades}
              accounts={accounts}
              setups={setupDefinitions}
              selectedAccountId={selectedAccountId}
              journalRules={journalRules}
              onAddRule={handleAddJournalRule}
              onEditRule={handleEditJournalRule}
              onDeleteRule={handleDeleteJournalRule}
              onResetRules={handleResetJournalRules}
              onAddTrade={handleAddTrade}
              onEditTrade={handleEditTrade}
              onDeleteTrade={handleDeleteTrade}
              prefillTrade={prefillTrade}
              onClearPrefill={() => setPrefillTrade(null)}
              onImportBackup={handleImportBackup}
              onRefreshData={async () => {
                if (user?.uid) {
                  await loadUserData(user.uid);
                }
              }}
              initialDateFilter={selectedJournalDate}
              onClearDateFilter={() => setSelectedJournalDate(null)}
            />
          )}

          {currentTab === 'calendar' && (
            <PnLCalendar 
              trades={filteredTrades} 
              initialBalance={totalAccountInitialBalance}
              onSelectDate={(dateStr) => {
                setSelectedJournalDate(dateStr);
                setCurrentTab('journal');
              }}
            />
          )}

          {currentTab === 'insights' && (
            <InsightsView
              trades={filteredTrades}
              selectedAccountId={selectedAccountId}
              accounts={accounts}
              setups={setupDefinitions}
            />
          )}

        </Suspense>

      </main>

      {/* Footer credits bar */}
      <footer className="clay-surface mx-auto mb-6 mt-12 w-[calc(100%-2rem)] max-w-7xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-3xs text-clay-muted font-mono gap-3">
        {/* Left Side: Made By Shubh Patel ❤️ */}
        <div className="flex items-center gap-1.5 font-bold text-clay-foreground bg-white/90 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-sm">
          <span>Made By Shubh Patel</span>
          <Heart size={13} className="text-rose-500 fill-rose-500 animate-pulse" />
        </div>

        {/* Center: Legal / Persistence */}
        <div className="text-center">
          <div>TRADEFORGE & EXECUTIVE TRADING JOURNAL • CLIENT-SIDE PERSISTENCE SECURED</div>
          <div className="mt-0.5 flex justify-center items-center gap-1.5 text-clay-accent">
            <Database size={10} className="stroke-[3px]" />
            <span>Local Storage Cache Active • Live UTC Session Feed</span>
          </div>
        </div>

        {/* Right Side: Version */}
        <div className="hidden md:block text-clay-muted font-bold">
          v2.4 Pro Build
        </div>
      </footer>

    </div>
  );
}
