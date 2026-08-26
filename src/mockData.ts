import { Trade, TradePlan, TradingAccount, JournalRule, DisciplineSettings, DailyDisciplineRecord, DisciplineViolation, SetupDefinition } from './types';

export const DEFAULT_DISCIPLINE_SETTINGS: DisciplineSettings = {
  session: {
    durationSeconds: 1800,
    presets: [
      { id: 'p0', label: '5m Cool-Down', durationMinutes: 5 },
      { id: 'p1', label: '15m Cool-Down', durationMinutes: 15 },
      { id: 'p2', label: '30m Session', durationMinutes: 30 },
      { id: 'p3', label: '60m Session', durationMinutes: 60 },
      { id: 'p4', label: '90m Session', durationMinutes: 90 },
      { id: 'p5', label: '120m Session', durationMinutes: 120 }
    ]
  },
  loss: {
    currencySymbol: '$',
    minLoss: 0,
    maxLoss: 100,
    stepSize: 1,
    currentLoss: 0,
    dailyLossLimit: 50,
    warningThresholdPercent: 50,
    criticalThresholdPercent: 75,
    labels: ['$0', '$25', '$50', '$75', '$100']
  },
  tradeCount: {
    minTrades: 0,
    maxTrades: 10,
    stepSize: 1,
    currentTradeCount: 0,
    plannedMaxTrades: 10,
    warningThreshold: 6,
    criticalThreshold: 10,
    labels: ['0', '2', '4', '6', '8', '10'],
    exceededWarningMessage: 'TRADE FREQUENCY WARNING — REVIEW YOUR PLAN.'
  },
  emotion: {
    minScore: 0,
    maxScore: 100,
    currentScore: 50,
    warningThreshold: 60,
    criticalThreshold: 75,
    levels: [
      { id: 'e1', label: 'FEAR', score: 15, color: '#3b82f6', warningMsg: 'Overly hesitant. Trust your rules.' },
      { id: 'e2', label: 'ANXIOUS', score: 35, color: '#06b6d4', warningMsg: 'Heightened stress. Slow down execution.' },
      { id: 'e3', label: 'CALM', score: 50, color: '#10b981', warningMsg: 'Balanced mindset.' },
      { id: 'e4', label: 'NEUTRAL', score: 60, color: '#8b5cf6', warningMsg: 'Optimal objective state.' },
      { id: 'e5', label: 'CONFIDENT', score: 70, color: '#f59e0b', warningMsg: 'Focused execution.' },
      { id: 'e6', label: 'AGGRESSIVE', score: 85, color: '#f97316', warningMsg: 'High intensity! Guard against impulse trades.' },
      { id: 'e7', label: 'OVERTRADING', score: 98, color: '#ef4444', warningMsg: 'HIGH RISK OF OVERTRADING — CONSIDER STOPPING.' }
    ]
  },
  scoreWeights: [
    { id: 'w1', name: 'Loss Control', weight: 25, key: 'lossControl' },
    { id: 'w2', name: 'Trade Frequency', weight: 20, key: 'tradeFrequency' },
    { id: 'w3', name: 'Emotional Control', weight: 25, key: 'emotionalControl' },
    { id: 'w4', name: 'Rule Compliance', weight: 20, key: 'ruleCompliance' },
    { id: 'w5', name: 'Session Discipline', weight: 10, key: 'sessionDiscipline' }
  ],
  thresholds: {
    lossWarning: 25,
    lossCritical: 50,
    tradeWarning: 6,
    tradeCritical: 10,
    emotionWarning: 60,
    emotionCritical: 75,
    goodDisciplineMin: 80,
    cautionDisciplineMin: 60,
    warningDisciplineMin: 40,
    criticalDisciplineMax: 39
  },
  warnings: [
    {
      id: 'warn-1',
      level: 'SAFE',
      name: 'Safe',
      minScore: 80,
      maxScore: 100,
      message: 'YOU ARE WITHIN YOUR PLANNED LIMITS.',
      description: 'Execution parameters align with your pre-defined trading plan.',
      icon: 'CheckCircle2',
      color: '#10b981'
    },
    {
      id: 'warn-2',
      level: 'CAUTION',
      name: 'Caution',
      minScore: 60,
      maxScore: 79,
      message: 'SLOW DOWN — TRADING ACTIVITY IS INCREASING.',
      description: 'Trade frequency or drawdown levels are approaching warning zones.',
      icon: 'AlertTriangle',
      color: '#f59e0b'
    },
    {
      id: 'warn-3',
      level: 'WARNING',
      name: 'Warning',
      minScore: 40,
      maxScore: 59,
      message: 'DISCIPLINE WARNING — REVIEW YOUR RULES.',
      description: 'Loss limit or trade frequency threshold breached. Review plan immediately.',
      icon: 'ShieldAlert',
      color: '#f97316'
    },
    {
      id: 'warn-4',
      level: 'CRITICAL',
      name: 'Critical',
      minScore: 0,
      maxScore: 39,
      message: 'HIGH RISK OF OVERTRADING — CONSIDER STOPPING.',
      description: 'Multiple thresholds exceeded. High emotional bias detected.',
      icon: 'XCircle',
      color: '#ef4444'
    }
  ],
  customMetrics: [
    {
      id: 'cm-1',
      name: 'Revenge Trading',
      maxScore: 100,
      warningThreshold: 70,
      warningMsg: 'You may be revenge trading after a recent loss.',
      description: 'Taking impulsive positions to win back lost PnL.',
      defaultValue: 20
    },
    {
      id: 'cm-2',
      name: 'FOMO Entry',
      maxScore: 100,
      warningThreshold: 65,
      warningMsg: 'Entering late without structural confirmation.',
      description: 'Fear of missing out on sudden market momentum.',
      defaultValue: 15
    },
    {
      id: 'cm-3',
      name: 'Moving Stop Loss',
      maxScore: 100,
      warningThreshold: 50,
      warningMsg: 'Widen or shift stop loss during active trade.',
      description: 'Modifying stop loss away from planned invalidate point.',
      defaultValue: 0
    }
  ],
  appearance: {
    layout: 'expanded',
    showMetrics: true,
    showWarnings: true,
    calendarView: 'month'
  }
};

export const INITIAL_DISCIPLINE_VIOLATIONS: DisciplineViolation[] = [
  {
    id: 'v-1',
    date: '2026-08-18',
    time: '14:45',
    violationName: 'Trade Frequency Warning',
    currentValue: '7 trades',
    threshold: '6 trades',
    pnl: -214,
    notes: 'Exceeded warning threshold of 6 trades during New York open session.',
    severity: 'WARNING'
  },
  {
    id: 'v-2',
    date: '2026-08-15',
    time: '16:10',
    violationName: 'Revenge Trading Metric Spike',
    currentValue: '78 / 100',
    threshold: '70 / 100',
    pnl: -450,
    notes: 'Entered immediate counter-trade 3 minutes after stopping out on Gold.',
    severity: 'CRITICAL'
  },
  {
    id: 'v-3',
    date: '2026-08-12',
    time: '10:20',
    violationName: 'Loss Limit Warning',
    currentValue: '$1,200',
    threshold: '$1,000',
    pnl: -1200,
    notes: 'Daily loss crossed 50% warning threshold.',
    severity: 'CAUTION'
  }
];

export const INITIAL_DISCIPLINE_RECORDS: DailyDisciplineRecord[] = [
  {
    id: 'dr-2026-08-18',
    date: '2026-08-18',
    disciplineScore: 82,
    pnl: 485,
    tradeCount: 3,
    emotionScore: 60,
    warningStatus: 'SAFE',
    categoryScores: {
      lossControl: 90,
      tradeFrequency: 85,
      emotionalControl: 80,
      ruleCompliance: 80,
      sessionDiscipline: 75
    },
    customMetricScores: {
      'cm-1': 10,
      'cm-2': 15,
      'cm-3': 0
    },
    violations: [],
    notes: 'Very disciplined execution during London session. Stuck to planned risk.',
    createdAt: '2026-08-18T18:00:00Z'
  },
  {
    id: 'dr-2026-08-17',
    date: '2026-08-17',
    disciplineScore: 38,
    pnl: -214,
    tradeCount: 14,
    emotionScore: 82,
    warningStatus: 'CRITICAL',
    categoryScores: {
      lossControl: 30,
      tradeFrequency: 25,
      emotionalControl: 40,
      ruleCompliance: 50,
      sessionDiscipline: 45
    },
    customMetricScores: {
      'cm-1': 80,
      'cm-2': 70,
      'cm-3': 60
    },
    violations: [
      {
        id: 'v-17-1',
        date: '2026-08-17',
        time: '15:20',
        violationName: 'Overtrading Breach',
        currentValue: '14 trades',
        threshold: '10 trades',
        pnl: -214,
        notes: 'Chased micro-moves after initial morning loss.',
        severity: 'CRITICAL'
      }
    ],
    notes: 'Chased Gold volatility after inflation numbers. Needs EOD review.',
    createdAt: '2026-08-17T20:00:00Z'
  },
  {
    id: 'dr-2026-08-16',
    date: '2026-08-16',
    disciplineScore: 92,
    pnl: 850,
    tradeCount: 2,
    emotionScore: 50,
    warningStatus: 'SAFE',
    categoryScores: {
      lossControl: 95,
      tradeFrequency: 95,
      emotionalControl: 90,
      ruleCompliance: 90,
      sessionDiscipline: 90
    },
    customMetricScores: {
      'cm-1': 0,
      'cm-2': 5,
      'cm-3': 0
    },
    violations: [],
    notes: 'A+ setup on XAUUSD. Took profits according to plan.',
    createdAt: '2026-08-16T17:00:00Z'
  },
  {
    id: 'dr-2026-08-15',
    date: '2026-08-15',
    disciplineScore: 68,
    pnl: -450,
    tradeCount: 6,
    emotionScore: 78,
    warningStatus: 'CAUTION',
    categoryScores: {
      lossControl: 70,
      tradeFrequency: 65,
      emotionalControl: 60,
      ruleCompliance: 75,
      sessionDiscipline: 70
    },
    customMetricScores: {
      'cm-1': 55,
      'cm-2': 40,
      'cm-3': 20
    },
    violations: [INITIAL_DISCIPLINE_VIOLATIONS[1]],
    notes: 'Emotional fatigue led to overleveraging on EURUSD.',
    createdAt: '2026-08-15T19:00:00Z'
  }
];


export const DEFAULT_JOURNAL_RULES: JournalRule[] = [
  { id: 'rule-1', label: 'Liquidity Swept', description: 'Price swept session high/low liquidity before entry' },
  { id: 'rule-2', label: 'Displacement Candle', description: 'Strong expansion/displacement candle in trade direction' },
  { id: 'rule-3', label: 'Clean EMA Reaction', description: 'Clean bounce or rejection off key EMA level' },
  { id: 'rule-4', label: 'EMA Separation', description: 'EMAs are nicely fanned out showing clear trend strength' },
  { id: 'rule-5', label: 'Support Resistance Confluence', description: 'Entry aligned with key HTF Support/Resistance level' },
  { id: 'rule-6', label: 'Trendline Confluence', description: 'Entry aligns with trendline touch or breakout retest' },
  { id: 'rule-7', label: 'Single Clean BOS', description: 'Clear single Break of Structure without market noise' },
  { id: 'rule-8', label: 'Distance to Target', description: 'Sufficient R:R distance to major target/liquidity pool' },
];

export const DEFAULT_SETUP_DEFINITIONS: SetupDefinition[] = [
  {
    id: 'setup-highs-rejection',
    name: 'Highs Rejection',
    description: 'A reversal playbook after a sweep of session or higher-timeframe highs, confirmed by bearish displacement and structure shift.',
    preferredAssets: ['XAUUSD', 'GBPUSD'],
    preferredSessions: ['LONDON', 'NEW YORK'],
    direction: 'SELL',
    marketConditions: 'Price reaches a marked premium / liquidity pool with room to the opposing draw on liquidity.',
    entryRules: ['Sweep of a marked high or liquidity pool', 'Bearish displacement or break of structure', 'Entry only after lower-timeframe confirmation'],
    invalidationRules: ['No displacement after the sweep', 'Close beyond the defined higher-timeframe invalidation level'],
    managementRules: ['Define stop before entry', 'Take partials only at planned liquidity targets', 'Do not re-enter after a news-driven invalidation'],
    tags: ['reversal', 'liquidity', 'structure'],
    minChecklistScore: 6,
    riskPerTrade: 0.5,
    maxTradesPerDay: 2,
    status: 'ACTIVE',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z'
  },
  {
    id: 'setup-bos-downside',
    name: 'BoS Downside',
    description: 'Trend-continuation short after a clean downside break of structure and retest.',
    preferredAssets: ['XAUUSD', 'EURUSD'],
    preferredSessions: ['LONDON', 'NEW YORK'],
    direction: 'SELL',
    marketConditions: 'Bearish higher-timeframe bias with a clear downside liquidity objective.',
    entryRules: ['Higher-timeframe bearish bias', 'Clean downside break of structure', 'Retest or lower-timeframe trigger with defined invalidation'],
    invalidationRules: ['Price reclaims the broken structure with acceptance', 'Entry would be directly into nearby opposing liquidity'],
    managementRules: ['Keep risk fixed', 'Move to break-even only after the planned confirmation', 'Record whether the retest was clean or chased'],
    tags: ['continuation', 'BOS', 'trend'],
    minChecklistScore: 6,
    riskPerTrade: 0.5,
    maxTradesPerDay: 2,
    status: 'ACTIVE',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z'
  },
  {
    id: 'setup-ema-rejection',
    name: 'EMA Rejection',
    description: 'A trend-aligned continuation from a tested moving average after price confirms rejection.',
    preferredAssets: ['GBPUSD', 'EURUSD'],
    preferredSessions: ['LONDON'],
    direction: 'BOTH',
    marketConditions: 'Directional session with a respected higher-timeframe moving average and clear room to target.',
    entryRules: ['Trend and EMA slope are aligned', 'Price rejects the EMA with a clear confirmation candle', 'Entry has pre-defined stop and target'],
    invalidationRules: ['EMA loses slope or price accepts through it', 'Countertrend higher-timeframe liquidity is too close'],
    managementRules: ['Do not enter late after an extended move', 'Keep target aligned with the next liquidity pool'],
    tags: ['continuation', 'EMA', 'trend'],
    minChecklistScore: 5,
    riskPerTrade: 0.5,
    maxTradesPerDay: 2,
    status: 'ACTIVE',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z'
  },
  {
    id: 'setup-liquidity-sweep',
    name: 'Liquidity Sweep',
    description: 'A reversal or continuation trade only after liquidity is taken and price confirms the intended direction.',
    preferredAssets: ['XAUUSD', 'GBPUSD'],
    preferredSessions: ['LONDON', 'NEW YORK'],
    direction: 'BOTH',
    marketConditions: 'A clearly marked session high, low, or equal high/low is available to sweep.',
    entryRules: ['Liquidity level is marked before the session', 'Sweep is followed by displacement', 'Lower-timeframe structure confirms the intended direction'],
    invalidationRules: ['Sweep occurs without confirmation', 'A second impulse invalidates the structure'],
    managementRules: ['Avoid chasing the first candle after the sweep', 'Log whether the setup occurred near scheduled news'],
    tags: ['liquidity', 'reversal', 'confirmation'],
    minChecklistScore: 6,
    riskPerTrade: 0.5,
    maxTradesPerDay: 2,
    status: 'ACTIVE',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z'
  }
];

export const INITIAL_ACCOUNTS: TradingAccount[] = [
  {
    id: 'acc-1',
    name: 'Personal FTMO ($100k)',
    broker: 'FTMO / Eightcap',
    initialBalance: 100000,
    currency: 'USD',
    commissionPerLot: 7.00
  },
  {
    id: 'acc-2',
    name: 'Prop Evaluation ($200k)',
    broker: 'Funding Pips',
    initialBalance: 200000,
    currency: 'USD',
    commissionPerLot: 7.00
  },
  {
    id: 'acc-3',
    name: 'Crypto Spot Trading',
    broker: 'Binance / Bybit',
    initialBalance: 25000,
    currency: 'USDT',
    commissionPerLot: 0.00
  }
];

export const INITIAL_TRADE_PLANS: TradePlan[] = [
  {
    id: 'plan-1',
    date: '2026-07-16',
    asset: 'XAUUSD',
    setupId: 'setup-highs-rejection',
    bias: 'BEARISH',
    fourHour: {
      text: 'Looks bearish and on a major resistance level which was prior support. CPI inflation was lower than expected, oil prices were low in June but raised again. Potential more downfall if Iran-US tensions escalate.',
      bias: 'BEARISH',
      imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80'
    },
    oneHour: {
      text: '1HR chart is also bearish. Price gave a pretty bearish move and heading towards 1HR EMA. Need to see the rejection and some BoS (Break of Structure) towards downside.',
      bias: 'BEARISH',
      imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80'
    },
    fifteenMin: {
      text: 'Gold is giving a short-term bullish move. Need to see some rejection of the level and BoS towards downside for the shorts.',
      bias: 'BULLISH',
      imageUrl: 'https://images.unsplash.com/photo-1642390091310-1ecf18553ca7?auto=format&fit=crop&w=600&q=80'
    },
    fiveMin: {
      text: '5M structural shift occurs. Heavy volume rejection observed near high of yesterday. Liquidity distribution phase.',
      bias: 'BEARISH',
      imageUrl: 'https://images.unsplash.com/photo-1624996379697-f01d168b1a52?auto=format&fit=crop&w=600&q=80'
    },
    macroNotes: 'CPI lower than expected (prevents rate hikes), June oil prices raised again. PPI news today could be softer but unpredictable.',
    triggers: 'Rejection of the Highs and some BoS on 15m to get a short-side trade. Trade after the PPI news release.',
    status: 'ACTIVE',
    createdAt: '2026-07-16T04:30:00Z'
  }
];

export const INITIAL_TRADES: Trade[] = [
  // Account 1 (FTMO 100k) Trades
  {
    id: 'trade-1',
    accountId: 'acc-1',
    date: '2026-07-15',
    time: '14:30',
    asset: 'XAUUSD',
    setup: 'Highs Rejection',
    direction: 'SELL',
    entryPrice: 2420.50,
    exitPrice: 2405.00,
    size: 2.5,
    sl: 2428.00,
    tp: 2400.00,
    pnl: 3875,
    commission: 17.50,
    swap: 0,
    fee: 0,
    status: 'WIN',
    session: 'NEW YORK',
    mistakes: ['None'],
    notes: 'Exited slightly early before TP hit as price stalled at prior demand zone. Very clean trade matching the 15m setup plan.',
    htfScreenshot: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
    ltfScreenshot: 'https://images.unsplash.com/photo-1642390091310-1ecf18553ca7?auto=format&fit=crop&w=600&q=80',
    checklist: { 'rule-1': true, 'rule-2': true, 'rule-3': true, 'rule-4': true, 'rule-5': true, 'rule-6': false, 'rule-7': true, 'rule-8': true },
    checklistScore: 7,
    maxChecklistScore: 8,
    journalingStatus: 'COMPLETE'
  },
  {
    id: 'trade-2',
    accountId: 'acc-1',
    date: '2026-07-14',
    time: '09:15',
    asset: 'EURUSD',
    setup: 'BoS Downside',
    direction: 'SELL',
    entryPrice: 1.08900,
    exitPrice: 1.08620,
    size: 5.0,
    sl: 1.09120,
    tp: 1.08300,
    pnl: 1400,
    commission: 35.00,
    swap: 0,
    fee: 0,
    status: 'WIN',
    session: 'LONDON',
    mistakes: ['None'],
    notes: 'Clean continuation pattern. Took partials at +2R.',
    htfScreenshot: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
    checklist: { 'rule-1': true, 'rule-2': true, 'rule-3': true, 'rule-4': false, 'rule-5': true, 'rule-6': true, 'rule-7': true, 'rule-8': false },
    checklistScore: 6,
    maxChecklistScore: 8,
    journalingStatus: 'COMPLETE'
  },
  {
    id: 'trade-3',
    accountId: 'acc-1',
    date: '2026-07-13',
    time: '15:45',
    asset: 'XAUUSD',
    setup: 'BoS Downside',
    direction: 'SELL',
    entryPrice: 2435.00,
    exitPrice: 2442.00,
    size: 2.0,
    sl: 2442.00,
    tp: 2415.00,
    pnl: -1400,
    commission: 14.00,
    swap: 0,
    fee: 0,
    status: 'LOSS',
    session: 'NEW YORK',
    mistakes: ['FOMO'],
    notes: 'Forced the short right before news. Got stopped out on a wick expansion before the downward move occurred. Patience was missing.',
    ltfScreenshot: 'https://images.unsplash.com/photo-1624996379697-f01d168b1a52?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'trade-4',
    accountId: 'acc-1',
    date: '2026-07-10',
    time: '10:30',
    asset: 'GBPUSD',
    setup: 'EMA Rejection',
    direction: 'BUY',
    entryPrice: 1.28200,
    exitPrice: 1.28850,
    size: 3.0,
    sl: 1.27900,
    tp: 1.29000,
    pnl: 1950,
    commission: 21.00,
    swap: 0,
    fee: 0,
    status: 'WIN',
    session: 'LONDON',
    mistakes: ['None'],
    notes: 'Perfect rejection of the 1HR 50 EMA during London session. Risk-reward was exceptional.'
  },

  // Account 2 (Prop Evaluation 200k) Trades
  {
    id: 'trade-5',
    accountId: 'acc-2',
    date: '2026-07-15',
    time: '16:00',
    asset: 'GBPUSD',
    setup: 'Liquidity Sweep',
    direction: 'BUY',
    entryPrice: 1.28100,
    exitPrice: 1.28950,
    size: 6.0,
    sl: 1.27800,
    tp: 1.29100,
    pnl: 5100,
    commission: 42.00,
    swap: 0,
    fee: 0,
    status: 'WIN',
    session: 'NEW YORK',
    mistakes: ['None'],
    notes: 'Huge rejection of daily liquidity. Scale-out exit executed near dynamic supply.',
    htfScreenshot: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
    ltfScreenshot: 'https://images.unsplash.com/photo-1642390091310-1ecf18553ca7?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'trade-6',
    accountId: 'acc-2',
    date: '2026-07-14',
    time: '10:00',
    asset: 'XAUUSD',
    setup: 'EMA Rejection',
    direction: 'SELL',
    entryPrice: 2415.00,
    exitPrice: 2423.00,
    size: 4.0,
    sl: 2423.00,
    tp: 2395.00,
    pnl: -3200,
    commission: 28.00,
    swap: 0,
    fee: 0,
    status: 'LOSS',
    session: 'LONDON',
    mistakes: ['Overtrading'],
    notes: 'Tried to pre-empt London rejection of 50 EMA. Violated discipline rules.'
  },
  {
    id: 'trade-7',
    accountId: 'acc-2',
    date: '2026-07-11',
    time: '15:10',
    asset: 'XAUUSD',
    setup: 'Liquidity Sweep',
    direction: 'BUY',
    entryPrice: 2388.00,
    exitPrice: 2412.00,
    size: 5.0,
    sl: 2380.00,
    tp: 2420.00,
    pnl: 12000,
    commission: 35.00,
    swap: 0,
    fee: 0,
    status: 'WIN',
    session: 'NEW YORK',
    mistakes: ['Left Early'],
    notes: 'Swept Asian low on Friday. Exceptional volume breakout. Stopped early but huge reward secured.'
  },

  // Account 3 (Crypto Spot Binance) Trades
  {
    id: 'trade-8',
    accountId: 'acc-3',
    date: '2026-07-16',
    time: '08:00',
    asset: 'BTCUSDT',
    setup: 'Order Block Retest',
    direction: 'BUY',
    entryPrice: 62500.00,
    exitPrice: 63800.00,
    size: 1.2,
    sl: 61800.00,
    tp: 65000.00,
    pnl: 1560,
    commission: 8.40,
    swap: 0,
    fee: 0,
    status: 'WIN',
    session: 'ASIA',
    mistakes: ['None'],
    notes: 'Order block retest near daily support. Standard crypto range play.',
    ltfScreenshot: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'trade-9',
    accountId: 'acc-3',
    date: '2026-07-12',
    time: '18:30',
    asset: 'ETHUSDT',
    setup: 'Highs Rejection',
    direction: 'SELL',
    entryPrice: 3450.00,
    exitPrice: 3495.00,
    size: 10.0,
    sl: 3495.00,
    tp: 3300.00,
    pnl: -450,
    commission: 70.00,
    swap: 0,
    fee: 0,
    status: 'LOSS',
    session: 'NEW YORK',
    mistakes: ['Chased Trade'],
    notes: 'Tried to short momentum wicks over the weekend. Low liquidity stop hunt.'
  }
];
