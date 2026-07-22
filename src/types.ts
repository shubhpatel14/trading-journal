export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  initialBalance: number;
  currency: string;
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
  pnl: number; // Profit and Loss in USD
  status: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN';
  session: 'LONDON' | 'NEW YORK' | 'ASIA';
  mistakes: string[]; // e.g., "FOMO", "Overtrading", "Left Early", "None"
  notes: string;
  htfScreenshot?: string; // High Timeframe Screenshot
  ltfScreenshot?: string; // Low Timeframe Screenshot
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  riskRewardRatio: number;
  maxDrawdown: number;
  totalPnl: number;
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

