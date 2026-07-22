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
  Sparkles
} from 'lucide-react';
import { Trade, TradingAccount } from '../types';

interface JournalViewProps {
  trades: Trade[];
  accounts: TradingAccount[];
  selectedAccountId: string;
  onAddTrade: (trade: Omit<Trade, 'id'>) => void;
  onEditTrade: (id: string, trade: Partial<Trade>) => void;
  onDeleteTrade: (id: string) => void;
  prefillTrade: Partial<Trade> | null;
  onClearPrefill: () => void;
  onImportBackup: (backupTrades: Trade[]) => void;
}

const getLocalDateStr = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  onAddTrade,
  onEditTrade,
  onDeleteTrade,
  prefillTrade,
  onClearPrefill,
  onImportBackup
}: JournalViewProps) {
  
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
  
  // High / Low Timeframe Screenshots URLs
  const [htfScreenshot, setHtfScreenshot] = useState('');
  const [ltfScreenshot, setLtfScreenshot] = useState('');

  // Filtering / Search State
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [setupFilter, setSetupFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sessionFilter, setSessionFilter] = useState('ALL');

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

  // Handle submit (save or update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      ltfScreenshot: ltfScreenshot.trim()
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

  // Filter Trades
  const filteredTrades = trades.filter(t => {
    const matchSearch = t.asset.toLowerCase().includes(search.toLowerCase()) || 
                        t.setup.toLowerCase().includes(search.toLowerCase()) ||
                        t.notes.toLowerCase().includes(search.toLowerCase());
    
    const matchAsset = assetFilter === 'ALL' || t.asset === assetFilter;
    const matchSetup = setupFilter === 'ALL' || t.setup === setupFilter;
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchSession = sessionFilter === 'ALL' || t.session === sessionFilter;

    return matchSearch && matchAsset && matchSetup && matchStatus && matchSession;
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
            id="btn-log-trade"
            onClick={handleOpenForm}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition duration-150 shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            Log Executed Trade
          </button>
        </div>
      </div>

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

          {/* Row 4 - PNL & Rules Check */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
                  required
                />
              </div>
            </div>

            <div className="md:col-span-3">
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

      {/* Interactive Logs Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
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
          </div>
        </div>

        {/* Tabular logs list */}
        {filteredTrades.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No trades match the current filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/20 text-3xs font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-sans">Account Scope</th>
                  <th className="py-3 px-4 font-sans">Trade / Setup</th>
                  <th className="py-3 px-4 font-sans">Direction</th>
                  <th className="py-3 px-4 font-sans">Entry Price</th>
                  <th className="py-3 px-4 font-sans">Exit Price</th>
                  <th className="py-3 px-4 font-sans">Size</th>
                  <th className="py-3 px-4 font-sans">P&L ($)</th>
                  <th className="py-3 px-4 font-sans">Session</th>
                  <th className="py-3 px-4 font-sans">Reflections</th>
                  <th className="py-3 px-4 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredTrades.map((trade) => {
                  const linkedAccount = accounts.find(a => a.id === trade.accountId);
                  const isExpanded = expandedTradeId === trade.id;

                  return (
                    <React.Fragment key={trade.id}>
                      <tr 
                        className={`hover:bg-slate-50/50 transition duration-150 cursor-pointer ${
                          isExpanded ? 'bg-slate-50/30' : ''
                        }`}
                        onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                      >
                        {/* Account Scope Column */}
                        <td className="py-3.5 px-4">
                          <span className="text-4xs font-bold font-sans bg-blue-50 text-blue-600 border border-blue-100/50 px-2 py-0.5 rounded-md uppercase">
                            {linkedAccount ? linkedAccount.name.replace('Personal ', '').split(' (')[0] : 'Consolidated'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-mono text-slate-900">{trade.asset}</span>
                              <span className="text-3xs text-slate-400 font-mono font-medium">{trade.time}</span>
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

                        <td className="py-3.5 px-4">
                          <span className="text-3xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                            {trade.session}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {trade.mistakes.map(m => (
                              <span 
                                key={m} 
                                className={`text-3xs px-1.5 py-0.5 rounded ${
                                  m === 'None' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50/70 text-rose-600'
                                }`}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(trade)}
                              className="px-2.5 py-1 hover:bg-slate-100 text-slate-600 text-3xs font-bold rounded transition cursor-pointer border border-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDeleteTrade(trade.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer border border-slate-200"
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

    </div>
  );
}
