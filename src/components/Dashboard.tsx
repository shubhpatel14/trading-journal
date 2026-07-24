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
  Play,
  Sparkles,
  Zap,
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

interface MetricCardProps {
  label: string;
  value: string;
  note: React.ReactNode;
  icon: React.ElementType;
  gradient: string;
  delay?: string;
}

function MetricCard({ label, value, note, icon: Icon, gradient, delay = '' }: MetricCardProps) {
  return (
    <article className={`clay-card min-h-[174px] p-5 flex flex-col justify-between ${delay}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-clay-muted">{label}</span>
        <div className={`clay-orb flex h-11 w-11 items-center justify-center bg-gradient-to-br ${gradient}`}>
          <Icon size={19} className="text-white stroke-[3px]" />
        </div>
      </div>
      <div className="font-display text-3xl font-black leading-none tracking-tight text-clay-foreground break-words">{value}</div>
      <div className="clay-pressed px-4 py-3 text-xs font-bold leading-snug text-clay-muted">{note}</div>
    </article>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType;
  title: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="flex items-center gap-3 font-display text-2xl font-black tracking-tight text-clay-foreground">
        <span className="clay-orb flex h-12 w-12 items-center justify-center bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]">
          <Icon size={20} className="text-white stroke-[3px]" />
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}

function BiasBadge({ value }: { value: string }) {
  const className =
    value === 'BULLISH'
      ? 'bg-gradient-to-br from-emerald-300 to-emerald-500 text-white'
      : value === 'BEARISH'
        ? 'bg-gradient-to-br from-pink-400 to-[#DB2777] text-white'
        : 'bg-white/80 text-clay-foreground';

  return <span className={`clay-pill ${className}`}>{value}</span>;
}

export default function Dashboard({
  trades,
  plans,
  onNavigate,
  onExecutePlan,
  onOpenNewTrade,
  initialCapital = 100000,
  currencySymbol = 'USD',
}: DashboardProps) {
  const formatValue = (val: number, options?: { showSign?: boolean; decimals?: number }) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const symbol =
      currencySymbol === 'USD'
        ? '$'
        : currencySymbol === 'EUR'
          ? 'EUR '
          : currencySymbol === 'GBP'
            ? 'GBP '
            : '';
    const suffix = currencySymbol !== 'USD' && currencySymbol !== 'EUR' && currencySymbol !== 'GBP' ? ` ${currencySymbol}` : '';
    const formattedNum = absVal.toLocaleString(undefined, {
      minimumFractionDigits: options?.decimals !== undefined ? options.decimals : 2,
      maximumFractionDigits: options?.decimals !== undefined ? options.decimals : 2,
    });

    const sign = options?.showSign && val > 0 ? '+' : isNeg ? '-' : '';
    return `${sign}${symbol}${formattedNum}${suffix}`;
  };

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
        lossCount: 0,
      };
    }

    let totalPnl = 0;
    let winCount = 0;
    let lossCount = 0;
    let totalWinsPnl = 0;
    let totalLossesPnl = 0;
    let totalRrRatioSum = 0;
    let validRrCount = 0;
    let rollingBalance = initialCapital;
    let peak = rollingBalance;
    let maxDdUSD = 0;

    const sortedTrades = [...trades].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return dateTimeA - dateTimeB;
    });

    sortedTrades.forEach((trade) => {
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

      if (trade.entryPrice && trade.sl && trade.tp) {
        const risk = Math.abs(trade.entryPrice - trade.sl);
        const reward = Math.abs(trade.tp - trade.entryPrice);
        if (risk > 0) {
          totalRrRatioSum += reward / risk;
          validRrCount++;
        }
      }
    });

    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const profitFactor = totalLossesPnl > 0 ? totalWinsPnl / totalLossesPnl : totalWinsPnl > 0 ? 99.9 : 0;
    const riskRewardRatio = validRrCount > 0 ? totalRrRatioSum / validRrCount : 0;
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
      lossCount,
    };
  }, [trades, initialCapital]);

  const activePlans = React.useMemo(() => plans.filter((plan) => plan.status === 'ACTIVE'), [plans]);

  const recentTrades = React.useMemo(
    () =>
      [...trades]
        .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime())
        .slice(0, 4),
    [trades],
  );

  return (
    <div className="space-y-10" id="dashboard-tab">
      <section className="clay-surface relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#DB2777]/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-10 hidden h-28 w-28 rounded-full bg-[#0EA5E9]/20 blur-2xl sm:block" />
        <div className="relative max-w-4xl space-y-5">
          <span className="clay-pill bg-white/80 text-clay-accent">
            <Sparkles size={14} className="fill-clay-accent stroke-[3px]" />
            Live Command Board
          </span>
          <div className="space-y-3">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-clay-foreground">
              Active Execution Workspace
            </h1>
            <p className="max-w-2xl text-base sm:text-lg font-medium leading-relaxed text-clay-muted">
              Plan the session, log clean executions, and keep your trade data feeling calm, tactile, and easy to scan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button id="btn-nav-journal" onClick={() => onNavigate('plans')} className="clay-button clay-button-secondary px-5 py-2 text-sm">
              Manage Setup Plans
              <ArrowRight size={16} className="stroke-[3px]" />
            </button>
            <button id="btn-log-trade-banner" onClick={onOpenNewTrade} className="clay-button clay-button-primary px-5 py-2 text-sm">
              <PlusCircle size={17} className="stroke-[3px]" />
              Log Executed Trade
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Total Net Profit"
          value={formatValue(metrics.totalPnl, { showSign: true })}
          note={
            <>
              Initial capital <span className="font-black text-clay-foreground">{formatValue(initialCapital, { decimals: 0 })}</span>
            </>
          }
          icon={metrics.totalPnl >= 0 ? TrendingUp : TrendingDown}
          gradient={metrics.totalPnl >= 0 ? 'from-emerald-300 to-emerald-500' : 'from-pink-400 to-[#DB2777]'}
        />
        <MetricCard
          label="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          note={
            <span className="flex justify-between gap-3">
              <span>Wins {metrics.winCount}</span>
              <span>Losses {metrics.lossCount}</span>
            </span>
          }
          icon={Percent}
          gradient="from-sky-300 to-[#0EA5E9]"
        />
        <MetricCard
          label="Profit Factor"
          value={metrics.profitFactor === 99.9 ? 'INF' : metrics.profitFactor.toFixed(2)}
          note="Gross gains divided by gross losses."
          icon={Award}
          gradient="from-violet-300 to-[#7C3AED]"
        />
        <MetricCard
          label="Avg Planned R:R"
          value={`1:${metrics.riskRewardRatio.toFixed(2)}`}
          note="Average target size against stop size."
          icon={Layers}
          gradient="from-amber-300 to-[#F59E0B]"
        />
        <MetricCard
          label="Max Drawdown"
          value={`${metrics.maxDrawdown.toFixed(2)}%`}
          note="Peak-to-trough risk pressure."
          icon={ShieldAlert}
          gradient="from-rose-300 to-rose-500"
        />
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-5">
          <SectionTitle
            icon={Clock}
            title="Active Setup Plans"
            action={
              <button id="btn-go-plans" onClick={() => onNavigate('plans')} className="clay-button clay-button-secondary min-h-0 px-4 py-2 text-xs">
                All Plans ({plans.length})
                <ArrowRight size={14} className="stroke-[3px]" />
              </button>
            }
          />

          {activePlans.length === 0 ? (
            <div className="clay-surface bg-white/70 p-8 text-center">
              <p className="mb-4 font-display text-lg font-black text-clay-foreground">No active plans for today.</p>
              <button onClick={() => onNavigate('plans')} className="clay-button clay-button-pink px-4 py-2 text-xs">
                Create Standard Setup Plan
                <ArrowRight size={14} className="stroke-[3px]" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {activePlans.map((plan) => (
                <article key={plan.id} className="clay-card p-5 space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="clay-pill bg-white/90 font-mono text-clay-accent">{plan.asset}</span>
                      <BiasBadge value={plan.bias} />
                    </div>
                    <span className="clay-pill bg-white/80 font-mono text-clay-muted">{plan.date}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      ['4HR Chart', plan.fourHour.bias],
                      ['1HR Chart', plan.oneHour.bias],
                      ['15m Chart', plan.fifteenMin.bias],
                    ].map(([label, bias]) => (
                      <div key={label} className="clay-pressed p-4 text-xs">
                        <div className="font-bold uppercase tracking-wide text-clay-muted">{label}</div>
                        <div className="mt-1 font-display text-base font-black text-clay-foreground">{bias}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="font-display font-black text-clay-foreground">Triggers</p>
                    <p className="font-medium leading-relaxed text-clay-muted">{plan.triggers}</p>
                  </div>

                  <div className="clay-pressed p-4 text-xs">
                    <p className="mb-1 font-bold uppercase tracking-wide text-clay-accent">Macro Notes / News</p>
                    <p className="font-medium leading-relaxed text-clay-muted">{plan.macroNotes}</p>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button onClick={() => onExecutePlan(plan)} className="clay-button clay-button-primary px-4 py-2 text-xs">
                      <Play size={14} fill="white" className="stroke-[3px]" />
                      Execute Setup Plan
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-5">
          <SectionTitle
            icon={CalendarDays}
            title="Recent Trades"
            action={
              <button id="btn-go-journal" onClick={() => onNavigate('journal')} className="clay-button clay-button-secondary min-h-0 px-4 py-2 text-xs">
                Full Journal
                <ArrowRight size={14} className="stroke-[3px]" />
              </button>
            }
          />

          <div className="clay-surface overflow-hidden bg-white/70">
            {recentTrades.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-clay-muted">No trades logged yet. Start execution tracking.</div>
            ) : (
              recentTrades.map((trade, index) => (
                <div key={trade.id} className={`flex items-center justify-between gap-4 p-4 ${index > 0 ? 'border-t border-white/70' : ''}`}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-clay-foreground">{trade.asset}</span>
                      <span className={`clay-pill ${trade.direction === 'BUY' ? 'bg-gradient-to-br from-emerald-300 to-emerald-500 text-white' : 'bg-gradient-to-br from-pink-400 to-[#DB2777] text-white'}`}>
                        {trade.direction}
                      </span>
                      {trade.journalingStatus === 'COMPLETE' ? (
                        <span className="clay-pill bg-purple-100 text-purple-700 text-3xs font-extrabold">
                          Complete ({trade.checklistScore ?? 0}/{trade.maxChecklistScore ?? 8})
                        </span>
                      ) : (
                        <span className="clay-pill bg-amber-100 text-amber-700 text-3xs font-extrabold">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-clay-muted">
                      <span>{trade.date}</span>
                      <span className="text-clay-accent">/</span>
                      <span>{trade.setup}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <div className="font-display text-sm font-black text-clay-foreground">{formatValue(trade.pnl, { showSign: true, decimals: 0 })}</div>
                    <div className="clay-pill bg-white/80 text-3xs uppercase text-clay-muted">{trade.session}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="clay-surface bg-white/70 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-clay-muted">
              <span className="flex items-center gap-2">
                <Zap size={16} className="fill-clay-warning text-clay-warning stroke-[3px]" />
                Win Ratio Metric
              </span>
              <span>
                {metrics.winRate.toFixed(0)}% ({metrics.winCount}/{metrics.totalTrades})
              </span>
            </div>
            <div className="clay-pressed flex h-5 w-full overflow-hidden p-0.5">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500 transition-all duration-200" style={{ width: `${metrics.winRate}%` }} />
              <div className="h-full rounded-full bg-gradient-to-r from-pink-300 to-[#DB2777] transition-all duration-200" style={{ width: `${100 - metrics.winRate}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold text-clay-muted">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-clayButton" />
                Wins
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-pink-500 shadow-clayButton" />
                Losses
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
