import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  BrainCircuit, 
  Sparkles, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  RotateCcw,
  Clock,
  HelpCircle,
  Database,
  Coins,
  AlertTriangle,
  Lightbulb,
  Zap,
  Flame,
  LineChart as LineIcon,
  Activity,
  Target,
  Percent,
  Scale,
  Award
} from 'lucide-react';
import { Trade, TradingAccount } from '../types';

interface InsightsViewProps {
  trades: Trade[];
  selectedAccountId: string;
  accounts: TradingAccount[];
}

export default function InsightsView({ 
  trades, 
  selectedAccountId, 
  accounts 
}: InsightsViewProps) {
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Identify active account details for current scope
  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const activeInitialCapital = useMemo(() => {
    if (selectedAccountId === 'ALL') {
      return accounts.reduce((sum, a) => sum + a.initialBalance, 0);
    }
    return activeAccount?.initialBalance || 100000;
  }, [accounts, selectedAccountId, activeAccount]);

  const currencySymbol = useMemo(() => {
    if (selectedAccountId === 'ALL') return 'USD';
    return activeAccount?.currency || 'USD';
  }, [selectedAccountId, activeAccount]);

  // Utility to format currency values cleanly
  const formatVal = (val: number, options?: { showSign?: boolean; decimals?: number }) => {
    const dec = options?.decimals !== undefined ? options.decimals : 0;
    const formatted = Math.abs(val).toLocaleString(undefined, { 
      minimumFractionDigits: dec, 
      maximumFractionDigits: dec 
    });
    const sign = options?.showSign && val !== 0 ? (val > 0 ? '+' : '-') : '';
    
    // Dynamic currency prefix/suffix
    const symbol = currencySymbol === 'EUR' ? '€' : currencySymbol === 'GBP' ? '£' : '$';
    return `${sign}${symbol}${formatted}`;
  };

  // 1. Process Sequential Cumulative PNL & Drawdowns
  const cumulativeData = useMemo(() => {
    const sorted = [...trades].sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return timeA - timeB;
    });

    let currentSum = 0;
    let peakSum = 0;
    let maxDrawdownValue = 0;

    const points = sorted.map((t, idx) => {
      currentSum += t.pnl;
      if (currentSum > peakSum) {
        peakSum = currentSum;
      }
      
      const currentDrawdown = peakSum - currentSum;
      if (currentDrawdown > maxDrawdownValue) {
        maxDrawdownValue = currentDrawdown;
      }

      return {
        tradeIndex: idx + 1,
        date: t.date,
        pnl: t.pnl,
        cumulative: currentSum,
        asset: t.asset,
        peak: peakSum,
        drawdown: currentDrawdown
      };
    });

    return {
      points,
      peak: peakSum,
      maxDrawdown: maxDrawdownValue,
      maxDrawdownPercent: activeInitialCapital > 0 ? (maxDrawdownValue / activeInitialCapital) * 100 : 0
    };
  }, [trades, activeInitialCapital]);

  // 2. Process Setup Profitability
  const setupPerformanceData = useMemo(() => {
    const map: Record<string, { pnl: number; wins: number; total: number }> = {};
    
    trades.forEach(t => {
      if (!map[t.setup]) {
        map[t.setup] = { pnl: 0, wins: 0, total: 0 };
      }
      map[t.setup].pnl += t.pnl;
      map[t.setup].total += 1;
      if (t.status === 'WIN') {
        map[t.setup].wins += 1;
      }
    });

    return Object.entries(map).map(([name, data]) => ({
      setup: name,
      pnl: data.pnl,
      winRate: (data.wins / data.total) * 100,
      total: data.total
    }));
  }, [trades]);

  // 3. Process Psychological Mistakes Distribution
  const mistakesFrequencyData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    trades.forEach(t => {
      t.mistakes.forEach(m => {
        if (m === 'None') return; // Skip "None" for mistake metrics
        counts[m] = (counts[m] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([mistake, count]) => ({ mistake, count }))
      .sort((a, b) => b.count - a.count);
  }, [trades]);

  // 4. Process PNL by Day of Week
  const dayPerformanceData = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const pnlByDay = [0, 0, 0, 0, 0, 0, 0];
    const countsByDay = [0, 0, 0, 0, 0, 0, 0];

    trades.forEach(t => {
      const dayIdx = new Date(t.date).getDay();
      pnlByDay[dayIdx] += t.pnl;
      countsByDay[dayIdx] += 1;
    });

    return days.map((day, idx) => ({
      day,
      pnl: pnlByDay[idx],
      tradesCount: countsByDay[idx]
    })).filter(item => item.tradesCount > 0);
  }, [trades]);

  // 5. CALCULATE HIGHLY INTENTIONAL ADVANCED TACTICAL INSIGHTS:
  
  // A. Discipline Leak Factor (Mistake Cost)
  const mistakeCostMetric = useMemo(() => {
    let totalLosingMistakesPnL = 0;
    let tradesWithMistakesCount = 0;
    
    trades.forEach(t => {
      const hasMistakes = t.mistakes.some(m => m !== 'None');
      if (hasMistakes) {
        tradesWithMistakesCount++;
        totalLosingMistakesPnL += t.pnl;
      }
    });

    return {
      cost: totalLosingMistakesPnL,
      count: tradesWithMistakesCount,
      leakRatio: trades.length > 0 ? (tradesWithMistakesCount / trades.length) * 100 : 0
    };
  }, [trades]);

  // B. The Golden Session Window
  const sessionAdvantageMetric = useMemo(() => {
    const map: Record<string, { pnl: number; wins: number; total: number }> = {
      'NEW YORK': { pnl: 0, wins: 0, total: 0 },
      'LONDON': { pnl: 0, wins: 0, total: 0 },
      'ASIA': { pnl: 0, wins: 0, total: 0 }
    };

    trades.forEach(t => {
      const sess = t.session.toUpperCase();
      if (map[sess]) {
        map[sess].pnl += t.pnl;
        map[sess].total += 1;
        if (t.status === 'WIN') {
          map[sess].wins += 1;
        }
      }
    });

    let bestSession = 'None';
    let maxPnl = -Infinity;
    
    Object.entries(map).forEach(([sess, data]) => {
      if (data.total > 0 && data.pnl > maxPnl) {
        maxPnl = data.pnl;
        bestSession = sess;
      }
    });

    const bestData = map[bestSession];
    const bestWinRate = bestData && bestData.total > 0 ? (bestData.wins / bestData.total) * 100 : 0;

    return {
      bestSession,
      pnl: maxPnl,
      winRate: bestWinRate,
      totalTrades: bestData?.total || 0,
      breakdown: map
    };
  }, [trades]);

  // C. Alpha Asset Optimizer
  const alphaAssetMetric = useMemo(() => {
    const map: Record<string, { pnl: number; wins: number; total: number }> = {};
    
    trades.forEach(t => {
      if (!map[t.asset]) {
        map[t.asset] = { pnl: 0, wins: 0, total: 0 };
      }
      map[t.asset].pnl += t.pnl;
      map[t.asset].total += 1;
      if (t.status === 'WIN') {
        map[t.asset].wins += 1;
      }
    });

    let bestAsset = 'None';
    let highestWinRate = -1;
    let bestPnl = 0;

    Object.entries(map).forEach(([asset, data]) => {
      const wr = (data.wins / data.total) * 100;
      // Asset is optimal if it has positive gains and highest win rate
      if (wr > highestWinRate && data.total >= 1) {
        highestWinRate = wr;
        bestAsset = asset;
        bestPnl = data.pnl;
      }
    });

    return {
      bestAsset,
      winRate: highestWinRate,
      pnl: bestPnl,
      totalTrades: map[bestAsset]?.total || 0
    };
  }, [trades]);

  // D. Mathematical Profit Edge Matrix (Win/Loss expectancy math)
  const mathProfitEdge = useMemo(() => {
    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl < 0);
    
    const avgWin = winners.length > 0 ? winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length : 0;
    const avgLoss = losers.length > 0 ? losers.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losers.length : 0;
    
    const winRate = trades.length > 0 ? (winners.length / trades.length) : 0;
    const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss) : 0;
    
    // Expectancy math formula: (WinRate * AvgWin) - (LossRate * AvgLoss)
    const expectancyValue = (winRate * avgWin) - ((1 - winRate) * avgLoss);
    
    // Recommended win rate for break even at current risk reward
    const breakEvenWinRateNeeded = riskRewardRatio > 0 ? (1 / (1 + riskRewardRatio)) * 100 : 0;

    return {
      avgWin,
      avgLoss,
      riskRewardRatio,
      expectancyValue,
      breakEvenWinRateNeeded,
      hasMathematicalEdge: expectancyValue > 0
    };
  }, [trades]);

  // E. Consecutive Streaks Analysis (Max Wins & Max Losses in sequence)
  const consecutiveStreaks = useMemo(() => {
    const sorted = [...trades].sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return timeA - timeB;
    });

    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    sorted.forEach(t => {
      if (t.status === 'WIN') {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) {
          maxWinStreak = currentWinStreak;
        }
      } else if (t.status === 'LOSS') {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) {
          maxLossStreak = currentLossStreak;
        }
      } else if (t.status === 'BREAKEVEN') {
        // Breakeven resets directional streaks
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
    });

    return { maxWinStreak, maxLossStreak };
  }, [trades]);

  // F. System Quality Number (SQN) & Volatility Stats
  const systemQualityStats = useMemo(() => {
    if (trades.length === 0) return { stdDev: 0, sqn: 0, sqnRating: 'N/A' };

    const pnls = trades.map(t => t.pnl);
    const totalPnl = pnls.reduce((sum, p) => sum + p, 0);
    const avgPnl = totalPnl / trades.length;

    const variance = pnls.reduce((sum, p) => sum + Math.pow(p - avgPnl, 2), 0) / trades.length;
    const stdDev = Math.sqrt(variance);

    let sqn = 0;
    if (stdDev > 0) {
      sqn = (avgPnl / stdDev) * Math.sqrt(trades.length);
    }

    let sqnRating = 'Average';
    if (sqn >= 7.0) sqnRating = 'Holy Grail';
    else if (sqn >= 5.0) sqnRating = 'Superb';
    else if (sqn >= 3.0) sqnRating = 'Excellent';
    else if (sqn >= 2.5) sqnRating = 'Good';
    else if (sqn >= 2.0) sqnRating = 'Above Average';
    else if (sqn >= 1.6) sqnRating = 'Average';
    else if (sqn >= 0) sqnRating = 'Under-performing';
    else sqnRating = 'Negative Edge';

    return { stdDev, sqn, sqnRating };
  }, [trades]);

  // G. Sizing Guidance (Kelly Criterion) & Risk Recovery metrics
  const portfolioRiskAudits = useMemo(() => {
    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl < 0);
    
    const avgWin = winners.length > 0 ? winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length : 0;
    const avgLoss = losers.length > 0 ? losers.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losers.length : 0;
    
    const winRate = trades.length > 0 ? (winners.length / trades.length) : 0;
    const ratio = avgLoss > 0 ? (avgWin / avgLoss) : 0;

    // Kelly % = W - [(1 - W) / R]
    let kellyPercent = 0;
    if (ratio > 0) {
      kellyPercent = winRate - ((1 - winRate) / ratio);
    } else if (winRate > 0) {
      kellyPercent = winRate;
    }

    // Recovery Factor = Net Profit / Max Drawdown
    const totalNetProfit = trades.reduce((sum, t) => sum + t.pnl, 0);
    const maxDd = cumulativeData.maxDrawdown;
    const recoveryFactor = maxDd > 0 ? (totalNetProfit / maxDd) : totalNetProfit > 0 ? Infinity : 0;

    return {
      kellyPercent: kellyPercent * 100,
      recoveryFactor
    };
  }, [trades, cumulativeData]);

  // Invoke server-side Gemini API Coach Audit
  const generateAiAudit = async () => {
    if (trades.length === 0) {
      alert('Please log some trades before calling the AI Trading Coach.');
      return;
    }

    setLoadingAi(true);
    setAiReport('');
    
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades })
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      const result = await response.json();
      setAiReport(result.feedback);
    } catch (err) {
      setAiReport('The server-side Gemini API is currently offline or unconfigured. Please verify your GEMINI_API_KEY is configured inside Settings > Secrets.');
    } finally {
      setLoadingAi(false);
    }
  };

  if (trades.length === 0) {
    return (
      <div className="bg-white border border-slate-100 p-12 rounded-2xl text-center space-y-4 max-w-xl mx-auto shadow-3xs">
        <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <BarChart3 size={24} />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">No Performance Data to Map</h2>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            Please log trades in your Execution Journal first. This panel will generate advanced Recharts graphs, psychological mistake frequencies, golden session metrics, drawdowns, and elite coaching audits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="insights-tab">
      
      {/* Header section with Scoping status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-blue-600" />
            Tactical & Risk Analytics
          </h1>
          <p className="text-sm text-slate-500 font-sans">
            Diagnose psychological leaks, optimize your execution session windows, and inspect mathematical expectancy.
          </p>
        </div>

        {/* Scope Indicator Badge */}
        <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-100 px-3.5 py-1.5 rounded-xl">
          <Database size={13} className="text-blue-600" />
          <div className="text-2xs font-extrabold text-blue-800 font-sans">
            CURRENT SCOPE:{' '}
            <span className="uppercase text-slate-700">
              {selectedAccountId === 'ALL' ? 'Consolidated Portfolio (All Accounts)' : activeAccount?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Account Switching curve disclaimer alert */}
      {selectedAccountId === 'ALL' && accounts.length > 1 && (
        <div className="bg-amber-50 border border-amber-100/70 p-4 rounded-xl flex items-start gap-3 text-amber-900 text-xs animate-fadeIn">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <strong className="font-bold block">Consolidated P&L Curve Disclaimer</strong>
            <p className="text-2xs text-amber-800 leading-relaxed font-sans">
              You are viewing combined trade logs from multiple active accounts. P&L trajectories can look mathematically inconsistent if accounts utilize different currencies or leverage balances. For absolute mathematical precision, select a specific single account from the switcher at the top.
            </p>
          </div>
        </div>
      )}

      {/* High-Fidelity Bento Grid of Programmatic Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Discipline Leak Factor */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs flex flex-col justify-between space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider">Discipline Leak</span>
              <ShieldAlert size={14} className="text-rose-500" />
            </div>
            <strong className={`text-lg font-black font-mono tracking-tight block ${mistakeCostMetric.cost < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatVal(mistakeCostMetric.cost, { showSign: true })}
            </strong>
          </div>
          <div className="text-4xs text-slate-500 font-sans leading-snug border-t pt-2">
            Lost across <span className="font-bold text-slate-700">{mistakeCostMetric.count} trades</span> with behavioral errors ({mistakeCostMetric.leakRatio.toFixed(0)}% of log).
          </div>
        </div>

        {/* Metric 2: The Golden Session Window */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs flex flex-col justify-between space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider">Alpha Session</span>
              <Clock size={14} className="text-blue-500" />
            </div>
            <strong className="text-base font-black font-sans text-blue-700 tracking-tight block uppercase">
              {sessionAdvantageMetric.bestSession}
            </strong>
          </div>
          <div className="text-4xs text-slate-500 font-sans leading-snug border-t pt-2">
            Produced <span className="font-bold text-slate-700">{formatVal(sessionAdvantageMetric.pnl)}</span> with a golden <span className="font-semibold text-emerald-600">{sessionAdvantageMetric.winRate.toFixed(0)}% win rate</span>.
          </div>
        </div>

        {/* Metric 3: Alpha Asset Optimizer */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs flex flex-col justify-between space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider">Alpha Asset</span>
              <Coins size={14} className="text-emerald-500" />
            </div>
            <strong className="text-lg font-black font-mono text-slate-800 tracking-tight block">
              {alphaAssetMetric.bestAsset}
            </strong>
          </div>
          <div className="text-4xs text-slate-500 font-sans leading-snug border-t pt-2">
            Achieved optimal <span className="font-semibold text-emerald-600">{alphaAssetMetric.winRate.toFixed(0)}% win probability</span> over {alphaAssetMetric.totalTrades} setups.
          </div>
        </div>

        {/* Metric 4: Mathematical Edge */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs flex flex-col justify-between space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider">System Edge</span>
              <Zap size={14} className={mathProfitEdge.hasMathematicalEdge ? 'text-amber-500' : 'text-slate-400'} />
            </div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest inline-block ${
              mathProfitEdge.hasMathematicalEdge ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {mathProfitEdge.hasMathematicalEdge ? 'POSITIVE' : 'NEGATIVE'} EXPECTANCY
            </span>
          </div>
          <div className="text-4xs text-slate-500 font-sans leading-snug border-t pt-2">
            Expectancy is <span className="font-bold text-slate-700">{formatVal(mathProfitEdge.expectancyValue, { showSign: true })}</span> net per trade.
          </div>
        </div>

        {/* Metric 5: Institutional Drawdown Peak-to-Valley */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs flex flex-col justify-between space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider">Max DD level</span>
              <AlertTriangle size={14} className="text-rose-400" />
            </div>
            <strong className="text-lg font-black font-mono text-rose-600 tracking-tight block">
              {cumulativeData.maxDrawdownPercent.toFixed(1)}%
            </strong>
          </div>
          <div className="text-4xs text-slate-500 font-sans leading-snug border-t pt-2">
            Peak-to-valley risk drop of <span className="font-bold text-slate-700">{formatVal(cumulativeData.maxDrawdown)}</span> from absolute equity high.
          </div>
        </div>

      </div>

      {/* Primary Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Cumulative Profit Curve - 12 cols */}
        <div className="lg:col-span-12 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
                <LineIcon size={14} className="text-blue-600" />
                Cumulative Profit Curve (Equity curve)
              </h3>
              <p className="text-4xs text-slate-400 font-sans">COMPILING REALIZED NET BALANCES IN SEQUENTIAL LOGGING ORDER</p>
            </div>
            <div className="text-3xs text-slate-500 font-mono flex items-center gap-1">
              <span>Account balance peak:</span>
              <span className="text-emerald-600 font-bold">{formatVal(activeInitialCapital + cumulativeData.peak)}</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData.points} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="tradeIndex" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  label={{ value: 'Executed Trades Sequential Index', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8' }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => formatVal(val)}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px', fontFamily: 'monospace' }}
                  formatter={(val: any) => [formatVal(Number(val)), 'Cumulative Balance']}
                  labelFormatter={(idx) => `Sequential Trade #${idx}`}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorPnl)" name="Cumulative Balance" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Setups Profitability - 6 cols */}
        <div className="lg:col-span-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
            <BarChart3 size={14} className="text-blue-600" />
            Setup Profitability Analysis
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={setupPerformanceData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="setup" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => formatVal(val)} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }}
                  formatter={(val: any) => [formatVal(Number(val)), 'Total Net PnL']}
                />
                <Bar dataKey="pnl" name="Total Net PnL" radius={[4, 4, 0, 0]}>
                  {setupPerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Psychology Mistakes Distribution - 6 cols */}
        <div className="lg:col-span-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-rose-500" />
            Psychological Mistakes Frequency
          </h3>
          {mistakesFrequencyData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <span className="text-2xs text-slate-500 font-sans flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Zero behavioral errors logged! Flawless discipline.
              </span>
            </div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mistakesFrequencyData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="mistake" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }} />
                  <Bar dataKey="count" name="Frequency Count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* PNL by Day of Week - 4 cols */}
        <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
            <Clock size={14} className="text-slate-500" />
            PnL by Day of Week
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayPerformanceData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => formatVal(val)} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }}
                  formatter={(val: any) => [formatVal(Number(val)), 'Total Net P&L']}
                />
                <Bar dataKey="pnl" name="Total PnL" radius={[4, 4, 0, 0]}>
                  {dayPerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Realized Performance Ratios - 4 cols */}
        <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
              <Scale size={14} className="text-blue-500" />
              Realized Payoff Matrix
            </h3>
            <div className="divide-y divide-slate-100">
              
              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans">Profit Factor Ratio</span>
                <span className="font-bold font-mono text-slate-800">
                  {(() => {
                    let gains = 0;
                    let drops = 0;
                    trades.forEach(t => t.pnl >= 0 ? (gains += t.pnl) : (drops += Math.abs(t.pnl)));
                    return drops > 0 ? (gains / drops).toFixed(2) : gains > 0 ? '∞' : '0.00';
                  })()}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans">Average Winning Trade</span>
                <span className="font-bold font-mono text-emerald-600">
                  {formatVal(mathProfitEdge.avgWin)}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans">Average Losing Trade</span>
                <span className="font-bold font-mono text-rose-600">
                  {formatVal(mathProfitEdge.avgLoss)}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans">Avg Win/Loss Payoff</span>
                <span className="font-bold font-mono text-slate-800">
                  {mathProfitEdge.avgLoss > 0 ? (mathProfitEdge.avgWin / mathProfitEdge.avgLoss).toFixed(2) : mathProfitEdge.avgWin > 0 ? '∞' : '0.00'}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans">Expectancy (PnL / Trade)</span>
                <span className="font-bold font-mono text-slate-800">
                  {formatVal(mathProfitEdge.expectancyValue, { showSign: true })}
                </span>
              </div>

            </div>
          </div>

          <div className="text-3xs text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-4 leading-relaxed font-sans">
            <strong>Edge Status:</strong> {mathProfitEdge.hasMathematicalEdge ? (
              <span className="text-emerald-705 font-semibold text-emerald-700">Your model has a positive mathematical edge. For every dollar risked, you expect to yield positive returns over volume.</span>
            ) : (
              <span className="text-rose-605 font-semibold text-rose-600">Negative expectancy detected. Tighten stop losses or refine setups to improve risk reward profiles.</span>
            )}
          </div>
        </div>

        {/* Elite Statistical Audits - 4 cols */}
        <div className="lg:col-span-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
              <Award size={14} className="text-amber-500" />
              Elite Statistical Audits
            </h3>
            <div className="divide-y divide-slate-100">
              
              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans flex items-center gap-1">
                  Van Tharp SQN
                  <HelpCircle size={10} className="text-slate-300 cursor-help" title="System Quality Number: Measures the profitability and consistency of a trading framework. Ratings > 2.0 are good; > 3.0 are excellent." />
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold font-mono text-slate-800">
                    {systemQualityStats.sqn.toFixed(2)}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none ${
                    systemQualityStats.sqn >= 3.0 ? 'bg-emerald-50 text-emerald-700' :
                    systemQualityStats.sqn >= 2.0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {systemQualityStats.sqnRating}
                  </span>
                </div>
              </div>

              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans flex items-center gap-1">
                  Kelly Sizing Guide
                  <HelpCircle size={10} className="text-slate-300 cursor-help" title="Kelly Criterion calculates the mathematically optimal risk size percentage of your account to allocate per trade." />
                </span>
                <span className={`font-bold font-mono ${portfolioRiskAudits.kellyPercent > 0 ? 'text-blue-600' : 'text-slate-500'}`}>
                  {portfolioRiskAudits.kellyPercent > 0 ? `${portfolioRiskAudits.kellyPercent.toFixed(1)}%` : '0.0% (No Risk)'}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans">Recovery Factor</span>
                <span className="font-bold font-mono text-slate-800">
                  {portfolioRiskAudits.recoveryFactor === Infinity ? '∞' : portfolioRiskAudits.recoveryFactor.toFixed(2)}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans">Max Streaks (Win/Loss)</span>
                <span className="font-bold font-mono text-slate-800 flex items-center gap-1">
                  <span className="text-emerald-600">{consecutiveStreaks.maxWinStreak}W</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-rose-600">{consecutiveStreaks.maxLossStreak}L</span>
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-sans">Standard Deviation</span>
                <span className="font-bold font-mono text-slate-800">
                  {formatVal(systemQualityStats.stdDev)}
                </span>
              </div>

            </div>
          </div>

          <div className="text-3xs text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-4 leading-relaxed font-sans">
            <strong>Kelly Recommendation:</strong> {portfolioRiskAudits.kellyPercent > 0 ? (
              <span>Calculated optimal risk is <strong className="text-slate-700 font-extrabold">{portfolioRiskAudits.kellyPercent.toFixed(1)}%</strong> of liquid capital per entry. Maintain 0.5x half-Kelly sizing for conservative accounts.</span>
            ) : (
              <span>Your current system metrics indicate negative expectancy. Do not risk capital using leverage; practice execution on a demo sandbox.</span>
            )}
          </div>
        </div>

      </div>

      {/* AI Trading Coach Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Sparkles size={18} className="text-indigo-600" />
              AI Trading Coach — Portfolio Audit
            </h3>
            <p className="text-xs text-slate-600 font-sans">
              Deploy our server-side Gemini 3.5-flash audit client to extract behavioral trends and structural inefficiencies from your log history.
            </p>
          </div>
          <button
            onClick={generateAiAudit}
            disabled={loadingAi}
            className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50`}
          >
            {loadingAi ? 'Analyzing Log History...' : 'Generate AI Coach Audit'}
          </button>
        </div>

        {/* AI Report Output */}
        {loadingAi && (
          <div className="bg-white border border-slate-100 p-5 rounded-xl animate-pulse space-y-3">
            <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            <div className="h-2 bg-slate-50 rounded w-full"></div>
            <div className="h-2 bg-slate-50 rounded w-full"></div>
            <div className="h-2 bg-slate-50 rounded w-2/3"></div>
          </div>
        )}

        {aiReport && (
          <div className="bg-white border border-indigo-100 p-5 rounded-xl text-slate-700 text-xs leading-relaxed font-sans space-y-3 shadow-2xs whitespace-pre-line">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <strong className="text-indigo-900 uppercase tracking-wide">Coach Audit Report</strong>
              <button 
                onClick={() => setAiReport('')}
                className="text-slate-400 hover:text-slate-600 text-3xs font-bold"
              >
                Clear Report
              </button>
            </div>
            <p>{aiReport}</p>
          </div>
        )}
      </div>

    </div>
  );
}
