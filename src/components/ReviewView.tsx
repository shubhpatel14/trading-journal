import React, { useState, useMemo } from 'react';
import { 
  Star, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Maximize2, 
  X, 
  Award, 
  Target, 
  ShieldAlert, 
  BrainCircuit, 
  Check, 
  FileText, 
  Image as ImageIcon,
  CheckSquare,
  Layers
} from 'lucide-react';
import { Trade, DailyReview, WeeklyReview } from '../types';

interface ReviewViewProps {
  trades: Trade[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  onAddDailyReview: (review: Omit<DailyReview, 'id' | 'createdAt'>) => void;
  onDeleteDailyReview: (id: string) => void;
  onAddWeeklyReview: (review: Omit<WeeklyReview, 'id' | 'createdAt'>) => void;
  onDeleteWeeklyReview: (id: string) => void;
}

const COMMON_MISTAKES = [
  'FOMO',
  'Overtrading',
  'Revenge Trading',
  'Left Early',
  'Moved Stop Loss',
  'Chased Trade',
  'Oversizing',
  'Ignored Setup Plan',
  'Traded News Volatility',
  'No Stop Loss'
];

const getLocalDateStr = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to get week start date (Sunday)
const getWeekStartDate = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day;
  const start = new Date(date.setDate(diff));
  return getLocalDateStr(start);
};

// Helper to get week end date (Saturday)
const getWeekEndDate = (startDateStr: string) => {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return getLocalDateStr(end);
};

export default function ReviewView({
  trades,
  dailyReviews,
  weeklyReviews,
  onAddDailyReview,
  onDeleteDailyReview,
  onAddWeeklyReview,
  onDeleteWeeklyReview
}: ReviewViewProps) {
  const [mode, setMode] = useState<'EOD' | 'EOW'>('EOD');
  
  // EOD State
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const [rating, setRating] = useState<number>(5);
  const [ruleAdherence, setRuleAdherence] = useState<'FULL' | 'PARTIAL' | 'VIOLATED'>('FULL');
  const [whatWentWell, setWhatWentWell] = useState('');
  const [improvementsNeeded, setImprovementsNeeded] = useState('');
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [actionItems, setActionItems] = useState('');
  const [chartScreenshot, setChartScreenshot] = useState('');
  const [showEodForm, setShowEodForm] = useState(false);

  // EOW State
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => getWeekStartDate(new Date()));
  const selectedWeekEnd = useMemo(() => getWeekEndDate(selectedWeekStart), [selectedWeekStart]);
  const [weeklyGrade, setWeeklyGrade] = useState<'A+' | 'A' | 'B' | 'C' | 'D' | 'F'>('A');
  const [keyLessons, setKeyLessons] = useState('');
  const [focusGoalsNextWeek, setFocusGoalsNextWeek] = useState('');
  const [selectedWeeklyMistakes, setSelectedWeeklyMistakes] = useState<string[]>([]);
  const [weeklyNotes, setWeeklyNotes] = useState('');
  const [weeklyScreenshot, setWeeklyScreenshot] = useState('');
  const [showEowForm, setShowEowForm] = useState(false);

  // Lightbox Modal state
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Filter trades for selected EOD date
  const dayTrades = useMemo(() => {
    return trades.filter(t => t.date === selectedDate);
  }, [trades, selectedDate]);

  const dayPnl = useMemo(() => {
    return dayTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [dayTrades]);

  const dayWins = useMemo(() => dayTrades.filter(t => t.pnl > 0).length, [dayTrades]);
  const dayLosses = useMemo(() => dayTrades.filter(t => t.pnl < 0).length, [dayTrades]);

  // Existing review for selected date
  const existingDailyReview = useMemo(() => {
    return dailyReviews.find(r => r.date === selectedDate);
  }, [dailyReviews, selectedDate]);

  // Filter trades for selected EOW week range
  const weekTrades = useMemo(() => {
    return trades.filter(t => t.date >= selectedWeekStart && t.date <= selectedWeekEnd);
  }, [trades, selectedWeekStart, selectedWeekEnd]);

  const weekPnl = useMemo(() => {
    return weekTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [weekTrades]);

  const weekWinRate = useMemo(() => {
    if (weekTrades.length === 0) return 0;
    const wins = weekTrades.filter(t => t.pnl > 0).length;
    return Math.round((wins / weekTrades.length) * 100);
  }, [weekTrades]);

  const weekProfitFactor = useMemo(() => {
    let wins = 0;
    let losses = 0;
    weekTrades.forEach(t => {
      if (t.pnl > 0) wins += t.pnl;
      else losses += Math.abs(t.pnl);
    });
    if (losses === 0) return wins > 0 ? '∞' : '0.00';
    return (wins / losses).toFixed(2);
  }, [weekTrades]);

  // Existing weekly review for selected week
  const existingWeeklyReview = useMemo(() => {
    return weeklyReviews.find(r => r.weekStartDate === selectedWeekStart);
  }, [weeklyReviews, selectedWeekStart]);

  // Date Navigation Handlers
  const handleAdjustDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    setSelectedDate(getLocalDateStr(dateObj));
  };

  const handleAdjustWeek = (weeks: number) => {
    const [y, m, d] = selectedWeekStart.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + (weeks * 7));
    setSelectedWeekStart(getWeekStartDate(dateObj));
  };

  // Toggle mistake selection in form
  const toggleMistake = (mistake: string, isWeekly = false) => {
    if (isWeekly) {
      setSelectedWeeklyMistakes(prev => 
        prev.includes(mistake) ? prev.filter(m => m !== mistake) : [...prev, mistake]
      );
    } else {
      setSelectedMistakes(prev => 
        prev.includes(mistake) ? prev.filter(m => m !== mistake) : [...prev, mistake]
      );
    }
  };

  // Handle submit EOD Review
  const handleSubmitEodReview = (e: React.FormEvent) => {
    e.preventDefault();
    onAddDailyReview({
      date: selectedDate,
      rating,
      ruleAdherence,
      whatWentWell,
      improvementsNeeded,
      mistakesAnalyzed: selectedMistakes,
      actionItems,
      chartScreenshot
    });
    setShowEodForm(false);
  };

  // Handle submit EOW Review
  const handleSubmitEowReview = (e: React.FormEvent) => {
    e.preventDefault();
    onAddWeeklyReview({
      weekStartDate: selectedWeekStart,
      weekEndDate: selectedWeekEnd,
      grade: weeklyGrade,
      keyLessons,
      focusGoalsNextWeek,
      topMistakes: selectedWeeklyMistakes,
      weeklyNotes,
      weeklyScreenshot
    });
    setShowEowForm(false);
  };

  // Open edit EOD form prepopulated
  const handleEditEod = (rev: DailyReview) => {
    setRating(rev.rating);
    setRuleAdherence(rev.ruleAdherence);
    setWhatWentWell(rev.whatWentWell);
    setImprovementsNeeded(rev.improvementsNeeded);
    setSelectedMistakes(rev.mistakesAnalyzed || []);
    setActionItems(rev.actionItems);
    setChartScreenshot(rev.chartScreenshot || '');
    setShowEodForm(true);
  };

  // Open edit EOW form prepopulated
  const handleEditEow = (rev: WeeklyReview) => {
    setWeeklyGrade(rev.grade);
    setKeyLessons(rev.keyLessons);
    setFocusGoalsNextWeek(rev.focusGoalsNextWeek);
    setSelectedWeeklyMistakes(rev.topMistakes || []);
    setWeeklyNotes(rev.weeklyNotes);
    setWeeklyScreenshot(rev.weeklyScreenshot || '');
    setShowEowForm(true);
  };

  return (
    <div className="space-y-8" id="review-tab">
      
      {/* Lightbox Modal */}
      {activeLightboxImg && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setActiveLightboxImg(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X size={24} />
            </button>
            <img 
              src={activeLightboxImg} 
              alt="Expanded Chart View" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-purple-600" />
            Performance Reviews
          </h1>
          <p className="text-sm text-slate-500 font-sans">
            Conduct End-of-Day (EOD) reflections & weekly strategic retrospectives with execution screenshots and lessons.
          </p>
        </div>

        {/* EOD / EOW Mode Toggle Switch */}
        <div className="clay-pressed flex items-center p-1.5 rounded-2xl">
          <button
            onClick={() => setMode('EOD')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'EOD'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={14} />
            Daily (EOD) Review
          </button>
          <button
            onClick={() => setMode('EOW')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'EOW'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} />
            Weekly (EOW) Review
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: DAILY (EOD) REVIEW                                               */}
      {/* ========================================================================= */}
      {mode === 'EOD' && (
        <div className="space-y-6">
          
          {/* Date Selector Navigation Bar */}
          <div className="clay-card p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Selecting Date:</span>
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                <button
                  onClick={() => handleAdjustDate(-1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer font-mono"
                />
                <button
                  onClick={() => handleAdjustDate(1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              
              <button
                onClick={() => setSelectedDate(getLocalDateStr())}
                className="text-4xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-600 px-2.5 py-1.5 rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                Today
              </button>
            </div>

            {/* Action button */}
            {!existingDailyReview && !showEodForm && (
              <button
                onClick={() => setShowEodForm(true)}
                className="clay-button clay-button-primary px-4 py-2 text-xs flex items-center gap-2"
              >
                <Plus size={15} />
                Log EOD Review
              </button>
            )}
          </div>

          {/* Daily Performance Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="clay-card p-4 space-y-1">
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Day Net PnL</span>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold font-mono ${dayPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {dayPnl >= 0 ? '+' : ''}${dayPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                {dayPnl >= 0 ? <TrendingUp size={18} className="text-emerald-500" /> : <TrendingDown size={18} className="text-rose-500" />}
              </div>
            </div>

            <div className="clay-card p-4 space-y-1">
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Executed Trades</span>
              <div className="text-xl font-bold text-slate-800 font-mono">
                {dayTrades.length} {dayTrades.length === 1 ? 'Trade' : 'Trades'}
              </div>
            </div>

            <div className="clay-card p-4 space-y-1">
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Win / Loss Outcome</span>
              <div className="flex items-center gap-2 font-mono text-sm font-bold">
                <span className="text-emerald-600">{dayWins} Wins</span>
                <span className="text-slate-300">/</span>
                <span className="text-rose-600">{dayLosses} Losses</span>
              </div>
            </div>

            <div className="clay-card p-4 space-y-1">
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">EOD Review Status</span>
              <div>
                {existingDailyReview ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 size={13} /> Logged
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                    <AlertTriangle size={13} /> Pending EOD Review
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section: Trades Executed Today with Screenshot Gallery */}
          <div className="clay-card p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-purple-600" />
                Trades Logged for {selectedDate}
              </h2>
              <span className="text-2xs text-slate-400 font-mono font-bold">
                {dayTrades.length} Total Executions
              </span>
            </div>

            {dayTrades.length === 0 ? (
              <div className="clay-pressed p-8 text-center text-slate-400 space-y-2 rounded-2xl">
                <p className="text-sm font-medium">No trades logged on this calendar date.</p>
                <p className="text-xs">You can still record an EOD psychological review or rest day reflection below.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dayTrades.map((t) => (
                  <div key={t.id} className="bg-white/80 border border-slate-100 p-4 rounded-2xl space-y-3 shadow-xs hover:border-purple-200 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono text-sm">{t.asset}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            t.direction === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {t.direction}
                          </span>
                          <span className="text-3xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                            {t.session}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{t.setup} • {t.size} Lots</p>
                      </div>

                      <div className="text-right">
                        <div className={`font-mono text-base font-bold ${
                          t.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toLocaleString()}
                        </div>
                        <span className="text-3xs text-slate-400">{t.time}</span>
                      </div>
                    </div>

                    {/* Trade Notes & Mistakes */}
                    {t.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl italic">
                        "{t.notes}"
                      </p>
                    )}

                    {t.mistakes && t.mistakes.length > 0 && t.mistakes[0] !== 'None' && (
                      <div className="flex flex-wrap gap-1">
                        {t.mistakes.map((m, i) => (
                          <span key={i} className="text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-md">
                            ⚠️ {m}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Screenshots */}
                    {(t.htfScreenshot || t.ltfScreenshot) && (
                      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                        {t.htfScreenshot && (
                          <div 
                            className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 max-w-[120px]"
                            onClick={() => setActiveLightboxImg(t.htfScreenshot!)}
                          >
                            <img src={t.htfScreenshot} alt="HTF Chart" className="w-full h-16 object-cover group-hover:scale-105 transition" />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <Maximize2 size={14} />
                            </div>
                            <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-slate-900/70 text-white px-1 rounded">HTF</span>
                          </div>
                        )}

                        {t.ltfScreenshot && (
                          <div 
                            className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 max-w-[120px]"
                            onClick={() => setActiveLightboxImg(t.ltfScreenshot!)}
                          >
                            <img src={t.ltfScreenshot} alt="LTF Chart" className="w-full h-16 object-cover group-hover:scale-105 transition" />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <Maximize2 size={14} />
                            </div>
                            <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-slate-900/70 text-white px-1 rounded">LTF</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: EOD Review Form / Card Display */}
          {existingDailyReview && !showEodForm ? (
            <div className="clay-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">EOD Review Summary for {selectedDate}</h3>
                    <p className="text-xs text-slate-500">Logged on {new Date(existingDailyReview.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditEod(existingDailyReview)}
                    className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition cursor-pointer"
                    title="Edit Review"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteDailyReview(existingDailyReview.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Delete Review"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Rating & Rule Adherence Badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="clay-pressed p-4 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-500">Discipline Rating</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        size={18} 
                        className={s <= existingDailyReview.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
                      />
                    ))}
                  </div>
                </div>

                <div className="clay-pressed p-4 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-500">Rule Adherence</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                    existingDailyReview.ruleAdherence === 'FULL' 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : existingDailyReview.ruleAdherence === 'PARTIAL'
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-rose-100 text-rose-700 border border-rose-300'
                  }`}>
                    {existingDailyReview.ruleAdherence} ADHERENCE
                  </span>
                </div>
              </div>

              {/* Text Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> What Went Well Today
                  </h4>
                  <p className="text-xs text-slate-700 bg-white/80 border border-slate-100 p-4 rounded-2xl whitespace-pre-wrap">
                    {existingDailyReview.whatWentWell || 'No notes provided.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                    <Target size={14} /> Improvements & Mistakes
                  </h4>
                  <p className="text-xs text-slate-700 bg-white/80 border border-slate-100 p-4 rounded-2xl whitespace-pre-wrap">
                    {existingDailyReview.improvementsNeeded || 'No notes provided.'}
                  </p>
                </div>
              </div>

              {/* Tagged Mistakes */}
              {existingDailyReview.mistakesAnalyzed && existingDailyReview.mistakesAnalyzed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <ShieldAlert size={14} /> Tagged Psychological / Execution Mistakes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {existingDailyReview.mistakesAnalyzed.map((m, i) => (
                      <span key={i} className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-xl">
                        ⚠️ {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items for Tomorrow */}
              {existingDailyReview.actionItems && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                    <CheckSquare size={14} /> Action Items for Tomorrow
                  </h4>
                  <p className="text-xs text-slate-700 bg-purple-50/50 border border-purple-100 p-4 rounded-2xl whitespace-pre-wrap">
                    {existingDailyReview.actionItems}
                  </p>
                </div>
              )}

              {/* Overall EOD Chart Screenshot */}
              {existingDailyReview.chartScreenshot && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ImageIcon size={14} /> Daily Structure / Narrative Chart
                  </h4>
                  <div 
                    className="relative group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 max-h-60"
                    onClick={() => setActiveLightboxImg(existingDailyReview.chartScreenshot!)}
                  >
                    <img src={existingDailyReview.chartScreenshot} alt="EOD Chart" className="w-full h-48 object-cover group-hover:scale-102 transition" />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                      <Maximize2 size={20} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : showEodForm ? (
            <form onSubmit={handleSubmitEodReview} className="clay-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-600" />
                  {existingDailyReview ? 'Edit EOD Review' : 'Create End of Day (EOD) Review'} for {selectedDate}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEodForm(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Rating & Rule Adherence Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    Execution & Emotional Discipline Rating (1 to 5 Stars)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="p-1 text-slate-300 hover:scale-110 transition cursor-pointer"
                      >
                        <Star 
                          size={24} 
                          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} 
                        />
                      </button>
                    ))}
                    <span className="text-xs font-mono font-bold text-slate-600 ml-2">{rating} / 5</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    Trade Plan Rule Adherence
                  </label>
                  <div className="flex gap-2">
                    {(['FULL', 'PARTIAL', 'VIOLATED'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setRuleAdherence(status)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          ruleAdherence === status
                            ? status === 'FULL'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : status === 'PARTIAL'
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mistakes Selection Pills */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-600 block">
                  Select Mistakes Committed Today (if any)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_MISTAKES.map((m) => {
                    const isSel = selectedMistakes.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMistake(m)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer border ${
                          isSel 
                            ? 'bg-rose-600 text-white border-rose-600' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {isSel ? '✓ ' : '+ '}{m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reflection Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    What Went Well Today?
                  </label>
                  <textarea
                    rows={3}
                    value={whatWentWell}
                    onChange={(e) => setWhatWentWell(e.target.value)}
                    placeholder="e.g., Followed risk management, patient entry on 15m BoS, no FOMO..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    What Needs Improvement & Key Takeaways?
                  </label>
                  <textarea
                    rows={3}
                    value={improvementsNeeded}
                    onChange={(e) => setImprovementsNeeded(e.target.value)}
                    placeholder="e.g., Exited trade early before 1HR target due to anxiety..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    Action Items for Tomorrow's Session
                  </label>
                  <textarea
                    rows={2}
                    value={actionItems}
                    onChange={(e) => setActionItems(e.target.value)}
                    placeholder="e.g., Wait for London open confirmation, set strict stop loss limit..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    Daily EOD Chart / Narrative Screenshot URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={chartScreenshot}
                    onChange={(e) => setChartScreenshot(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEodForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="clay-button clay-button-primary px-6 py-2 text-xs font-bold"
                >
                  Save EOD Review
                </button>
              </div>
            </form>
          ) : null}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: WEEKLY (EOW) REVIEW                                              */}
      {/* ========================================================================= */}
      {mode === 'EOW' && (
        <div className="space-y-6">
          
          {/* Week Selector Navigation Bar */}
          <div className="clay-card p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Weekly Range:</span>
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                <button
                  onClick={() => handleAdjustWeek(-1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                  title="Previous Week"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {selectedWeekStart} to {selectedWeekEnd}
                </span>
                <button
                  onClick={() => handleAdjustWeek(1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                  title="Next Week"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={() => setSelectedWeekStart(getWeekStartDate(new Date()))}
                className="text-4xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-600 px-2.5 py-1.5 rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                Current Week
              </button>
            </div>

            {/* Action button */}
            {!existingWeeklyReview && !showEowForm && (
              <button
                onClick={() => setShowEowForm(true)}
                className="clay-button clay-button-primary px-4 py-2 text-xs flex items-center gap-2"
              >
                <Plus size={15} />
                Log Weekly EOW Review
              </button>
            )}
          </div>

          {/* Weekly Performance Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="clay-card p-4 space-y-1">
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Weekly Net PnL</span>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold font-mono ${weekPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {weekPnl >= 0 ? '+' : ''}${weekPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                {weekPnl >= 0 ? <TrendingUp size={18} className="text-emerald-500" /> : <TrendingDown size={18} className="text-rose-500" />}
              </div>
            </div>

            <div className="clay-card p-4 space-y-1">
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Week Trades & Win Rate</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-800 font-mono">{weekTrades.length}</span>
                <span className="text-xs text-slate-500 font-bold font-mono">({weekWinRate}% Win Rate)</span>
              </div>
            </div>

            <div className="clay-card p-4 space-y-1">
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Week Profit Factor</span>
              <div className="text-xl font-bold text-slate-800 font-mono">
                {weekProfitFactor}
              </div>
            </div>

            <div className="clay-card p-4 space-y-1">
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Weekly Review Status</span>
              <div>
                {existingWeeklyReview ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 size={13} /> Grade {existingWeeklyReview.grade} Logged
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                    <AlertTriangle size={13} /> Pending EOW Review
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Trade Screenshots of the Week */}
          <div className="clay-card p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon size={18} className="text-purple-600" />
              Key Trade Execution Screenshots for the Week
            </h2>

            {weekTrades.filter(t => t.htfScreenshot || t.ltfScreenshot).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No trade screenshots uploaded for trades in this week.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {weekTrades.filter(t => t.htfScreenshot || t.ltfScreenshot).slice(0, 8).map((t) => (
                  <div key={t.id} className="bg-white p-3 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="font-mono">{t.asset} ({t.direction})</span>
                      <span className={t.pnl >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {t.htfScreenshot && (
                        <div 
                          className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 flex-1 h-20"
                          onClick={() => setActiveLightboxImg(t.htfScreenshot!)}
                        >
                          <img src={t.htfScreenshot} alt="HTF" className="w-full h-full object-cover group-hover:scale-105 transition" />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                            <Maximize2 size={14} />
                          </div>
                        </div>
                      )}
                      {t.ltfScreenshot && (
                        <div 
                          className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 flex-1 h-20"
                          onClick={() => setActiveLightboxImg(t.ltfScreenshot!)}
                        >
                          <img src={t.ltfScreenshot} alt="LTF" className="w-full h-full object-cover group-hover:scale-105 transition" />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                            <Maximize2 size={14} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: EOW Review Form / Card Display */}
          {existingWeeklyReview && !showEowForm ? (
            <div className="clay-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md font-mono">
                    {existingWeeklyReview.grade}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Weekly EOW Review Summary</h3>
                    <p className="text-xs text-slate-500">{existingWeeklyReview.weekStartDate} to {existingWeeklyReview.weekEndDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditEow(existingWeeklyReview)}
                    className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition cursor-pointer"
                    title="Edit Review"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteWeeklyReview(existingWeeklyReview.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Delete Review"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Text Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                    <BrainCircuit size={14} /> Key Lessons Learned This Week
                  </h4>
                  <p className="text-xs text-slate-700 bg-white/80 border border-slate-100 p-4 rounded-2xl whitespace-pre-wrap">
                    {existingWeeklyReview.keyLessons || 'No lessons recorded.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <Target size={14} /> Strategic Focus Goals for Next Week
                  </h4>
                  <p className="text-xs text-slate-700 bg-white/80 border border-slate-100 p-4 rounded-2xl whitespace-pre-wrap">
                    {existingWeeklyReview.focusGoalsNextWeek || 'No goals set.'}
                  </p>
                </div>
              </div>

              {/* Top Weekly Mistakes */}
              {existingWeeklyReview.topMistakes && existingWeeklyReview.topMistakes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <ShieldAlert size={14} /> Recurring Mistakes This Week
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {existingWeeklyReview.topMistakes.map((m, i) => (
                      <span key={i} className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-xl">
                        ⚠️ {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly Notes */}
              {existingWeeklyReview.weeklyNotes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <FileText size={14} /> General Weekly Execution Notes
                  </h4>
                  <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl whitespace-pre-wrap">
                    {existingWeeklyReview.weeklyNotes}
                  </p>
                </div>
              )}

              {/* Weekly Screenshot */}
              {existingWeeklyReview.weeklyScreenshot && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ImageIcon size={14} /> Weekly Macro / HTF Chart Overview
                  </h4>
                  <div 
                    className="relative group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 max-h-64"
                    onClick={() => setActiveLightboxImg(existingWeeklyReview.weeklyScreenshot!)}
                  >
                    <img src={existingWeeklyReview.weeklyScreenshot} alt="Weekly Chart" className="w-full h-56 object-cover group-hover:scale-102 transition" />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                      <Maximize2 size={20} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : showEowForm ? (
            <form onSubmit={handleSubmitEowReview} className="clay-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Award size={18} className="text-purple-600" />
                  {existingWeeklyReview ? 'Edit Weekly EOW Review' : 'Create End of Week (EOW) Review'} ({selectedWeekStart} - {selectedWeekEnd})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEowForm(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Grade Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-600 block">
                  Overall Weekly Execution Grade
                </label>
                <div className="flex flex-wrap gap-3">
                  {(['A+', 'A', 'B', 'C', 'D', 'F'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setWeeklyGrade(g)}
                      className={`w-12 h-12 rounded-2xl font-black text-lg transition cursor-pointer flex items-center justify-center font-mono border ${
                        weeklyGrade === g
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-105'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurring Mistakes Pills */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-600 block">
                  Select Recurring Mistakes This Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_MISTAKES.map((m) => {
                    const isSel = selectedWeeklyMistakes.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMistake(m, true)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer border ${
                          isSel 
                            ? 'bg-rose-600 text-white border-rose-600' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {isSel ? '✓ ' : '+ '}{m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reflection Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    Key Lessons Learned This Week
                  </label>
                  <textarea
                    rows={3}
                    value={keyLessons}
                    onChange={(e) => setKeyLessons(e.target.value)}
                    placeholder="e.g., Don't hold short positions through CPI news release..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    Strategic Focus Goals for Next Week
                  </label>
                  <textarea
                    rows={3}
                    value={focusGoalsNextWeek}
                    onChange={(e) => setFocusGoalsNextWeek(e.target.value)}
                    placeholder="e.g., Limit risk to 1% per trade, focus only on London session gold setups..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    Weekly Macro & Narrative Notes
                  </label>
                  <textarea
                    rows={2}
                    value={weeklyNotes}
                    onChange={(e) => setWeeklyNotes(e.target.value)}
                    placeholder="e.g., DXY printed strong bullish candles on daily..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    Weekly High-Timeframe Chart Screenshot URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={weeklyScreenshot}
                    onChange={(e) => setWeeklyScreenshot(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEowForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="clay-button clay-button-primary px-6 py-2 text-xs font-bold"
                >
                  Save Weekly EOW Review
                </button>
              </div>
            </form>
          ) : null}

        </div>
      )}

    </div>
  );
}
