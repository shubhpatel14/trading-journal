import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  Upload, 
  Plus, 
  BookOpen, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  Database,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Sparkles,
  RefreshCw,
  CalendarDays,
  Clock,
  CheckCircle2,
  CheckSquare,
  Edit3,
  Sliders,
  RotateCcw,
  Award,
  Check
} from 'lucide-react';
import { Trade, TradingAccount, JournalRule } from '../types';

interface JournalViewProps {
  trades: Trade[];
  accounts: TradingAccount[];
  selectedAccountId: string;
  journalRules: JournalRule[];
  onAddRule: (rule: Omit<JournalRule, 'id'>) => void;
  onEditRule: (id: string, rule: Partial<JournalRule>) => void;
  onDeleteRule: (id: string) => void;
  onResetRules: () => void;
  onAddTrade: (trade: Omit<Trade, 'id'>) => void;
  onEditTrade: (id: string, trade: Partial<Trade>) => void;
  onDeleteTrade: (id: string) => void;
  prefillTrade: Partial<Trade> | null;
  onClearPrefill: () => void;
  onImportBackup: (backupTrades: Trade[]) => void;
  onRefreshData?: () => Promise<void>;
  initialDateFilter?: string | null;
  onClearDateFilter?: () => void;
}

const getLocalDateStr = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const format12HourTime = (timeStr?: string) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${formattedHours}:${minutes} ${ampm}`;
};

const AVAILABLE_MISTAKES = [
  'None',
  'FOMO',
  'Overtrading',
  'Chased Trade',
  'Left Early',
  'Wide Stop Loss',
  'Overleveraged',
  'No Plan Execution'
];

const MOCK_JOURNAL_SCREENSHOTS = [
  { name: 'HTF Daily Supply Sweep', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80' },
  { name: 'LTF 15m entry trigger confirmation', url: 'https://images.unsplash.com/photo-1642390091310-1ecf18553ca7?auto=format&fit=crop&w=600&q=80' }
];

export default function JournalView({
  trades,
  accounts,
  selectedAccountId,
  journalRules,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onResetRules,
  onAddTrade,
  onEditTrade,
  onDeleteTrade,
  prefillTrade,
  onClearPrefill,
  onImportBackup,
  onRefreshData,
  initialDateFilter,
  onClearDateFilter
}: JournalViewProps) {
  
  const [isSyncingMT5, setIsSyncingMT5] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSyncMT5 = async () => {
    setIsSyncingMT5(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch('/api/mt5/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStatusMsg({
          text: `Synced ${data.uploadedCount} MT5 trades successfully!`,
          type: 'success'
        });
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        setSyncStatusMsg({
          text: `Sync failed: ${data.error || 'Check MT5 Terminal'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSyncStatusMsg({
        text: `Sync failed: ${err.message || 'Server error'}`,
        type: 'error'
      });
    } finally {
      setIsSyncingMT5(false);
      setTimeout(() => setSyncStatusMsg(null), 6000);
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [accountId, setAccountId] = useState(() => {
    return selectedAccountId !== 'ALL' ? selectedAccountId : accounts[0]?.id || 'acc-1';
  });
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [asset, setAsset] = useState('XAUUSD');
  const [setup, setSetup] = useState('BoS Downside');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('SELL');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [size, setSize] = useState('1.0');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [pnl, setPnl] = useState('');
  const [status, setStatus] = useState<'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN'>('WIN');
  const [session, setSession] = useState<'LONDON' | 'NEW YORK' | 'ASIA'>('NEW YORK');
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>(['None']);
  const [notes, setNotes] = useState('');
  const [formChecklist, setFormChecklist] = useState<Record<string, boolean>>({});

  // Quick Journal / Score Modal state
  const [journalingTrade, setJournalingTrade] = useState<Trade | null>(null);
  const [journalingChecklist, setJournalingChecklist] = useState<Record<string, boolean>>({});
  const [journalingNotes, setJournalingNotes] = useState('');
  const [journalingMistakes, setJournalingMistakes] = useState<string[]>(['None']);

  // Manage Rules Modal state
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [newRuleLabel, setNewRuleLabel] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleLabel, setEditRuleLabel] = useState('');
  const [editRuleDesc, setEditRuleDesc] = useState('');

  // High / Low Timeframe Screenshots URLs
  const [htfScreenshot, setHtfScreenshot] = useState('');
  const [ltfScreenshot, setLtfScreenshot] = useState('');

  // Filtering / Search State
  const [tradeTypeTab, setTradeTypeTab] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [setupFilter, setSetupFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<string>(initialDateFilter || '');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'HIGHEST_PROFIT' | 'HIGHEST_LOSS'>('NEWEST');

  const getTradeDayName = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d).toLocaleDateString('en-US', { weekday: 'long' });
    }
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
  };

  useEffect(() => {
    if (initialDateFilter) {
      setDateFilter(initialDateFilter);
    }
  }, [initialDateFilter]);

  // Expanded row state for Trade Details
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  
  // Lightbox Modal state
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Sync account assignment with selected filter if it changes
  useEffect(() => {
    if (selectedAccountId !== 'ALL') {
      setAccountId(selectedAccountId);
    } else if (accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [selectedAccountId, accounts]);

  // Handle Prefill (e.g. from active setup plan execution)
  useEffect(() => {
    if (prefillTrade) {
      setAsset(prefillTrade.asset || 'XAUUSD');
      setSetup(prefillTrade.setup || 'BoS Downside');
      setDirection(prefillTrade.direction || 'SELL');
      setDate(getLocalDateStr());
      setTime(new Date().toTimeString().slice(0, 5));
      setHtfScreenshot('');
      setLtfScreenshot('');
      setShowForm(true);
      setEditingId(null);
    }
  }, [prefillTrade]);

  // Set default date/time on fresh form open
  const handleOpenForm = () => {
    setDate(getLocalDateStr());
    setTime(new Date().toTimeString().slice(0, 5));
    setEditingId(null);
    onClearPrefill();
    
    // Clear other states
    setEntryPrice('');
    setExitPrice('');
    setSize('1.0');
    setSl('');
    setTp('');
    setPnl('');
    setNotes('');
    setHtfScreenshot('');
    setLtfScreenshot('');
    setSelectedMistakes(['None']);
    setFormChecklist({});
    if (selectedAccountId !== 'ALL') {
      setAccountId(selectedAccountId);
    } else if (accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
    setShowForm(true);
  };

  // Close Form and clean up prefills
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    onClearPrefill();
  };

  // Prepopulate form for editing
  const handleStartEdit = (trade: Trade) => {
    setEditingId(trade.id);
    setAccountId(trade.accountId || accounts[0]?.id || 'acc-1');
    setDate(trade.date);
    setTime(trade.time);
    setAsset(trade.asset);
    setSetup(trade.setup);
    setDirection(trade.direction);
    setEntryPrice(trade.entryPrice.toString());
    setExitPrice(trade.exitPrice.toString());
    setSize(trade.size.toString());
    setSl(trade.sl ? trade.sl.toString() : '');
    setTp(trade.tp ? trade.tp.toString() : '');
    setPnl(trade.pnl.toString());
    setStatus(trade.status);
    setSession(trade.session);
    setSelectedMistakes(trade.mistakes);
    setNotes(trade.notes);
    setHtfScreenshot(trade.htfScreenshot || '');
    setLtfScreenshot(trade.ltfScreenshot || '');
    setFormChecklist(trade.checklist || {});
    setShowForm(true);
  };

  const handleToggleMistake = (mistake: string) => {
    if (mistake === 'None') {
      setSelectedMistakes(['None']);
      return;
    }

    let updated = selectedMistakes.filter(m => m !== 'None');
    if (updated.includes(mistake)) {
      updated = updated.filter(m => m !== mistake);
      if (updated.length === 0) updated = ['None'];
    } else {
      updated.push(mistake);
    }
    setSelectedMistakes(updated);
  };

  const handleToggleFormRule = (ruleId: string) => {
    setFormChecklist(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };

  // Quick Journal / Score Modal Handlers
  const handleOpenJournalModal = (trade: Trade) => {
    setJournalingTrade(trade);
    setJournalingChecklist(trade.checklist || {});
    setJournalingNotes(trade.notes || '');
    setJournalingMistakes(trade.mistakes && trade.mistakes.length > 0 ? trade.mistakes : ['None']);
  };

  const handleToggleJournalRule = (ruleId: string) => {
    setJournalingChecklist(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };

  const handleToggleJournalMistake = (mistake: string) => {
    if (mistake === 'None') {
      setJournalingMistakes(['None']);
      return;
    }
    let updated = journalingMistakes.filter(m => m !== 'None');
    if (updated.includes(mistake)) {
      updated = updated.filter(m => m !== mistake);
      if (updated.length === 0) updated = ['None'];
    } else {
      updated.push(mistake);
    }
    setJournalingMistakes(updated);
  };

  const handleSaveJournalScore = () => {
    if (!journalingTrade) return;
    const checkedCount = journalRules.filter(r => journalingChecklist[r.id]).length;
    const maxScore = journalRules.length;

    onEditTrade(journalingTrade.id, {
      checklist: journalingChecklist,
      checklistScore: checkedCount,
      maxChecklistScore: maxScore,
      journalingStatus: 'COMPLETE',
      notes: journalingNotes,
      mistakes: journalingMistakes
    });

    setJournalingTrade(null);
  };

  // Manage Rules Handlers
  const handleCreateRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleLabel.trim()) return;
    onAddRule({
      label: newRuleLabel.trim(),
      description: newRuleDesc.trim() || undefined
    });
    setNewRuleLabel('');
    setNewRuleDesc('');
  };

  const handleStartEditRule = (rule: JournalRule) => {
    setEditingRuleId(rule.id);
    setEditRuleLabel(rule.label);
    setEditRuleDesc(rule.description || '');
  };

  const handleSaveEditRule = (id: string) => {
    if (!editRuleLabel.trim()) return;
    onEditRule(id, {
      label: editRuleLabel.trim(),
      description: editRuleDesc.trim() || undefined
    });
    setEditingRuleId(null);
  };

  // Handle submit (save or update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const checkedRulesCount = journalRules.filter(r => formChecklist[r.id]).length;
    const maxScore = journalRules.length;
    const isEvaluated = Object.keys(formChecklist).length > 0;

    const existingTrade = editingId ? trades.find(t => t.id === editingId) : null;

    const finalTrade = {
      accountId,
      date,
      time,
      asset: asset.toUpperCase().trim(),
      setup,
      direction,
      entryPrice: parseFloat(entryPrice) || 0,
      exitPrice: parseFloat(exitPrice) || 0,
      size: parseFloat(size) || 1,
      sl: parseFloat(sl) || 0,
      tp: parseFloat(tp) || 0,
      pnl: parseFloat(pnl) || 0,
      status,
      session,
      mistakes: selectedMistakes,
      notes,
      htfScreenshot: htfScreenshot.trim(),
      ltfScreenshot: ltfScreenshot.trim(),
      checklist: formChecklist,
      checklistScore: isEvaluated ? checkedRulesCount : (existingTrade?.checklistScore ?? 0),
      maxChecklistScore: isEvaluated ? maxScore : (existingTrade?.maxChecklistScore ?? maxScore),
      journalingStatus: isEvaluated ? ('COMPLETE' as const) : (existingTrade?.journalingStatus ?? ('PENDING' as const))
    };

    if (editingId) {
      onEditTrade(editingId, finalTrade);
    } else {
      onAddTrade(finalTrade);
    }

    handleCloseForm();
  };

  // Calculated values when entering entry/exit
  const calculateEstimatePnl = () => {
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const qty = parseFloat(size);
    if (!isNaN(entry) && !isNaN(exit) && !isNaN(qty)) {
      let multiplier = 100; 
      if (asset.toUpperCase().includes('USD') && !asset.toUpperCase().includes('XAU')) {
        multiplier = 100000; 
      }
      const rawDiff = direction === 'BUY' ? (exit - entry) : (entry - exit);
      
      let estPnl = 0;
      if (asset.toUpperCase().includes('XAU')) {
        estPnl = rawDiff * qty * 100;
      } else {
        estPnl = rawDiff * qty * multiplier;
      }
      setPnl(estPnl.toFixed(0));
      setStatus(estPnl > 0 ? 'WIN' : estPnl < 0 ? 'LOSS' : 'BREAKEVEN');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'ID,AccountID,Date,Time,Asset,Setup,Direction,Entry,Exit,Size,Stop Loss,Take Profit,PnL,Status,Session,Mistakes,Notes,HTF_Screenshot,LTF_Screenshot\n';
    const rows = trades.map(t => 
      `"${t.id}","${t.accountId}","${t.date}","${t.time}","${t.asset}","${t.setup}","${t.direction}",${t.entryPrice},${t.exitPrice},${t.size},${t.sl},${t.tp},${t.pnl},"${t.status}","${t.session}","${t.mistakes.join(';') || 'None'}","${t.notes.replace(/"/g, '""')}","${t.htfScreenshot || ''}","${t.ltfScreenshot || ''}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Trading_Journal_Backup_${getLocalDateStr()}.csv`);
    link.click();
  };

  // Import Backup JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const isValid = parsed.every(item => item.asset && item.pnl !== undefined && item.date);
          if (isValid) {
            onImportBackup(parsed);
            alert(`Imported ${parsed.length} trades successfully.`);
          } else {
            alert('Invalid backup structure.');
          }
        } else {
          alert('Backup must be an array of trades.');
        }
      } catch (err) {
        alert('Failed to parse file as JSON.');
      }
    };
    reader.readAsText(file);
  };

  const completedCount = trades.filter(t => t.journalingStatus === 'COMPLETE').length;
  const pendingCount = trades.filter(t => t.journalingStatus !== 'COMPLETE').length;

  // Filter Trades
  const filteredTrades = trades.filter(t => {
    const matchSearch = t.asset.toLowerCase().includes(search.toLowerCase()) || 
                        t.setup.toLowerCase().includes(search.toLowerCase()) ||
                        t.notes.toLowerCase().includes(search.toLowerCase());
    
    const matchAsset = assetFilter === 'ALL' || t.asset === assetFilter;
    const matchSetup = setupFilter === 'ALL' || t.setup === setupFilter;
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchSession = sessionFilter === 'ALL' || t.session === sessionFilter;
    const matchDate = !dateFilter || t.date === dateFilter;
    const matchDayOfWeek = dayOfWeekFilter === 'ALL' || getTradeDayName(t.date).toLowerCase() === dayOfWeekFilter.toLowerCase();
    const matchTypeTab = tradeTypeTab === 'ALL' 
      ? true 
      : tradeTypeTab === 'PENDING' 
        ? t.journalingStatus !== 'COMPLETE' 
        : t.journalingStatus === 'COMPLETE';

    return matchSearch && matchAsset && matchSetup && matchStatus && matchSession && matchDate && matchDayOfWeek && matchTypeTab;
  });

  // Sort Trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (sortBy === 'NEWEST') {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
      return b.id.localeCompare(a.id);
    }
    if (sortBy === 'OLDEST') {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeA - timeB;
      }
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'HIGHEST_PROFIT') {
      return b.pnl - a.pnl;
    }
    if (sortBy === 'HIGHEST_LOSS') {
      return a.pnl - b.pnl;
    }
    return 0;
  });

  // Unique elements for filter dropdowns
  const uniqueAssets = Array.from(new Set(trades.map(t => t.asset)));
  const uniqueSetups = Array.from(new Set(trades.map(t => t.setup)));

  return (
    <div className="space-y-8" id="journal-tab">
      
      {/* Lightbox Overlay */}
      {activeLightboxImg && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setActiveLightboxImg(null)}
              className="absolute -top-10 right-0 bg-white/15 hover:bg-white/20 p-2 rounded-full text-white cursor-pointer transition"
            >
              <X size={18} />
            </button>
            <img 
              src={activeLightboxImg} 
              alt="High fidelity trading execution zoom" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
            />
            <span className="text-3xs text-white/50 font-mono mt-3">EXECUTION CHART SCREENSHOT STUDY • CLICK OUTSIDE TO CLOSE</span>
          </div>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="text-blue-600" />
            Execution Journal Logs
          </h1>
          <p className="text-sm text-slate-500 font-sans">
            Log exact entries, link HTF/LTF trading charts, and monitor individual accounts. Click any row to expand details.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowRulesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 hover:bg-purple-50 text-purple-700 text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
            title="Add, edit, or delete trade journaling checklist rules"
          >
            <Sliders size={14} />
            Manage Rules ({journalRules.length})
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
            title="Download CSV"
          >
            <FileSpreadsheet size={14} />
            Export CSV
          </button>
          
          <label className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer hover:border-slate-350">
            <Upload size={14} />
            Import Backup
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportJSON} 
              className="hidden" 
            />
          </label>

          <button
            onClick={handleSyncMT5}
            disabled={isSyncingMT5}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer disabled:opacity-60"
            title="Sync latest trades automatically from MetaTrader 5"
          >
            <RefreshCw size={14} className={isSyncingMT5 ? 'animate-spin' : ''} />
            {isSyncingMT5 ? 'Syncing MT5...' : 'Sync MT5'}
          </button>

          <button
            id="btn-log-trade"
            onClick={handleOpenForm}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition duration-150 shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            Log Executed Trade
          </button>
        </div>
      </div>

      {/* Sync Status Notification Banner */}
      {syncStatusMsg && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-fadeIn shadow-3xs ${
          syncStatusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200/80' 
            : 'bg-rose-50 text-rose-900 border-rose-200/80'
        }`}>
          <Sparkles size={15} className={syncStatusMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
          <span>{syncStatusMsg.text}</span>
        </div>
      )}

      {/* Logging Form (Add / Edit) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-6 animate-slideDown">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {editingId ? 'Edit Logged Trade Details' : 'Log Trade Execution'}
              </h3>
              <p className="text-4xs text-slate-450 font-mono">PERSISTED SECURELY IN CACHE</p>
            </div>
            <button
              type="button"
              onClick={handleCloseForm}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Account scope selection */}
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trading Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700"
                required
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trade Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trade Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asset Symbol</label>
              <input
                type="text"
                value={asset}
                onChange={(e) => setAsset(e.target.value.toUpperCase())}
                placeholder="XAUUSD"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-800 font-mono"
                required
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Setup Name</label>
              <select
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800"
              >
                <option value="BoS Downside">BoS Downside</option>
                <option value="EMA Rejection">EMA Rejection</option>
                <option value="Highs Rejection">Highs Rejection</option>
                <option value="Liquidity Sweep">Liquidity Sweep</option>
                <option value="Double Top/Bottom">Double Top/Bottom</option>
                <option value="Order Block Retest">Order Block Retest</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                {(['BUY', 'SELL'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setDirection(dir)}
                    className={`py-2 text-3xs font-extrabold tracking-wider rounded-xl border transition cursor-pointer ${
                      direction === dir
                        ? dir === 'BUY'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800"
              >
                <option value="NEW YORK">NEW YORK</option>
                <option value="LONDON">LONDON</option>
                <option value="ASIA">ASIA</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Size (Lots/Contracts)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800 font-mono"
                required
              />
            </div>

            {/* Row 3 - entry, exit, sl, tp */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider">Entry Price</label>
                <button
                  type="button"
                  onClick={calculateEstimatePnl}
                  className="text-3xs text-blue-600 hover:underline font-bold"
                >
                  Estimate PnL
                </button>
              </div>
              <input
                type="number"
                step="0.00001"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="2420.50"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exit Price</label>
              <input
                type="number"
                step="0.00001"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="2405.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stop Loss (SL)</label>
              <input
                type="number"
                step="0.00001"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                placeholder="2428.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Take Profit (TP)</label>
              <input
                type="number"
                step="0.00001"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                placeholder="2400.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Screenshot Attachments URLs (HTF and LTF) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-4">
            <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block">Log Execution Screenshots (HTF & LTF Charts)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-4xs font-bold text-slate-500 uppercase block">High Timeframe Screenshot URL (HTF SS)</label>
                <input
                  type="url"
                  placeholder="e.g. Daily/4HR structure screenshot link"
                  value={htfScreenshot}
                  onChange={(e) => setHtfScreenshot(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-650 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-4xs font-bold text-slate-500 uppercase block">Low Timeframe Screenshot URL (LTF SS)</label>
                <input
                  type="url"
                  placeholder="e.g. 15m/5m entry wick confirmation link"
                  value={ltfScreenshot}
                  onChange={(e) => setLtfScreenshot(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-650 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-3xs bg-white p-2 border rounded-lg">
              <span className="font-bold text-blue-700 uppercase flex items-center gap-1">
                <Sparkles size={11} />
                Quick-Paste Demo Charts:
              </span>
              <button
                type="button"
                onClick={() => {
                  setHtfScreenshot(MOCK_JOURNAL_SCREENSHOTS[0].url);
                  setLtfScreenshot(MOCK_JOURNAL_SCREENSHOTS[1].url);
                }}
                className="px-2 py-0.5 border border-slate-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition font-bold"
              >
                Paste Mock HTF/LTF SS Links
              </button>
            </div>
          </div>

          {/* Row 4 - Trade Status, PNL & Rules Check */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Trade Status / Outcome
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="WIN">WIN (Completed)</option>
                <option value="LOSS">LOSS (Completed)</option>
                <option value="BREAKEVEN">BREAKEVEN (Completed)</option>
                <option value="OPEN">PENDING / OPEN (Active Trade)</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Realized Net Profit/Loss ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={pnl}
                  onChange={(e) => setPnl(e.target.value)}
                  placeholder="3875"
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold font-mono text-slate-800"
                  required={status !== 'OPEN'}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Execution Reflections / Psychology check (Mistakes)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_MISTAKES.map((mistake) => {
                  const isSelected = selectedMistakes.includes(mistake);
                  return (
                    <button
                      key={mistake}
                      type="button"
                      onClick={() => handleToggleMistake(mistake)}
                      className={`px-3 py-1.5 rounded-xl text-3xs font-bold border transition cursor-pointer ${
                        isSelected
                          ? mistake === 'None'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {mistake}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Trade Journaling Checklist Rules */}
          <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-150 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-purple-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Trade Journaling Confluence Checklist
                </span>
              </div>
              <div className="flex items-center gap-2 text-2xs font-bold text-purple-700 bg-purple-100/70 px-2.5 py-1 rounded-lg">
                <span>Score: {journalRules.filter(r => formChecklist[r.id]).length} / {journalRules.length}</span>
                <span>({journalRules.length > 0 ? Math.round((journalRules.filter(r => formChecklist[r.id]).length / journalRules.length) * 100) : 0}%)</span>
              </div>
            </div>

            <p className="text-3xs text-slate-500 font-sans">
              Evaluate rules met for this trade. Saving with checklist scores will set status to <strong className="text-emerald-600 font-bold">Journaling Complete</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
              {journalRules.map(rule => {
                const isChecked = Boolean(formChecklist[rule.id]);
                return (
                  <label
                    key={rule.id}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border transition cursor-pointer text-xs ${
                      isChecked
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleFormRule(rule.id)}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold leading-tight">{rule.label}</div>
                      {rule.description && (
                        <div className={`text-4xs leading-normal ${isChecked ? 'text-purple-100' : 'text-slate-450'}`}>
                          {rule.description}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Reflections notes */}
          <div>
            <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes / Lessons Learned</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the mood during trade, reasons for leaving early, how the news PPI/CPI impacted spread wicks, etc."
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-700 font-sans"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <div className="text-3xs text-slate-400 flex items-center gap-1">
              <AlertCircle size={12} />
              PnL will scale dynamically based on selected portfolio account constraints.
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition duration-150 cursor-pointer shadow-xs"
              >
                {editingId ? 'Update Logged Trade' : 'Save Logged Trade'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filtered Date Banner */}
      {dateFilter && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-50 border border-blue-200/80 p-4 rounded-2xl shadow-xs text-xs">
          <div className="flex items-center gap-3 font-bold text-slate-800">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-3xs">
              <CalendarDays size={18} />
            </div>
            <div>
              <div className="text-2xs text-blue-700 uppercase font-black tracking-wider">Filtered Calendar View</div>
              <div className="text-sm font-extrabold text-slate-900 font-mono flex items-center gap-2">
                <span>{dateFilter}</span>
                <span className="text-2xs font-semibold font-sans text-slate-500">
                  ({filteredTrades.length} {filteredTrades.length === 1 ? 'trade' : 'trades'} logged on this day)
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setDateFilter('');
              if (onClearDateFilter) onClearDateFilter();
            }}
            className="self-start sm:self-auto flex items-center gap-1.5 text-2xs font-extrabold bg-white text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded-xl shadow-3xs transition cursor-pointer"
          >
            <X size={13} />
            <span>Show All Dates</span>
          </button>
        </div>
      )}

      {/* Interactive Logs Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Pending vs Completed Trade Journaling Tabs Header */}
        <div className="p-3.5 bg-slate-100/50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-xl shadow-3xs">
            <button
              onClick={() => setTradeTypeTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
                tradeTypeTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>All Trades</span>
              <span className={`px-1.5 py-0.2 text-3xs rounded-full font-mono ${tradeTypeTab === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {trades.length}
              </span>
            </button>

            <button
              onClick={() => setTradeTypeTab('COMPLETED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
                tradeTypeTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 size={13} className={tradeTypeTab === 'COMPLETED' ? 'text-white' : 'text-emerald-600'} />
              <span>Completed Trades</span>
              <span className={`px-1.5 py-0.2 text-3xs rounded-full font-mono ${tradeTypeTab === 'COMPLETED' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {completedCount}
              </span>
            </button>

            <button
              onClick={() => setTradeTypeTab('PENDING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
                tradeTypeTab === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Clock size={13} className={tradeTypeTab === 'PENDING' ? 'text-white animate-pulse' : 'text-amber-600'} />
              <span>Pending Trades</span>
              <span className={`px-1.5 py-0.2 text-3xs rounded-full font-mono ${tradeTypeTab === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {pendingCount}
              </span>
            </button>
          </div>

          <div className="text-3xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200/60 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} />
            <span>Trades Partitioned By Day</span>
          </div>
        </div>

        {/* Table Filters header */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-100/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets, setups, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400" />
              <span className="text-slate-500 text-2xs font-sans">Filters:</span>
            </div>

            {/* Asset selector */}
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 bg-white rounded-lg text-2xs font-semibold text-slate-600"
            >
              <option value="ALL">All Assets</option>
              {uniqueAssets.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* Setup Selector */}
            <select
              value={setupFilter}
              onChange={(e) => setSetupFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 bg-white rounded-lg text-2xs font-semibold text-slate-600"
            >
              <option value="ALL">All Setups</option>
              {uniqueSetups.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Status selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 bg-white rounded-lg text-2xs font-semibold text-slate-600"
            >
              <option value="ALL">All Outcomes</option>
              <option value="WIN">WIN</option>
              <option value="LOSS">LOSS</option>
              <option value="BREAKEVEN">BREAKEVEN</option>
              <option value="OPEN">OPEN</option>
            </select>

            {/* Session selector */}
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 bg-white rounded-lg text-2xs font-semibold text-slate-600"
            >
              <option value="ALL">All Sessions</option>
              <option value="NEW YORK">New York</option>
              <option value="LONDON">London</option>
              <option value="ASIA">Asia</option>
            </select>

            {/* Day of Week selector */}
            <select
              value={dayOfWeekFilter}
              onChange={(e) => setDayOfWeekFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 bg-white rounded-lg text-2xs font-semibold text-slate-600 cursor-pointer"
            >
              <option value="ALL">All Days of Week</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>

            {/* Specific Date Picker filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-2xs">
              <CalendarDays size={13} className="text-slate-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-2xs font-semibold text-slate-600 focus:outline-none bg-transparent font-sans cursor-pointer"
                title="Filter by specific date"
              />
              {dateFilter && (
                <button
                  onClick={() => {
                    setDateFilter('');
                    if (onClearDateFilter) onClearDateFilter();
                  }}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Clear Date Filter"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Reset Filters Button */}
            {(assetFilter !== 'ALL' || setupFilter !== 'ALL' || statusFilter !== 'ALL' || sessionFilter !== 'ALL' || dayOfWeekFilter !== 'ALL' || dateFilter !== '' || search !== '' || tradeTypeTab !== 'ALL') && (
              <button
                onClick={() => {
                  setAssetFilter('ALL');
                  setSetupFilter('ALL');
                  setStatusFilter('ALL');
                  setSessionFilter('ALL');
                  setDayOfWeekFilter('ALL');
                  setDateFilter('');
                  setSearch('');
                  setTradeTypeTab('ALL');
                  if (onClearDateFilter) onClearDateFilter();
                }}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 rounded-lg text-2xs font-extrabold transition flex items-center gap-1 cursor-pointer shadow-3xs"
                title="Clear all active filters"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* Sort selector */}
            <div className="flex items-center gap-1.5 border-l border-slate-200/80 pl-3">
              <span className="text-slate-500 text-2xs font-bold font-sans">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 border border-blue-200 bg-blue-50/80 rounded-lg text-2xs font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-3xs cursor-pointer"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
                <option value="HIGHEST_PROFIT">Highest Profit</option>
                <option value="HIGHEST_LOSS">Highest Loss</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabular logs list */}
        {sortedTrades.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No trades match the current filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/20 text-3xs font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-sans">Account Scope</th>
                  <th className="py-3 px-4 font-sans">Date & Time (IST)</th>
                  <th className="py-3 px-4 font-sans">Trade / Setup</th>
                  <th className="py-3 px-4 font-sans">Direction</th>
                  <th className="py-3 px-4 font-sans">Entry Price</th>
                  <th className="py-3 px-4 font-sans">Exit Price</th>
                  <th className="py-3 px-4 font-sans">Size</th>
                  <th className="py-3 px-4 font-sans">P&L ($)</th>
                  <th className="py-3 px-4 font-sans">Journaling</th>
                  <th className="py-3 px-4 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {sortedTrades.map((trade, index) => {
                  const linkedAccount = accounts.find(a => a.id === trade.accountId);
                  const isExpanded = expandedTradeId === trade.id || (Boolean(dateFilter) && expandedTradeId !== `collapsed-${trade.id}`);
                  const showDateDivider = index === 0 || sortedTrades[index - 1].date !== trade.date;

                  return (
                    <React.Fragment key={trade.id}>
                      {/* Subtle Line Partitioning Each Day's Trades */}
                      {showDateDivider && (
                        <tr key={`divider-${trade.date}-${index}`} className="bg-slate-50/60">
                          <td colSpan={10} className="py-1.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-[1px] flex-1 bg-blue-300/60" />
                              <span className="text-4xs font-extrabold font-mono text-blue-600 bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-200/70 uppercase tracking-wider flex items-center gap-1 shrink-0">
                                <CalendarDays size={10} className="text-blue-500" />
                                {trade.date} • {getTradeDayName(trade.date)}
                              </span>
                              <div className="h-[1px] flex-1 bg-blue-300/60" />
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr 
                        className={`hover:bg-slate-50/50 transition duration-150 cursor-pointer ${
                          isExpanded ? 'bg-slate-50/30' : ''
                        }`}
                        onClick={() => setExpandedTradeId(isExpanded ? (dateFilter ? `collapsed-${trade.id}` : null) : trade.id)}
                      >
                        {/* Account Scope Column */}
                        <td className="py-3.5 px-4">
                          <span className="text-4xs font-bold font-sans bg-blue-50 text-blue-600 border border-blue-100/50 px-2 py-0.5 rounded-md uppercase">
                            {linkedAccount ? linkedAccount.name.replace('Personal ', '').split(' (')[0] : 'Consolidated'}
                          </span>
                        </td>

                        {/* Date & Time (IST) Column */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{trade.date}</span>
                              <span className="text-4xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200/70 px-1 py-0.2 rounded tracking-wider">IST</span>
                            </div>
                            <div className="text-3xs text-slate-500 font-medium">
                              {trade.time ? `${format12HourTime(trade.time)} IST` : '12:00 PM IST'}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-mono text-slate-900">{trade.asset}</span>
                            </div>
                            <div className="text-3xs text-slate-500 font-sans">{trade.setup}</div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-3xs font-extrabold tracking-wider ${
                            trade.direction === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {trade.direction}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{trade.entryPrice.toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{trade.exitPrice.toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{trade.size}</td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            {trade.pnl >= 0 ? (
                              <TrendingUp size={12} className="text-emerald-500" />
                            ) : (
                              <TrendingDown size={12} className="text-rose-500" />
                            )}
                            <span className={`font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        </td>

                        {/* Journaling Column */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          {trade.journalingStatus === 'COMPLETE' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-3xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-3xs">
                                  <CheckCircle2 size={11} />
                                  Journaling Complete
                                </span>
                                {trade.checklistScore !== undefined && trade.maxChecklistScore !== undefined && (
                                  <span className="text-3xs font-bold font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/80">
                                    {trade.checklistScore}/{trade.maxChecklistScore} ({trade.maxChecklistScore > 0 ? Math.round((trade.checklistScore / trade.maxChecklistScore) * 100) : 0}%)
                                  </span>
                                )}
                              </div>
                              {trade.mistakes && trade.mistakes.length > 0 && trade.mistakes[0] !== 'None' && (
                                <div className="text-4xs px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold border border-rose-200/70 inline-block">
                                  {trade.mistakes.join(', ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-3xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-3xs">
                                  <Clock size={11} className="animate-pulse" />
                                  Pending
                                </span>
                                <button
                                  onClick={() => handleOpenJournalModal(trade)}
                                  className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white text-4xs font-bold rounded shadow-3xs transition cursor-pointer flex items-center gap-1"
                                >
                                  <CheckSquare size={10} />
                                  Score Trade
                                </button>
                              </div>
                              <div className="text-4xs text-slate-400 font-medium">Checklist not evaluated yet</div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end items-center gap-1">
                            <button
                              onClick={() => handleOpenJournalModal(trade)}
                              className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/80 text-3xs font-bold rounded transition cursor-pointer flex items-center gap-1"
                              title="Evaluate checklist rules & score trade"
                            >
                              <CheckSquare size={11} />
                              <span>Score</span>
                            </button>
                            <button
                              onClick={() => handleStartEdit(trade)}
                              className="px-2.5 py-1 hover:bg-slate-100 text-slate-600 text-3xs font-bold rounded transition cursor-pointer border border-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDeleteTrade(trade.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer border border-slate-200"
                              title="Delete trade"
                            >
                              <Trash2 size={12} />
                            </button>
                            <button
                              onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded transition cursor-pointer border border-slate-200"
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable row content */}
                      {isExpanded && (
                        <tr className="bg-slate-50/20">
                          <td colSpan={10} className="p-5 border-b border-slate-100">
                            <div className="space-y-4 animate-fadeIn">
                              
                              {/* Notes */}
                              <div className="space-y-1.5">
                                <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider block">Trade Reflections & Analysis Notes</span>
                                <p className="text-xs text-slate-700 leading-relaxed font-sans bg-white border rounded-xl p-3 shadow-3xs">
                                  {trade.notes || 'No notes added for this execution.'}
                                </p>
                              </div>

                              {/* Checklist Breakdown */}
                              <div className="space-y-1.5">
                                <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider block">
                                  Journaling Checklist Confluence Breakdown
                                </span>
                                {trade.journalingStatus === 'COMPLETE' ? (
                                  <div className="bg-white border border-slate-150 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    {journalRules.map(rule => {
                                      const passed = trade.checklist && Boolean(trade.checklist[rule.id]);
                                      return (
                                        <div key={rule.id} className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-2xs font-bold ${
                                          passed ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                        }`}>
                                          {passed ? <CheckCircle2 size={12} className="text-emerald-600 shrink-0" /> : <X size={12} className="text-slate-350 shrink-0" />}
                                          <span className="truncate">{rule.label}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-800 font-medium flex items-center justify-between flex-wrap gap-2">
                                    <span>This trade has not been evaluated with the journaling checklist yet.</span>
                                    <button
                                      onClick={() => handleOpenJournalModal(trade)}
                                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1"
                                    >
                                      <CheckSquare size={13} />
                                      Score Checklist Now
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* HTF and LTF Chart screenshots */}
                              {(trade.htfScreenshot || trade.ltfScreenshot) ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                  {trade.htfScreenshot && (
                                    <div className="space-y-2">
                                      <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                        <ImageIcon size={11} className="text-blue-600" />
                                        High Timeframe Structure (HTF SS)
                                      </span>
                                      <div className="relative group overflow-hidden bg-slate-950 aspect-[16/10] rounded-xl border">
                                        <img 
                                          src={trade.htfScreenshot} 
                                          alt="High timeframe setup" 
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                                        />
                                        <button
                                          onClick={() => setActiveLightboxImg(trade.htfScreenshot || '')}
                                          className="absolute bottom-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                        >
                                          <Maximize2 size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {trade.ltfScreenshot && (
                                    <div className="space-y-2">
                                      <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                        <ImageIcon size={11} className="text-blue-600" />
                                        Low Timeframe Entry confirmation (LTF SS)
                                      </span>
                                      <div className="relative group overflow-hidden bg-slate-950 aspect-[16/10] rounded-xl border">
                                        <img 
                                          src={trade.ltfScreenshot} 
                                          alt="Low timeframe entries wicks" 
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                                        />
                                        <button
                                          onClick={() => setActiveLightboxImg(trade.ltfScreenshot || '')}
                                          className="absolute bottom-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                        >
                                          <Maximize2 size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-3xs text-slate-400 bg-white p-3 border rounded-xl italic">
                                  No HTF or LTF chart wicks logged. Add chart links to review entries.
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Journaling / Scoring Modal */}
      {journalingTrade && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 text-2xs font-bold text-purple-600 uppercase tracking-wider">
                  <CheckSquare size={14} />
                  Trade Journaling Checklist Evaluator
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {journalingTrade.asset} ({journalingTrade.direction}) — {journalingTrade.date}
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Setup: <strong className="text-slate-800">{journalingTrade.setup}</strong> • PnL: <span className={journalingTrade.pnl >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>${journalingTrade.pnl}</span>
                </p>
              </div>
              <button
                onClick={() => setJournalingTrade(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Score Readout */}
            <div className="bg-purple-50 border border-purple-200/80 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-2xs font-bold text-purple-700 uppercase tracking-wider">Confluence Score</div>
                <div className="text-2xl font-black text-purple-900 font-mono">
                  {journalRules.filter(r => journalingChecklist[r.id]).length} / {journalRules.length}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-purple-800">
                  {journalRules.length > 0 ? Math.round((journalRules.filter(r => journalingChecklist[r.id]).length / journalRules.length) * 100) : 0}% Confluence
                </div>
                <span className="text-3xs text-purple-600 font-bold">
                  {journalRules.filter(r => journalingChecklist[r.id]).length >= 6 ? '🌟 High Quality Setup' : '⚠️ Low Confluence Trade'}
                </span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Checklist Rules ({journalRules.length} items)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {journalRules.map(rule => {
                  const isChecked = Boolean(journalingChecklist[rule.id]);
                  return (
                    <label
                      key={rule.id}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer text-xs ${
                        isChecked
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleJournalRule(rule.id)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold leading-tight">{rule.label}</div>
                        {rule.description && (
                          <div className={`text-4xs leading-normal ${isChecked ? 'text-purple-100' : 'text-slate-500'}`}>
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Mistakes reflections */}
            <div className="space-y-2">
              <label className="text-2xs font-extrabold text-slate-600 uppercase tracking-wider block">Psychology / Mistakes</label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_MISTAKES.map(mistake => {
                  const isSelected = journalingMistakes.includes(mistake);
                  return (
                    <button
                      key={mistake}
                      type="button"
                      onClick={() => handleToggleJournalMistake(mistake)}
                      className={`px-2.5 py-1 rounded-lg text-3xs font-bold border transition cursor-pointer ${
                        isSelected
                          ? mistake === 'None'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {mistake}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-2xs font-extrabold text-slate-600 uppercase tracking-wider block">Reflections / Journaling Notes</label>
              <textarea
                value={journalingNotes}
                onChange={(e) => setJournalingNotes(e.target.value)}
                placeholder="Add execution reflections, details on exit strategy..."
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 font-sans"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setJournalingTrade(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveJournalScore}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                Save & Mark Journaling Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 text-2xs font-bold text-purple-600 uppercase tracking-wider">
                  <Sliders size={14} />
                  Rule Management System
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Manage Trade Journaling Checklist Rules
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Add new rules, edit existing rules, or delete rules to customize your setup confluence checklist.
                </p>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Add New Rule Form */}
            <form onSubmit={handleCreateRuleSubmit} className="p-4 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-3">
              <span className="text-2xs font-extrabold text-purple-800 uppercase tracking-wider block">
                Add New Checklist Rule
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Rule Title (e.g., HTF Order Block Touch)"
                  value={newRuleLabel}
                  onChange={(e) => setNewRuleLabel(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-3xs transition cursor-pointer flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Rule
                </button>
              </div>
            </form>

            {/* Existing Rules List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Active Rules ({journalRules.length})
                </span>
                <button
                  onClick={onResetRules}
                  className="text-3xs font-bold text-slate-500 hover:text-purple-600 flex items-center gap-1 cursor-pointer transition"
                  title="Reset rules to default 8 items"
                >
                  <RotateCcw size={11} />
                  Reset Defaults
                </button>
              </div>

              <div className="space-y-2">
                {journalRules.map((rule, idx) => {
                  const isEditing = editingRuleId === rule.id;
                  return (
                    <div key={rule.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition">
                      {isEditing ? (
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editRuleLabel}
                            onChange={(e) => setEditRuleLabel(e.target.value)}
                            className="px-2.5 py-1 border border-purple-300 rounded-lg text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={editRuleDesc}
                            onChange={(e) => setEditRuleDesc(e.target.value)}
                            className="px-2.5 py-1 border border-purple-300 rounded-lg text-xs"
                            placeholder="Description"
                          />
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5">
                          <span className="text-3xs font-mono font-bold text-slate-400 mt-0.5">{idx + 1}.</span>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{rule.label}</div>
                            {rule.description && (
                              <div className="text-3xs text-slate-500 font-sans">{rule.description}</div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveEditRule(rule.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-3xs font-bold rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartEditRule(rule)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer transition"
                            title="Edit Rule"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                          title="Delete Rule"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
