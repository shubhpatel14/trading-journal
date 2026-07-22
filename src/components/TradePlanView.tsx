import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Sparkles, 
  HelpCircle, 
  Archive,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  X,
  Maximize2
} from 'lucide-react';
import { TradePlan, TimeframeAnalysis } from '../types';

interface TradePlanViewProps {
  plans: TradePlan[];
  onAddPlan: (plan: Omit<TradePlan, 'id' | 'createdAt'>) => void;
  onDeletePlan: (id: string) => void;
  onArchivePlan: (id: string) => void;
  onExecutePlan: (plan: TradePlan) => void;
}

const getLocalDateStr = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const PREMIUM_MOCK_CHARTS = [
  { name: 'Gold 4HR Trend', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80' },
  { name: 'FX Accumulation 1HR', url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80' },
  { name: '15m BoS Rejection', url: 'https://images.unsplash.com/photo-1642390091310-1ecf18553ca7?auto=format&fit=crop&w=600&q=80' },
  { name: '5m Local Entry Sweep', url: 'https://images.unsplash.com/photo-1624996379697-f01d168b1a52?auto=format&fit=crop&w=600&q=80' }
];

export default function TradePlanView({
  plans,
  onAddPlan,
  onDeletePlan,
  onArchivePlan,
  onExecutePlan
}: TradePlanViewProps) {
  // Current Date filter for Daily changing structure
  const [selectedDate, setSelectedDate] = useState(() => {
    return getLocalDateStr();
  });

  const [asset, setAsset] = useState('XAUUSD');
  const [bias, setBias] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BEARISH');
  
  // Timeframe analyses state
  const [fourHourText, setFourHourText] = useState('');
  const [fourHourBias, setFourHourBias] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BEARISH');
  const [fourHourImg, setFourHourImg] = useState('');
  
  const [oneHourText, setOneHourText] = useState('');
  const [oneHourBias, setOneHourBias] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BEARISH');
  const [oneHourImg, setOneHourImg] = useState('');
  
  const [fifteenMinText, setFifteenMinText] = useState('');
  const [fifteenMinBias, setFifteenMinBias] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BULLISH');
  const [fifteenMinImg, setFifteenMinImg] = useState('');

  const [fiveMinText, setFiveMinText] = useState('');
  const [fiveMinBias, setFiveMinBias] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BEARISH');
  const [fiveMinImg, setFiveMinImg] = useState('');
  
  const [macroNotes, setMacroNotes] = useState('');
  const [triggers, setTriggers] = useState('');
  
  const [filterMode, setFilterMode] = useState<'DATE_SPECIFIC' | 'SHOW_ALL'>('DATE_SPECIFIC');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Lightbox Modal state
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Helper to adjust the selected date day by day
  const handleAdjustDate = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalDateStr(d));
  };

  // Prepopulate form with premium template
  const loadPDFTemplate = () => {
    setAsset('XAUUSD');
    setBias('BEARISH');
    
    setFourHourText('Looks bearish and on a major resistance level which was prior support. Inflation CPI was lower than expected, oil prices were low in June but raised again. Potential more downfall if Iran-US tensions escalate.');
    setFourHourBias('BEARISH');
    setFourHourImg(PREMIUM_MOCK_CHARTS[0].url);

    setOneHourText('1HR chart is also bearish. Price gave a pretty bearish move and heading towards 1HR EMA. Need to see the rejection and some BoS (Break of Structure) towards downside for short trades.');
    setOneHourBias('BEARISH');
    setOneHourImg(PREMIUM_MOCK_CHARTS[1].url);

    setFifteenMinText('Gold is giving a short term bullish move. Need to see some rejection of the level and BoS towards downside for shorts.');
    setFifteenMinBias('BULLISH');
    setFifteenMinImg(PREMIUM_MOCK_CHARTS[2].url);

    setFiveMinText('5M structural shift occurs. Heavy volume rejection observed near high of yesterday. Liquidity distribution phase.');
    setFiveMinBias('BEARISH');
    setFiveMinImg(PREMIUM_MOCK_CHARTS[3].url);

    setMacroNotes('PPI news today which can be softer but can\'t predict. CPI and oil price developments are main macro drivers.');
    setTriggers('Need to see some rejection of the Highs and some BoS on 15m/5m to get a short side trade. Avoid trading right before PPI news.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !triggers) {
      alert('Please fill out at least the Asset and Execution Triggers.');
      return;
    }

    onAddPlan({
      date: selectedDate, // Save specifically to the active selected date!
      asset: asset.toUpperCase(),
      bias,
      fourHour: { text: fourHourText, bias: fourHourBias, imageUrl: fourHourImg },
      oneHour: { text: oneHourText, bias: oneHourBias, imageUrl: oneHourImg },
      fifteenMin: { text: fifteenMinText, bias: fifteenMinBias, imageUrl: fifteenMinImg },
      fiveMin: { text: fiveMinText, bias: fiveMinBias, imageUrl: fiveMinImg },
      macroNotes,
      triggers,
      status: 'ACTIVE'
    });

    // Reset fields
    setFourHourText('');
    setFourHourImg('');
    setOneHourText('');
    setOneHourImg('');
    setFifteenMinText('');
    setFifteenMinImg('');
    setFiveMinText('');
    setFiveMinImg('');
    setMacroNotes('');
    setTriggers('');
    setShowForm(false);
  };

  // Filter plans based on active settings
  const filteredPlans = plans.filter(p => {
    const matchesStatus = p.status === statusFilter;
    if (filterMode === 'SHOW_ALL') {
      return matchesStatus;
    } else {
      return p.date === selectedDate && matchesStatus;
    }
  });

  return (
    <div className="space-y-8" id="plans-tab">
      
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
              alt="Expanded high fidelity chart analysis" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
            />
            <span className="text-3xs text-white/50 font-mono mt-3">PROPORTIONAL CHART STUDY • CLICK OUTSIDE TO CLOSE</span>
          </div>
        </div>
      )}

      {/* Tab Header with Context */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-blue-600" />
            Daily Structural Blueprint
          </h1>
          <p className="text-sm text-slate-500 font-sans">
            Draft, attach chart screenshots, and organize session plans per daily market structures (4HR, 1HR, 15M, 5M).
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            <HelpCircle size={14} />
            Structural Protocol
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm) {
                // Ensure date matches
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition duration-150 shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            {showForm ? 'Close Editor' : 'Draft Daily Setup'}
          </button>
        </div>
      </div>

      {/* Structural help instructions */}
      {showHelp && (
        <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl space-y-3 text-slate-700 animate-fadeIn text-xs">
          <h3 className="font-bold text-sm text-blue-900">Institutional Multi-Timeframe Alignment Protocols</h3>
          <p className="leading-relaxed">
            Profitable execution relies on combining higher timeframe structures (HTF) for core biases, and lower timeframe structures (LTF) for precision executions:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            <div className="bg-white p-3 rounded-xl border border-blue-50">
              <strong className="text-blue-700 block mb-1">4HR Core Regime</strong>
              Macro trend identification, major dynamic support/resistance wicks, CPI/FOMC daily zones.
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-50">
              <strong className="text-blue-700 block mb-1">1HR Intermediary</strong>
              Liquidity pools, trend validation, key moving average (50/200 EMA) touches.
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-50">
              <strong className="text-blue-700 block mb-1">15M Local Context</strong>
              Session high/low sweeps, Break of Structure (BoS) or Change of Character (ChoCh) confirmations.
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-50">
              <strong className="text-blue-700 block mb-1">5M Execution Entry</strong>
              Trigger wicks, dynamic entries, optimized Stop Loss sizing to maximize risk-reward ratios.
            </div>
          </div>
        </div>
      )}

      {/* Editor Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-6 animate-slideDown">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Draft Daily Setup Plan</h3>
              <p className="text-4xs text-slate-400 font-mono">DRAFTING BLUEPRINT FOR DATE: {selectedDate}</p>
            </div>
            <button
              type="button"
              onClick={loadPDFTemplate}
              className="flex items-center gap-1 px-2.5 py-1 text-3xs font-extrabold tracking-wider bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg uppercase cursor-pointer"
            >
              <Sparkles size={12} />
              Load Gold PDF Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asset Symbol</label>
              <input
                type="text"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                placeholder="e.g. XAUUSD"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold font-mono text-slate-800 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Overall bias regime</label>
              <div className="grid grid-cols-3 gap-2">
                {(['BULLISH', 'BEARISH', 'NEUTRAL'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBias(b)}
                    className={`py-2 text-2xs font-extrabold tracking-wider rounded-xl transition cursor-pointer border ${
                      bias === b
                        ? b === 'BULLISH'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : b === 'BEARISH'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Blueprint Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* Timeframe Analysis Tabs - Grid layout */}
          <div className="space-y-4 pt-2">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Multi-Timeframe Structure & Charts</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 4HR */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">4HR Chart Analysis</span>
                  <select
                    value={fourHourBias}
                    onChange={(e) => setFourHourBias(e.target.value as any)}
                    className="text-3xs font-bold px-1.5 py-1 bg-white border border-slate-200 rounded-md focus:outline-none"
                  >
                    <option value="BULLISH">BULLISH</option>
                    <option value="BEARISH">BEARISH</option>
                    <option value="NEUTRAL">NEUTRAL</option>
                  </select>
                </div>
                <textarea
                  value={fourHourText}
                  onChange={(e) => setFourHourText(e.target.value)}
                  placeholder="HTF demand levels, swing points, EMA directions..."
                  rows={3}
                  className="w-full p-2 text-2xs bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-sans"
                />
                <div className="space-y-1">
                  <label className="text-4xs font-bold text-slate-500 block uppercase">4HR Chart Screenshot URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={fourHourImg}
                    onChange={(e) => setFourHourImg(e.target.value)}
                    className="w-full p-1.5 text-3xs bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* 1HR */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">1HR Chart Trend</span>
                  <select
                    value={oneHourBias}
                    onChange={(e) => setOneHourBias(e.target.value as any)}
                    className="text-3xs font-bold px-1.5 py-1 bg-white border border-slate-200 rounded-md focus:outline-none"
                  >
                    <option value="BULLISH">BULLISH</option>
                    <option value="BEARISH">BEARISH</option>
                    <option value="NEUTRAL">NEUTRAL</option>
                  </select>
                </div>
                <textarea
                  value={oneHourText}
                  onChange={(e) => setOneHourText(e.target.value)}
                  placeholder="Local trend alignment, session gaps, daily wicks..."
                  rows={3}
                  className="w-full p-2 text-2xs bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-sans"
                />
                <div className="space-y-1">
                  <label className="text-4xs font-bold text-slate-500 block uppercase">1HR Chart Screenshot URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={oneHourImg}
                    onChange={(e) => setOneHourImg(e.target.value)}
                    className="w-full p-1.5 text-3xs bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* 15M */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">15m Execution Plan</span>
                  <select
                    value={fifteenMinBias}
                    onChange={(e) => setFifteenMinBias(e.target.value as any)}
                    className="text-3xs font-bold px-1.5 py-1 bg-white border border-slate-200 rounded-md focus:outline-none"
                  >
                    <option value="BULLISH">BULLISH</option>
                    <option value="BEARISH">BEARISH</option>
                    <option value="NEUTRAL">NEUTRAL</option>
                  </select>
                </div>
                <textarea
                  value={fifteenMinText}
                  onChange={(e) => setFifteenMinText(e.target.value)}
                  placeholder="Break of Structure points, pool sweeps, orderblocks..."
                  rows={3}
                  className="w-full p-2 text-2xs bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-sans"
                />
                <div className="space-y-1">
                  <label className="text-4xs font-bold text-slate-500 block uppercase">15m Chart Screenshot URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={fifteenMinImg}
                    onChange={(e) => setFifteenMinImg(e.target.value)}
                    className="w-full p-1.5 text-3xs bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* 5M */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">5m Entry Setup</span>
                  <select
                    value={fiveMinBias}
                    onChange={(e) => setFiveMinBias(e.target.value as any)}
                    className="text-3xs font-bold px-1.5 py-1 bg-white border border-slate-200 rounded-md focus:outline-none"
                  >
                    <option value="BULLISH">BULLISH</option>
                    <option value="BEARISH">BEARISH</option>
                    <option value="NEUTRAL">NEUTRAL</option>
                  </select>
                </div>
                <textarea
                  value={fiveMinText}
                  onChange={(e) => setFiveMinText(e.target.value)}
                  placeholder="Precision entries, local re-accumulations, stop parameters..."
                  rows={3}
                  className="w-full p-2 text-2xs bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-sans"
                />
                <div className="space-y-1">
                  <label className="text-4xs font-bold text-slate-500 block uppercase">5m Chart Screenshot URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={fiveMinImg}
                    onChange={(e) => setFiveMinImg(e.target.value)}
                    className="w-full p-1.5 text-3xs bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
            
            {/* Quick Presets library */}
            <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100/50 flex flex-wrap items-center gap-3">
              <span className="text-3xs text-blue-700 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} />
                Quick-Paste High Fidelity Demo Screenshots:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PREMIUM_MOCK_CHARTS.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (idx === 0) setFourHourImg(c.url);
                      else if (idx === 1) setOneHourImg(c.url);
                      else if (idx === 2) setFifteenMinImg(c.url);
                      else if (idx === 3) setFiveMinImg(c.url);
                    }}
                    className="px-2 py-0.5 text-3xs font-bold bg-white hover:bg-blue-100/50 border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-700 rounded-md transition cursor-pointer"
                  >
                    Assign to {idx === 0 ? '4HR' : idx === 1 ? '1HR' : idx === 2 ? '15m' : '5m'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Macro Catalyst & Triggers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Macro News catalysts / PPI events</label>
              <textarea
                value={macroNotes}
                onChange={(e) => setMacroNotes(e.target.value)}
                placeholder="e.g., PPI news softness, CPI forecasts, geopolitical escalations..."
                rows={3}
                className="w-full p-3 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-700 font-sans"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Specific entry triggers (rejection / BoS)</label>
              <textarea
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                placeholder="Must wait for 15m BoS downwards, confirmation candle rejection of the high..."
                rows={3}
                className="w-full p-3 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-700 font-sans font-medium text-slate-800"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition duration-150 cursor-pointer shadow-xs"
            >
              Save Setup Plan
            </button>
          </div>
        </form>
      )}

      {/* Tab Filter & Calendar Daily structural alignment bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-3xs flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Toggle mode: Daily timeline vs all plans list */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilterMode('DATE_SPECIFIC')}
            className={`px-3.5 py-1.5 rounded-lg text-2xs font-extrabold tracking-wider uppercase transition cursor-pointer ${
              filterMode === 'DATE_SPECIFIC'
                ? 'bg-white text-blue-600 shadow-3xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daily Blueprint Timeline
          </button>
          <button
            onClick={() => setFilterMode('SHOW_ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-2xs font-extrabold tracking-wider uppercase transition cursor-pointer ${
              filterMode === 'SHOW_ALL'
                ? 'bg-white text-blue-600 shadow-3xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Plans List
          </button>
        </div>

        {/* Date Day-by-Day Switcher (visible in DATE_SPECIFIC mode) */}
        {filterMode === 'DATE_SPECIFIC' ? (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5">
            <button 
              onClick={() => handleAdjustDate(-1)}
              className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
              title="Previous Trading Day"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-blue-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-2xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer font-mono text-center w-[120px]"
              />
            </div>

            <button 
              onClick={() => handleAdjustDate(1)}
              className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
              title="Next Trading Day"
            >
              <ChevronRight size={16} />
            </button>
            
            <button
              onClick={() => setSelectedDate(getLocalDateStr())}
              className="text-4xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded uppercase tracking-wider"
            >
              Today
            </button>
          </div>
        ) : (
          <div className="text-2xs text-slate-400 font-medium">
            Displaying all blueprints historically logged in catalog.
          </div>
        )}

        {/* Plan Status filters (Active / Archived) */}
        <div className="flex gap-1">
          {(['ACTIVE', 'ARCHIVED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-2xs font-extrabold tracking-wider transition ${
                statusFilter === s
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500'
              }`}
            >
              {s} BLUEPRINTS
            </button>
          ))}
        </div>
      </div>

      {/* Blueprints Display Section */}
      <div className="space-y-6">
        {filteredPlans.length === 0 ? (
          <div className="bg-white border border-slate-100 p-12 rounded-2xl text-center space-y-4 max-w-xl mx-auto shadow-3xs">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
              <FileText size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">No Blueprint logged for {filterMode === 'DATE_SPECIFIC' ? selectedDate : 'this selection'}</h3>
              <p className="text-2xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                {filterMode === 'DATE_SPECIFIC' 
                  ? 'Professional execution begins with structure. Prepare your daily setup maps before session liquidity expansions.' 
                  : 'Your database is currently empty for this catalog filter.'}
              </p>
            </div>
            {filterMode === 'DATE_SPECIFIC' && (
              <button
                onClick={() => {
                  loadPDFTemplate();
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-2xs font-bold rounded-xl transition cursor-pointer"
              >
                <Plus size={13} />
                Draft Today's Gold Setup Plan
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-6 animate-fadeIn relative"
              >
                {/* Upper plan metadata */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-blue-650 text-blue-700 rounded-xl text-sm font-black font-mono tracking-tight bg-blue-50/80">
                      {plan.asset}
                    </span>
                    <span className={`px-2.5 py-0.5 text-3xs font-black tracking-widest rounded-md ${
                      plan.bias === 'BULLISH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                      plan.bias === 'BEARISH' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {plan.bias} BIAS
                    </span>
                    <span className="text-3xs text-slate-400 font-mono flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-150">
                      <Calendar size={11} />
                      DATE: {plan.date}
                    </span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2">
                    {plan.status === 'ACTIVE' && (
                      <button
                        onClick={() => onExecutePlan(plan)}
                        className="flex items-center gap-1.5 text-2xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg transition duration-150 cursor-pointer shadow-xs"
                      >
                        <span>Execute Session Setup</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                    {plan.status === 'ACTIVE' && (
                      <button
                        onClick={() => onArchivePlan(plan.id)}
                        className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg transition cursor-pointer"
                        title="Archive setup plan"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onDeletePlan(plan.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg transition cursor-pointer"
                      title="Delete setup plan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* The 4 Timeframes Grid - Chart Board */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 4HR */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl overflow-hidden flex flex-col justify-between">
                    <div className="p-3.5 space-y-2">
                      <div className="flex justify-between items-center text-3xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                        <span>4HR CORE STRUCTURE</span>
                        <span className={plan.fourHour.bias === 'BEARISH' ? 'text-rose-600' : 'text-emerald-600'}>
                          {plan.fourHour.bias}
                        </span>
                      </div>
                      <p className="text-2xs text-slate-650 leading-relaxed font-sans">
                        {plan.fourHour.text || 'No structural notes recorded.'}
                      </p>
                    </div>
                    {plan.fourHour.imageUrl ? (
                      <div className="relative group overflow-hidden bg-slate-950 aspect-[16/9] border-t border-slate-100">
                        <img 
                          src={plan.fourHour.imageUrl} 
                          alt="4HR setup chart" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <button
                          onClick={() => setActiveLightboxImg(plan.fourHour.imageUrl || '')}
                          className="absolute bottom-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Expand chart"
                        >
                          <Maximize2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-100/40 border-t border-slate-100 text-center text-[10px] text-slate-400 italic">
                        No chart attached.
                      </div>
                    )}
                  </div>

                  {/* 1HR */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl overflow-hidden flex flex-col justify-between">
                    <div className="p-3.5 space-y-2">
                      <div className="flex justify-between items-center text-3xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                        <span>1HR INTERMEDIARY</span>
                        <span className={plan.oneHour.bias === 'BEARISH' ? 'text-rose-600' : 'text-emerald-600'}>
                          {plan.oneHour.bias}
                        </span>
                      </div>
                      <p className="text-2xs text-slate-650 leading-relaxed font-sans">
                        {plan.oneHour.text || 'No structural notes recorded.'}
                      </p>
                    </div>
                    {plan.oneHour.imageUrl ? (
                      <div className="relative group overflow-hidden bg-slate-950 aspect-[16/9] border-t border-slate-100">
                        <img 
                          src={plan.oneHour.imageUrl} 
                          alt="1HR setup chart" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <button
                          onClick={() => setActiveLightboxImg(plan.oneHour.imageUrl || '')}
                          className="absolute bottom-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Expand chart"
                        >
                          <Maximize2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-100/40 border-t border-slate-100 text-center text-[10px] text-slate-400 italic">
                        No chart attached.
                      </div>
                    )}
                  </div>

                  {/* 15M */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl overflow-hidden flex flex-col justify-between">
                    <div className="p-3.5 space-y-2">
                      <div className="flex justify-between items-center text-3xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                        <span>15M LIQUIDITY MAP</span>
                        <span className={plan.fifteenMin.bias === 'BEARISH' ? 'text-rose-600' : 'text-emerald-600'}>
                          {plan.fifteenMin.bias}
                        </span>
                      </div>
                      <p className="text-2xs text-slate-650 leading-relaxed font-sans">
                        {plan.fifteenMin.text || 'No structural notes recorded.'}
                      </p>
                    </div>
                    {plan.fifteenMin.imageUrl ? (
                      <div className="relative group overflow-hidden bg-slate-950 aspect-[16/9] border-t border-slate-100">
                        <img 
                          src={plan.fifteenMin.imageUrl} 
                          alt="15M setup chart" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <button
                          onClick={() => setActiveLightboxImg(plan.fifteenMin.imageUrl || '')}
                          className="absolute bottom-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Expand chart"
                        >
                          <Maximize2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-100/40 border-t border-slate-100 text-center text-[10px] text-slate-400 italic">
                        No chart attached.
                      </div>
                    )}
                  </div>

                  {/* 5M */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl overflow-hidden flex flex-col justify-between">
                    <div className="p-3.5 space-y-2">
                      <div className="flex justify-between items-center text-3xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                        <span>5M ENTRY ZONE</span>
                        <span className={plan.fiveMin?.bias === 'BEARISH' ? 'text-rose-600' : 'text-emerald-600'}>
                          {plan.fiveMin?.bias || 'NEUTRAL'}
                        </span>
                      </div>
                      <p className="text-2xs text-slate-650 leading-relaxed font-sans">
                        {plan.fiveMin?.text || 'No structural notes recorded.'}
                      </p>
                    </div>
                    {plan.fiveMin?.imageUrl ? (
                      <div className="relative group overflow-hidden bg-slate-950 aspect-[16/9] border-t border-slate-100">
                        <img 
                          src={plan.fiveMin.imageUrl} 
                          alt="5M setup chart" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <button
                          onClick={() => setActiveLightboxImg(plan.fiveMin?.imageUrl || '')}
                          className="absolute bottom-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Expand chart"
                        >
                          <Maximize2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-100/40 border-t border-slate-100 text-center text-[10px] text-slate-400 italic">
                        No chart attached.
                      </div>
                    )}
                  </div>
                </div>

                {/* Macro catalysts & execution trigger blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="p-4 bg-amber-50/40 border border-amber-100/50 rounded-xl space-y-1.5">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wide block">Macro Catalysts & Calendar Events</span>
                    <p className="text-2xs text-amber-900 leading-relaxed">
                      {plan.macroNotes || 'No key macro triggers declared for this session.'}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50/30 border border-blue-100/50 rounded-xl space-y-1.5">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wide block">Execution entry rules & wicks</span>
                    <p className="text-2xs text-blue-900 leading-relaxed font-semibold">
                      {plan.triggers || 'Always wait for specific local structure sweep/break confirmations.'}
                    </p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
