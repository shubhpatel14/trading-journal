import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  CartesianGrid, 
  XAxis, 
  YAxis
} from 'recharts';
import { 
  BrainCircuit, 
  Sparkles, 
  ShieldAlert, 
  Clock, 
  Info,
  Database, 
  Coins, 
  AlertTriangle, 
  Zap, 
  LineChart as LineIcon, 
  Activity, 
  Scale, 
  Download,
  Printer,
  X,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Trade, TradingAccount } from '../types';

interface InsightsViewProps {
  trades: Trade[];
  selectedAccountId: string;
  accounts: TradingAccount[];
}

// ============================================================================
// METRIC KNOWLEDGE BASE (INFO BUTTON TOOLTIPS & MODALS)
// ============================================================================

interface BenchmarkItem {
  label: string;
  range: string;
  status: 'good' | 'average' | 'bad';
}

interface MetricInfo {
  title: string;
  category: string;
  whatIsIt: string;
  whyItMatters: string;
  formula?: string;
  benchmarks: BenchmarkItem[];
  interpretation: string;
  example: string;
  tips: string[];
  relatedMetrics?: string[];
}

const METRIC_KNOWLEDGE_BASE: Record<string, MetricInfo> = {
  discipline_score: {
    title: 'Discipline Score',
    category: 'Behavioral Analytics',
    whatIsIt: 'Discipline Score calculates the percentage of your logged trades that were executed flawlessly without breaking any pre-defined trading rules or logging psychological mistakes.',
    whyItMatters: 'Trading discipline is the single biggest predictor of long-term profitability. Strategies with high statistical edge fail when executed with poor discipline.',
    formula: '((Total Trades - Trades with Mistakes) / Total Trades) * 100',
    benchmarks: [
      { label: 'Rule Violation Rate High', range: '< 70%', status: 'bad' },
      { label: 'Moderate Discipline', range: '70% - 85%', status: 'average' },
      { label: 'Institutional Grade', range: '85%+', status: 'good' }
    ],
    interpretation: 'A score below 70% indicates severe behavioral leaks (FOMO, overtrading, or moving stops) that swallow strategy edge.',
    example: 'Out of 20 trades, 17 were executed cleanly with no mistakes and 3 had FOMO errors. Discipline Score = (17 / 20) * 100 = 85%.',
    tips: [
      'Pre-define exact entry triggers before market open.',
      'Set hard daily loss limits in your broker platform.',
      'Never alter stop loss orders after entering a position.'
    ],
    relatedMetrics: ['Mistake Cost', 'SQN', 'Consistency Score']
  },
  best_session: {
    title: 'Best Trading Session',
    category: 'Time Analytics',
    whatIsIt: 'Identifies the specific market session (Asia, London, New York, or Overlap) where your strategy generates the highest net PnL and win probability.',
    whyItMatters: 'Market volatility, liquidity, and spread behavior vary dramatically across global trading sessions.',
    benchmarks: [
      { label: 'Off-Peak Execution', range: 'Negative PnL', status: 'bad' },
      { label: 'Session Neutral', range: 'Neutral Edge', status: 'average' },
      { label: 'Session Dominance', range: 'Highest PnL & Win Rate', status: 'good' }
    ],
    interpretation: 'Focusing exclusively on your top 1-2 performing sessions eliminates wasted screen time and reduces fatigue-induced errors.',
    example: 'Your trades during London session yield +$8,400 PnL with a 68% win rate, while Asia trades lose -$1,200.',
    tips: [
      'Eliminate trading during low-liquidity session transitions.',
      'Align volatility setups with London & NY overlap windows.'
    ],
    relatedMetrics: ['Hourly Profitability', 'Hold Time by Session']
  },
  best_asset: {
    title: 'Best Asset Symbol',
    category: 'Market Analytics',
    whatIsIt: 'The instrument or asset ticker (e.g. XAUUSD, EURUSD, BTCUSDT) that yields your highest cumulative return and win probability.',
    whyItMatters: 'Different assets have distinct ATR (Average True Range) volatility profiles, spread friction, and institutional market maker dynamics.',
    benchmarks: [
      { label: 'Capital Leak Asset', range: 'Negative PnL', status: 'bad' },
      { label: 'Average Contributor', range: 'Small PnL Gain', status: 'average' },
      { label: 'Alpha Instrument', range: 'Dominant PnL Contribution', status: 'good' }
    ],
    interpretation: 'Concentrate capital sizing on your top 1-2 assets where your edge is statistically verified.',
    example: 'Gold (XAUUSD) accounts for 72% of your net profits across 45 executions.',
    tips: [
      'Stop trading instruments where your win rate is below 40%.',
      'Optimize lot sizes specifically for each asset’s tick value.'
    ],
    relatedMetrics: ['Profit Contribution %', 'Average R per Asset']
  },
  system_expectancy: {
    title: 'System Expectancy (EV)',
    category: 'Mathematical Edge',
    whatIsIt: 'Expectancy measures the average dollar amount (or R-multiple) you can expect to win or lose on every trade executed over time.',
    whyItMatters: 'If your Expectancy is positive, your system will mathematically print money over a sufficient sample size of trades.',
    formula: 'EV = (Win Rate % * Avg Win $) - (Loss Rate % * Avg Loss $)',
    benchmarks: [
      { label: 'Negative Edge', range: '< $0.00', status: 'bad' },
      { label: 'Marginal Edge', range: '$0.01 - $50.00', status: 'average' },
      { label: 'Strong Institutional Edge', range: '> $50.00 / trade', status: 'good' }
    ],
    interpretation: 'An Expectancy of +$120 means that on average, every time you press buy or sell, you net $120 after wins and losses.',
    example: 'Win Rate = 60%, Avg Win = $400, Avg Loss = $200. EV = (0.60 * 400) - (0.40 * 200) = $240 - $80 = +$160 per trade.',
    tips: [
      'Increase win rate by waiting for high-confluence setups.',
      'Cut losses at -1R to keep average loss size tightly constrained.'
    ],
    relatedMetrics: ['Profit Factor', 'SQN', 'Kelly Criterion']
  },
  max_drawdown: {
    title: 'Maximum Drawdown (Max DD)',
    category: 'Risk Analytics',
    whatIsIt: 'The largest peak-to-valley percentage drop in your cumulative equity curve before hitting a new historical equity high.',
    whyItMatters: 'Drawdown measures portfolio capital risk. Prop firms and institutional capital allocators enforce strict drawdown limits.',
    formula: 'Max DD % = ((Peak Equity - Trough Equity) / Peak Equity) * 100',
    benchmarks: [
      { label: 'High Ruin Risk', range: '> 15%', status: 'bad' },
      { label: 'Standard Prop Constraint', range: '5% - 10%', status: 'average' },
      { label: 'Institutional Preservation', range: '< 5%', status: 'good' }
    ],
    interpretation: 'A 10% drawdown requires an 11.1% gain to break even. A 50% drawdown requires a 100% gain to break even.',
    example: 'Account peak was $110,000 and dropped to $99,000 during a losing streak. Max DD = ($11,000 / $110,000) * 100 = 10%.',
    tips: [
      'Reduce position size by 50% when in a 3-trade drawdown streak.',
      'Never increase risk per trade after a losing trade.'
    ],
    relatedMetrics: ['Recovery Factor', 'Calmar Ratio', 'Ulcer Index']
  },
  profit_factor: {
    title: 'Profit Factor',
    category: 'Executive Summary',
    whatIsIt: 'Profit Factor compares total gross dollars won versus total gross dollars lost.',
    whyItMatters: 'It gives an immediate, clear snapshot of whether your wins outweigh your losses and by what margin.',
    formula: 'Gross Profits / Gross Losses',
    benchmarks: [
      { label: 'Losing System', range: '< 1.0', status: 'bad' },
      { label: 'Needs Improvement', range: '1.0 - 1.5', status: 'average' },
      { label: 'Strong Edge', range: '1.5 - 2.0', status: 'good' },
      { label: 'Elite Institutional', range: '2.0+', status: 'good' }
    ],
    interpretation: 'A Profit Factor of 2.15 means for every $1.00 you lose on losing trades, you generate $2.15 on winning trades.',
    example: 'Gross Wins = $15,000, Gross Losses = $6,000. Profit Factor = 15,000 / 6,000 = 2.50.',
    tips: [
      'Cut losing trades earlier to reduce gross loss size.',
      'Let winning trades reach key supply/demand target zones.'
    ],
    relatedMetrics: ['Win Rate', 'Payoff Ratio', 'Expectancy']
  },
  win_rate: {
    title: 'Win Rate %',
    category: 'Performance Distribution',
    whatIsIt: 'The percentage of closed trades that resulted in a positive realized profit.',
    whyItMatters: 'Win rate shows how frequently your trades hit profit targets versus stop losses or break-even levels.',
    formula: '(Winning Trades / Total Closed Trades) * 100',
    benchmarks: [
      { label: 'Low Accuracy', range: '< 40%', status: 'bad' },
      { label: 'Standard Systematic Range', range: '45% - 60%', status: 'average' },
      { label: 'High Accuracy', range: '> 60%', status: 'good' }
    ],
    interpretation: 'Note: Win rate alone does NOT equal profitability. A 40% win rate can be extremely profitable if Risk:Reward is 1:3.',
    example: 'Out of 50 trades, 30 are wins, 16 are losses, and 4 are break-even. Win Rate = (30 / 50) * 100 = 60%.',
    tips: [
      'Do not trade low-volume market consolidation periods.',
      'Align trades with 1HR/4HR higher-timeframe trend direction.'
    ],
    relatedMetrics: ['Profit Factor', 'Average Risk Reward', 'Break-even %']
  },
  avg_r_multiple: {
    title: 'Average R-Multiple',
    category: 'Executive Summary',
    whatIsIt: 'R-Multiple measures your average return expressed as a multiple of the initial risk (1R) placed on each trade.',
    whyItMatters: 'Normalizing trade performance into R-multiples removes position size variance and focuses purely on trade execution quality.',
    formula: 'Net Return ($) / Initial Dollar Risk (1R)',
    benchmarks: [
      { label: 'Negative Return / Risk', range: '< 0.0R', status: 'bad' },
      { label: 'Moderate Edge', range: '0.2R - 0.6R', status: 'average' },
      { label: 'Institutional Edge', range: '> 0.7R', status: 'good' }
    ],
    interpretation: 'An average of +0.85R per trade means you consistently gain 0.85 times your risk unit on every executed trade.',
    example: 'If 1R risk is $200, a winning trade netting +$600 achieves +3.0R.',
    tips: [
      'Always calculate 1R dollar risk before placing orders.',
      'Track setups yielding > 2R expected return.'
    ],
    relatedMetrics: ['Expectancy', 'Payoff Ratio', 'Average Risk Reward']
  },
  recovery_factor: {
    title: 'Recovery Factor',
    category: 'Risk Analytics',
    whatIsIt: 'Recovery Factor measures how effectively your strategy recovers from its deepest drawdown peak-to-valley loss.',
    whyItMatters: 'It proves whether net profits are substantial relative to the maximum risk experienced to produce those profits.',
    formula: 'Net Profit ($) / Maximum Drawdown ($)',
    benchmarks: [
      { label: 'Poor Capital Recovery', range: '< 1.5', status: 'bad' },
      { label: 'Acceptable Recovery', range: '1.5 - 3.0', status: 'average' },
      { label: 'Robust Recovery', range: '> 3.0', status: 'good' }
    ],
    interpretation: 'A Recovery Factor of 4.5 means your overall net profit is 4.5 times larger than your worst drawdown peak.',
    example: 'Net Profit = $20,000, Max Drawdown = $4,000. Recovery Factor = 20,000 / 4,000 = 5.0.',
    tips: [
      'Tighten risk management during drawdown phases.',
      'Avoid over-leveraging after hitting new equity highs.'
    ],
    relatedMetrics: ['Max Drawdown', 'Calmar Ratio', 'Ulcer Index']
  },
  avg_risk_reward: {
    title: 'Average Risk : Reward Ratio',
    category: 'Risk Analytics',
    whatIsIt: 'The ratio between your average planned stop loss distance and take profit target distance across logged trades.',
    whyItMatters: 'A high Risk:Reward ratio allows you to maintain profitability even with a win rate under 50%.',
    formula: 'Average Planned Reward Distance / Average Planned Risk Distance',
    benchmarks: [
      { label: 'Negative Asymmetry', range: '< 1.0', status: 'bad' },
      { label: 'Balanced Standard', range: '1.0 - 1.8', status: 'average' },
      { label: 'High Asymmetrical Edge', range: '> 1.8', status: 'good' }
    ],
    interpretation: 'A 1:2.5 Risk:Reward means for every 1 unit of risk, your target captures 2.5 units of potential reward.',
    example: 'Entry: 2400.00, SL: 2395.00 (Risk 5 pts), TP: 2412.50 (Reward 12.5 pts). RR = 12.5 / 5 = 2.5.',
    tips: [
      'Avoid taking trades with planned Risk:Reward under 1:1.5.',
      'Trail stop loss orders behind 15m structure highs/lows.'
    ],
    relatedMetrics: ['Win Rate', 'Expectancy', 'Payoff Ratio']
  },
  sqn: {
    title: 'System Quality Number (SQN)',
    category: 'Advanced Statistics',
    whatIsIt: 'Developed by Van Tharp, SQN scores the statistical score and reliability of a trading system by factoring average PnL, standard deviation, and sample size.',
    whyItMatters: 'SQN tells you if your performance is driven by genuine statistical edge or just random lucky wicks.',
    formula: '(Average PnL / Standard Deviation of PnL) * sqrt(Total Trades)',
    benchmarks: [
      { label: 'Hard to Trade', range: '< 1.5', status: 'bad' },
      { label: 'Average System', range: '1.5 - 2.0', status: 'average' },
      { label: 'Good System', range: '2.0 - 3.0', status: 'good' },
      { label: 'Excellent System', range: '3.0 - 5.0', status: 'good' },
      { label: 'Holy Grail Category', range: '5.0+', status: 'good' }
    ],
    interpretation: 'An SQN above 2.5 confirms a highly stable trading edge capable of scaling position size safely.',
    example: 'Avg PnL = $250, Std Dev = $500, Trades = 36. SQN = (250 / 500) * sqrt(36) = 0.5 * 6 = 3.0 (Excellent).',
    tips: [
      'Eliminate outsized outlier losses to lower standard deviation.',
      'Maintain disciplined position sizing on every execution.'
    ],
    relatedMetrics: ['Sharpe Ratio', 'Kelly Criterion', 'Expectancy']
  },
  kelly_criterion: {
    title: 'Kelly Criterion %',
    category: 'Advanced Statistics',
    whatIsIt: 'A mathematical formula used to determine the optimal percentage of your total capital to risk on a single trade to maximize long-term growth rate.',
    whyItMatters: 'Over-risking above Kelly causes eventual account bankruptcy, while half-Kelly risk optimizes growth with minimal drawdown.',
    formula: 'Kelly % = Win Rate % - ((1 - Win Rate %) / Payoff Ratio)',
    benchmarks: [
      { label: 'Negative EV (Do Not Risk)', range: '< 0%', status: 'bad' },
      { label: 'Half-Kelly Recommended Range', range: '1% - 5%', status: 'average' },
      { label: 'Full Kelly Upper Limit', range: '> 5%', status: 'good' }
    ],
    interpretation: 'If Kelly is 4.2%, risking 2.1% (Half-Kelly) optimizes long-term compound growth safely.',
    example: 'Win Rate = 60% (0.60), Payoff Ratio = 1.5. Kelly = 0.60 - ((1 - 0.60) / 1.5) = 0.60 - 0.267 = 33.3% (Use Half/Quarter Kelly for safety).',
    tips: [
      'Institutional traders typically use 25% of Full Kelly (Fractional Kelly).',
      'Never risk more than 2% per trade regardless of Kelly output.'
    ],
    relatedMetrics: ['SQN', 'Payoff Ratio', 'Expectancy']
  },
  sharpe_ratio: {
    title: 'Sharpe Ratio',
    category: 'Advanced Statistics',
    whatIsIt: 'Measures risk-adjusted return by comparing excess net returns over the risk-free rate relative to total volatility (standard deviation).',
    whyItMatters: 'Wall Street and hedge funds use Sharpe to evaluate whether high returns are worth the volatility risk.',
    formula: '(Average Trade PnL - Risk Free Rate) / Standard Deviation of PnL',
    benchmarks: [
      { label: 'Sub-Optimal Risk', range: '< 1.0', status: 'bad' },
      { label: 'Good Risk-Adjusted', range: '1.0 - 2.0', status: 'average' },
      { label: 'Institutional Benchmark', range: '2.0+', status: 'good' }
    ],
    interpretation: 'A Sharpe Ratio above 2.0 indicates smooth equity growth with minimal wild swings.',
    example: 'Excess return is 18% with a standard deviation of 8%. Sharpe Ratio = 18 / 8 = 2.25.',
    tips: [
      'Reduce variance by avoiding news volatility trades.',
      'Keep stop loss placements consistent across all setups.'
    ],
    relatedMetrics: ['Sortino Ratio', 'Calmar Ratio', 'SQN']
  },
  sortino_ratio: {
    title: 'Sortino Ratio',
    category: 'Advanced Statistics',
    whatIsIt: 'Similar to Sharpe, but only penalizes downside negative volatility (losing trades) instead of total volatility.',
    whyItMatters: 'Traders love positive upside volatility (big winning wicks). Sortino gives credit for upside wins while penalizing losses.',
    formula: '(Average Trade PnL - Risk Free Rate) / Downside Standard Deviation',
    benchmarks: [
      { label: 'High Loss Volatility', range: '< 1.5', status: 'bad' },
      { label: 'Strong Risk Profile', range: '1.5 - 3.0', status: 'average' },
      { label: 'Elite Institutional', range: '3.0+', status: 'good' }
    ],
    interpretation: 'A Sortino Ratio above 3.0 demonstrates excellent capital preservation during market pullbacks.',
    example: 'Excess return = 24%, Downside Deviation = 6%. Sortino Ratio = 24 / 6 = 4.0.',
    tips: [
      'Cap max loss per trade at -1R to keep downside deviation low.',
      'Eliminate revenge trades following a stop out.'
    ],
    relatedMetrics: ['Sharpe Ratio', 'Ulcer Index', 'Max Drawdown']
  },
  calmar_ratio: {
    title: 'Calmar Ratio',
    category: 'Advanced Statistics',
    whatIsIt: 'Compares annualized strategy return relative to the maximum percentage drawdown experienced over the same period.',
    whyItMatters: 'Evaluates drawdown risk relative to net annual profitability.',
    formula: 'Annualized Return % / Maximum Drawdown %',
    benchmarks: [
      { label: 'High DD Relative to Return', range: '< 1.0', status: 'bad' },
      { label: 'Healthy Growth Rate', range: '1.0 - 3.0', status: 'average' },
      { label: 'Exceptional Edge', range: '3.0+', status: 'good' }
    ],
    interpretation: 'A Calmar Ratio of 3.5 means your annual return is 3.5 times greater than your worst drawdown.',
    example: 'Annual Return = 35%, Max Drawdown = 10%. Calmar Ratio = 35 / 10 = 3.5.',
    tips: [
      'Focus on limiting drawdown depth rather than forcing trades.',
      'Scale up position size only when Calmar Ratio is > 2.0.'
    ],
    relatedMetrics: ['Recovery Factor', 'Sharpe Ratio', 'Max Drawdown']
  },
  edge_ratio: {
    title: 'Edge Ratio',
    category: 'Advanced Statistics',
    whatIsIt: 'Measures total mathematical expectancy per unit of risk, factoring win probability and payoff ratio.',
    whyItMatters: 'Determines whether your strategy possesses a durable statistical advantage after transaction costs.',
    formula: '(Win Rate % * Payoff Ratio) - (1 - Win Rate %)',
    benchmarks: [
      { label: 'No Statistical Edge', range: '< 0.0', status: 'bad' },
      { label: 'Moderate Edge', range: '0.2 - 0.5', status: 'average' },
      { label: 'Strong Edge', range: '> 0.5', status: 'good' }
    ],
    interpretation: 'An Edge Ratio above 0.5 confirms robust mathematical expectation.',
    example: 'Win Rate = 55%, Payoff = 1.8. Edge Ratio = (0.55 * 1.8) - 0.45 = 0.99 - 0.45 = 0.54.',
    tips: [
      'Protect your edge by executing only A+ setup confluences.',
      'Log every execution mistake to prevent edge decay.'
    ],
    relatedMetrics: ['System Expectancy', 'Profit Factor', 'Payoff Ratio']
  },
  payoff_ratio: {
    title: 'Payoff Ratio (Win / Loss Ratio)',
    category: 'Advanced Statistics',
    whatIsIt: 'Compares your average winning dollar amount versus your average losing dollar amount.',
    whyItMatters: 'Shows whether your winning trades are bigger than your losing trades.',
    formula: 'Average Winning Trade PnL ($) / Average Losing Trade PnL ($)',
    benchmarks: [
      { label: 'Negative Asymmetry', range: '< 1.0', status: 'bad' },
      { label: 'Symmetrical Standard', range: '1.0 - 1.5', status: 'average' },
      { label: 'High Payoff Edge', range: '> 1.5', status: 'good' }
    ],
    interpretation: 'A Payoff Ratio of 2.0 means your average winning trade is twice as large as your average losing trade.',
    example: 'Avg Win = $600, Avg Loss = $300. Payoff Ratio = 600 / 300 = 2.0.',
    tips: [
      'Hold winning trades until pre-planned liquidity targets.',
      'Cut losing trades instantly when entry thesis is invalidated.'
    ],
    relatedMetrics: ['Average Win', 'Average Loss', 'Profit Factor']
  },
  ulcer_index: {
    title: 'Ulcer Index',
    category: 'Advanced Statistics',
    whatIsIt: 'Measures portfolio stress and downside risk by evaluating both the depth and duration of equity drawdowns.',
    whyItMatters: 'A low Ulcer Index indicates smooth equity growth that is easy for a trader to execute psychologically without emotional stress.',
    formula: 'sqrt( sum( (Drawdown %)^2 ) / N )',
    benchmarks: [
      { label: 'Low Stress Execution', range: '< 3.0', status: 'good' },
      { label: 'Moderate Stress', range: '3.0 - 7.0', status: 'average' },
      { label: 'High Psychological Stress', range: '> 7.0', status: 'bad' }
    ],
    interpretation: 'An Ulcer Index below 3.0 means drawdowns are shallow and recover rapidly.',
    example: 'Strategy experiences rare 2% drawdowns that resolve within 2 days. Ulcer Index = 1.4 (Very low stress).',
    tips: [
      'Reduce lot size to lower psychological stress during trades.',
      'Close trades before weekend market gaps.'
    ],
    relatedMetrics: ['Max Drawdown', 'Sortino Ratio', 'Recovery Factor']
  },
  risk_of_ruin: {
    title: 'Risk of Ruin %',
    category: 'Risk Analytics',
    whatIsIt: 'The mathematical probability that your trading account will suffer a drawdown large enough to destroy your trading capital.',
    whyItMatters: 'Guarantees that your position sizing will not lead to account wipeout during an unexpected streak of losses.',
    formula: '((1 - W) / (1 + W)) ^ Units_of_Capital',
    benchmarks: [
      { label: 'Virtual Bankruptcy Certainty', range: '> 10%', status: 'bad' },
      { label: 'Moderate Risk', range: '1% - 10%', status: 'average' },
      { label: 'Statistically Zero Ruin Risk', range: '< 1%', status: 'good' }
    ],
    interpretation: 'A Risk of Ruin below 0.1% proves your capital management renders bankruptcy mathematically impossible.',
    example: 'Win Rate = 60%, Payoff = 2.0, Risk per trade = 1%. Risk of Ruin = < 0.01%.',
    tips: [
      'Never risk more than 1-2% of balance per trade.',
      'Lower position size if win rate drops below 45%.'
    ],
    relatedMetrics: ['Max Drawdown', 'Kelly Criterion', 'Expectancy']
  },
  equity_curve: {
    title: 'Cumulative Equity Curve & Peak Overlay',
    category: 'Equity Analytics',
    whatIsIt: 'Visualizes the sequential growth of total account equity, highlighting peak balances and equity pullbacks.',
    whyItMatters: 'Shows whether your equity growth trajectory is smooth and steady or volatile and erratic.',
    benchmarks: [
      { label: 'Volatile & Erratic', range: 'High Whipsaws', status: 'bad' },
      { label: 'Moderate Growth', range: 'Steady Steps', status: 'average' },
      { label: 'Institutional Smoothness', range: '45-Degree Growth', status: 'good' }
    ],
    interpretation: 'A steady 45-degree upward slope proves disciplined, repeatable performance.',
    example: 'Account starts at $100k and grows smoothly to $118k over 40 trades with minor 2% dips.',
    tips: [
      'Do not increase position size after a random winning streak.',
      'Maintain fixed fractional risk per trade.'
    ],
    relatedMetrics: ['Rolling Drawdown', 'Max Drawdown', 'Sharpe Ratio']
  },
  rolling_drawdown: {
    title: 'Rolling Drawdown %',
    category: 'Equity Analytics',
    whatIsIt: 'Tracks peak-to-valley equity loss percentage continuously across time.',
    whyItMatters: 'Reveals how frequently and deeply your account contracts during losing periods.',
    benchmarks: [
      { label: 'Severe Capital Risk', range: '> 15%', status: 'bad' },
      { label: 'Normal Pullback', range: '5% - 10%', status: 'average' },
      { label: 'Controlled Risk', range: '< 5%', status: 'good' }
    ],
    interpretation: 'Keeping drawdowns under 5% preserves psychological calm and allows steady compounding.',
    example: 'Drawdown peaked at -4.2% on trade #14 before returning to new highs.',
    tips: [
      'Halve your risk sizing when drawdown exceeds 5%.',
      'Take a 24-hour trading break after two consecutive losing days.'
    ],
    relatedMetrics: ['Ulcer Index', 'Max Drawdown', 'Recovery Factor']
  },
  pnl_distribution: {
    title: 'Trade PnL Distribution ($)',
    category: 'Performance Distribution',
    whatIsIt: 'A frequency histogram sorting all trades into dollar profit and loss brackets.',
    whyItMatters: 'Identifies whether wins are fat-tailed (large upside outliers) and whether losses are strictly capped.',
    benchmarks: [
      { label: 'Uncapped Fat Losses', range: 'Large Left Tail', status: 'bad' },
      { label: 'Symmetrical Distribution', range: 'Bell Curve', status: 'average' },
      { label: 'Right-Skewed Outliers', range: 'Large Right Tail', status: 'good' }
    ],
    interpretation: 'You want a tight, capped left tail (losses limited to 1R) and a fat right tail (wins scaling to 3R+).',
    example: '80% of losses are tightly grouped under -$200, while top wins reach +$1,200.',
    tips: [
      'Never allow a loss to exceed your pre-set 1R stop loss boundary.',
      'Let winner trades trail stops to catch mega trend expansions.'
    ],
    relatedMetrics: ['Payoff Ratio', 'Average Win', 'Average Loss']
  },
  win_loss_pie: {
    title: 'Trade Outcome Ratio',
    category: 'Performance Distribution',
    whatIsIt: 'Visual pie chart showing the proportion of Wins, Losses, and Break-Even trades.',
    whyItMatters: 'Quickly shows whether your trading style is high-accuracy/low-reward or low-accuracy/high-reward.',
    benchmarks: [
      { label: 'Low Accuracy', range: '< 40% Wins', status: 'bad' },
      { label: 'Balanced', range: '50% Wins', status: 'average' },
      { label: 'High Accuracy', range: '> 60% Wins', status: 'good' }
    ],
    interpretation: 'Even a 45% win rate generates high returns if your Payoff Ratio is 2.5.',
    example: '55% Wins, 35% Losses, 10% Break-Even.',
    tips: [
      'Track Break-Even trades to ensure you are not closing trades prematurely.',
      'Do not force trades when setup triggers are ambiguous.'
    ],
    relatedMetrics: ['Win Rate %', 'Break-even %', 'Profit Factor']
  },
  hourly_profitability: {
    title: 'Hourly Profitability',
    category: 'Time Analytics',
    whatIsIt: 'Maps net dollar returns and trade volume across each 24-hour period of the day.',
    whyItMatters: 'Exposes specific hours of the day where market conditions favor your strategy versus hours that bleed capital.',
    benchmarks: [
      { label: 'Negative Hourly Window', range: 'Losses', status: 'bad' },
      { label: 'Neutral Window', range: 'Flat PnL', status: 'average' },
      { label: 'Alpha Execution Hour', range: 'High PnL', status: 'good' }
    ],
    interpretation: 'Trading only during your top 3-4 golden hours significantly boosts your overall win rate.',
    example: '14:00 - 16:00 UTC (NY Open) generates 65% of your overall profits.',
    tips: [
      'Set alarm alerts only during high-edge hourly windows.',
      'Close open positions before low-volume session dead zones.'
    ],
    relatedMetrics: ['Best Trading Session', 'Day Heatmap']
  },
  day_heatmap: {
    title: 'Day of Week Profitability',
    category: 'Time Analytics',
    whatIsIt: 'Breaks down net profit and win rate across Monday through Friday execution days.',
    whyItMatters: 'Certain days (e.g. Friday afternoon before weekend gaps, or Monday morning liquidity building) have distinct market dynamics.',
    benchmarks: [
      { label: 'Weak Execution Day', range: 'Negative PnL', status: 'bad' },
      { label: 'Average Day', range: 'Moderate Return', status: 'average' },
      { label: 'High Edge Day', range: 'Top PnL', status: 'good' }
    ],
    interpretation: 'If Friday trading loses money consistently, stopping Friday trading instantly increases net annual profits.',
    example: 'Wednesdays and Thursdays yield +$12,000 PnL, while Fridays lose -$2,500.',
    tips: [
      'Reduce risk size by 50% on historically weak trading days.',
      'Review weekly economic news release calendars every Sunday.'
    ],
    relatedMetrics: ['Best Trading Session', 'Hourly Profitability']
  },
  mistake_frequency: {
    title: 'Psychological Mistake Frequency & Cost',
    category: 'Behavioral Analytics',
    whatIsIt: 'Tracks the exact frequency and financial loss caused by execution mistakes (FOMO, Overtrading, Chasing Trades, Moving Stops).',
    whyItMatters: 'Quantifies the exact dollar cost of emotional breaches in your trading discipline.',
    benchmarks: [
      { label: 'High Leak Rate', range: '> 25% of Trades', status: 'bad' },
      { label: 'Occasional Error', range: '5% - 15%', status: 'average' },
      { label: 'Zero Behavioral Errors', range: '0%', status: 'good' }
    ],
    interpretation: 'Plugging just one top psychological leak often turns a losing trader into a profitable prop trader immediately.',
    example: 'FOMO errors occurred on 6 trades, costing -$3,400 in net losses.',
    tips: [
      'Walk away from the screens after any trade violation.',
      'Log trade notes immediately upon exit while emotions are fresh.'
    ],
    relatedMetrics: ['Discipline Score', 'SQN', 'Consistency Score']
  },
  setup_performance: {
    title: 'Strategy Setup Expectancy',
    category: 'Setup Analytics',
    whatIsIt: 'Breaks down Win Rate, Profit Factor, and System Expectancy across individual entry setup models (e.g. BoS Downside, Liquidity Sweep, EMA Rejection).',
    whyItMatters: 'Identifies which setup models are high-yield alpha generators versus setups that leak capital.',
    benchmarks: [
      { label: 'Negative EV Setup', range: 'Expectancy < $0', status: 'bad' },
      { label: 'Average Setup', range: 'PF 1.2 - 1.5', status: 'average' },
      { label: 'A+ High Alpha Setup', range: 'PF 2.0+ & High EV', status: 'good' }
    ],
    interpretation: 'Double down on your A+ setups and archive setups that consistently produce negative EV.',
    example: 'Liquidity Sweep setup produces +$280 EV per trade with a 2.4 Profit Factor.',
    tips: [
      'Archive setups with win rate below 40%.',
      'Filter setup triggers through higher-timeframe HTF bias.'
    ],
    relatedMetrics: ['System Expectancy', 'Profit Factor', 'Win Rate %']
  },
  rolling_expectancy: {
    title: 'Rolling Expectancy Trend',
    category: 'Consistency Analytics',
    whatIsIt: 'Tracks the moving average of trade expectancy over a 10-trade or 30-trade rolling window.',
    whyItMatters: 'Shows whether your trading edge is expanding or deteriorating over time.',
    benchmarks: [
      { label: 'Edge Decay', range: 'Downward Trend', status: 'bad' },
      { label: 'Stable Edge', range: 'Flat Line', status: 'average' },
      { label: 'Expanding Edge', range: 'Upward Trend', status: 'good' }
    ],
    interpretation: 'An upward rolling expectancy curve confirms continuous trader skill development.',
    example: 'Rolling 10-trade expectancy expanded from +$40 to +$180 after eliminating FOMO trades.',
    tips: [
      'Audit your last 20 trades when rolling expectancy turns downward.',
      'Keep position size fixed during edge refinement phases.'
    ],
    relatedMetrics: ['System Expectancy', 'Consistency Score', 'SQN']
  }
};

// Default fallback knowledge item for unlisted metrics
const DEFAULT_METRIC_INFO: MetricInfo = {
  title: 'Performance Metric',
  category: 'Tactical Analytics',
  whatIsIt: 'A quantitative indicator tracking trading performance, risk exposure, or statistical edge.',
  whyItMatters: 'Monitoring metrics helps identify execution flaws and statistical opportunities.',
  benchmarks: [
    { label: 'Needs Attention', range: 'Below Benchmark', status: 'bad' },
    { label: 'Standard Range', range: 'Average', status: 'average' },
    { label: 'Optimal Edge', range: 'Above Benchmark', status: 'good' }
  ],
  interpretation: 'Compare this metric against historical performance trends to verify strategy consistency.',
  example: 'Regularly reviewing performance statistics leads to measurable execution improvements.',
  tips: [
    'Log every trade execution promptly.',
    'Focus on process quality over single-trade outcomes.'
  ]
};

// ============================================================================
// MAIN COMPONENT: INSIGHTSVIEW
// ============================================================================

export default function InsightsView({ 
  trades, 
  selectedAccountId, 
  accounts 
}: InsightsViewProps) {
  // Modal state for Universal ℹ️ Info buttons
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);
  
  // AI Audit State
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Active account details
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

  const formatVal = (val: number, options?: { showSign?: boolean; decimals?: number }) => {
    const dec = options?.decimals !== undefined ? options.decimals : 2;
    const roundedVal = Number(Math.abs(val).toFixed(2));
    const formatted = roundedVal.toLocaleString(undefined, { 
      minimumFractionDigits: dec, 
      maximumFractionDigits: dec 
    });
    const sign = options?.showSign && roundedVal >= 0.01 ? (val > 0 ? '+' : '-') : '';
    const symbol = currencySymbol === 'EUR' ? '€' : currencySymbol === 'GBP' ? '£' : '$';
    return `${sign}${symbol}${formatted}`;
  };

  // Sort trades chronologically
  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return timeA - timeB;
    });
  }, [trades]);

  // 1. EXECUTIVE SUMMARY & KPI CALCULATIONS
  const kpis = useMemo(() => {
    const totalTrades = sortedTrades.length;
    if (totalTrades === 0) {
      return {
        disciplineScore: 100,
        winRate: 0,
        profitFactor: 0,
        expectancy: 0,
        maxDrawdownPct: 0,
        maxDrawdownUSD: 0,
        recoveryFactor: 0,
        avgRiskReward: 0,
        avgRMultiple: 0,
        winCount: 0,
        lossCount: 0,
        beCount: 0,
        totalPnl: 0,
        bestSession: 'N/A',
        bestAsset: 'N/A',
        grossProfit: 0,
        grossLoss: 0,
        avgWin: 0,
        avgLoss: 0
      };
    }

    let totalPnl = 0;
    let winCount = 0;
    let lossCount = 0;
    let beCount = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let tradesWithMistakes = 0;

    let rollingBalance = activeInitialCapital;
    let peakBalance = rollingBalance;
    let maxDdUSD = 0;

    let totalRrSum = 0;
    let validRrCount = 0;

    const sessionPnL: Record<string, { pnl: number; wins: number; total: number }> = {};
    const assetPnL: Record<string, { pnl: number; wins: number; total: number }> = {};

    sortedTrades.forEach(t => {
      totalPnl += t.pnl;
      rollingBalance += t.pnl;

      if (rollingBalance > peakBalance) {
        peakBalance = rollingBalance;
      }
      const dd = peakBalance - rollingBalance;
      if (dd > maxDdUSD) {
        maxDdUSD = dd;
      }

      const isBe = t.status === 'BREAKEVEN' || (t.pnl > -10 && t.pnl < 10);
      if (isBe) {
        beCount++;
      } else if (t.status === 'WIN' || t.pnl >= 10) {
        winCount++;
        grossProfit += t.pnl;
      } else {
        lossCount++;
        grossLoss += Math.abs(t.pnl);
      }

      if (t.mistakes && t.mistakes.some(m => m !== 'None')) {
        tradesWithMistakes++;
      }

      if (t.entryPrice && t.sl && t.tp) {
        const risk = Math.abs(t.entryPrice - t.sl);
        const reward = Math.abs(t.tp - t.entryPrice);
        if (risk > 0) {
          totalRrSum += reward / risk;
          validRrCount++;
        }
      }

      // Session map
      const sess = t.session || 'NEW YORK';
      if (!sessionPnL[sess]) sessionPnL[sess] = { pnl: 0, wins: 0, total: 0 };
      sessionPnL[sess].pnl += t.pnl;
      sessionPnL[sess].total += 1;
      if (t.pnl > 0) sessionPnL[sess].wins += 1;

      // Asset map
      const asset = t.asset || 'XAUUSD';
      if (!assetPnL[asset]) assetPnL[asset] = { pnl: 0, wins: 0, total: 0 };
      assetPnL[asset].pnl += t.pnl;
      assetPnL[asset].total += 1;
      if (t.pnl > 0) assetPnL[asset].wins += 1;
    });

    const winRate = (winCount / totalTrades) * 100;
    const avgWin = winCount > 0 ? grossProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const expectancy = (winRate / 100 * avgWin) - ((1 - (winRate / 100)) * avgLoss);
    const maxDrawdownPct = peakBalance > 0 ? (maxDdUSD / peakBalance) * 100 : 0;
    const recoveryFactor = maxDdUSD > 0 ? totalPnl / maxDdUSD : totalPnl > 0 ? 99.9 : 0;
    const avgRiskReward = validRrCount > 0 ? totalRrSum / validRrCount : 0;
    const disciplineScore = Math.max(0, ((totalTrades - tradesWithMistakes) / totalTrades) * 100);
    const avgRMultiple = avgLoss > 0 ? (expectancy / avgLoss) : 0;

    // Best session
    let bestSession = 'N/A';
    let maxSessPnl = -Infinity;
    Object.entries(sessionPnL).forEach(([sess, d]) => {
      if (d.pnl > maxSessPnl) {
        maxSessPnl = d.pnl;
        bestSession = sess;
      }
    });

    // Best asset
    let bestAsset = 'N/A';
    let maxAssetPnl = -Infinity;
    Object.entries(assetPnL).forEach(([asset, d]) => {
      if (d.pnl > maxAssetPnl) {
        maxAssetPnl = d.pnl;
        bestAsset = asset;
      }
    });

    return {
      disciplineScore,
      winRate,
      profitFactor,
      expectancy,
      maxDrawdownPct,
      maxDrawdownUSD: maxDdUSD,
      recoveryFactor,
      avgRiskReward,
      avgRMultiple,
      winCount,
      lossCount,
      beCount,
      totalPnl,
      avgWin,
      avgLoss,
      bestSession,
      bestAsset,
      grossProfit,
      grossLoss
    };
  }, [sortedTrades, activeInitialCapital]);

  // 2. EQUITY CURVE & RUNNING DRAWDOWN DATA
  const equityAnalyticsData = useMemo(() => {
    let currentEquity = activeInitialCapital;
    let peakEquity = activeInitialCapital;
    let cumulativePnl = 0;

    const points = sortedTrades.map((t, idx) => {
      cumulativePnl += t.pnl;
      currentEquity += t.pnl;

      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }

      const drawdownUSD = peakEquity - currentEquity;
      const drawdownPct = peakEquity > 0 ? (drawdownUSD / peakEquity) * 100 : 0;

      return {
        tradeIndex: idx + 1,
        date: t.date,
        time: t.time || '12:00',
        asset: t.asset,
        pnl: t.pnl,
        cumulativePnl,
        equity: currentEquity,
        peak: peakEquity,
        drawdownUSD,
        drawdownPct: -drawdownPct, // Negative for area display under baseline
        isNewHigh: currentEquity === peakEquity
      };
    });

    // Rolling 10-trade moving average
    const rollingPoints = points.map((pt, idx) => {
      const startIdx = Math.max(0, idx - 9);
      const window = points.slice(startIdx, idx + 1);
      const avgPnl = window.reduce((sum, w) => sum + w.pnl, 0) / window.length;
      return {
        ...pt,
        rollingAvgPnl: avgPnl
      };
    });

    return rollingPoints;
  }, [sortedTrades, activeInitialCapital]);

  // 3. PNL BY DAY OF WEEK & HOURLY ANALYTICS
  const timeAnalytics = useMemo(() => {
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysData = daysName.map(day => ({ day, pnl: 0, trades: 0, wins: 0 }));
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ 
      hour: `${String(i).padStart(2, '0')}:00`, 
      pnl: 0, 
      trades: 0, 
      wins: 0 
    }));

    sortedTrades.forEach(t => {
      const d = new Date(t.date);
      const dayIdx = d.getDay();
      daysData[dayIdx].pnl = Number((daysData[dayIdx].pnl + t.pnl).toFixed(2));
      daysData[dayIdx].trades += 1;
      if (t.pnl > 0) daysData[dayIdx].wins += 1;

      if (t.time) {
        const hour = parseInt(t.time.split(':')[0], 10);
        if (!isNaN(hour) && hour >= 0 && hour < 24) {
          hourlyData[hour].pnl = Number((hourlyData[hour].pnl + t.pnl).toFixed(2));
          hourlyData[hour].trades += 1;
          if (t.pnl > 0) hourlyData[hour].wins += 1;
        }
      }
    });

    const filteredDays = daysData.filter(d => d.trades > 0 || (d.day !== 'Sun' && d.day !== 'Sat'));

    return {
      daysData: filteredDays,
      hourlyData
    };
  }, [sortedTrades]);

  // 4. PERFORMANCE DISTRIBUTION & HISTOGRAMS
  const distributionData = useMemo(() => {
    const buckets = [
      { range: '< -$1k', count: 0, min: -Infinity, max: -1000 },
      { range: '-$1k to -$500', count: 0, min: -1000, max: -500 },
      { range: '-$500 to -$100', count: 0, min: -500, max: -100 },
      { range: '-$100 to $0', count: 0, min: -100, max: 0 },
      { range: '$0 to $100', count: 0, min: 0, max: 100 },
      { range: '$100 to $500', count: 0, min: 100, max: 500 },
      { range: '$500 to $1k', count: 0, min: 500, max: 1000 },
      { range: '> $1k', count: 0, min: 1000, max: Infinity }
    ];

    sortedTrades.forEach(t => {
      const p = t.pnl;
      for (const b of buckets) {
        if (p >= b.min && p < b.max) {
          b.count += 1;
          break;
        }
      }
    });

    const pieData = [
      { name: 'Wins', value: kpis.winCount, color: '#10B981' },
      { name: 'Losses', value: kpis.lossCount, color: '#F43F5E' },
      { name: 'Break-Even', value: kpis.beCount, color: '#F59E0B' }
    ].filter(d => d.value > 0);

    return {
      histogram: buckets,
      pieData
    };
  }, [sortedTrades, kpis]);

  // 5. ASSET & MARKET ANALYTICS
  const assetAnalytics = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number; wins: number; volume: number }> = {};
    
    sortedTrades.forEach(t => {
      const a = t.asset || 'XAUUSD';
      if (!map[a]) map[a] = { pnl: 0, trades: 0, wins: 0, volume: 0 };
      map[a].pnl += t.pnl;
      map[a].trades += 1;
      map[a].volume += t.size || 1;
      if (t.pnl > 0) map[a].wins += 1;
    });

    const list = Object.entries(map).map(([asset, d]) => ({
      asset,
      pnl: d.pnl,
      trades: d.trades,
      winRate: (d.wins / d.trades) * 100,
      avgPnL: d.pnl / d.trades,
      volume: d.volume
    })).sort((a, b) => b.pnl - a.pnl);

    return list;
  }, [sortedTrades]);

  // 6. SETUP ANALYTICS & EXPECTANCY
  const setupAnalytics = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number; wins: number; grossProfit: number; grossLoss: number }> = {};
    
    sortedTrades.forEach(t => {
      const s = t.setup || 'Standard Setup';
      if (!map[s]) map[s] = { pnl: 0, trades: 0, wins: 0, grossProfit: 0, grossLoss: 0 };
      map[s].pnl += t.pnl;
      map[s].trades += 1;
      if (t.pnl > 0) {
        map[s].wins += 1;
        map[s].grossProfit += t.pnl;
      } else {
        map[s].grossLoss += Math.abs(t.pnl);
      }
    });

    return Object.entries(map).map(([setup, d]) => {
      const winRate = (d.wins / d.trades) * 100;
      const avgWin = d.wins > 0 ? d.grossProfit / d.wins : 0;
      const avgLoss = (d.trades - d.wins) > 0 ? d.grossLoss / (d.trades - d.wins) : 0;
      const profitFactor = d.grossLoss > 0 ? d.grossProfit / d.grossLoss : d.grossProfit > 0 ? 99.9 : 0;
      const expectancy = (winRate / 100 * avgWin) - ((1 - (winRate / 100)) * avgLoss);
      
      return {
        setup,
        pnl: d.pnl,
        trades: d.trades,
        winRate,
        profitFactor,
        expectancy
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [sortedTrades]);

  // 7. BEHAVIORAL MISTAKES ANALYTICS
  const behavioralAnalytics = useMemo(() => {
    const mistakeMap: Record<string, { count: number; totalLoss: number }> = {};

    sortedTrades.forEach(t => {
      if (t.mistakes) {
        t.mistakes.forEach(m => {
          if (m === 'None') return;
          if (!mistakeMap[m]) mistakeMap[m] = { count: 0, totalLoss: 0 };
          mistakeMap[m].count += 1;
          mistakeMap[m].totalLoss += t.pnl;
        });
      }
    });

    const list = Object.entries(mistakeMap).map(([mistake, d]) => ({
      mistake,
      count: d.count,
      totalLoss: d.totalLoss
    })).sort((a, b) => a.totalLoss - b.totalLoss);

    return list;
  }, [sortedTrades]);

  // 8. ADVANCED INSTITUTIONAL STATISTICS
  const advancedStats = useMemo(() => {
    const totalTrades = sortedTrades.length;
    if (totalTrades === 0) {
      return {
        sqn: 0,
        sharpe: 0,
        sortino: 0,
        calmar: 0,
        kellyPct: 0,
        ulcerIndex: 0,
        payoffRatio: 0,
        riskOfRuin: 0,
        stdDevPnL: 0,
        maxConsecWins: 0,
        maxConsecLosses: 0,
        largestWin: 0,
        largestLoss: 0
      };
    }

    const pnls = sortedTrades.map(t => t.pnl);
    const avgPnL = kpis.totalPnl / totalTrades;
    
    // Standard deviation
    const variance = pnls.reduce((sum, p) => sum + Math.pow(p - avgPnL, 2), 0) / totalTrades;
    const stdDevPnL = Math.sqrt(variance);

    // Downside deviation
    const negativePnls = pnls.filter(p => p < 0);
    const downsideVariance = negativePnls.reduce((sum, p) => sum + Math.pow(p - avgPnL, 2), 0) / (negativePnls.length || 1);
    const downsideStdDev = Math.sqrt(downsideVariance);

    const sqn = stdDevPnL > 0 ? (avgPnL / stdDevPnL) * Math.sqrt(totalTrades) : 0;
    const sharpe = stdDevPnL > 0 ? (avgPnL / stdDevPnL) : 0;
    const sortino = downsideStdDev > 0 ? (avgPnL / downsideStdDev) : 0;

    const netReturnPct = (kpis.totalPnl / activeInitialCapital) * 100;
    const calmar = kpis.maxDrawdownPct > 0 ? netReturnPct / kpis.maxDrawdownPct : netReturnPct > 0 ? 99.9 : 0;
    const payoffRatio = kpis.avgLoss > 0 ? kpis.avgWin / kpis.avgLoss : 0;

    const winRatioDecimal = kpis.winRate / 100;
    const kellyPct = payoffRatio > 0 ? (winRatioDecimal - ((1 - winRatioDecimal) / payoffRatio)) * 100 : 0;

    const drawdownsSqSum = equityAnalyticsData.reduce((sum, pt) => sum + Math.pow(pt.drawdownPct, 2), 0);
    const ulcerIndex = Math.sqrt(drawdownsSqSum / totalTrades);

    let maxWins = 0;
    let maxLosses = 0;
    let curWins = 0;
    let curLosses = 0;
    let largestWin = 0;
    let largestLoss = 0;

    sortedTrades.forEach(t => {
      if (t.pnl > largestWin) largestWin = t.pnl;
      if (t.pnl < largestLoss) largestLoss = t.pnl;

      if (t.pnl > 0) {
        curWins++;
        curLosses = 0;
        if (curWins > maxWins) maxWins = curWins;
      } else if (t.pnl < 0) {
        curLosses++;
        curWins = 0;
        if (curLosses > maxLosses) maxLosses = curLosses;
      }
    });

    const w = winRatioDecimal;
    const riskOfRuin = w > 0.5 ? Math.pow((1 - w) / (1 + w), 10) * 100 : 99.9;

    return {
      sqn,
      sharpe,
      sortino,
      calmar,
      kellyPct,
      ulcerIndex,
      payoffRatio,
      riskOfRuin: Math.min(99.9, Math.max(0, riskOfRuin)),
      stdDevPnL,
      maxConsecWins: maxWins,
      maxConsecLosses: maxLosses,
      largestWin,
      largestLoss
    };
  }, [sortedTrades, kpis, activeInitialCapital, equityAnalyticsData]);

  // 9. AI PERFORMANCE INSIGHTS
  const aiInsights = useMemo(() => {
    const list = [];
    if (sortedTrades.length < 3) return [];

    if (kpis.bestSession !== 'N/A') {
      list.push({
        title: 'Session Alpha Advantage',
        confidence: 94,
        priority: 'HIGH',
        evidence: `Your executions in ${kpis.bestSession} session produce your highest net cumulative return.`,
        recommendation: `Focus 80% of your trading capital exclusively during the ${kpis.bestSession} session window to maximize edge and reduce exposure.`
      });
    }

    if (behavioralAnalytics.length > 0) {
      const topMistake = behavioralAnalytics[0];
      list.push({
        title: 'Psychological Capital Leak',
        confidence: 89,
        priority: 'HIGH',
        evidence: `The psychological error "${topMistake.mistake}" accounts for ${formatVal(topMistake.totalLoss)} in realized losses over ${topMistake.count} trades.`,
        recommendation: `Establish an automated pre-trade checklist enforcing entry rules to eliminate ${topMistake.mistake} errors.`
      });
    }

    if (kpis.avgRiskReward < 1.5) {
      list.push({
        title: 'Sub-Optimal Risk:Reward Ratio',
        confidence: 86,
        priority: 'MEDIUM',
        evidence: `Your average planned Risk:Reward ratio is currently ${kpis.avgRiskReward.toFixed(2)}, below the institutional benchmark of 1.50.`,
        recommendation: `Target a minimum 1:2.0 Risk:Reward ratio by placing take-profit targets near 15m/1HR key liquidity swing points.`
      });
    }

    if (kpis.bestAsset !== 'N/A') {
      list.push({
        title: 'Instrument Dominance',
        confidence: 92,
        priority: 'HIGH',
        evidence: `${kpis.bestAsset} represents your highest performing financial instrument.`,
        recommendation: `Increase lot sizing by 20% on ${kpis.bestAsset} setups while reducing capital allocation on underperforming assets.`
      });
    }

    return list;
  }, [sortedTrades, kpis, behavioralAnalytics, formatVal]);

  // Server-side AI Coach Audit Trigger
  const generateAiAudit = async () => {
    if (trades.length === 0) {
      alert('Please log trades in your journal before generating an AI performance audit.');
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
      if (!response.ok) throw new Error('Server returned an error');
      const result = await response.json();
      setAiReport(result.feedback);
    } catch (err) {
      setAiReport('The server-side AI Coach is currently offline. Please check your server configuration.');
    } finally {
      setLoadingAi(false);
    }
  };

  const openInfoModal = (key: string) => {
    setActiveInfoKey(key);
  };

  const closeInfoModal = () => {
    setActiveInfoKey(null);
  };

  const activeInfoModalData = activeInfoKey ? (METRIC_KNOWLEDGE_BASE[activeInfoKey] || DEFAULT_METRIC_INFO) : null;

  const handleExportCSV = () => {
    const headers = 'Metric,Value\n';
    const rows = [
      `Total Trades,${sortedTrades.length}`,
      `Net PnL,${kpis.totalPnl}`,
      `Win Rate %,${kpis.winRate.toFixed(2)}%`,
      `Profit Factor,${kpis.profitFactor.toFixed(2)}`,
      `Expectancy,${kpis.expectancy.toFixed(2)}`,
      `Max Drawdown %,${kpis.maxDrawdownPct.toFixed(2)}%`,
      `Recovery Factor,${kpis.recoveryFactor.toFixed(2)}`,
      `Discipline Score %,${kpis.disciplineScore.toFixed(2)}%`,
      `SQN,${advancedStats.sqn.toFixed(2)}`,
      `Sharpe Ratio,${advancedStats.sharpe.toFixed(2)}`,
      `Sortino Ratio,${advancedStats.sortino.toFixed(2)}`
    ].join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TradeForge_Tactical_Insights_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // REQUIREMENT: EMPTY STATE (< 3 TRADES)
  if (trades.length < 3) {
    return (
      <div className="space-y-6" id="insights-tab">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BrainCircuit className="text-blue-600" />
              Tactical & Performance Analytics
            </h1>
            <p className="text-xs text-slate-500 font-sans">Institutional-grade quantitative portfolio analysis & behavioral metrics</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center space-y-5 max-w-xl mx-auto shadow-xs">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-3xs">
            <BarChart3 size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-850">Not enough trading history to generate this analysis</h2>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Log at least <strong className="text-blue-600 font-mono">3 executed trades</strong> in your trading journal to unlock institutional equity curves, time heatmaps, behavioral mistake leaks, SQN ratings, and AI coaching observations.
            </p>
          </div>
          <div className="pt-2 flex justify-center items-center gap-3 text-2xs font-extrabold text-slate-400 uppercase font-mono">
            <span>Minimum Trades Required: 3</span>
            <span>•</span>
            <span>Current Logged Trades: {trades.length}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="insights-tab">
      
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-blue-600" />
            Tactical & Risk Performance Analytics
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Institutional portfolio analytics comparable to Bloomberg Terminal, TradeZella, and Edgewonk.
          </p>
        </div>

        {/* Action Controls & Scope */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-2xs font-extrabold rounded-xl transition cursor-pointer shadow-3xs"
          >
            <Download size={13} className="text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-2xs font-extrabold rounded-xl transition cursor-pointer shadow-3xs"
          >
            <Printer size={13} className="text-slate-500" />
            <span>Print PDF</span>
          </button>
          <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-100 px-3.5 py-1.5 rounded-xl">
            <Database size={13} className="text-blue-600" />
            <div className="text-2xs font-extrabold text-blue-800 font-sans">
              SCOPE:{' '}
              <span className="uppercase text-slate-700 font-mono">
                {selectedAccountId === 'ALL' ? 'Consolidated Portfolio' : activeAccount?.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE SUMMARY KPI CARDS */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
            <Activity size={14} className="text-blue-600" />
            Section 1 — Executive Summary KPIs
          </h2>
          <span className="text-3xs text-slate-400 font-mono">10 Institutional Metrics</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          
          {/* Card 1: Discipline Score */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">Discipline Score</span>
              <button onClick={() => openInfoModal('discipline_score')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-xl font-black font-mono ${kpis.disciplineScore >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpis.disciplineScore.toFixed(0)}%
              </span>
              <span className="text-4xs font-extrabold px-1.5 py-0.5 rounded uppercase bg-blue-50 text-blue-700">
                {kpis.disciplineScore >= 85 ? 'Institutional' : 'Needs Edge'}
              </span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5 flex justify-between items-center">
              <span>Rule adherence rate</span>
              <ArrowUpRight size={11} className="text-emerald-500" />
            </div>
          </div>

          {/* Card 2: Best Trading Session */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">Alpha Session</span>
              <button onClick={() => openInfoModal('best_session')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-black font-sans text-blue-700 uppercase">
                {kpis.bestSession}
              </span>
              <span className="text-4xs font-bold text-slate-500">Top PnL</span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5">
              Highest win probability window
            </div>
          </div>

          {/* Card 3: Best Asset */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">Alpha Asset</span>
              <button onClick={() => openInfoModal('best_asset')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-slate-850">
                {kpis.bestAsset}
              </span>
              <span className="text-4xs font-bold text-emerald-600">Optimal</span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5">
              Primary profit contributor
            </div>
          </div>

          {/* Card 4: System Expectancy */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">System EV</span>
              <button onClick={() => openInfoModal('system_expectancy')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-lg font-black font-mono ${kpis.expectancy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatVal(kpis.expectancy, { showSign: true })}
              </span>
              <span className="text-4xs text-slate-400">/trade</span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5">
              Expected value per execution
            </div>
          </div>

          {/* Card 5: Maximum Drawdown */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">Max Drawdown</span>
              <button onClick={() => openInfoModal('max_drawdown')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-rose-600">
                {kpis.maxDrawdownPct.toFixed(1)}%
              </span>
              <span className="text-4xs text-slate-400 font-mono">{formatVal(kpis.maxDrawdownUSD)}</span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5">
              Peak-to-valley risk depth
            </div>
          </div>

          {/* Card 6: Profit Factor */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">Profit Factor</span>
              <button onClick={() => openInfoModal('profit_factor')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-slate-850">
                {kpis.profitFactor === 99.9 ? '∞' : kpis.profitFactor.toFixed(2)}
              </span>
              <span className="text-4xs font-bold text-blue-600">Wins/Losses</span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5">
              Gross gains / Gross losses
            </div>
          </div>

          {/* Card 7: Win Rate */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">Win Rate %</span>
              <button onClick={() => openInfoModal('win_rate')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-emerald-600">
                {kpis.winRate.toFixed(1)}%
              </span>
              <span className="text-4xs font-mono text-slate-500">{kpis.winCount}W/{kpis.lossCount}L</span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5">
              Percentage of winning logs
            </div>
          </div>

          {/* Card 8: Average R Multiple */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">Average R</span>
              <button onClick={() => openInfoModal('avg_r_multiple')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-slate-850">
                +{kpis.avgRMultiple.toFixed(2)}R
              </span>
              <span className="text-4xs font-bold text-slate-500">Expectancy R</span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5">
              Return relative to 1R risk
            </div>
          </div>

          {/* Card 9: Recovery Factor */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">Recovery Factor</span>
              <button onClick={() => openInfoModal('recovery_factor')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-slate-850">
                {kpis.recoveryFactor === 99.9 ? '∞' : kpis.recoveryFactor.toFixed(2)}
              </span>
              <span className="text-4xs font-bold text-emerald-600">Net/DD</span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5">
              Net profit / Max drawdown
            </div>
          </div>

          {/* Card 10: Average Risk Reward */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-2 relative group hover:border-blue-300 transition duration-150">
            <div className="flex justify-between items-start text-slate-400">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">Planned R:R</span>
              <button onClick={() => openInfoModal('avg_risk_reward')} className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5" title="View Metric Explanation ℹ️">
                <Info size={13} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black font-mono text-slate-850">
                1:{kpis.avgRiskReward.toFixed(2)}
              </span>
              <span className="text-4xs font-bold text-blue-600">Planned Target</span>
            </div>
            <div className="text-4xs text-slate-400 font-sans border-t border-slate-50 pt-1.5">
              Average planned Risk:Reward
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2: EQUITY ANALYTICS */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
            <LineIcon size={14} className="text-blue-600" />
            Section 2 — Institutional Equity Analytics & Running Drawdowns
          </h2>
          <button onClick={() => openInfoModal('equity_curve')} className="text-2xs font-extrabold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
            <Info size={13} />
            <span>Equity Curve Dynamics Info</span>
          </button>
        </div>

        {/* Main Cumulative Equity Curve Chart */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
                Cumulative Realized Equity Curve & Drawdown Overlay
              </h3>
              <p className="text-4xs text-slate-400 font-sans">SEQUENTIAL TRADE LOG EXECUTION TRACKING PEAK BALANCES</p>
            </div>
            <div className="flex items-center gap-4 text-3xs font-mono">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Equity Peak: {formatVal(activeInitialCapital + Math.max(...equityAnalyticsData.map(d => d.cumulativePnl), 0))}
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Max DD: {kpis.maxDrawdownPct.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityAnalyticsData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.0}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis dataKey="tradeIndex" stroke="#94A3B8" fontSize={10} tickLine={false} tickFormatter={(val) => `#${val}`} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-3xs space-y-1 font-mono">
                          <div className="font-bold text-slate-300 border-b border-slate-800 pb-1">
                            Trade #{data.tradeIndex} • {data.date} ({data.asset})
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Trade PnL:</span>
                            <span className={data.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {formatVal(data.pnl, { showSign: true })}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Cumulative PnL:</span>
                            <span className="text-white font-bold">{formatVal(data.cumulativePnl)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Drawdown Depth:</span>
                            <span className="text-rose-400 font-bold">-{Math.abs(data.drawdownPct).toFixed(1)}% ({formatVal(data.drawdownUSD)})</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="cumulativePnl" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#equityGrad)" name="Cumulative PnL ($)" />
                <Area type="monotone" dataKey="drawdownPct" stroke="#F43F5E" strokeWidth={1.5} fillOpacity={1} fill="url(#ddGrad)" name="Drawdown %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rolling Equity & Drawdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Rolling Moving Average Chart */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 font-sans flex items-center gap-1.5">
                <Activity size={13} className="text-blue-600" />
                Rolling 10-Trade Moving Average PnL
              </h4>
              <button onClick={() => openInfoModal('rolling_expectancy')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityAnalyticsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="tradeIndex" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <RechartsTooltip 
                    formatter={(val: any) => [formatVal(Number(val) || 0, { showSign: true, decimals: 2 }), '10-Trade Avg']}
                    labelFormatter={(label) => `Trade #${label}`}
                  />
                  <Line type="monotone" dataKey="rollingAvgPnl" stroke="#3B82F6" strokeWidth={2} dot={false} name="10-Trade Moving Avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rolling Drawdown % Chart */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 font-sans flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-rose-500" />
                Rolling Drawdown Percentage (%)
              </h4>
              <button onClick={() => openInfoModal('rolling_drawdown')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityAnalyticsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="tradeIndex" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <RechartsTooltip 
                    formatter={(val: any) => [`${Math.abs(Number(val) || 0).toFixed(2)}%`, 'Drawdown %']}
                    labelFormatter={(label) => `Trade #${label}`}
                  />
                  <Area type="monotone" dataKey="drawdownPct" stroke="#F43F5E" fill="#FFE4E6" strokeWidth={1.5} name="Drawdown %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 3: PERFORMANCE DISTRIBUTION */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
            <BarChart3 size={14} className="text-blue-600" />
            Section 3 — Performance Distribution & Quantile Metrics
          </h2>
          <button onClick={() => openInfoModal('pnl_distribution')} className="text-2xs font-extrabold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
            <Info size={13} />
            <span>Distribution Info</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Trade PnL Histogram - 7 cols */}
          <div className="lg:col-span-7 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                Trade PnL Frequency Histogram ($ Distribution)
              </h3>
              <button onClick={() => openInfoModal('pnl_distribution')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData.histogram} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="range" stroke="#64748B" fontSize={8} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#94A3B8" fontSize={9} />
                  <RechartsTooltip formatter={(val: any) => [`${val} trades`, 'Trades Count']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distributionData.histogram.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.range.startsWith('-') || entry.range.startsWith('<') ? '#F43F5E' : '#10B981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win / Loss / BE Pie & Distribution - 5 cols */}
          <div className="lg:col-span-5 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                Trade Outcome Distribution (Win / Loss / BE)
              </h3>
              <button onClick={() => openInfoModal('win_loss_pie')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>

            <div className="h-[180px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                    {distributionData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => [`${val} trades`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-3xs font-mono pt-2 border-t border-slate-100">
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-slate-400 block uppercase text-4xs font-sans">Wins</span>
                <span className="text-emerald-700 font-bold text-xs">{kpis.winCount} ({kpis.winRate.toFixed(0)}%)</span>
              </div>
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-slate-400 block uppercase text-4xs font-sans">Break-Even</span>
                <span className="text-amber-700 font-bold text-xs">{kpis.beCount}</span>
              </div>
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <span className="text-slate-400 block uppercase text-4xs font-sans">Losses</span>
                <span className="text-rose-700 font-bold text-xs">{kpis.lossCount}</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 4: TIME ANALYTICS & HEATMAPS */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
            <Clock size={14} className="text-blue-600" />
            Section 4 — Time Analytics, Session Windows & Day Heatmaps
          </h2>
          <button onClick={() => openInfoModal('hourly_profitability')} className="text-2xs font-extrabold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
            <Info size={13} />
            <span>Time Edge Info</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Day of Week Heatmap - 6 cols */}
          <div className="lg:col-span-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                Day of Week Profitability Heatmap
              </h3>
              <button onClick={() => openInfoModal('day_heatmap')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>
            <div className="space-y-2.5">
              {timeAnalytics.daysData.map(d => {
                const winPct = d.trades > 0 ? (d.wins / d.trades) * 100 : 0;
                return (
                  <div key={d.day} className="flex items-center justify-between p-2.5 bg-slate-50/70 rounded-xl text-3xs font-mono">
                    <div className="w-20 font-bold font-sans text-slate-700">{d.day}</div>
                    <div className="flex-1 mx-3">
                      <div className="flex h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${d.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                          style={{ width: `${Math.min(100, Math.max(10, (Math.abs(d.pnl) / (Math.abs(kpis.totalPnl) || 1)) * 100))}%` }} 
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className={`font-bold ${d.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatVal(d.pnl, { showSign: true })}
                      </span>
                      <span className="text-slate-400 block text-4xs font-sans">{d.trades} trades ({winPct.toFixed(0)}% W)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hourly Profitability Chart - 6 cols */}
          <div className="lg:col-span-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                Hourly Execution Profitability ($ Net PnL)
              </h3>
              <button onClick={() => openInfoModal('hourly_profitability')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeAnalytics.hourlyData.filter(h => h.trades > 0)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="hour" stroke="#94A3B8" fontSize={8} />
                  <YAxis stroke="#94A3B8" fontSize={9} />
                  <RechartsTooltip 
                    formatter={(value: any) => [formatVal(Number(value) || 0, { showSign: true, decimals: 2 }), 'Net PnL']}
                    labelFormatter={(label) => `Hour: ${label}`}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {timeAnalytics.hourlyData.filter(h => h.trades > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10B981' : '#F43F5E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 5 & 6: MARKET ANALYTICS & RISK DASHBOARD */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
            <Coins size={14} className="text-blue-600" />
            Section 5 & 6 — Market Instrument & Risk Analytics
          </h2>
          <button onClick={() => openInfoModal('best_asset')} className="text-2xs font-extrabold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
            <Info size={13} />
            <span>Asset Risk Info</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Asset Breakdown Table - 7 cols */}
          <div className="lg:col-span-7 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                Asset Symbol Performance & Volume Breakdown
              </h3>
              <button onClick={() => openInfoModal('best_asset')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-3xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-sans font-extrabold">
                    <th className="py-2 px-3">Asset</th>
                    <th className="py-2 px-3">Trades</th>
                    <th className="py-2 px-3">Win Rate</th>
                    <th className="py-2 px-3">Avg Trade PnL</th>
                    <th className="py-2 px-3 text-right">Net PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {assetAnalytics.map(a => (
                    <tr key={a.asset} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{a.asset}</td>
                      <td className="py-2.5 px-3 text-slate-600">{a.trades}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold ${a.winRate >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {a.winRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{formatVal(a.avgPnL, { showSign: true })}</td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={a.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatVal(a.pnl, { showSign: true })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Dashboard & Streaks - 5 cols */}
          <div className="lg:col-span-5 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                Professional Risk & Streak Telemetry
              </h3>
              <button onClick={() => openInfoModal('max_drawdown')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-3xs text-slate-500 font-sans font-bold uppercase">Max Consecutive Wins</span>
                <span className="font-extrabold text-emerald-600">{advancedStats.maxConsecWins} Trades</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-3xs text-slate-500 font-sans font-bold uppercase">Max Consecutive Losses</span>
                <span className="font-extrabold text-rose-600">{advancedStats.maxConsecLosses} Trades</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-3xs text-slate-500 font-sans font-bold uppercase">Single Largest Win</span>
                <span className="font-extrabold text-emerald-600">{formatVal(advancedStats.largestWin, { showSign: true })}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-3xs text-slate-500 font-sans font-bold uppercase">Single Largest Loss</span>
                <span className="font-extrabold text-rose-600">{formatVal(advancedStats.largestLoss, { showSign: true })}</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 7 & 8: SETUP & BEHAVIORAL ANALYTICS */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-blue-600" />
            Section 7 & 8 — Setup Expectancy & Behavioral Mistakes Leaks
          </h2>
          <button onClick={() => openInfoModal('mistake_frequency')} className="text-2xs font-extrabold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
            <Info size={13} />
            <span>Behavioral Info</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Setup Profitability Table - 6 cols */}
          <div className="lg:col-span-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                Strategy Setup Expectancy & Profit Factor
              </h3>
              <button onClick={() => openInfoModal('setup_performance')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>
            <div className="space-y-3">
              {setupAnalytics.map(s => (
                <div key={s.setup} className="p-3 bg-slate-50/80 rounded-xl border border-slate-150 space-y-1.5 font-sans">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900">{s.setup}</span>
                    <span className={`font-mono font-extrabold ${s.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatVal(s.pnl, { showSign: true })}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-3xs font-mono text-slate-500 pt-1 border-t border-slate-200/60">
                    <div>Trades: <span className="font-bold text-slate-800">{s.trades}</span></div>
                    <div>Win Rate: <span className="font-bold text-emerald-600">{s.winRate.toFixed(0)}%</span></div>
                    <div>PF: <span className="font-bold text-blue-700">{s.profitFactor === 99.9 ? '∞' : s.profitFactor.toFixed(2)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Psychological Mistake Frequency - 6 cols */}
          <div className="lg:col-span-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                Psychological Mistake Frequency & Cost ($ Capital Leaks)
              </h3>
              <button onClick={() => openInfoModal('mistake_frequency')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                <Info size={13} />
              </button>
            </div>

            {behavioralAnalytics.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-sans space-y-1">
                <CheckCircle2 size={20} className="mx-auto text-emerald-600" />
                <strong className="block font-bold">Zero Execution Leaks Recorded</strong>
                <p className="text-3xs text-emerald-700">All logged trades strictly adhered to your trading discipline guidelines.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {behavioralAnalytics.map(b => (
                  <div key={b.mistake} className="p-3 bg-rose-50/50 border border-rose-150 rounded-xl space-y-1 text-3xs font-sans">
                    <div className="flex justify-between items-center text-xs font-bold text-rose-900">
                      <span>{b.mistake}</span>
                      <span className="font-mono text-rose-600">{formatVal(b.totalLoss, { showSign: true })}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 text-4xs font-mono">
                      <span>Occurred {b.count} times</span>
                      <span>Avg Leak: {formatVal(b.totalLoss / b.count)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* SECTION 9: ADVANCED INSTITUTIONAL STATISTICS TABLE */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
            <Scale size={14} className="text-blue-600" />
            Section 9 — Advanced Institutional Performance Statistics Table
          </h2>
          <span className="text-3xs text-slate-400 font-mono">Bloomberg & Quant Grade</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-3xs font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Metric</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Institutional Benchmark</th>
                  <th className="py-3 px-4">Status / Rating</th>
                  <th className="py-3 px-4 text-center">Info ℹ️</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-mono text-2xs">
                
                {/* SQN */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold font-sans text-slate-900">System Quality Number (SQN)</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{advancedStats.sqn.toFixed(2)}</td>
                  <td className="py-3 px-4 text-slate-500">2.0+ (Good) / 3.0+ (Excellent)</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-4xs font-black uppercase ${
                      advancedStats.sqn >= 2.0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {advancedStats.sqn >= 3.0 ? 'EXCELLENT' : advancedStats.sqn >= 2.0 ? 'GOOD' : 'AVERAGE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => openInfoModal('sqn')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </td>
                </tr>

                {/* Sharpe Ratio */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold font-sans text-slate-900">Sharpe Ratio</td>
                  <td className="py-3 px-4 font-bold text-slate-850">{advancedStats.sharpe.toFixed(2)}</td>
                  <td className="py-3 px-4 text-slate-500">2.0+ (Hedge Fund Standard)</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-4xs font-black uppercase ${
                      advancedStats.sharpe >= 2.0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {advancedStats.sharpe >= 2.0 ? 'INSTITUTIONAL' : 'STANDARD'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => openInfoModal('sharpe_ratio')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </td>
                </tr>

                {/* Sortino Ratio */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold font-sans text-slate-900">Sortino Ratio (Downside)</td>
                  <td className="py-3 px-4 font-bold text-slate-850">{advancedStats.sortino.toFixed(2)}</td>
                  <td className="py-3 px-4 text-slate-500">3.0+ (Low Downside Volatility)</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-4xs font-black uppercase ${
                      advancedStats.sortino >= 3.0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {advancedStats.sortino >= 3.0 ? 'ROBUST' : 'MODERATE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => openInfoModal('sortino_ratio')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </td>
                </tr>

                {/* Kelly % */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold font-sans text-slate-900">Kelly Criterion % (Optimal Risk)</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{advancedStats.kellyPct.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-slate-500">Half-Kelly Recommended (1% - 5%)</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-4xs font-black uppercase bg-blue-50 text-blue-700">
                      OPTIMAL SIZE
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => openInfoModal('kelly_criterion')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </td>
                </tr>

                {/* Payoff Ratio */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold font-sans text-slate-900">Payoff Ratio (Avg Win / Avg Loss)</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{advancedStats.payoffRatio.toFixed(2)}</td>
                  <td className="py-3 px-4 text-slate-500">1.50+ (Asymmetrical Advantage)</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-4xs font-black uppercase ${
                      advancedStats.payoffRatio >= 1.5 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {advancedStats.payoffRatio >= 1.5 ? 'ASYMMETRICAL' : 'BALANCED'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => openInfoModal('payoff_ratio')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </td>
                </tr>

                {/* Risk of Ruin */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold font-sans text-slate-900">Risk of Ruin %</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{advancedStats.riskOfRuin.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-slate-500">&lt; 1.0% (Capital Preserved)</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-4xs font-black uppercase bg-emerald-50 text-emerald-700">
                      ZERO RUIN RISK
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => openInfoModal('risk_of_ruin')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </td>
                </tr>

                {/* Ulcer Index */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold font-sans text-slate-900">Ulcer Index (Drawdown Stress)</td>
                  <td className="py-3 px-4 font-bold text-slate-850">{advancedStats.ulcerIndex.toFixed(2)}</td>
                  <td className="py-3 px-4 text-slate-500">&lt; 3.0 (Low Psychological Stress)</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-4xs font-black uppercase bg-blue-50 text-blue-700">
                      LOW STRESS
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => openInfoModal('ulcer_index')} className="text-slate-400 hover:text-blue-600 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 11 & 12: AI PERFORMANCE INSIGHTS & ACTIONABLE COACHING */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500 fill-amber-400" />
            Section 11 & 12 — Programmatic AI Insights & Personal Coaching
          </h2>
          <button onClick={generateAiAudit} disabled={loadingAi} className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-2xs font-extrabold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs">
            {loadingAi ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{loadingAi ? 'Analyzing Log History...' : 'Generate Gemini AI Audit'}</span>
          </button>
        </div>

        {/* AI Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiInsights.map((ins, idx) => (
            <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500 fill-amber-400" />
                  {ins.title}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-4xs font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">
                    {ins.confidence}% Confidence
                  </span>
                  <span className="text-4xs font-black bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-mono">
                    {ins.priority}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-2xs text-slate-600 font-sans leading-relaxed">
                <div><strong className="text-slate-800">Evidence:</strong> {ins.evidence}</div>
                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-900 font-semibold">
                  <strong>Recommendation:</strong> {ins.recommendation}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Server-Side Gemini AI Detailed Audit Output */}
        {aiReport && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4 animate-slideDown">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400 fill-amber-400" size={18} />
                <h3 className="text-sm font-bold tracking-tight">Institutional Gemini AI Performance Audit</h3>
              </div>
              <button onClick={() => setAiReport('')} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="text-xs leading-relaxed font-sans text-slate-200 whitespace-pre-wrap">
              {aiReport}
            </div>
          </div>
        )}

      </section>

      {/* UNIVERSAL ℹ️ INFO MODAL DIALOG */}
      {activeInfoModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-100 max-w-2xl w-full p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 animate-scaleUp max-h-[90vh] overflow-y-auto font-sans">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-3xs font-extrabold text-blue-600 uppercase tracking-widest font-mono">
                  {activeInfoModalData.category}
                </span>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Info className="text-blue-600" size={20} />
                  {activeInfoModalData.title}
                </h3>
              </div>
              <button
                onClick={closeInfoModal}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-5 text-xs text-slate-700 leading-relaxed">
              
              {/* What is it */}
              <div className="space-y-1">
                <h4 className="text-2xs font-extrabold uppercase text-slate-400 tracking-wider">What is it?</h4>
                <p className="font-medium text-slate-800">{activeInfoModalData.whatIsIt}</p>
              </div>

              {/* Why it matters */}
              <div className="space-y-1">
                <h4 className="text-2xs font-extrabold uppercase text-slate-400 tracking-wider">Why it matters</h4>
                <p className="text-slate-650">{activeInfoModalData.whyItMatters}</p>
              </div>

              {/* Formula if applicable */}
              {activeInfoModalData.formula && (
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                  <h4 className="text-3xs font-extrabold uppercase text-slate-400 tracking-wider font-mono">Formula</h4>
                  <div className="font-mono text-xs font-bold text-blue-700">{activeInfoModalData.formula}</div>
                </div>
              )}

              {/* Benchmarks Range */}
              <div className="space-y-2">
                <h4 className="text-2xs font-extrabold uppercase text-slate-400 tracking-wider">Professional Benchmarks & Interpretation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {activeInfoModalData.benchmarks.map((b, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border text-3xs font-mono space-y-1 ${
                        b.status === 'good' 
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                          : b.status === 'average' 
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
                            : 'bg-rose-50/70 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="font-bold font-sans text-xs">{b.label}</div>
                      <div className="font-black text-sm">{b.range}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical Example */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                <h4 className="text-3xs font-extrabold uppercase text-blue-700 tracking-wider">Real-World Example</h4>
                <p className="text-slate-700 font-sans text-3xs leading-normal">{activeInfoModalData.example}</p>
              </div>

              {/* Tips to Improve */}
              <div className="space-y-2">
                <h4 className="text-2xs font-extrabold uppercase text-slate-400 tracking-wider">Actionable Tips to Improve</h4>
                <ul className="space-y-1.5 text-3xs text-slate-650">
                  {activeInfoModalData.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={closeInfoModal}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Got It, Thanks!
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
