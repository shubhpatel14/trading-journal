import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Target, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Save, 
  Copy, 
  RefreshCw, 
  X, 
  Sparkles, 
  AlertTriangle,
  Zap,
  DollarSign
} from 'lucide-react';
import { 
  DailyTradeChecklist, 
  BiasDirection, 
  ChecklistDecision, 
  LiquidityLevel 
} from '../types';
import SliderToggleGR, { GoNoGoSlider } from './SliderToggleGR';
import ChecklistImageUploader from './ChecklistImageUploader';

interface TradeChecklistViewProps {
  checklists: DailyTradeChecklist[];
  onSaveChecklist: (checklist: DailyTradeChecklist) => Promise<void> | void;
  initialDate?: string;
  isCloudSyncing?: boolean;
}

const getTodayDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createBlankChecklist = (dateStr: string): DailyTradeChecklist => ({
  id: `checklist-${dateStr}`,
  date: dateStr,
  bias: 'BULLISH',
  whyNotes: '',
  emas: {
    fourHour: { bias: 'BULLISH', imageUrl: '' },
    oneHour: { bias: 'BULLISH', imageUrl: '' },
    fifteenMin: { bias: 'BULLISH', imageUrl: '' },
    fiveMin: { bias: 'BULLISH', imageUrl: '' },
    oneMin: { bias: 'BULLISH', imageUrl: '' },
  },
  liquidity: {
    imageUrl: '',
    levels: [
      { id: 'lvl-1', price: '', note: 'Asian High (BSL)' },
      { id: 'lvl-2', price: '', note: 'Asian Low (SSL)' }
    ],
  },
  orderFlow: 'BULLISH',
  dxy: 'BULLISH',
  finalPlan: {
    text: '',
    imageUrl: '',
  },
  liveChecklist: {
    emas: 'GO',
    liquidity: 'GO',
    technicalLevel: 'GO',
    dxy: 'GO',
    orderFlow: 'GO',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function TradeChecklistView({
  checklists,
  onSaveChecklist,
  initialDate,
  isCloudSyncing = false,
}: TradeChecklistViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayDateStr());
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Find checklist for current date or initialize from blank
  const existingChecklist = useMemo(() => {
    return checklists.find(c => c.date === selectedDate);
  }, [checklists, selectedDate]);

  // Working state for active checklist
  const [checklist, setChecklist] = useState<DailyTradeChecklist>(() => {
    return existingChecklist || createBlankChecklist(selectedDate);
  });

  // Keep local working copy in sync when existingChecklist or selectedDate changes
  useEffect(() => {
    if (existingChecklist) {
      setChecklist(existingChecklist);
    } else {
      setChecklist(createBlankChecklist(selectedDate));
    }
  }, [existingChecklist, selectedDate]);

  // Date Navigation handlers
  const handleShiftDate = (days: number) => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${day}`);
    }
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayDateStr());
  };

  // State update helpers
  const updateChecklist = <K extends keyof DailyTradeChecklist>(
    key: K,
    val: DailyTradeChecklist[K]
  ) => {
    setChecklist(prev => ({
      ...prev,
      [key]: val,
      updatedAt: new Date().toISOString()
    }));
  };

  const updateEmaTimeframe = (
    tf: 'fourHour' | 'oneHour' | 'fifteenMin' | 'fiveMin' | 'oneMin',
    field: 'bias' | 'imageUrl',
    val: any
  ) => {
    setChecklist(prev => ({
      ...prev,
      emas: {
        ...prev.emas,
        [tf]: {
          ...prev.emas[tf],
          [field]: val,
        }
      },
      updatedAt: new Date().toISOString()
    }));
  };

  const updateLiveCheck = (
    item: 'emas' | 'liquidity' | 'technicalLevel' | 'dxy' | 'orderFlow',
    decision: ChecklistDecision
  ) => {
    setChecklist(prev => ({
      ...prev,
      liveChecklist: {
        ...prev.liveChecklist,
        [item]: decision,
      },
      updatedAt: new Date().toISOString()
    }));
  };

  // Liquidity levels management
  const handleAddLiquidityLevel = () => {
    const newLvl: LiquidityLevel = {
      id: `lvl-${Date.now()}`,
      price: '',
      note: ''
    };
    setChecklist(prev => ({
      ...prev,
      liquidity: {
        ...prev.liquidity,
        levels: [...(prev.liquidity.levels || []), newLvl]
      },
      updatedAt: new Date().toISOString()
    }));
  };

  const handleUpdateLiquidityLevel = (id: string, field: 'price' | 'note', val: string) => {
    setChecklist(prev => ({
      ...prev,
      liquidity: {
        ...prev.liquidity,
        levels: prev.liquidity.levels.map(lvl => 
          lvl.id === id ? { ...lvl, [field]: val } : lvl
        )
      },
      updatedAt: new Date().toISOString()
    }));
  };

  const handleDeleteLiquidityLevel = (id: string) => {
    setChecklist(prev => ({
      ...prev,
      liquidity: {
        ...prev.liquidity,
        levels: prev.liquidity.levels.filter(lvl => lvl.id !== id)
      },
      updatedAt: new Date().toISOString()
    }));
  };

  // Save checklist
  const handleSave = async () => {
    try {
      const payload: DailyTradeChecklist = {
        ...checklist,
        id: `checklist-${selectedDate}`,
        date: selectedDate,
        updatedAt: new Date().toISOString()
      };
      await onSaveChecklist(payload);
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2500);
    } catch (e) {
      console.error('Failed to save checklist:', e);
    }
  };

  // Copy structured brief to clipboard
  const handleCopyBrief = () => {
    const summary = `📊 **DAILY TRADE PLAN - ${selectedDate}**
Direction Bias: ${checklist.bias}
Reasoning: ${checklist.whyNotes || 'N/A'}

📈 **EMAs Multi-Timeframe Alignment:**
- 4HR: ${checklist.emas.fourHour.bias}
- 1HR: ${checklist.emas.oneHour.bias}
- 15M: ${checklist.emas.fifteenMin.bias}
- 5M:  ${checklist.emas.fiveMin.bias}
- 1M:  ${checklist.emas.oneMin.bias}

💧 **Liquidity & Key Levels:**
${checklist.liquidity.levels.map(l => `- ${l.price || 'N/A'}: ${l.note || 'Level'}`).join('\n')}

🌊 Order Flow: ${checklist.orderFlow}
💵 DXY Trend: ${checklist.dxy}

🎯 **Final Plan:**
${checklist.finalPlan.text || 'N/A'}

⚡ **LIVE Execution Gate:**
- EMAs: ${checklist.liveChecklist.emas}
- Liquidity: ${checklist.liveChecklist.liquidity}
- Technical Level: ${checklist.liveChecklist.technicalLevel}
- DXY: ${checklist.liveChecklist.dxy}
- Order Flow: ${checklist.liveChecklist.orderFlow}`;

    navigator.clipboard.writeText(summary);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Count live check GOs
  const goCount = useMemo(() => {
    const c = checklist.liveChecklist;
    let count = 0;
    if (c.emas === 'GO') count++;
    if (c.liquidity === 'GO') count++;
    if (c.technicalLevel === 'GO') count++;
    if (c.dxy === 'GO') count++;
    if (c.orderFlow === 'GO') count++;
    return count;
  }, [checklist.liveChecklist]);

  // Formatted display date
  const formattedDisplayDate = useMemo(() => {
    try {
      return new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="space-y-6 sm:space-y-8" id="trade-checklist-page">
      {/* Fullscreen Lightbox Modal */}
      {activeLightboxImg && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setActiveLightboxImg(null)}
              className="absolute -top-11 right-0 bg-white/20 hover:bg-white/30 p-2 rounded-full text-white cursor-pointer transition shadow-lg"
              title="Close zoom"
            >
              <X size={18} />
            </button>
            <img 
              src={activeLightboxImg} 
              alt="High resolution chart study" 
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <span className="text-3xs text-white/60 font-mono mt-3 uppercase tracking-wider">
              Chart Snapshot View • Click anywhere to dismiss
            </span>
          </div>
        </div>
      )}

      {/* Top Header & Day Navigation */}
      <section className="clay-surface relative overflow-hidden p-5 sm:p-7 space-y-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-20 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="clay-pill bg-white/90 text-violet-700 font-bold">
                <CheckSquare size={13} className="text-violet-600 stroke-[3px]" />
                Daily Checklist
              </span>
              <span className="text-3xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Pre-Session Protocol
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Daily Trade Plan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-sans max-w-xl">
              Map higher-timeframe market structure, verify multi-timeframe EMA alignment, mark key liquidity pools, and enforce strict live execution discipline.
            </p>
          </div>

          {/* Date Selector & Primary Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Day Switcher */}
            <div className="flex items-center justify-between gap-1.5 bg-white border border-slate-200/90 px-3 py-1.5 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5 px-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-black text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetToday}
                className="clay-button clay-button-secondary min-h-0 px-3 py-2 text-2xs uppercase font-extrabold"
                title="Jump to Today"
              >
                Today
              </button>

              <button
                type="button"
                onClick={handleCopyBrief}
                className="clay-button clay-button-secondary min-h-0 px-3 py-2 text-2xs uppercase font-extrabold flex items-center gap-1.5"
                title="Copy full plan summary to clipboard"
              >
                <Copy size={12} />
                <span>{copyFeedback ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="clay-button clay-button-primary min-h-0 px-4 py-2 text-2xs uppercase font-black flex items-center gap-1.5"
                title="Save Daily Trade Plan to Cloud"
              >
                {isCloudSyncing ? (
                  <RefreshCw size={12} className="animate-spin text-white" />
                ) : (
                  <Save size={12} className="stroke-[3px]" />
                )}
                <span>{saveFeedback ? 'Saved!' : 'Save Plan'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Date Active Banner */}
        <div className="pt-2 border-t border-slate-100/90 flex flex-wrap items-center justify-between text-2xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 font-sans">
              📅 Active Plan Date:
            </span>
            <span className="font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-lg border border-violet-200/70 font-mono">
              {formattedDisplayDate}
            </span>
            {existingChecklist && (
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                ✓ Saved in Cloud
              </span>
            )}
          </div>

          {/* Confluence Quick Score */}
          <div className="flex items-center gap-1.5">
            <span className="text-3xs font-extrabold uppercase text-slate-400">Live Confluence:</span>
            <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-black ${
              goCount === 5 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              goCount >= 4 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
              'bg-rose-100 text-rose-800 border border-rose-300'
            }`}>
              {goCount} / 5 GO
            </span>
          </div>
        </div>
      </section>

      {/* Main Form Content */}
      <div className="space-y-6">

        {/* 1. Daily Bias & Why Text Box */}
        <article className="clay-card p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
                <Target size={18} className="stroke-[3px]" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Daily Direction Bias
                </h2>
                <p className="text-3xs sm:text-2xs text-slate-400 font-medium">
                  Set overall session macro trajectory (Bullish / Bearish)
                </p>
              </div>
            </div>

            {/* Slide Button GR (Bullish / Bearish) */}
            <div className="flex items-center gap-2">
              <span className="text-2xs font-extrabold uppercase text-slate-500 hidden sm:inline">
                Session Bias:
              </span>
              <SliderToggleGR<BiasDirection>
                value={checklist.bias}
                onChange={(val) => updateChecklist('bias', val)}
                size="md"
              />
            </div>
          </div>

          {/* Why?? Text Box */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-violet-600" />
                <span>Why?? (Catalyst, Core Drivers & Technical Context)</span>
              </span>
              <span className="text-3xs font-mono text-slate-400 font-bold lowercase">
                required session reasoning
              </span>
            </label>
            <textarea
              value={checklist.whyNotes}
              onChange={(e) => updateChecklist('whyNotes', e.target.value)}
              placeholder="Why are you Bullish or Bearish today? Detail the key economic drivers (DXY weakness, CPI/PPI prints, yields), higher-timeframe trend continuation, or liquidity imbalance..."
              rows={3}
              className="w-full p-3.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 font-sans focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-200"
            />
          </div>
        </article>

        {/* 2. EMAs Multi-Timeframe Alignment */}
        <article className="clay-card p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <Activity size={18} className="stroke-[3px]" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  EMAs Multi-Timeframe Alignment
                </h2>
                <p className="text-3xs sm:text-2xs text-slate-400 font-medium">
                  Track EMA trend angle (9/21/50/200) and attach timeframe chart evidence
                </p>
              </div>
            </div>

            <div className="text-3xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
              5 Timeframes: 4HR → 1M
            </div>
          </div>

          {/* Timeframe Rows */}
          <div className="space-y-4">
            {[
              { key: 'fourHour' as const, label: '4HR Timeframe', desc: 'Macro Trend / HTF Direction' },
              { key: 'oneHour' as const, label: '1HR Timeframe', desc: 'Intermediate Trend / S&R Confirmation' },
              { key: 'fifteenMin' as const, label: '15M Timeframe', desc: 'Structural Shifts / Setup Formation' },
              { key: 'fiveMin' as const, label: '5M Timeframe', desc: 'Session Momentum / Pullback Health' },
              { key: 'oneMin' as const, label: '1M Timeframe', desc: 'Execution Trigger / Candle Timing' },
            ].map((tf) => {
              const currentEma = checklist.emas[tf.key];
              return (
                <div 
                  key={tf.key} 
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs sm:text-sm font-black text-slate-900 px-2.5 py-1 bg-white rounded-xl border border-slate-200 shadow-3xs shrink-0">
                        {tf.label.split(' ')[0]}
                      </span>
                      <span className="text-3xs text-slate-500 font-sans truncate">
                        {tf.desc}
                      </span>
                    </div>

                    {/* Slider Toggle GR (Bullish / Bearish) */}
                    <div className="shrink-0">
                      <SliderToggleGR<BiasDirection>
                        value={currentEma.bias}
                        onChange={(val) => updateEmaTimeframe(tf.key, 'bias', val)}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Add Image for this Timeframe */}
                  <div>
                    <ChecklistImageUploader
                      label={tf.label}
                      value={currentEma.imageUrl}
                      onChange={(url) => updateEmaTimeframe(tf.key, 'imageUrl', url)}
                      onOpenLightbox={(url) => setActiveLightboxImg(url)}
                      compact={true}
                      placeholder={`+ Add ${tf.label.split(' ')[0]} Chart Screenshot`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* 3. Liquidity Points Section */}
        <article className="clay-card p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                <Layers size={18} className="stroke-[3px]" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Liquidity Points & Technical Key Levels
                </h2>
                <p className="text-3xs sm:text-2xs text-slate-400 font-medium">
                  Mark buy-side/sell-side liquidity pools (BSL/SSL) and critical reaction prices
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddLiquidityLevel}
              className="clay-button clay-button-primary min-h-0 px-3.5 py-1.5 text-2xs uppercase font-extrabold flex items-center gap-1 self-start sm:self-auto"
            >
              <Plus size={13} className="stroke-[3px]" />
              <span>Add Price Level</span>
            </button>
          </div>

          {/* Add Image for Liquidity */}
          <div className="space-y-2">
            <ChecklistImageUploader
              label="Liquidity & Key Levels Chart Diagram"
              value={checklist.liquidity.imageUrl}
              onChange={(url) => setChecklist(prev => ({
                ...prev,
                liquidity: { ...prev.liquidity, imageUrl: url },
                updatedAt: new Date().toISOString()
              }))}
              onOpenLightbox={(url) => setActiveLightboxImg(url)}
              compact={false}
              placeholder="Attach Liquidity Chart (BSL/SSL zones)"
            />
          </div>

          {/* Price Levels List */}
          <div className="space-y-2.5 pt-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Target Price Levels ({checklist.liquidity.levels.length})</span>
              <span className="text-3xs text-slate-400 font-sans font-bold">
                e.g. Asian Range, Equal Highs, Orderblocks
              </span>
            </div>

            {checklist.liquidity.levels.length === 0 ? (
              <div className="p-5 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
                No liquidity levels defined yet. Click "+ Add Price Level" above.
              </div>
            ) : (
              <div className="space-y-2">
                {checklist.liquidity.levels.map((lvl, index) => (
                  <div 
                    key={lvl.id}
                    className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-white transition-all"
                  >
                    <span className="text-3xs font-mono font-bold text-slate-400 w-6 text-center shrink-0">
                      #{index + 1}
                    </span>

                    {/* Price Input */}
                    <div className="relative w-32 sm:w-40 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                        $
                      </span>
                      <input
                        type="text"
                        value={lvl.price}
                        onChange={(e) => handleUpdateLiquidityLevel(lvl.id, 'price', e.target.value)}
                        placeholder="2745.50"
                        className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-3xs"
                      />
                    </div>

                    {/* Note / Label Input */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={lvl.note || ''}
                        onChange={(e) => handleUpdateLiquidityLevel(lvl.id, 'note', e.target.value)}
                        placeholder="e.g. Previous Day High, Asian BSL Sweep, 15M FVG"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-3xs"
                      />
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteLiquidityLevel(lvl.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                      title="Remove level"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddLiquidityLevel}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-violet-200 hover:border-violet-400 bg-violet-50/40 hover:bg-violet-50 text-violet-700 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Plus size={14} className="stroke-[3px]" />
                  <span>+ Add More Levels</span>
                </button>
              </div>
            )}
          </div>
        </article>

        {/* 4. Order Flow & DXY Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Flow */}
          <article className="clay-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <TrendingUp size={16} className="stroke-[2.5px]" />
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-slate-900">
                    Order Flow
                  </h3>
                  <p className="text-3xs text-slate-400">Institutional order book flow direction</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <span className="text-2xs font-extrabold uppercase text-slate-600">
                Order Flow Direction:
              </span>
              <SliderToggleGR<BiasDirection>
                value={checklist.orderFlow}
                onChange={(val) => updateChecklist('orderFlow', val)}
                size="md"
              />
            </div>
          </article>

          {/* DXY */}
          <article className="clay-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <DollarSign size={16} className="stroke-[2.5px]" />
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-slate-900">
                    DXY (US Dollar Index)
                  </h3>
                  <p className="text-3xs text-slate-400">Global dollar correlation baseline</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <span className="text-2xs font-extrabold uppercase text-slate-600">
                DXY Direction:
              </span>
              <SliderToggleGR<BiasDirection>
                value={checklist.dxy}
                onChange={(val) => updateChecklist('dxy', val)}
                size="md"
              />
            </div>
          </article>
        </div>

        {/* 5. Final Trade Plan */}
        <article className="clay-card p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <CheckSquare size={18} className="stroke-[3px]" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Final Trade Plan
              </h2>
              <p className="text-3xs sm:text-2xs text-slate-400 font-medium">
                Detailed execution plan, confirmation triggers, invalidation, and risk budget
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Execution Strategy & Plan Notes
            </label>
            <textarea
              value={checklist.finalPlan.text}
              onChange={(e) => setChecklist(prev => ({
                ...prev,
                finalPlan: { ...prev.finalPlan, text: e.target.value },
                updatedAt: new Date().toISOString()
              }))}
              placeholder="e.g. Wait for 15M sweep of Asian High -> Look for 1M Change of Character (CHoCH) -> Enter on 50% FVG retest with stop loss above wick high. Target 1:2.5 RR into Asian Low..."
              rows={4}
              className="w-full p-3.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 font-sans focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-200"
            />
          </div>

          {/* Add Image for Final Trade Plan */}
          <div className="space-y-2 pt-2">
            <ChecklistImageUploader
              label="Final Trade Plan Chart Diagram"
              value={checklist.finalPlan.imageUrl}
              onChange={(url) => setChecklist(prev => ({
                ...prev,
                finalPlan: { ...prev.finalPlan, imageUrl: url },
                updatedAt: new Date().toISOString()
              }))}
              onOpenLightbox={(url) => setActiveLightboxImg(url)}
              compact={false}
              placeholder="Attach Annotated Final Chart Plan"
            />
          </div>
        </article>

        {/* 6. LIVE Checklist (The Gatekeeper) */}
        <article className="clay-card p-5 sm:p-7 space-y-6 border-2 border-violet-200/80 bg-gradient-to-b from-white via-white to-violet-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-violet-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 text-white shadow-clayButton">
                <ShieldCheck size={20} className="stroke-[3px]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    LIVE Execution Checklist
                  </h2>
                  <span className="text-3xs uppercase font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                    Gatekeeper
                  </span>
                </div>
                <p className="text-3xs sm:text-2xs text-slate-400 font-medium">
                  Strict pre-execution checkpoint — verify all five conditions before taking a trade
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-black font-mono px-3 py-1.5 rounded-xl border shadow-3xs ${
                goCount === 5 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                  : goCount >= 4 
                    ? 'bg-amber-50 text-amber-700 border-amber-300' 
                    : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}>
                {goCount} / 5 Confirmed
              </span>
            </div>
          </div>

          {/* Status HUD Banner */}
          <div className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${
            goCount === 5
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-[0_8px_24px_rgba(16,185,129,0.3)]'
              : goCount >= 4
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-300 shadow-[0_8px_24px_rgba(245,158,11,0.25)]'
                : 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-400 shadow-[0_8px_24px_rgba(244,63,94,0.3)]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                {goCount === 5 ? (
                  <Zap size={22} className="text-white fill-white animate-pulse" />
                ) : (
                  <AlertTriangle size={22} className="text-white" />
                )}
              </div>
              <div>
                <h3 className="font-display font-black text-sm sm:text-base tracking-tight">
                  {goCount === 5 
                    ? 'ALL 5 CONDITIONS VERIFIED — HIGH PROBABILITY GO' 
                    : goCount >= 4 
                      ? '4/5 CONDITIONS MET — PROCEED WITH LOWER RISK' 
                      : 'EXECUTION GATE BLOCKED — INSUFFICIENT CONFLUENCE'}
                </h3>
                <p className="text-3xs text-white/85 font-medium">
                  {goCount === 5 
                    ? 'All rules aligned with pre-market plan. Execute according to plan sizing.' 
                    : 'Do not gamble. Only enter when setups meet full system criteria.'}
                </p>
              </div>
            </div>
          </div>

          {/* 5 LIVE Checklist Items */}
          <div className="space-y-3">
            {[
              {
                id: 'emas' as const,
                label: 'EMAs Alignment',
                desc: 'Are key moving averages aligned in trade direction?'
              },
              {
                id: 'liquidity' as const,
                label: 'Liquidity',
                desc: 'Has buy-side or sell-side liquidity been hunted/swept?'
              },
              {
                id: 'technicalLevel' as const,
                label: 'Technical Level',
                desc: 'Price confirmed rejection or breakout at high-probability technical level?'
              },
              {
                id: 'dxy' as const,
                label: 'DXY Correlation',
                desc: 'Does US Dollar Index order flow support this currency/metal pair?'
              },
              {
                id: 'orderFlow' as const,
                label: 'Order Flow',
                desc: 'Is footprint / institutional order flow confirming directional volume?'
              },
            ].map((item) => {
              const currentVal = checklist.liveChecklist[item.id];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-violet-300 shadow-3xs transition-all"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-slate-800 font-sans truncate">
                        {item.label}
                      </span>
                    </div>
                    <p className="text-3xs text-slate-400 font-medium truncate sm:whitespace-normal">
                      {item.desc}
                    </p>
                  </div>

                  {/* GO / NO GO Slider Button GR */}
                  <div className="shrink-0">
                    <GoNoGoSlider
                      value={currentVal}
                      onChange={(val) => updateLiveCheck(item.id, val)}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Bar inside Live Checklist */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-3xs text-slate-400 font-sans">
              Checklists persist permanently for each individual trading day.
            </span>
            <button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto clay-button clay-button-primary min-h-0 px-6 py-2.5 text-xs font-black uppercase flex items-center justify-center gap-2 shadow-clayButton"
            >
              <Save size={14} className="stroke-[3px]" />
              <span>{saveFeedback ? 'Plan Saved Successfully!' : 'Save Daily Trade Plan'}</span>
            </button>
          </div>
        </article>

      </div>
    </div>
  );
}
