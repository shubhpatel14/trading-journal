import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays,
  Calendar,
  FileText
} from 'lucide-react';
import { Trade } from '../types';

interface PnLCalendarProps {
  trades: Trade[];
  onSelectDate?: (dateStr: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getLocalDateStr = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function PnLCalendar({ trades, onSelectDate }: PnLCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Use current date as baseline calendar view
  const [currentDate, setCurrentDate] = useState(() => {
    // Check if there are trades, otherwise default to today
    if (trades.length > 0) {
      // Sort trades descending to find latest trade date and establish calendar baseline
      const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return new Date(sorted[0].date);
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
    return trades.filter(t => t.date === dateStr);
  };

  // Calculate total PNL for a day
  const getDailyPnl = (dateStr: string) => {
    const dayTrades = getTradesForDay(dateStr);
    return dayTrades.reduce((sum, t) => sum + t.pnl, 0);
  };

  // Calculate total monthly PNL for the viewed month (only including current month days)
  const monthlyTotalPnl = React.useMemo(() => {
    let total = 0;
    trades.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        total += t.pnl;
      }
    });
    return total;
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

        {/* Navigation / Month select */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-800 min-w-[110px] text-center font-mono">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
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
                const d = new Date(t.date);
                return d.getFullYear() === year && d.getMonth() === month;
              }).reduce((acc, t) => acc.add(t.date), new Set<string>()).size}
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
                  const d = new Date(t.date);
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

      {/* Main Calendar Grid + Weekly columns */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-visible">
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

            return (
              <div key={idx} className="grid grid-cols-8 min-h-[100px] divide-x divide-slate-100 overflow-visible">
                {week.map((day, dIdx) => {
                  const dayTrades = day.dateStr ? getTradesForDay(day.dateStr) : [];
                  const dayPnl = day.dateStr ? getDailyPnl(day.dateStr) : 0;
                  const isToday = day.dateStr === getLocalDateStr(new Date());

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
                      className={`relative group p-2.5 flex flex-col justify-between transition-all duration-200 ease-out transform hover:scale-[1.03] hover:-translate-y-1 hover:z-50 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer border border-transparent hover:border-blue-300 rounded-xl ${
                        day.isCurrentMonth ? 'bg-white hover:bg-gradient-to-b hover:from-white hover:to-blue-50/30' : 'bg-slate-50/30 text-slate-300'
                      } ${isToday ? 'ring-2 ring-blue-500/20 ring-inset bg-blue-50/10' : ''}`}
                    >
                      {/* Hover Pop-Up Animation Card */}
                      {day.dateStr && (
                        <div
                          className={`opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 absolute z-50 w-72 p-3.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_20px_45px_-10px_rgba(15,23,42,0.16),0_0_0_1px_rgba(255,255,255,0.9)_inset] text-slate-800 font-sans text-left transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            idx === 0
                              ? 'top-full mt-2.5 translate-y-[-8px] group-hover:translate-y-0'
                              : 'bottom-full mb-2.5 translate-y-[8px] group-hover:translate-y-0'
                          } ${
                            dIdx === 0
                              ? 'left-0 translate-x-0'
                              : dIdx === 6
                                ? 'right-0 left-auto translate-x-0'
                                : 'left-1/2 -translate-x-1/2'
                          }`}
                        >
                          {/* Arrow indicator */}
                          <div
                            className={`absolute w-3 h-3 bg-white/95 backdrop-blur-xl rotate-45 ${
                              idx === 0
                                ? '-top-1.5 border-t border-l border-slate-200/90'
                                : '-bottom-1.5 border-b border-r border-slate-200/90'
                            } ${
                              dIdx === 0
                                ? 'left-6'
                                : dIdx === 6
                                  ? 'right-6 left-auto'
                                  : 'left-1/2 -translate-x-1/2'
                            }`}
                          />

                          <div className="space-y-2.5 relative z-10">
                            {/* Header */}
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-2xs font-extrabold font-mono text-slate-800 tracking-tight">
                                  {new Date(`${day.dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              {dayTrades.length > 0 ? (
                                <span className={`text-3xs font-black font-mono px-2 py-0.5 rounded-full border ${
                                  dayPnl >= 10 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                                    : dayPnl <= -10 
                                      ? 'bg-rose-50 text-rose-700 border-rose-200/80' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200/80'
                                }`}>
                                  {dayPnl >= 0 ? '+' : ''}${dayPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              ) : (
                                <span className="text-3xs font-bold text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-full">
                                  No Executions
                                </span>
                              )}
                            </div>

                            {/* Trades List */}
                            {dayTrades.length > 0 ? (
                              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {dayTrades.map((t) => (
                                  <div
                                    key={t.id}
                                    className="text-3xs bg-slate-50/90 hover:bg-indigo-50/30 p-2.5 rounded-xl border border-slate-200/70 space-y-1.5 transition-colors shadow-2xs"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold font-mono text-slate-900 text-xs">{t.asset}</span>
                                        <span className={`px-1.5 py-0.3 rounded text-[8px] font-black uppercase tracking-wider ${
                                          t.direction === 'BUY'
                                            ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/20'
                                            : 'bg-rose-500/15 text-rose-700 border border-rose-500/20'
                                        }`}>
                                          {t.direction}
                                        </span>
                                      </div>
                                      <span className={`font-mono font-bold text-xs ${
                                        t.pnl >= 10 ? 'text-emerald-600' : t.pnl <= -10 ? 'text-rose-600' : 'text-amber-600'
                                      }`}>
                                        {t.pnl >= 0 ? '+' : ''}${t.pnl}
                                      </span>
                                    </div>
                                    {t.notes && (
                                      <div className="flex items-start gap-1 text-[9.5px] text-slate-600 bg-white/90 p-1.5 rounded-lg border border-slate-200/50 font-sans italic">
                                        <FileText className="w-2.5 h-2.5 text-slate-400 shrink-0 mt-0.5" />
                                        <p className="line-clamp-2 leading-tight">
                                          "{t.notes}"
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-2.5 text-center font-sans">
                                <p className="text-3xs text-slate-400 font-medium">No trades logged on this date.</p>
                              </div>
                            )}

                            {/* Footer CTA */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-blue-600 font-bold">
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
  );
}
