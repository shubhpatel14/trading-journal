import { Trade, PerformanceMetrics, getTradeNetPnl } from '../types';

export interface ForgeScores {
  winRateScore: number;
  profitFactorScore: number;
  avgWinLossScore: number;
  recoveryFactorScore: number;
  maxDrawdownScore: number;
  consistencyScore: number;
}

export interface ForgeMetricsRaw {
  winRate: number; // percentage, e.g. 58.3
  profitFactor: number; // e.g. 1.82
  avgWinLossRatio: number; // e.g. 1.75
  recoveryFactor: number; // e.g. 2.40
  maxDrawdownPct: number; // percentage, e.g. 6.5
  consistencyPct: number; // percentage 0-100
}

export interface ForgeScoreResult {
  overallScore: number;
  scores: ForgeScores;
  raw: ForgeMetricsRaw;
  tier: {
    label: 'Critical' | 'Weak' | 'Developing' | 'Strong' | 'Excellent' | 'Elite';
    color: string;
    badgeBg: string;
    gradient: string;
  };
}

/**
 * Helper to interpolate linearly between ranges
 */
function interpolate(
  val: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (val <= inMin) return outMin;
  if (val >= inMax) return outMax;
  const ratio = (val - inMin) / (inMax - inMin);
  return outMin + ratio * (outMax - outMin);
}

/**
 * 1. WIN RATE SCORE
 * - < 30% = 0–10
 * - 30–40% = 20–35
 * - 40–50% = 35–50
 * - 50–60% = 50–70
 * - 60–70% = 70–85
 * - 70–80% = 85–95
 * - >80% = 95–100
 */
export function calculateWinRateScore(winRate: number): number {
  if (winRate < 30) return interpolate(winRate, 0, 30, 0, 10);
  if (winRate < 40) return interpolate(winRate, 30, 40, 20, 35);
  if (winRate < 50) return interpolate(winRate, 40, 50, 35, 50);
  if (winRate < 60) return interpolate(winRate, 50, 60, 50, 70);
  if (winRate < 70) return interpolate(winRate, 60, 70, 70, 85);
  if (winRate < 80) return interpolate(winRate, 70, 80, 85, 95);
  return interpolate(winRate, 80, 100, 95, 100);
}

/**
 * 2. PROFIT FACTOR SCORE
 * - PF < 0.75 → 0
 * - PF 0.75–1.00 → 10–25
 * - PF 1.00–1.25 → 25–45
 * - PF 1.25–1.50 → 45–65
 * - PF 1.50–2.00 → 65–85
 * - PF 2.00–2.50 → 85–95
 * - PF > 2.50 → 95–100
 */
export function calculateProfitFactorScore(pf: number): number {
  if (pf < 0.75) return interpolate(pf, 0, 0.75, 0, 10);
  if (pf < 1.0) return interpolate(pf, 0.75, 1.0, 10, 25);
  if (pf < 1.25) return interpolate(pf, 1.0, 1.25, 25, 45);
  if (pf < 1.5) return interpolate(pf, 1.25, 1.5, 45, 65);
  if (pf < 2.0) return interpolate(pf, 1.5, 2.0, 65, 85);
  if (pf < 2.5) return interpolate(pf, 2.0, 2.5, 85, 95);
  return interpolate(pf, 2.5, 4.0, 95, 100);
}

/**
 * 3. AVG WIN/LOSS SCORE
 * - < 0.75 → 0–15
 * - 0.75–1.00 → 15–30
 * - 1.00–1.25 → 30–50
 * - 1.25–1.50 → 50–65
 * - 1.50–2.00 → 65–85
 * - 2.00–3.00 → 85–95
 * - > 3.00 → 95–100
 */
export function calculateAvgWinLossScore(ratio: number): number {
  if (ratio < 0.75) return interpolate(ratio, 0, 0.75, 0, 15);
  if (ratio < 1.0) return interpolate(ratio, 0.75, 1.0, 15, 30);
  if (ratio < 1.25) return interpolate(ratio, 1.0, 1.25, 30, 50);
  if (ratio < 1.5) return interpolate(ratio, 1.25, 1.5, 50, 65);
  if (ratio < 2.0) return interpolate(ratio, 1.5, 2.0, 65, 85);
  if (ratio < 3.0) return interpolate(ratio, 2.0, 3.0, 85, 95);
  return interpolate(ratio, 3.0, 5.0, 95, 100);
}

/**
 * 4. RECOVERY FACTOR SCORE
 * - < 0 → 0
 * - 0–0.5 → 10–25
 * - 0.5–1.0 → 25–40
 * - 1.0–1.5 → 40–55
 * - 1.5–2.0 → 55–70
 * - 2.0–3.0 → 70–85
 * - 3.0–5.0 → 85–95
 * - > 5.0 → 95–100
 */
export function calculateRecoveryFactorScore(recFactor: number): number {
  if (recFactor <= 0) return 0;
  if (recFactor < 0.5) return interpolate(recFactor, 0, 0.5, 10, 25);
  if (recFactor < 1.0) return interpolate(recFactor, 0.5, 1.0, 25, 40);
  if (recFactor < 1.5) return interpolate(recFactor, 1.0, 1.5, 40, 55);
  if (recFactor < 2.0) return interpolate(recFactor, 1.5, 2.0, 55, 70);
  if (recFactor < 3.0) return interpolate(recFactor, 2.0, 3.0, 70, 85);
  if (recFactor < 5.0) return interpolate(recFactor, 3.0, 5.0, 85, 95);
  return interpolate(recFactor, 5.0, 8.0, 95, 100);
}

/**
 * 5. MAX DRAWDOWN SCORE (Inverse)
 * - 0–2% DD → 95–100
 * - 2–4% → 85–95
 * - 4–6% → 70–85
 * - 6–10% → 50–70
 * - 10–15% → 25–50
 * - 15–20% → 10–25
 * - > 20% → 0–10
 */
export function calculateDrawdownScore(maxDdPct: number): number {
  if (maxDdPct <= 2) return interpolate(maxDdPct, 0, 2, 100, 95);
  if (maxDdPct <= 4) return interpolate(maxDdPct, 2, 4, 95, 85);
  if (maxDdPct <= 6) return interpolate(maxDdPct, 4, 6, 85, 70);
  if (maxDdPct <= 10) return interpolate(maxDdPct, 6, 10, 70, 50);
  if (maxDdPct <= 15) return interpolate(maxDdPct, 10, 15, 50, 25);
  if (maxDdPct <= 20) return interpolate(maxDdPct, 15, 20, 25, 10);
  return interpolate(maxDdPct, 20, 35, 10, 0);
}

/**
 * 6. CONSISTENCY SCORE
 * - 40% Profitable Trading Days
 * - 25% Equity curve stability
 * - 20% Return volatility
 * - 15% Losing streak control
 */
export function calculateConsistencyScore(trades: Trade[]): number {
  if (trades.length === 0) return 50;

  // Group by date to analyze daily PnL
  const pnlByDate: Record<string, number> = {};
  let totalChecklistRatio = 0;
  let checklistCount = 0;

  trades.forEach((t) => {
    const net = getTradeNetPnl(t);
    pnlByDate[t.date] = (pnlByDate[t.date] || 0) + net;
    if (t.journalingStatus === 'COMPLETE' && t.maxChecklistScore && t.maxChecklistScore > 0) {
      totalChecklistRatio += (t.checklistScore || 0) / t.maxChecklistScore;
      checklistCount++;
    }
  });

  const dailyPnls = Object.values(pnlByDate);
  const totalDays = dailyPnls.length;
  if (totalDays === 0) return 50;

  // 1) Profitable trading days % (40%)
  const winningDays = dailyPnls.filter((p) => p > 0).length;
  const winDayPct = (winningDays / totalDays) * 100;
  const winDayScore = Math.min(100, Math.max(0, winDayPct * 1.25));

  // 2) Equity curve stability / checklist discipline (25%)
  const avgChecklistScore = checklistCount > 0 ? (totalChecklistRatio / checklistCount) * 100 : 70;

  // 3) Return volatility / Std Dev ratio (20%)
  const avgPnl = dailyPnls.reduce((a, b) => a + b, 0) / totalDays;
  const variance = dailyPnls.reduce((sum, p) => sum + Math.pow(p - avgPnl, 2), 0) / totalDays;
  const stdDev = Math.sqrt(variance);
  const cv = avgPnl > 0 ? stdDev / avgPnl : 2.5; // lower is better
  const volScore = Math.min(100, Math.max(0, 100 - cv * 25));

  // 4) Losing streak control (15%)
  let maxLosingStreak = 0;
  let currentStreak = 0;
  const sorted = [...trades].sort(
    (a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime()
  );

  sorted.forEach((t) => {
    const net = getTradeNetPnl(t);
    if (net < 0) {
      currentStreak++;
      if (currentStreak > maxLosingStreak) maxLosingStreak = currentStreak;
    } else if (net > 0) {
      currentStreak = 0;
    }
  });

  const streakScore = Math.max(0, 100 - maxLosingStreak * 18);

  const weightedConsistency =
    winDayScore * 0.4 + avgChecklistScore * 0.25 + volScore * 0.2 + streakScore * 0.15;

  return Math.min(100, Math.max(0, Math.round(weightedConsistency)));
}

/**
 * FORGE SCORE TIER EVALUATION
 * 0–20   → Critical
 * 21–40  → Weak
 * 41–60  → Developing
 * 61–75  → Strong
 * 76–90  → Excellent
 * 91–100 → Elite
 */
export function getScoreTier(score: number) {
  if (score <= 20) {
    return {
      label: 'Critical' as const,
      color: '#EF4444',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      gradient: 'from-rose-500 to-rose-600',
    };
  }
  if (score <= 40) {
    return {
      label: 'Weak' as const,
      color: '#F97316',
      badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
      gradient: 'from-orange-500 to-amber-600',
    };
  }
  if (score <= 60) {
    return {
      label: 'Developing' as const,
      color: '#EAB308',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      gradient: 'from-amber-500 to-yellow-600',
    };
  }
  if (score <= 75) {
    return {
      label: 'Strong' as const,
      color: '#10B981',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      gradient: 'from-emerald-500 to-teal-600',
    };
  }
  if (score <= 90) {
    return {
      label: 'Excellent' as const,
      color: '#8B5CF6',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      gradient: 'from-purple-500 to-indigo-600',
    };
  }
  return {
    label: 'Elite' as const,
    color: '#7C3AED',
    badgeBg: 'bg-violet-100 text-violet-800 border-violet-300 font-extrabold',
    gradient: 'from-violet-600 via-purple-600 to-indigo-600',
  };
}

/**
 * MAIN FORGE SCORE ENGINE COMPUTATION
 */
export function computeForgeScore(trades: Trade[], metrics: PerformanceMetrics): ForgeScoreResult {
  if (trades.length === 0) {
    return {
      overallScore: 0,
      scores: {
        winRateScore: 0,
        profitFactorScore: 0,
        avgWinLossScore: 0,
        recoveryFactorScore: 0,
        maxDrawdownScore: 100,
        consistencyScore: 50,
      },
      raw: {
        winRate: 0,
        profitFactor: 0,
        avgWinLossRatio: 0,
        recoveryFactor: 0,
        maxDrawdownPct: 0,
        consistencyPct: 50,
      },
      tier: getScoreTier(0),
    };
  }

  // 1. Win Rate
  const winRate = metrics.winRate;
  const winRateScore = calculateWinRateScore(winRate);

  // 2. Profit Factor
  const profitFactor = metrics.profitFactor === 99.9 ? 3.5 : metrics.profitFactor;
  const profitFactorScore = calculateProfitFactorScore(profitFactor);

  // 3. Avg Win / Loss
  const avgWinLossRatio =
    metrics.avgLoss > 0
      ? metrics.avgWin / metrics.avgLoss
      : metrics.avgWin > 0
      ? 3.5
      : 0;
  const avgWinLossScore = calculateAvgWinLossScore(avgWinLossRatio);

  // 4. Recovery Factor
  let maxDdUSD = 0;
  let rolling = 100000;
  let peak = rolling;
  const sorted = [...trades].sort(
    (a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime()
  );
  sorted.forEach((t) => {
    rolling += getTradeNetPnl(t);
    if (rolling > peak) peak = rolling;
    const dd = peak - rolling;
    if (dd > maxDdUSD) maxDdUSD = dd;
  });

  const recoveryFactor =
    maxDdUSD > 0
      ? metrics.totalPnl / maxDdUSD
      : metrics.totalPnl > 0
      ? 4.5
      : 0;
  const recoveryFactorScore = calculateRecoveryFactorScore(recoveryFactor);

  // 5. Max Drawdown
  const maxDrawdownPct = metrics.maxDrawdown;
  const maxDrawdownScore = calculateDrawdownScore(maxDrawdownPct);

  // 6. Consistency
  const consistencyScore = calculateConsistencyScore(trades);

  // Weighted Sum Formula:
  // Win %: 15%
  // Profit Factor: 25%
  // Avg Win/Loss: 15%
  // Recovery Factor: 15%
  // Max Drawdown: 15%
  // Consistency: 15%
  const weightedSum =
    winRateScore * 0.15 +
    profitFactorScore * 0.25 +
    avgWinLossScore * 0.15 +
    recoveryFactorScore * 0.15 +
    maxDrawdownScore * 0.15 +
    consistencyScore * 0.15;

  const overallScore = Math.min(100, Math.max(0, Math.round(weightedSum)));

  return {
    overallScore,
    scores: {
      winRateScore: Math.round(winRateScore),
      profitFactorScore: Math.round(profitFactorScore),
      avgWinLossScore: Math.round(avgWinLossScore),
      recoveryFactorScore: Math.round(recoveryFactorScore),
      maxDrawdownScore: Math.round(maxDrawdownScore),
      consistencyScore: Math.round(consistencyScore),
    },
    raw: {
      winRate,
      profitFactor,
      avgWinLossRatio,
      recoveryFactor,
      maxDrawdownPct,
      consistencyPct: consistencyScore,
    },
    tier: getScoreTier(overallScore),
  };
}
