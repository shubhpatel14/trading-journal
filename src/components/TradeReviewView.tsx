import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Maximize2,
  NotebookPen,
  Search,
  X,
} from 'lucide-react';
import { Trade, TradingAccount, getTradeNetPnl, getTradeTotalFees } from '../types';
import { getTradeDisplayDateTime } from '../utils/tradeTime';

interface TradeReviewViewProps {
  trades: Trade[];
  accounts: TradingAccount[];
  onEditTrade: (id: string, update: Partial<Trade>) => void | Promise<void>;
}

const formatDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
};

const formatMoney = (value: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`;
  }
};

const formatPrice = (value: number) => Number.isFinite(value)
  ? value.toLocaleString(undefined, { maximumFractionDigits: 5 })
  : '—';

const getSortValue = (trade: Trade) => {
  const display = getTradeDisplayDateTime(trade);
  return `${display.date}T${display.time || '00:00'}`;
};

function Stat({ label, value, tone = 'default' }: { label: string; value: React.ReactNode; tone?: 'default' | 'positive' | 'negative' }) {
  return (
    <div className="clay-pressed rounded-2xl px-4 py-3 min-w-0">
      <div className="text-4xs font-extrabold uppercase tracking-[0.12em] text-clay-muted">{label}</div>
      <div className={`mt-1 truncate text-sm font-extrabold font-mono ${
        tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : 'text-clay-foreground'
      }`} title={typeof value === 'string' ? value : undefined}>
        {value}
      </div>
    </div>
  );
}

function ScreenshotPanel({
  image,
  label,
  onOpen,
}: {
  image?: string;
  label: string;
  onOpen: (image: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white/70 shadow-clayCard">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <ImageIcon size={15} className="text-clay-accent" />
          <span className="text-2xs font-extrabold uppercase tracking-wider text-clay-foreground">{label}</span>
        </div>
        {image && (
          <button
            type="button"
            onClick={() => onOpen(image)}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-3xs font-bold text-clay-accent transition hover:bg-purple-50 cursor-pointer"
          >
            <Maximize2 size={13} />
            Expand
          </button>
        )}
      </div>
      {image ? (
        <button
          type="button"
          onClick={() => onOpen(image)}
          className="group relative block w-full cursor-zoom-in overflow-hidden bg-slate-100"
          aria-label={`Open ${label}`}
        >
          <img
            src={image}
            alt={label}
            className="h-[320px] w-full object-contain transition duration-300 group-hover:scale-[1.01] sm:h-[390px]"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition group-hover:bg-slate-950/10">
            <span className="translate-y-2 rounded-full bg-slate-950/75 px-3 py-2 text-xs font-bold text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
              View full size
            </span>
          </div>
        </button>
      ) : (
        <div className="flex h-[220px] flex-col items-center justify-center gap-2 bg-white/45 text-clay-muted sm:h-[300px]">
          <ImageIcon size={30} strokeWidth={1.6} />
          <span className="text-xs font-bold">No {label.toLowerCase()} attached</span>
        </div>
      )}
    </div>
  );
}

export default function TradeReviewView({ trades, accounts, onEditTrade }: TradeReviewViewProps) {
  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => getSortValue(b).localeCompare(getSortValue(a))),
    [trades],
  );
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(sortedTrades[0]?.id ?? null);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'PENDING' | 'REVIEWED'>('ALL');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const visibleTrades = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedTrades.filter((trade) => {
      const display = getTradeDisplayDateTime(trade);
      if (dateFilter && display.date !== dateFilter) return false;
      if (reviewFilter === 'PENDING' && trade.reviewedAt) return false;
      if (reviewFilter === 'REVIEWED' && !trade.reviewedAt) return false;
      if (!query) return true;
      return [trade.asset, trade.setup, trade.direction, trade.session, trade.status]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [sortedTrades, dateFilter, reviewFilter, search]);

  const selectedTrade = sortedTrades.find((trade) => trade.id === selectedTradeId) ?? visibleTrades[0] ?? null;

  useEffect(() => {
    if (selectedTrade) setNotes(selectedTrade.notes || '');
  }, [selectedTrade?.id, selectedTrade?.notes]);

  useEffect(() => {
    if (visibleTrades.length > 0 && !visibleTrades.some((trade) => trade.id === selectedTradeId)) {
      setSelectedTradeId(visibleTrades[0].id);
    }
  }, [visibleTrades, selectedTradeId]);

  const saveTrade = async (markReviewed?: boolean) => {
    if (!selectedTrade) return;
    setIsSaving(true);
    setSavedNotice(false);
    try {
      await onEditTrade(selectedTrade.id, {
        notes,
        ...(markReviewed ? { reviewedAt: new Date().toISOString() } : {}),
      });
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2200);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleReviewed = async () => {
    if (!selectedTrade) return;
    if (selectedTrade.reviewedAt) {
      setIsSaving(true);
      try {
        await onEditTrade(selectedTrade.id, { notes, reviewedAt: undefined });
      } finally {
        setIsSaving(false);
      }
      return;
    }
    await saveTrade(true);
  };

  const moveSelection = (direction: -1 | 1) => {
    if (!selectedTrade || visibleTrades.length < 2) return;
    const index = visibleTrades.findIndex((trade) => trade.id === selectedTrade.id);
    const nextIndex = Math.min(Math.max(index + direction, 0), visibleTrades.length - 1);
    setSelectedTradeId(visibleTrades[nextIndex].id);
  };

  if (sortedTrades.length === 0) {
    return (
      <div className="clay-surface flex min-h-[460px] flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="clay-pressed rounded-full p-5 text-clay-accent"><NotebookPen size={30} /></div>
        <h1 className="text-2xl">Trade Review</h1>
        <p className="max-w-md text-sm text-clay-muted">Log a trade in the journal first. Its screenshots, execution stats, and review notes will appear here.</p>
      </div>
    );
  }

  const account = selectedTrade ? accounts.find((item) => item.id === selectedTrade.accountId) : undefined;
  const display = selectedTrade ? getTradeDisplayDateTime(selectedTrade) : null;
  const totalFees = selectedTrade ? getTradeTotalFees(selectedTrade, account?.commissionPerLot ?? 7) : 0;
  const netPnl = selectedTrade ? getTradeNetPnl(selectedTrade, account?.commissionPerLot ?? 7) : 0;
  const plannedRisk = selectedTrade ? Math.abs(selectedTrade.entryPrice - selectedTrade.sl) : 0;
  const plannedReward = selectedTrade ? Math.abs(selectedTrade.tp - selectedTrade.entryPrice) : 0;
  const plannedRR = plannedRisk > 0 ? plannedReward / plannedRisk : 0;

  return (
    <div className="space-y-6" id="trade-review-tab">
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-md sm:p-8" onClick={() => setLightbox(null)}>
          <div className="relative flex h-full w-full max-w-7xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setLightbox(null)} className="absolute right-1 top-1 z-10 rounded-full bg-white/90 p-2.5 text-slate-800 shadow-lg transition hover:bg-white cursor-pointer" aria-label="Close image">
              <X size={20} />
            </button>
            <img src={lightbox} alt="Expanded trade screenshot" className="max-h-[92vh] max-w-full rounded-2xl object-contain shadow-2xl" />
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-2xs font-extrabold uppercase tracking-[0.16em] text-clay-accent">
            <CheckCircle2 size={15} /> Focused review workspace
          </div>
          <h1 className="text-3xl tracking-tight">Trade Review</h1>
          <p className="mt-1 text-sm text-clay-muted">Inspect the full execution, study both charts, capture the lesson, then close the review.</p>
        </div>
        <div className="clay-pill self-start sm:self-auto">
          <Check size={13} className="text-emerald-600" />
          {sortedTrades.filter((trade) => trade.reviewedAt).length} of {sortedTrades.length} reviewed
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="clay-surface p-4 lg:sticky lg:top-4">
          <div className="space-y-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-clay-muted" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search trade or setup" className="clay-pressed w-full rounded-2xl py-2.5 pl-9 pr-3 text-xs text-clay-foreground placeholder:text-clay-muted/70" />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="clay-pressed min-w-0 rounded-2xl px-3 py-2.5 text-xs font-bold text-clay-foreground" />
              {dateFilter && <button type="button" onClick={() => setDateFilter('')} className="rounded-2xl bg-white/70 px-3 text-xs font-bold text-clay-muted hover:text-clay-accent cursor-pointer">Clear</button>}
            </div>
            <div className="clay-pressed grid grid-cols-3 rounded-2xl p-1">
              {(['ALL', 'PENDING', 'REVIEWED'] as const).map((filter) => (
                <button key={filter} type="button" onClick={() => setReviewFilter(filter)} className={`rounded-xl px-1 py-2 text-[9px] font-extrabold tracking-wide transition cursor-pointer ${reviewFilter === filter ? 'bg-white text-clay-accent shadow-sm' : 'text-clay-muted'}`}>
                  {filter === 'ALL' ? 'All' : filter === 'PENDING' ? 'Pending' : 'Reviewed'}
                </button>
              ))}
            </div>
          </div>

          <div className="custom-scrollbar mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {visibleTrades.length === 0 ? (
              <div className="py-10 text-center text-xs font-bold text-clay-muted">No trades match these filters.</div>
            ) : visibleTrades.map((trade) => {
              const itemDisplay = getTradeDisplayDateTime(trade);
              const itemAccount = accounts.find((item) => item.id === trade.accountId);
              const itemNet = getTradeNetPnl(trade, itemAccount?.commissionPerLot ?? 7);
              const active = trade.id === selectedTrade?.id;
              return (
                <button key={trade.id} type="button" onClick={() => setSelectedTradeId(trade.id)} className={`w-full rounded-2xl p-3 text-left transition cursor-pointer ${active ? 'bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-clayButton' : 'bg-white/65 text-clay-foreground hover:-translate-y-0.5 hover:bg-white'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-extrabold font-mono">{trade.asset}</span>
                        <span className={`rounded-lg px-1.5 py-0.5 text-[9px] font-black ${active ? 'bg-white/20' : trade.direction === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{trade.direction}</span>
                      </div>
                      <div className={`mt-1 truncate text-[10px] font-bold ${active ? 'text-white/75' : 'text-clay-muted'}`}>{formatDate(itemDisplay.date)} · {itemDisplay.time}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-black font-mono ${active ? 'text-white' : itemNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{itemNet >= 0 ? '+' : ''}{formatMoney(itemNet, itemAccount?.currency)}</div>
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] font-bold ${active ? 'text-white/75' : trade.reviewedAt ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {trade.reviewedAt ? <CheckCircle2 size={10} /> : <Clock3 size={10} />}{trade.reviewedAt ? 'Reviewed' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {selectedTrade && display && (
          <section className="min-w-0 space-y-6">
            <div className="clay-surface p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                <div className="flex items-start gap-3">
                  <div className={`rounded-2xl p-3 text-white shadow-clayButton ${selectedTrade.direction === 'BUY' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-rose-400 to-rose-600'}`}>
                    {selectedTrade.direction === 'BUY' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black font-mono">{selectedTrade.asset}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-4xs font-black uppercase tracking-wider ${netPnl >= 0 ? 'bg-emerald-100 text-emerald-700' : netPnl < 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{selectedTrade.status}</span>
                      {selectedTrade.reviewedAt && <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-4xs font-black uppercase tracking-wider text-purple-700"><CheckCircle2 size={11} /> Reviewed</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-clay-muted">
                      <span className="flex items-center gap-1.5"><CalendarDays size={13} />{formatDate(display.date)}</span>
                      <span className="flex items-center gap-1.5"><Clock3 size={13} />{display.time}{display.isIstConversion ? ' IST' : ''}</span>
                      <span>{selectedTrade.session}</span>
                      <span>{account?.name || 'Unknown account'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end xl:self-auto">
                  <button type="button" onClick={() => moveSelection(-1)} disabled={visibleTrades.findIndex((trade) => trade.id === selectedTrade.id) <= 0} className="clay-button clay-button-secondary min-h-0 p-2.5 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous trade"><ChevronLeft size={16} /></button>
                  <button type="button" onClick={() => moveSelection(1)} disabled={visibleTrades.findIndex((trade) => trade.id === selectedTrade.id) >= visibleTrades.length - 1} className="clay-button clay-button-secondary min-h-0 p-2.5 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next trade"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <ScreenshotPanel image={selectedTrade.htfScreenshot} label="High timeframe chart" onOpen={setLightbox} />
              <ScreenshotPanel image={selectedTrade.ltfScreenshot} label="Entry timeframe chart" onOpen={setLightbox} />
            </div>

            <div className="clay-surface p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg">Trade statistics</h3>
                  <p className="text-xs text-clay-muted">Complete execution and outcome details for this trade.</p>
                </div>
                <div className={`text-right text-xl font-black font-mono ${netPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {netPnl >= 0 ? '+' : ''}{formatMoney(netPnl, account?.currency)}
                  <div className="text-[9px] font-extrabold uppercase tracking-wider text-clay-muted">Net P&amp;L</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                <Stat label="Direction" value={selectedTrade.direction} />
                <Stat label="Setup" value={selectedTrade.setup || '—'} />
                <Stat label="Session" value={selectedTrade.session} />
                <Stat label="Position size" value={`${selectedTrade.size} lots`} />
                <Stat label="Entry price" value={formatPrice(selectedTrade.entryPrice)} />
                <Stat label="Exit price" value={formatPrice(selectedTrade.exitPrice)} />
                <Stat label="Stop loss" value={formatPrice(selectedTrade.sl)} />
                <Stat label="Take profit" value={formatPrice(selectedTrade.tp)} />
                <Stat label="Gross P&L" value={formatMoney(selectedTrade.pnl, account?.currency)} tone={selectedTrade.pnl >= 0 ? 'positive' : 'negative'} />
                <Stat label="Commission" value={formatMoney(Math.abs(selectedTrade.commission ?? selectedTrade.size * (account?.commissionPerLot ?? 7)), account?.currency)} />
                <Stat label="Swap" value={formatMoney(Math.abs(selectedTrade.swap || 0), account?.currency)} />
                <Stat label="Other fees" value={formatMoney(Math.abs(selectedTrade.fee || 0), account?.currency)} />
                <Stat label="Total fees" value={formatMoney(totalFees, account?.currency)} />
                <Stat label="Planned R:R" value={plannedRR > 0 ? `1 : ${plannedRR.toFixed(2)}` : '—'} />
                <Stat label="Trade grade" value={selectedTrade.tradeGrade || 'Not graded'} />
                <Stat label="Journal" value={selectedTrade.journalingStatus || 'PENDING'} />
                <Stat label="Rule score" value={selectedTrade.setupRuleMaxScore ? `${selectedTrade.setupRuleScore || 0} / ${selectedTrade.setupRuleMaxScore}` : '—'} />
                <Stat label="Source" value={selectedTrade.source || 'Manual'} />
                <Stat label="Broker open" value={selectedTrade.openTime || `${selectedTrade.date} ${selectedTrade.time}`} />
                <Stat label="Broker close" value={selectedTrade.closeTime || '—'} />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="clay-pressed rounded-2xl p-4">
                  <div className="text-4xs font-extrabold uppercase tracking-[0.12em] text-clay-muted">Mistakes tagged</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTrade.mistakes?.length && selectedTrade.mistakes.some((mistake) => mistake !== 'None')
                      ? selectedTrade.mistakes.filter((mistake) => mistake !== 'None').map((mistake) => <span key={mistake} className="rounded-full bg-rose-100 px-2.5 py-1 text-3xs font-bold text-rose-700">{mistake}</span>)
                      : <span className="text-xs font-bold text-emerald-600">No mistakes tagged</span>}
                  </div>
                </div>
                <div className="clay-pressed rounded-2xl p-4">
                  <div className="text-4xs font-extrabold uppercase tracking-[0.12em] text-clay-muted">Review completed</div>
                  <div className="mt-2 text-xs font-bold text-clay-foreground">{selectedTrade.reviewedAt ? new Date(selectedTrade.reviewedAt).toLocaleString('en-IN') : 'Still waiting for focused review'}</div>
                </div>
              </div>
            </div>

            <div className="clay-surface p-5 sm:p-6">
              <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h3 className="flex items-center gap-2 text-lg"><NotebookPen size={18} className="text-clay-accent" /> Review notes</h3>
                  <p className="text-xs text-clay-muted">Record what happened, what you learned, and the exact adjustment for the next execution.</p>
                </div>
                {savedNotice && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><Check size={14} /> Saved</span>}
              </div>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={7} placeholder="What did price do? Was the entry valid? What will you repeat or change next time?" className="clay-pressed w-full resize-y rounded-3xl px-4 py-4 text-sm leading-6 text-clay-foreground placeholder:text-clay-muted/60" />
              <div className="mt-4 flex flex-col-reverse justify-end gap-3 sm:flex-row">
                <button type="button" onClick={() => saveTrade(false)} disabled={isSaving || notes === (selectedTrade.notes || '')} className="clay-button clay-button-secondary px-5 text-xs disabled:cursor-not-allowed disabled:opacity-45">Save notes</button>
                <button type="button" onClick={toggleReviewed} disabled={isSaving} className={`clay-button px-5 text-xs ${selectedTrade.reviewedAt ? 'clay-button-secondary text-emerald-700' : 'clay-button-primary'}`}>
                  <CheckCircle2 size={16} />
                  {isSaving ? 'Saving…' : selectedTrade.reviewedAt ? 'Reviewed · Mark pending' : 'Mark trade as reviewed'}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
