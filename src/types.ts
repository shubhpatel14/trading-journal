export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  initialBalance: number;
  currency: string;
  commissionPerLot?: number; // Fee structure per lot ($/lot, e.g. 7.00)
  isActive?: boolean;
}

export interface TimeframeAnalysis {
  text: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  imageUrl?: string;
}

export interface TradePlan {
  id: string;
  date: string; // YYYY-MM-DD
  asset: string; // e.g., XAUUSD (Gold)
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  fourHour: TimeframeAnalysis;
  oneHour: TimeframeAnalysis;
  fifteenMin: TimeframeAnalysis;
  fiveMin: TimeframeAnalysis; // Added 5M structural context
  macroNotes: string; // inflation CPI, geopolitical risk, etc.
  triggers: string; // BoS, EMA rejection, etc.
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
}

export interface JournalRule {
  id: string;
  label: string;
  description?: string;
  weight?: number;
}

export interface Trade {
  id: string;
  accountId: string; // Associated trading account ID
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  asset: string;
  setup: string; // Setup name, e.g., "BoS Downside"
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  size: number; // Contracts/Lots
  sl: number; // Stop Loss
  tp: number; // Take Profit
  pnl: number; // Gross Profit and Loss in USD
  commission?: number; // USD trading commission
  swap?: number; // USD overnight financing fee
  fee?: number; // USD spread/additional fees
  status: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN';
  session: 'LONDON' | 'NEW YORK' | 'ASIA';
  mistakes: string[]; // e.g., "FOMO", "Overtrading", "Left Early", "None"
  notes: string;
  htfScreenshot?: string; // High Timeframe Screenshot
  ltfScreenshot?: string; // Low Timeframe Screenshot
  checklist?: Record<string, boolean>; // Map of rule ID to boolean checked state
  checklistScore?: number; // Number of rules met (score)
  maxChecklistScore?: number; // Total number of rules applicable
  journalingStatus?: 'COMPLETE' | 'PENDING'; // Status showing if trade journaling/checklist is complete
}

export function getTradeCommission(size: number, commissionOverride?: number, accountRate: number = 7): number {
  if (commissionOverride !== undefined && !isNaN(commissionOverride)) {
    return Math.abs(commissionOverride);
  }
  return Math.round((size || 0) * accountRate * 100) / 100;
}

export function getTradeTotalFees(trade: Partial<Trade>, defaultRate: number = 7): number {
  const size = trade.size || 0;
  const comm = trade.commission !== undefined ? Math.abs(trade.commission) : size * defaultRate;
  const swap = Math.abs(trade.swap || 0);
  const fee = Math.abs(trade.fee || 0);
  return Math.round((comm + swap + fee) * 100) / 100;
}

export function getTradeNetPnl(trade: Trade, defaultRate: number = 7): number {
  const fees = getTradeTotalFees(trade, defaultRate);
  return Math.round(((trade.pnl || 0) - fees) * 100) / 100;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  riskRewardRatio: number;
  maxDrawdown: number;
  totalPnl: number;
  totalFees?: number;
  grossPnl?: number;
  avgWin: number;
  avgLoss: number;
  winCount: number;
  lossCount: number;
}

export interface DailyReview {
  id: string;
  date: string; // YYYY-MM-DD
  rating: number; // 1 to 5 stars
  ruleAdherence: 'FULL' | 'PARTIAL' | 'VIOLATED';
  whatWentWell: string;
  improvementsNeeded: string;
  mistakesAnalyzed: string[];
  actionItems: string;
  chartScreenshot?: string;
  createdAt: string;
}

export interface WeeklyReview {
  id: string;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  keyLessons: string;
  focusGoalsNextWeek: string;
  topMistakes: string[];
  weeklyNotes: string;
  weeklyScreenshot?: string;
  createdAt: string;
}


