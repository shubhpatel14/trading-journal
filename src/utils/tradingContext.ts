import {
  DailyReview,
  SetupDefinition,
  Trade,
  TradePlan,
  TradingAccount,
  WeeklyReview,
  getTradeNetPnl,
} from '../types';

interface TradingContextInput {
  trades: Trade[];
  plans: TradePlan[];
  setups: SetupDefinition[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  accounts: TradingAccount[];
  selectedAccountId: string;
}

interface BreakdownRow {
  name: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
}

const round = (value: number, digits = 2) => {
  const multiplier = 10 ** digits;
  return Math.round((Number.isFinite(value) ? value : 0) * multiplier) / multiplier;
};

const clip = (value: string | undefined, max = 240) => (value || '').trim().slice(0, max);

const tradeTimestamp = (trade: Trade) => `${trade.date || ''}T${trade.time || '00:00'}`;

const summarizeBreakdown = (
  trades: Trade[],
  netPnlById: Map<string, number>,
  getKey: (trade: Trade) => string,
): BreakdownRow[] => {
  const rows = new Map<string, { trades: number; wins: number; losses: number; netPnl: number }>();
  trades.forEach(trade => {
    const name = getKey(trade) || 'Unspecified';
    const current = rows.get(name) || { trades: 0, wins: 0, losses: 0, netPnl: 0 };
    const netPnl = netPnlById.get(trade.id) || 0;
    current.trades += 1;
    current.wins += netPnl > 0 ? 1 : 0;
    current.losses += netPnl < 0 ? 1 : 0;
    current.netPnl += netPnl;
    rows.set(name, current);
  });

  return [...rows.entries()]
    .map(([name, row]) => ({
      name,
      ...row,
      winRate: round(row.trades ? (row.wins / row.trades) * 100 : 0, 1),
      netPnl: round(row.netPnl),
    }))
    .sort((left, right) => right.netPnl - left.netPnl);
};

export function buildTradingContext({
  trades,
  plans,
  setups,
  dailyReviews,
  weeklyReviews,
  accounts,
  selectedAccountId,
}: TradingContextInput) {
  const accountById = new Map(accounts.map(account => [account.id, account]));
  const setupById = new Map(setups.map(setup => [setup.id, setup]));
  const orderedTrades = [...trades].sort((a, b) => tradeTimestamp(a).localeCompare(tradeTimestamp(b)));
  const closedTrades = orderedTrades.filter(trade => trade.status !== 'OPEN');
  const openTrades = orderedTrades.filter(trade => trade.status === 'OPEN');
  const netPnlById = new Map(closedTrades.map(trade => {
    const commissionRate = accountById.get(trade.accountId)?.commissionPerLot ?? 7;
    return [trade.id, getTradeNetPnl(trade, commissionRate)] as const;
  }));
  const outcomes = closedTrades.map(trade => netPnlById.get(trade.id) || 0);
  const wins = outcomes.filter(value => value > 0);
  const losses = outcomes.filter(value => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const totalNetPnl = outcomes.reduce((sum, value) => sum + value, 0);

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  closedTrades.forEach(trade => {
    equity += netPnlById.get(trade.id) || 0;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });

  const setupPerformance = summarizeBreakdown(closedTrades, netPnlById, trade =>
    (trade.setupId && setupById.get(trade.setupId)?.name) || trade.setup || 'Unspecified',
  );
  const assetPerformance = summarizeBreakdown(closedTrades, netPnlById, trade => trade.asset);
  const sessionPerformance = summarizeBreakdown(closedTrades, netPnlById, trade => trade.session);
  const mistakeMap = new Map<string, { occurrences: number; associatedNetPnl: number }>();
  closedTrades.forEach(trade => {
    (trade.mistakes || [])
      .filter(mistake => mistake && mistake.toLowerCase() !== 'none')
      .forEach(mistake => {
        const current = mistakeMap.get(mistake) || { occurrences: 0, associatedNetPnl: 0 };
        current.occurrences += 1;
        current.associatedNetPnl += netPnlById.get(trade.id) || 0;
        mistakeMap.set(mistake, current);
      });
  });

  const compactTradeLimit = 250;
  const compactTrades = orderedTrades.slice(-compactTradeLimit).reverse().map(trade => ({
    date: trade.date,
    time: trade.time,
    asset: trade.asset,
    setup: (trade.setupId && setupById.get(trade.setupId)?.name) || trade.setup,
    direction: trade.direction,
    session: trade.session,
    status: trade.status,
    netPnl: trade.status === 'OPEN' ? null : round(netPnlById.get(trade.id) || 0),
    size: trade.size,
    entryPrice: trade.entryPrice,
    exitPrice: trade.status === 'OPEN' ? null : trade.exitPrice,
    stopLoss: trade.sl,
    takeProfit: trade.tp,
    mistakes: (trade.mistakes || []).filter(mistake => mistake.toLowerCase() !== 'none'),
    checklistScore: trade.checklistScore,
    checklistMax: trade.maxChecklistScore,
    notes: clip(trade.notes),
  }));

  const scopedAccounts = selectedAccountId === 'ALL'
    ? accounts
    : accounts.filter(account => account.id === selectedAccountId);

  return {
    generatedAt: new Date().toISOString(),
    scope: {
      account: selectedAccountId === 'ALL'
        ? 'All accounts'
        : scopedAccounts[0]?.name || selectedAccountId,
      currency: scopedAccounts[0]?.currency || accounts[0]?.currency || 'USD',
      recordRange: closedTrades.length
        ? { from: closedTrades[0].date, to: closedTrades[closedTrades.length - 1].date }
        : null,
    },
    performance: {
      totalRecords: orderedTrades.length,
      closedTrades: closedTrades.length,
      openPositions: openTrades.length,
      wins: wins.length,
      losses: losses.length,
      breakeven: closedTrades.length - wins.length - losses.length,
      winRate: round(closedTrades.length ? (wins.length / closedTrades.length) * 100 : 0, 1),
      netPnl: round(totalNetPnl),
      averageNetPnl: round(closedTrades.length ? totalNetPnl / closedTrades.length : 0),
      averageWin: round(wins.length ? grossProfit / wins.length : 0),
      averageLoss: round(losses.length ? grossLoss / losses.length : 0),
      profitFactor: grossLoss ? round(grossProfit / grossLoss) : null,
      maxRealizedDrawdownAmount: round(maxDrawdown),
    },
    breakdowns: {
      setups: setupPerformance,
      assets: assetPerformance,
      sessions: sessionPerformance,
      mistakes: [...mistakeMap.entries()]
        .map(([name, row]) => ({ name, occurrences: row.occurrences, associatedNetPnl: round(row.associatedNetPnl) }))
        .sort((left, right) => left.associatedNetPnl - right.associatedNetPnl),
    },
    openPositions: openTrades.slice(-25).reverse().map(trade => ({
      date: trade.date,
      time: trade.time,
      asset: trade.asset,
      setup: trade.setup,
      direction: trade.direction,
      size: trade.size,
      entryPrice: trade.entryPrice,
      stopLoss: trade.sl,
      takeProfit: trade.tp,
      notes: clip(trade.notes),
    })),
    activePlans: plans.filter(plan => plan.status === 'ACTIVE').slice(0, 25).map(plan => ({
      date: plan.date,
      asset: plan.asset,
      setup: plan.setupId ? setupById.get(plan.setupId)?.name : undefined,
      bias: plan.bias,
      triggers: clip(plan.triggers, 320),
      macroNotes: clip(plan.macroNotes, 240),
    })),
    playbooks: setups.filter(setup => setup.status === 'ACTIVE').slice(0, 30).map(setup => ({
      name: setup.name,
      description: clip(setup.description, 240),
      preferredAssets: setup.preferredAssets,
      preferredSessions: setup.preferredSessions,
      direction: setup.direction,
      marketConditions: clip(setup.marketConditions, 240),
      entryRules: setup.entryRules.slice(0, 8),
      invalidationRules: setup.invalidationRules.slice(0, 6),
      managementRules: setup.managementRules.slice(0, 6),
    })),
    recentReviews: {
      daily: [...dailyReviews].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).map(review => ({
        date: review.date,
        rating: review.rating,
        ruleAdherence: review.ruleAdherence,
        whatWentWell: clip(review.whatWentWell),
        improvementsNeeded: clip(review.improvementsNeeded),
        mistakes: review.mistakesAnalyzed,
        actionItems: clip(review.actionItems),
      })),
      weekly: [...weeklyReviews].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)).slice(0, 8).map(review => ({
        weekStart: review.weekStartDate,
        weekEnd: review.weekEndDate,
        grade: review.grade,
        keyLessons: clip(review.keyLessons, 320),
        nextWeekFocus: clip(review.focusGoalsNextWeek, 320),
        topMistakes: review.topMistakes,
        notes: clip(review.weeklyNotes, 320),
      })),
    },
    compactTrades,
    contextCoverage: {
      includedCompactTrades: compactTrades.length,
      totalTradeRecords: orderedTrades.length,
      compactTradeLimit,
      aggregateBreakdownsCoverAllClosedTrades: true,
    },
  };
}
