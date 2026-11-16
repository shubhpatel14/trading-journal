import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays,
  Calendar,
  FileText,
  Wallet,
  LayoutGrid,
  List
} from 'lucide-react';
import { Trade, getTradeNetPnl, getTradeTotalFees } from '../types';
import { getTradeDisplayDateTime } from '../utils/tradeTime';

interface PnLCalendarProps {
  trades: Trade[];
  onSelectDate?: (dateStr: string) => void;
  initialBalance?: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parseDateStr = (dateStr?: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yyyy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10) - 1;
    const dd = parseInt(parts[2], 10);
    if (!isNaN(yyyy) && !isNaN(mm) && !isNaN(dd)) {
      return new Date(yyyy, mm, dd);
    }
  }
  return new Date(dateStr);
};

const getLocalDateStr = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function PnLCalendar({ trades, onSelectDate, initialBalance = 100000 }: PnLCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');

  // Use current date as baseline calendar view
  const [currentDate, setCurrentDate] = useState(() => {
    // Check if there are trades, otherwise default to today
    if (trades.length > 0) {
      // Sort trades descending to find latest trade date and establish calendar baseline
      const sorted = [...trades].sort((a, b) => parseDateStr(getTradeDisplayDateTime(b).date).getTime() - parseDateStr(getTradeDisplayDateTime(a).date).getTime());
      return parseDateStr(getTradeDisplayDateTime(sorted[0]).date);
    }
    return new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Days calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Create grid structure grouped by week (7 days) to calculate weekly PnL
  const calendarWeeks: { dateStr: string | null; dayNum: number | null; isCurrentMonth: boolean }[][] = [];
  
  let currentWeek: { dateStr: string | null; dayNum: number | null; isCurrentMonth: boolean }[] = [];

  // 1. Pad previous month's final days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayVal = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, dayVal);
    const dateStr = getLocalDateStr(prevMonthDate);
    currentWeek.push({
      dateStr,
      dayNum: dayVal,
      isCurrentMonth: false
    });
  }

  // 2. Fill current month's days
  for (let d = 1; d <= daysInMonth; d++) {
    if (currentWeek.length === 7) {
      calendarWeeks.push(currentWeek);
      currentWeek = [];
    }
    const curDate = new Date(year, month, d);
    const dateStr = getLocalDateStr(curDate);
    currentWeek.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true
    });
  }

  // 3. Pad next month's starting days
  let nextMonthDay = 1;
  while (currentWeek.length < 7) {
    const nextDate = new Date(year, month + 1, nextMonthDay);
    const dateStr = getLocalDateStr(nextDate);
    currentWeek.push({
      dateStr,
      dayNum: nextMonthDay,
      isCurrentMonth: false
    });
    nextMonthDay++;
  }
  calendarWeeks.push(currentWeek);

  // Helper to get trades for a single day
  const getTradesForDay = (dateStr: string) => {
    return trades.filter(t => getTradeDisplayDateTime(t).date === dateStr);
  };

  // Calculate total Net PNL for a day (including $7/lot commissions)
  const getDailyPnl = (dateStr: string) => {
    const dayTrades = getTradesForDay(dateStr);
    return dayTrades.reduce((sum, t) => sum + getTradeNetPnl(t), 0);
  };

  // Calculate total equity on a specific date (initialBalance + cumulative Net PnL of all trades up to and including dateStr)
  const getEquityForDate = (dateStr: string) => {
    const cumulativePnl = trades
      .filter(t => getTradeDisplayDateTime(t).date <= dateStr)
      .reduce((sum, t) => sum + getTradeNetPnl(t), 0);
    return initialBalance + cumulativePnl;
  };

  // Calculate total monthly Net PNL for the viewed month
  const monthlyTotalPnl = React.useMemo(() => {
    let total = 0;
    trades.forEach(t => {
      const tDate = parseDateStr(t.date);
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        total += getTradeNetPnl(t);
      }
    });
    return total;
  }, [trades, year, month]);

  const monthlyTotalFees = React.useMemo(() => {
    let total = 0;
    trades.forEach(t => {
      const tDate = parseDateStr(t.date);
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        total += getTradeTotalFees(t);
      }
    });
    return total;
  }, [trades, year, month]);

  const activeDaysInMonth = React.useMemo(() => {
    const dayMap = new Map<string, { dateStr: string; trades: Trade[]; pnl: number; wins: number; losses: number }>();
    trades.forEach(t => {
      const dStr = getTradeDisplayDateTime(t).date;
      const d = parseDateStr(dStr);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (!dayMap.has(dStr)) {
          dayMap.set(dStr, { dateStr: dStr, trades: [], pnl: 0, wins: 0, losses: 0 });
        }
        const item = dayMap.get(dStr)!;
        item.trades.push(t);
        const net = getTradeNetPnl(t);
        item.pnl += net;
        if (net > 0) item.wins += 1;
        else if (net < 0) item.losses += 1;
      }
    });
    return Array.from(dayMap.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [trades, year, month]);

  return (
    <div className="space-y-8" id="calendar-tab">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="text-blue-600" />
            PnL Calendar
          </h1>
          <p className="text-sm text-slate-500 font-sans">
            Click any calendar date to jump directly to its detailed execution logs and notes.
          </p>
        </div>

        {/* Navigation / Month select & View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Grid vs Daily Agenda Toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Full Calendar Grid"
            >
              <LayoutGrid size={12} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'agenda'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Mobile Daily Agenda Feed"
            >
              <List size={12} />
              <span>Daily List</span>
              {activeDaysInMonth.length > 0 && (
                <span className={`px-1 py-0.2 rounded-full text-[9px] font-mono ${
                  viewMode === 'agenda' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {activeDaysInMonth.length}
                </span>
              )}
            </button>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-800 min-w-[100px] text-center font-mono">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-gradient-to-br from-blue-50/40 via-indigo-50/10 to-slate-50 border border-slate-100 p-5 rounded-2xl">
        <div className="space-y-1">
          <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider font-sans">Monthly Target Pacing</span>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold font-mono ${monthlyTotalPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {monthlyTotalPnl >= 0 ? '+' : ''}${monthlyTotalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-2xs text-slate-500">Net Profit</span>
          </div>
        </div>

        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200/60 pt-3 md:pt-0 md:pl-5">
          <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider font-sans">Active Month Days Logged</span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-slate-800 font-mono">
              {trades.filter(t => {
                const d = parseDateStr(getTradeDisplayDateTime(t).date);
                return d.getFullYear() === year && d.getMonth() === month;
              }).reduce((acc, t) => acc.add(getTradeDisplayDateTime(t).date), new Set<string>()).size}
            </span>
            <span className="text-2xs text-slate-500">Days executed</span>
          </div>
        </div>

        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200/60 pt-3 md:pt-0 md:pl-5">
          <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider font-sans font-mono">Month Profit Factor</span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-slate-800 font-mono">
              {(() => {
                let wins = 0;
                let losses = 0;
                trades.forEach(t => {
                  const d = parseDateStr(t.date);
                  if (d.getFullYear() === year && d.getMonth() === month) {
                    if (t.pnl > 0) wins += t.pnl;
                    else losses += Math.abs(t.pnl);
                  }
                });
                return losses > 0 ? (wins / losses).toFixed(2) : wins > 0 ? '∞' : '0.00';
              })()}
            </span>
            <span className="text-2xs text-slate-500">Ratio</span>
          </div>
        </div>
      </div>

      {viewMode === 'agenda' ? (
        <div className="space-y-3">
          {activeDaysInMonth.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-500">
              <CalendarDays size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-sm text-slate-700">No trades recorded in {MONTHS[month]} {year}</p>
              <p className="text-2xs text-slate-400 mt-1">Switch to Grid view or change months to see activity.</p>
            </div>
          ) : (
            activeDaysInMonth.map(item => {
              const eq = getEquityForDate(item.dateStr);
              return (
                <div
                  key={item.dateStr}
                  onClick={() => onSelectDate && onSelectDate(item.dateStr)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl flex flex-col items-center justify-center font-mono font-bold min-w-[50px] ${
                      item.pnl >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      <span className="text-sm">{item.dateStr.split('-')[2]}</span>
                      <span className="text-[9px] uppercase font-sans font-bold">{new Date(`${item.dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 font-sans">
                        {new Date(`${item.dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-3xs text-slate-500 font-sans mt-0.5 flex items-center gap-2">
                        <span>{item.trades.length} {item.trades.length === 1 ? 'Trade' : 'Trades'} ({item.wins}W / {item.losses}L)</span>
                        <span>•</span>
                        <span className="font-mono text-slate-700 font-bold">Eq: ${eq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className={`text-sm font-extrabold font-mono px-3 py-1 rounded-xl border ${
                      item.pnl >= 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : 'bg-rose-50 text-rose-700 border-rose-200/80'
                    }`}>
                      {item.pnl >= 0 ? '+' : ''}${item.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <button className="text-blue-600 text-2xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                      <span>View Logs</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Main Calendar Grid + Weekly columns */
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden w-full max-w-full">
          {/* Mobile horizontal scroll helper indicator */}
          <div className="md:hidden flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 border-b border-slate-100 text-[10px] text-slate-600 font-semibold">
            <span className="flex items-center gap-1">
              <span>👉 Swipe calendar horizontally for all days &amp; Weekly PnL</span>
            </span>
            <span className="font-mono text-blue-700 bg-white/90 px-1.5 py-0.5 rounded border border-blue-200/60 font-bold">8 Cols</span>
          </div>

          <div className="overflow-x-auto touch-pan-x custom-scrollbar w-full max-w-full">
            <div className="min-w-[620px] sm:min-w-0">
              {/* Calendar Grid Header */}
              <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/50 text-center text-3xs font-bold text-slate-400 uppercase tracking-widest py-3">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="font-sans">{d}</div>
            ))}
            <div className="text-blue-600 font-mono font-bold border-l border-slate-200/80">Weekly PnL</div>
          </div>

        {/* Calendar Rows */}
        <div className="divide-y divide-slate-100">
          {calendarWeeks.map((week, idx) => {
            // Calculate total weekly PNL for this calendar row
            const weeklyPnlSum = week.reduce((sum, day) => {
              if (day.dateStr) {
                return sum + getDailyPnl(day.dateStr);
              }
              return sum;
            }, 0);

            // Determine if there are active trades logged in this week
            const hasTradesThisWeek = week.some(day => day.dateStr && getTradesForDay(day.dateStr).length > 0);
            const isTopHalf = idx < Math.ceil(calendarWeeks.length / 2);

            return (
              <div key={idx} className="grid grid-cols-8 min-h-[100px] divide-x divide-slate-100 overflow-visible relative">
                {week.map((day, dIdx) => {
                  const dayTrades = day.dateStr ? getTradesForDay(day.dateStr) : [];
                  const dayPnl = day.dateStr ? getDailyPnl(day.dateStr) : 0;
                  const isToday = day.dateStr === getLocalDateStr(new Date());
                  const isHovered = hoveredDate === day.dateStr;

                  return (
                    <div
                      key={dIdx}
                      onClick={() => {
                        if (day.dateStr && onSelectDate) {
                          onSelectDate(day.dateStr);
                        }
                      }}
                      onMouseEnter={() => day.dateStr && setHoveredDate(day.dateStr)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`relative p-2.5 flex flex-col justify-between transition-colors duration-150 cursor-pointer border border-transparent hover:border-blue-300 rounded-xl ${
                        isHovered ? 'z-40 bg-blue-50/40' : day.isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/30 text-slate-300'
                      } ${isToday ? 'ring-2 ring-blue-500/20 ring-inset bg-blue-50/10' : ''}`}
                    >
                      {/* Hover Pop-Up Animation Card */}
                      {day.dateStr && (
                        <div
                          onMouseEnter={() => setHoveredDate(day.dateStr)}
                          onMouseLeave={() => setHoveredDate(null)}
                          className={`hidden md:block transition-all duration-200 ease-out absolute z-50 w-80 p-3.5 rounded-2xl bg-white/98 backdrop-blur-xl border border-slate-200/90 shadow-2xl text-slate-800 font-sans text-left ${
                            isHovered ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
                          } ${
                            isTopHalf
                              ? 'top-full mt-2.5 translate-y-0'
                              : 'bottom-full mb-2.5 translate-y-0'
                          } ${
                            dIdx <= 1
                              ? 'left-0 translate-x-0'
                              : dIdx >= 5
                                ? 'right-0 left-auto translate-x-0'
                                : 'left-1/2 -translate-x-1/2'
                          }`}
                        >
                          {/* Arrow indicator */}
                          <div
                            className={`absolute w-3 h-3 bg-white/98 backdrop-blur-xl rotate-45 border ${
                              isTopHalf
                                ? '-top-1.5 border-t border-l border-slate-200/90'
                                : '-bottom-1.5 border-b border-r border-slate-200/90'
                            } ${
                              dIdx <= 1
                                ? 'left-6'
                                : dIdx >= 5
                                  ? 'right-6 left-auto'
                                  : 'left-1/2 -translate-x-1/2'
                            }`}
                          />

                          <div className="space-y-2 relative z-10">
                            {/* Header with Date on left, Daily PnL + Equity Small Card on Top Right */}
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100 gap-1.5">
                              <div className="flex items-center gap-1 shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-2xs font-extrabold font-mono text-slate-800 tracking-tight">
                                  {new Date(`${day.dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {dayTrades.length > 0 ? (
                                  <span className={`text-3xs font-black font-mono px-1.5 py-0.5 rounded-full border ${
                                    dayPnl >= 10 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                                      : dayPnl <= -10 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200/80' 
                                        : 'bg-amber-50 text-amber-700 border-amber-200/80'
                                  }`}>
                                    {dayPnl >= 0 ? '+' : ''}${dayPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-3xs font-bold text-slate-400 bg-slate-100/80 px-1.5 py-0.5 rounded-full">
                                    No Trades
                                  </span>
                                )}

                                {/* Equity Value Small Card at Top Right */}
                                {(() => {
                                  const equityOnDate = getEquityForDate(day.dateStr);
                                  return (
                                    <div 
                                      className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-3xs font-mono px-2.5 py-0.5 rounded-full border border-blue-400/30 shadow-xs font-extrabold"
                                      title={`Account Equity on ${day.dateStr}`}
                                    >
                                      <Wallet size={10} className="text-blue-200 shrink-0" />
                                      <span className="text-[8.5px] uppercase tracking-wider text-blue-200 font-sans font-black">Eq</span>
                                      <span className="tracking-tight">${equityOnDate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Trades List - Ultra Compact (Asset & PnL only) */}
                            {dayTrades.length > 0 ? (
                              <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar pr-0.5">
                                <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex justify-between items-center px-1">
                                  <span>Trades ({dayTrades.length})</span>
                                  <span>PnL ($)</span>
                                </div>
                                {dayTrades.map((t) => (
                                  <div
                                    key={t.id}
                                    className="text-xs bg-slate-50/90 hover:bg-blue-50/60 px-2 py-1 rounded-lg border border-slate-200/80 flex justify-between items-center transition-colors font-mono shadow-3xs"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900">{t.asset}</span>
                                      <span className={`px-1 py-0.2 rounded text-[8px] font-black uppercase ${
                                        t.direction === 'BUY'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                                      }`}>
                                        {t.direction}
                                      </span>
                                    </div>
                                    <span className={`font-bold ${
                                      t.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-2 text-center font-sans">
                                <p className="text-3xs text-slate-400 font-medium">No trades logged on this date.</p>
                              </div>
                            )}

                            {/* Footer CTA */}
                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-blue-600 font-bold">
                              <span>Click date to open journal logs</span>
                              <ChevronRight size={10} className="text-blue-600" />
                            </div>
                          </div>
                        </div>
                      )}


                      {/* Day Number and Label */}
                      <div className="flex justify-between items-center">
                        <span className={`text-2xs font-mono font-bold ${
                          day.isCurrentMonth 
                            ? isToday 
                              ? 'text-blue-600 font-black' 
                              : 'text-slate-700' 
                            : 'text-slate-350'
                        }`}>
                          {day.dayNum}
                        </span>
                        {isToday && (
                          <span className="text-[9px] bg-blue-50 text-blue-600 font-extrabold px-1 py-0.5 rounded uppercase">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Day PnL value display */}
                      {day.dateStr && dayTrades.length > 0 ? (
                        <div className="mt-3 text-left">
                          <div className={`font-mono text-[11px] font-bold ${
                            dayPnl >= 10 ? 'text-emerald-600' : dayPnl <= -10 ? 'text-rose-600' : 'text-amber-600'
                          }`}>
                            {dayPnl >= 0 ? '+' : ''}${dayPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-[9px] text-slate-400 font-sans mt-0.5 font-medium flex items-center justify-between">
                            <span>{dayTrades.length} {dayTrades.length === 1 ? 'trade' : 'trades'}</span>
                            <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">➔</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-center text-3xs text-slate-200 font-mono select-none">
                          —
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Weekly Total Column */}
                <div className="p-3 bg-slate-50/30 flex flex-col justify-center items-center text-center border-l border-slate-100">
                  {hasTradesThisWeek ? (
                    <div className="space-y-1">
                      <div className={`font-mono text-xs font-bold ${
                        weeklyPnlSum > 0 ? 'text-emerald-600' : weeklyPnlSum < 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}>
                        {weeklyPnlSum > 0 ? '+' : ''}${weeklyPnlSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans">
                        Net Week
                      </div>
                    </div>
                  ) : (
                    <span className="text-3xs text-slate-300 font-mono">—</span>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  )}

    </div>
  );
}
