import { Trade, TradePlan, TradingAccount } from './types';

export const INITIAL_ACCOUNTS: TradingAccount[] = [
  {
    id: 'acc-1',
    name: 'Personal FTMO Funded ($100k)',
    broker: 'FTMO',
    initialBalance: 100000,
    currency: 'USD'
  },
  {
    id: 'acc-2',
    name: 'Prop Evaluation ($200k)',
    broker: 'Funding Pips',
    initialBalance: 200000,
    currency: 'USD'
  },
  {
    id: 'acc-3',
    name: 'Personal Spot Crypto',
    broker: 'Binance',
    initialBalance: 15000,
    currency: 'USDT'
  }
];

export const INITIAL_TRADE_PLANS: TradePlan[] = [
  {
    id: 'plan-1',
    date: '2026-07-16',
    asset: 'XAUUSD',
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
  },
  {
    id: 'plan-2',
    date: '2026-07-15',
    asset: 'EURUSD',
    bias: 'BULLISH',
    fourHour: {
      text: 'Bouncing from daily demand zone. High liquidity sitting above current swing high.',
      bias: 'BULLISH',
      imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80'
    },
    oneHour: {
      text: 'Consolidating above 50 EMA. Volume profiling indicates accumulation.',
      bias: 'BULLISH',
      imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80'
    },
    fifteenMin: {
      text: 'Higher high structure established. Looking for a retest of the golden pocket (61.8% Fib).',
      bias: 'BULLISH',
      imageUrl: 'https://images.unsplash.com/photo-1642390091310-1ecf18553ca7?auto=format&fit=crop&w=600&q=80'
    },
    fiveMin: {
      text: '5M dynamic demand holds. Re-accumulation phase before London session break.',
      bias: 'BULLISH',
      imageUrl: 'https://images.unsplash.com/photo-1624996379697-f01d168b1a52?auto=format&fit=crop&w=600&q=80'
    },
    macroNotes: 'Fed chairman speaking later today. DXY index showing signs of weakness at key resistance.',
    triggers: 'Limit order at 1.08450 with stop below the structure low.',
    status: 'ARCHIVED',
    createdAt: '2026-07-15T08:00:00Z'
  },
  {
    id: 'plan-3',
    date: '2026-07-16',
    asset: 'BTCUSDT',
    bias: 'BULLISH',
    fourHour: {
      text: 'Daily support level holds. Moving average convergence indicates a major breakout is pending.',
      bias: 'BULLISH',
      imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=600&q=80'
    },
    oneHour: {
      text: 'Ascending triangle forming. Spot ETF inflows increasing over consecutive sessions.',
      bias: 'BULLISH',
      imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80'
    },
    fifteenMin: {
      text: 'Consolidating near local range highs. Preparing for volume breakout.',
      bias: 'NEUTRAL',
      imageUrl: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=600&q=80'
    },
    fiveMin: {
      text: 'Micro flag structure holding above the 5m 20 EMA.',
      bias: 'BULLISH',
      imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80'
    },
    macroNotes: 'Global liquidity cycle improving. Core retail sales tomorrow.',
    triggers: 'Aggressive buy on breakout of $63,200 with local stop loss at $62,750.',
    status: 'ACTIVE',
    createdAt: '2026-07-16T01:15:00Z'
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
    status: 'WIN',
    session: 'NEW YORK',
    mistakes: ['None'],
    notes: 'Exited slightly early before TP hit as price stalled at prior demand zone. Very clean trade matching the 15m setup plan.',
    htfScreenshot: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
    ltfScreenshot: 'https://images.unsplash.com/photo-1642390091310-1ecf18553ca7?auto=format&fit=crop&w=600&q=80'
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
    status: 'WIN',
    session: 'LONDON',
    mistakes: ['None'],
    notes: 'Clean continuation pattern. Took partials at +2R.',
    htfScreenshot: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80'
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
    status: 'LOSS',
    session: 'NEW YORK',
    mistakes: ['Chased Trade'],
    notes: 'Tried to short momentum wicks over the weekend. Low liquidity stop hunt.'
  }
];
