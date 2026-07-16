import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Award, 
  ShieldAlert, 
  Layers, 
  Clock, 
  ArrowRight, 
  PlusCircle, 
  CalendarDays,
  Play
} from 'lucide-react';
import { Trade, TradePlan, PerformanceMetrics } from '../types';

interface DashboardProps {
  trades: Trade[];
  plans: TradePlan[];
  onNavigate: (tab: string) => void;
  onExecutePlan: (plan: TradePlan) => void;
  onOpenNewTrade: () => void;
  initialCapital?: number;
  currencySymbol?: string;
}

export default function Dashboard({ 
  trades, 
  plans, 
  onNavigate, 
  onExecutePlan,
  onOpenNewTrade,
  initialCapital = 100000,
  currencySymbol = 'USD'
}: DashboardProps) {
  
  // Format currency helper
  const formatValue = (val: number, options?: { showSign?: boolean; decimals?: number }) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const symbol = currencySymbol === 'USD' ? '$' : currencySymbol === 'EUR' ? '€' : currencySymbol === 'GBP' ? '£' : '';
    const suffix = (currencySymbol !== 'USD' && currencySymbol !== 'EUR' && currencySymbol !== 'GBP') ? ` ${currencySymbol}` : '';
    const formattedNum = absVal.toLocaleString(undefined, { 
      minimumFractionDigits: options?.decimals !== undefined ? options.decimals : 2, 
      maximumFractionDigits: options?.decimals !== undefined ? options.decimals : 2 
    });
    
    const sign = options?.showSign && val > 0 ? '+' : isNeg ? '-' : '';
    return `${sign}${symbol}${formattedNum}${suffix}`;
  };

  // Calculate performance metrics
  const metrics = React.useMemo((): PerformanceMetrics => {
    const totalTrades = trades.length;
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        riskRewardRatio: 0,
        maxDrawdown: 0,
        totalPnl: 0,
        avgWin: 0,
        avgLoss: 0,
        winCount: 0,
        lossCount: 0
      };
    }

    let totalPnl = 0;
    let winCount = 0;
    let lossCount = 0;
    let totalWinsPnl = 0;
    let totalLossesPnl = 0;
    let totalRrRatioSum = 0;
    let validRrCount = 0;

    // Track rolling balance for drawdown
    let rollingBalance = initialCapital;
    let peak = rollingBalance;
    let maxDdUSD = 0;

    // Sort trades by date + time to calculate progressive drawdown
    const sortedTrades = [...trades].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return dateTimeA - dateTimeB;
    });

    sortedTrades.forEach(trade => {
      totalPnl += trade.pnl;
      rollingBalance += trade.pnl;
      
      if (rollingBalance > peak) {
        peak = rollingBalance;
      }
      const currentDd = peak - rollingBalance;
      if (currentDd > maxDdUSD) {
        maxDdUSD = currentDd;
      }

      if (trade.status === 'WIN') {
        winCount++;
        totalWinsPnl += trade.pnl;
      } else if (trade.status === 'LOSS') {
        lossCount++;
        totalLossesPnl += Math.abs(trade.pnl);
      }

      // Calculate designed Risk-Reward Ratio: ABS(TP - Entry) / ABS(Entry - SL)
      if (trade.entryPrice && trade.sl && trade.tp) {
        const risk = Math.abs(trade.entryPrice - trade.sl);
        const reward = Math.abs(trade.tp - trade.entryPrice);
        if (risk > 0) {
          totalRrRatioSum += (reward / risk);
          validRrCount++;
        }
      }
    });

    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const profitFactor = totalLossesPnl > 0 ? totalWinsPnl / totalLossesPnl : totalWinsPnl > 0 ? 99.9 : 0;
    const riskRewardRatio = validRrCount > 0 ? totalRrRatioSum / validRrCount : 0;
    
    // Drawdown level as percentage of peak account value
    const maxDrawdownPct = peak > 0 ? (maxDdUSD / peak) * 100 : 0;

    return {
      totalTrades,
      winRate,
      profitFactor,
      riskRewardRatio,
      maxDrawdown: maxDrawdownPct,
      totalPnl,
      avgWin: winCount > 0 ? totalWinsPnl / winCount : 0,
      avgLoss: lossCount > 0 ? totalLossesPnl / lossCount : 0,
      winCount,
      lossCount
    };
  }, [trades, initialCapital]);

  const activePlans = React.useMemo(() => {
    return plans.filter(p => p.status === 'ACTIVE');
  }, [plans]);

  const recentTrades = React.useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime())
      .slice(0, 4);
  }, [trades]);

  return (
    <div className="space-y-8" id="dashboard-tab">
      {/* Upper Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/70 p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Execution Workspace</h1>
          <p className="text-sm text-slate-600 font-sans">
            Minimalist trading command center. Plan, log, analyze, and master setups.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button
            id="btn-nav-journal"
            onClick={() => onNavigate('plans')}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition duration-150 shadow-xs cursor-pointer"
          >
            Manage Setup Plans
          </button>
          <button
            id="btn-log-trade-banner"
            onClick={onOpenNewTrade}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition duration-150 shadow-sm shadow-blue-500/10 cursor-pointer"
          >
            <PlusCircle size={16} />
            Log Executed Trade
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Total PNL Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 font-medium font-sans uppercase tracking-wider">Total Net Profit</span>
              <div className={`p-1.5 rounded-lg ${metrics.totalPnl >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {metrics.totalPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              </div>
            </div>
            <span className={`text-2xl font-bold font-mono tracking-tight block ${metrics.totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatValue(metrics.totalPnl, { showSign: true })}
            </span>
          </div>
          <div className="mt-4 text-xs font-sans text-slate-500 border-t border-slate-50 pt-3">
            Initial Capital: <span className="font-semibold text-slate-700">{formatValue(initialCapital, { decimals: 0 })}</span>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 font-medium font-sans uppercase tracking-wider">Win Rate</span>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Percent size={16} />
              </div>
            </div>
            <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight block">
              {metrics.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="mt-4 text-xs font-sans text-slate-500 border-t border-slate-50 pt-3 flex justify-between">
            <span>Wins: <strong className="text-emerald-600">{metrics.winCount}</strong></span>
            <span>Losses: <strong className="text-rose-600">{metrics.lossCount}</strong></span>
          </div>
        </div>

        {/* Profit Factor Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 font-medium font-sans uppercase tracking-wider">Profit Factor</span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Award size={16} />
              </div>
            </div>
            <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight block">
              {metrics.profitFactor === 99.9 ? '∞' : metrics.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className="mt-4 text-xs font-sans text-slate-500 border-t border-slate-50 pt-3">
            Gross gains / Gross losses
          </div>
        </div>

        {/* Risk-Reward Ratio Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 font-medium font-sans uppercase tracking-wider">Avg Planned R:R</span>
              <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
                <Layers size={16} />
              </div>
            </div>
            <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight block">
              1 : {metrics.riskRewardRatio.toFixed(2)}
            </span>
          </div>
          <div className="mt-4 text-xs font-sans text-slate-500 border-t border-slate-50 pt-3">
            Avg targets vs. stop sizes
          </div>
        </div>

        {/* Max Drawdown Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 font-medium font-sans uppercase tracking-wider">Max Drawdown</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <ShieldAlert size={16} />
              </div>
            </div>
            <span className="text-2xl font-bold font-mono text-rose-600 tracking-tight block">
              {metrics.maxDrawdown.toFixed(2)}%
            </span>
          </div>
          <div className="mt-4 text-xs font-sans text-slate-500 border-t border-slate-50 pt-3">
            Peak-to-trough risk level
          </div>
        </div>
      </div>

      {/* Main Grid: Active Setup Plans + Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Active Trade Setup Plans (PDF inspired) - 7 columns */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              Active Trading Setup Plans
            </h2>
            <button 
              id="btn-go-plans"
              onClick={() => onNavigate('plans')} 
              className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              All Plans ({plans.length}) <ArrowRight size={14} />
            </button>
          </div>

          {activePlans.length === 0 ? (
            <div className="bg-slate-50/50 border border-dashed border-slate-200 p-8 rounded-2xl text-center">
              <p className="text-slate-500 text-sm mb-3">No active plans for today.</p>
              <button
                onClick={() => onNavigate('plans')}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
              >
                Create standard setup plan <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activePlans.map((plan) => (
                <div 
                  key={plan.id}
                  className="bg-white border border-slate-100 hover:border-slate-200/80 p-5 rounded-2xl shadow-xs hover:shadow-sm transition duration-150 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold font-mono">
                        {plan.asset}
                      </span>
                      <span className={`px-2 py-0.5 text-3xs font-extrabold tracking-widest rounded-md ${
                        plan.bias === 'BULLISH' ? 'bg-emerald-50 text-emerald-700' : 
                        plan.bias === 'BEARISH' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {plan.bias}
                      </span>
                    </div>
                    <span className="text-2xs text-slate-400 font-mono font-medium">{plan.date}</span>
                  </div>

                  {/* Multi-Timeframe Matrix (from PDF logic) */}
                  <div className="grid grid-cols-3 gap-2 text-2xs bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-500">4HR Chart</div>
                      <div className={`font-semibold ${plan.fourHour.bias === 'BEARISH' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {plan.fourHour.bias}
                      </div>
                    </div>
                    <div className="space-y-1 border-l border-slate-200/60 pl-3">
                      <div className="font-bold text-slate-500">1HR Chart</div>
                      <div className={`font-semibold ${plan.oneHour.bias === 'BEARISH' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {plan.oneHour.bias}
                      </div>
                    </div>
                    <div className="space-y-1 border-l border-slate-200/60 pl-3">
                      <div className="font-bold text-slate-500">15m Chart</div>
                      <div className={`font-semibold ${plan.fifteenMin.bias === 'BEARISH' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {plan.fifteenMin.bias}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-700">Triggers (15m BoS & Rejection):</p>
                    <p className="text-slate-600 font-sans leading-relaxed">{plan.triggers}</p>
                  </div>

                  <div className="space-y-1 text-xs bg-amber-50/40 p-3 rounded-xl border border-amber-100/50">
                    <p className="font-bold text-amber-800 flex items-center gap-1">
                      <span>Macro Notes / PPI news:</span>
                    </p>
                    <p className="text-amber-900 leading-relaxed text-2xs">{plan.macroNotes}</p>
                  </div>

                  {/* Execute Button */}
                  <div className="flex justify-end pt-2 border-t border-slate-50">
                    <button
                      onClick={() => onExecutePlan(plan)}
                      className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg transition duration-150 cursor-pointer"
                    >
                      <Play size={12} fill="white" />
                      Execute Setup Plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Journal Logs - 5 columns */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-600" />
              Recent Trades
            </h2>
            <button 
              id="btn-go-journal"
              onClick={() => onNavigate('journal')} 
              className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              Full Journal <ArrowRight size={14} />
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs divide-y divide-slate-50 overflow-hidden">
            {recentTrades.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No trades logged yet. Start execution tracking.
              </div>
            ) : (
              recentTrades.map((trade) => (
                <div 
                  key={trade.id} 
                  className="p-4 hover:bg-slate-50/50 transition duration-150 flex justify-between items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-slate-900 text-sm">{trade.asset}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-3xs font-extrabold tracking-wider ${
                        trade.direction === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {trade.direction}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-2xs text-slate-400 font-mono">
                      <span>{trade.date}</span>
                      <span>•</span>
                      <span>{trade.setup}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className={`font-mono font-bold text-sm ${trade.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatValue(trade.pnl, { showSign: true, decimals: 0 })}
                    </div>
                    <div className="text-3xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded-md inline-block uppercase">
                      {trade.session}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Quick Win/Loss ratio bar */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs space-y-3">
            <div className="flex justify-between text-2xs font-bold text-slate-500">
              <span>WIN RATIO METRIC</span>
              <span>{metrics.winRate.toFixed(0)}% ({metrics.winCount} of {metrics.totalTrades})</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full flex overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${metrics.winRate}%` }}
              />
              <div 
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${100 - metrics.winRate}%` }}
              />
            </div>
            <div className="flex justify-between text-3xs font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Wins
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Losses
              </span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
