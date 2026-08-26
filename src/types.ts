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
  setupId?: string; // Optional link to a reusable Setup Playbook
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

export type SetupStatus = 'ACTIVE' | 'ARCHIVED';

/**
 * A reusable execution playbook. The id is deliberately stored on trades and
 * plans so that historical performance remains connected even if its name is
 * edited later.
 */
export interface SetupDefinition {
  id: string;
  name: string;
  description: string;
  preferredAssets: string[];
  preferredSessions: Array<'LONDON' | 'NEW YORK' | 'ASIA'>;
  direction: 'BUY' | 'SELL' | 'BOTH';
  marketConditions: string;
  entryRules: string[];
  invalidationRules: string[];
  managementRules: string[];
  tags: string[];
  minChecklistScore?: number;
  riskPerTrade?: number;
  maxTradesPerDay?: number;
  status: SetupStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  accountId: string; // Associated trading account ID
  setupId?: string; // Stable link to a SetupDefinition when one was selected
  setupRuleSnapshot?: string[]; // Playbook rules at the time this trade was logged
  /**
   * Per-playbook rule answers are kept separately from the general journal
   * checklist.  The numeric values make historical setup adherence measurable
   * even after the playbook itself is edited.
   */
  setupRuleChecks?: Record<string, boolean>;
  setupRuleScore?: number;
  setupRuleMaxScore?: number;
  setupMinChecklistScore?: number;
  setupMaxTradesPerDay?: number;
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

export interface DisciplinePreset {
  id: string;
  label: string;
  durationMinutes: number;
}

export interface DisciplineEmotionLevel {
  id: string;
  label: string;
  score: number; // 0 to 100
  color: string;
  warningMsg?: string;
}

export interface DisciplineScoreWeight {
  id: string;
  name: string;
  weight: number; // percentage e.g. 25
  key: string;
}

export interface DisciplineWarningRule {
  id: string;
  level: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  name: string;
  minScore: number;
  maxScore: number;
  message: string;
  description: string;
  icon: string;
  color: string;
}

export interface CustomDisciplineMetric {
  id: string;
  name: string;
  maxScore: number;
  warningThreshold: number;
  warningMsg: string;
  description?: string;
  defaultValue?: number;
}

export interface DisciplineSettings {
  session: {
    durationSeconds: number;
    presets: DisciplinePreset[];
  };
  loss: {
    currencySymbol: string;
    minLoss: number;
    maxLoss: number;
    stepSize: number;
    currentLoss: number;
    dailyLossLimit: number;
    warningThresholdPercent: number;
    criticalThresholdPercent: number;
    labels: string[];
  };
  tradeCount: {
    minTrades: number;
    maxTrades: number;
    stepSize: number;
    currentTradeCount: number;
    plannedMaxTrades: number;
    warningThreshold: number;
    criticalThreshold: number;
    labels: string[];
    exceededWarningMessage: string;
  };
  emotion: {
    minScore: number;
    maxScore: number;
    currentScore: number;
    levels: DisciplineEmotionLevel[];
    warningThreshold: number;
    criticalThreshold: number;
  };
  scoreWeights: DisciplineScoreWeight[];
  thresholds: {
    lossWarning: number;
    lossCritical: number;
    tradeWarning: number;
    tradeCritical: number;
    emotionWarning: number;
    emotionCritical: number;
    goodDisciplineMin: number;
    cautionDisciplineMin: number;
    warningDisciplineMin: number;
    criticalDisciplineMax: number;
  };
  warnings: DisciplineWarningRule[];
  customMetrics: CustomDisciplineMetric[];
  appearance: {
    layout: 'compact' | 'expanded';
    showMetrics: boolean;
    showWarnings: boolean;
    calendarView: 'month' | 'grid';
  };
}

export interface DisciplineViolation {
  id: string;
  date: string;
  time: string;
  violationName: string;
  currentValue: string | number;
  threshold: string | number;
  pnl: number;
  notes: string;
  severity: 'CAUTION' | 'WARNING' | 'CRITICAL';
}

export interface DailyDisciplineRecord {
  id: string;
  date: string;
  disciplineScore: number;
  pnl: number;
  tradeCount: number;
  emotionScore: number;
  warningStatus: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  categoryScores: Record<string, number>;
  customMetricScores: Record<string, number>;
  violations: DisciplineViolation[];
  notes?: string;
  createdAt: string;
}



