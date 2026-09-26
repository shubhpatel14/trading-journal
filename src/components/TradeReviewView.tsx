import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Image as ImageIcon,
  Layers,
  Maximize2,
  NotebookPen,
  Search,
  Target,
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
  timeframeTag,
  onOpen,
}: {
  image?: string;
  label: string;
  timeframeTag?: string;
  onOpen: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white/70 shadow-clayCard">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <ImageIcon size={15} className="text-clay-accent" />
          {timeframeTag && (
            <span className="rounded-lg bg-purple-100 border border-purple-200/80 px-1.5 py-0.5 text-4xs font-black text-purple-700 font-mono">
              {timeframeTag}
            </span>
          )}
          <span className="text-2xs font-extrabold uppercase tracking-wider text-clay-foreground">{label}</span>
        </div>
        {image && (
          <button
            type="button"
            onClick={onOpen}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-3xs font-bold text-clay-accent transition hover:bg-purple-50 cursor-pointer"
          >
            <Maximize2 size={13} />
            Zoom
          </button>
        )}
      </div>
      {image ? (
        <button
          type="button"
          onClick={onOpen}
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
              View full size zoom
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
  const [currentPage, setCurrentPage] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [isZoomGalleryOpen, setIsZoomGalleryOpen] = useState(false);
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0);

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

  // Keep the sidebar light by rendering five trading dates at a time, matching
  // the Journal Logs pagination pattern. Selection/navigation still uses the
  // complete filtered list so previous/next never skips a trade.
  const DAYS_PER_PAGE = 5;
  const uniqueDates = useMemo(
    () => Array.from(new Set(visibleTrades.map((trade) => getTradeDisplayDateTime(trade).date))),
    [visibleTrades],
  );
  const totalPages = Math.max(1, Math.ceil(uniqueDates.length / DAYS_PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedTrades = useMemo(() => {
    const pageDates = new Set(uniqueDates.slice((safePage - 1) * DAYS_PER_PAGE, safePage * DAYS_PER_PAGE));
    return visibleTrades.filter((trade) => pageDates.has(getTradeDisplayDateTime(trade).date));
  }, [uniqueDates, safePage, visibleTrades]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter, reviewFilter]);

  const selectedTrade = sortedTrades.find((trade) => trade.id === selectedTradeId) ?? visibleTrades[0] ?? null;

  useEffect(() => {
    if (selectedTrade) setNotes(selectedTrade.notes || '');
  }, [selectedTrade?.id, selectedTrade?.notes]);

  useEffect(() => {
    if (visibleTrades.length > 0 && !visibleTrades.some((trade) => trade.id === selectedTradeId)) {
      const firstTrade = visibleTrades[0];
      setSelectedTradeId(firstTrade.id);
      const dateIndex = uniqueDates.indexOf(getTradeDisplayDateTime(firstTrade).date);
      if (dateIndex >= 0) setCurrentPage(Math.floor(dateIndex / DAYS_PER_PAGE) + 1);
    }
  }, [visibleTrades, selectedTradeId, uniqueDates]);

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

  const moveSelection = useCallback((direction: -1 | 1) => {
    if (!selectedTrade || visibleTrades.length < 2) return;
    const index = visibleTrades.findIndex((trade) => trade.id === selectedTrade.id);
    const nextIndex = Math.min(Math.max(index + direction, 0), visibleTrades.length - 1);
    const nextTrade = visibleTrades[nextIndex];
    if (!nextTrade) return;
    setSelectedTradeId(nextTrade.id);
    const nextDateIndex = uniqueDates.indexOf(getTradeDisplayDateTime(nextTrade).date);
    setCurrentPage(Math.floor(nextDateIndex / DAYS_PER_PAGE) + 1);
  }, [selectedTrade, visibleTrades, uniqueDates]);

  const selectTrade = (trade: Trade) => {
    setSelectedTradeId(trade.id);
    const dateIndex = uniqueDates.indexOf(getTradeDisplayDateTime(trade).date);
    if (dateIndex >= 0) setCurrentPage(Math.floor(dateIndex / DAYS_PER_PAGE) + 1);
  };

  const account = selectedTrade ? accounts.find((item) => item.id === selectedTrade.accountId) : undefined;
  const display = selectedTrade ? getTradeDisplayDateTime(selectedTrade) : null;
  const totalFees = selectedTrade ? getTradeTotalFees(selectedTrade, account?.commissionPerLot ?? 7) : 0;
  const netPnl = selectedTrade ? getTradeNetPnl(selectedTrade, account?.commissionPerLot ?? 7) : 0;
  const plannedRisk = selectedTrade ? Math.abs(selectedTrade.entryPrice - selectedTrade.sl) : 0;
  const plannedReward = selectedTrade ? Math.abs(selectedTrade.tp - selectedTrade.entryPrice) : 0;
  const plannedRR = plannedRisk > 0 ? plannedReward / plannedRisk : 0;

  // Strict timeframe order as requested: LTF, HTF, 15m, 1hr, 4hr
  const orderedScreenshotDefs = useMemo(() => [
    {
      key: 'ltf',
      label: 'LTF',
      badgeTitle: 'LTF (Entry)',
      fullName: 'Low Timeframe (Entry) Chart',
      image: selectedTrade?.ltfScreenshot,
      description: 'Execution trigger, entry confirmation, candle action and immediate invalidation',
    },
    {
      key: 'htf',
      label: 'HTF',
      badgeTitle: 'HTF (Context)',
      fullName: 'High Timeframe (HTF) Chart',
      image: selectedTrade?.htfScreenshot,
      description: 'Macro structure, major support / resistance, high timeframe bias and market regime',
    },
    {
      key: '15m',
      label: '15m',
      badgeTitle: '15 Min Structure',
      fullName: '15 Minute Chart',
      image: selectedTrade?.fifteenMinuteScreenshot,
      description: 'Intermediate market structure, liquidity sweeps, order blocks and session ranges',
    },
    {
      key: '1hr',
      label: '1hr',
      badgeTitle: '1 Hour Trend',
      fullName: '1 Hour Chart',
      image: selectedTrade?.oneHourScreenshot,
      description: 'Hourly trend alignment, fair value gaps, key levels and structural shifts',
    },
    {
      key: '4hr',
      label: '4hr',
      badgeTitle: '4 Hour Trend',
      fullName: '4 Hour Chart',
      image: selectedTrade?.fourHourScreenshot,
      description: 'Swing structure, 4H supply & demand zones, overarching market narrative',
    },
  ], [selectedTrade]);

  const availableScreenshots = useMemo(() => {
    return orderedScreenshotDefs.filter(
      (item): item is typeof item & { image: string } => Boolean(item.image && item.image.trim().length > 0),
    );
  }, [orderedScreenshotDefs]);

  const hasScreenshots = availableScreenshots.length > 0;

  const activeMistakes = useMemo(() => {
    if (!selectedTrade?.mistakes || !Array.isArray(selectedTrade.mistakes)) return [];
    return selectedTrade.mistakes.filter(
      (m) => typeof m === 'string' && m.trim().length > 0 && m.trim().toLowerCase() !== 'none',
    );
  }, [selectedTrade?.mistakes]);

  const goToPrevScreenshot = useCallback(() => {
    if (availableScreenshots.length <= 1) return;
    setCurrentScreenshotIndex((prev) => (prev > 0 ? prev - 1 : availableScreenshots.length - 1));
  }, [availableScreenshots.length]);

  const goToNextScreenshot = useCallback(() => {
    if (availableScreenshots.length <= 1) return;
    setCurrentScreenshotIndex((prev) => (prev < availableScreenshots.length - 1 ? prev + 1 : 0));
  }, [availableScreenshots.length]);

  // Handle keyboard navigation: Left/Right arrows in Review tab to change trades,
  // and Left/Right arrows in Screenshot Viewer to change screenshots!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is currently typing in an input or textarea, don't intercept arrow keys
      const target = e.target as HTMLElement | null;
      const isEditing = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (isEditing) return;

      if (isZoomGalleryOpen) {
        if (e.key === 'Escape') {
          setIsZoomGalleryOpen(false);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goToPrevScreenshot();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          goToNextScreenshot();
        }
      } else {
        // Trade Review Tab keyboard shortcuts for Previous / Next trade
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          moveSelection(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          moveSelection(1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomGalleryOpen, goToPrevScreenshot, goToNextScreenshot, moveSelection]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isZoomGalleryOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isZoomGalleryOpen]);

  const openZoomForTimeframe = (timeframeKey: string) => {
    const index = availableScreenshots.findIndex((item) => item.key === timeframeKey);
    setCurrentScreenshotIndex(index >= 0 ? index : 0);
    setIsZoomGalleryOpen(true);
  };

  const activeScreenshot = availableScreenshots[currentScreenshotIndex] || availableScreenshots[0];

  if (sortedTrades.length === 0) {
    return (
      <div className="clay-surface flex min-h-[460px] flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="clay-pressed rounded-full p-5 text-clay-accent"><NotebookPen size={30} /></div>
        <h1 className="text-2xl">Trade Review</h1>
        <p className="max-w-md text-sm text-clay-muted">Log a trade in the journal first. Its screenshots, execution stats, and review notes will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="trade-review-tab">
      {/* Lightbox for fallback single image view */}
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

      {/* Zoom Mode Gallery Modal: Horizontal Slide Viewer with Middle Corner Navigation Buttons */}
      {isZoomGalleryOpen && selectedTrade && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl text-white overflow-hidden animate-in fade-in duration-200 select-none"
          role="dialog"
          aria-modal="true"
          aria-label="Trade screenshots zoom view"
        >
          {/* Sticky Top Header inside Zoom Mode */}
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 sm:px-6 backdrop-blur-md">
            {/* Left: Trade Context & Outcomes */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${
                  selectedTrade.direction === 'BUY'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                    : 'bg-gradient-to-br from-rose-500 to-rose-700'
                }`}
              >
                {selectedTrade.direction === 'BUY' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-lg text-white">{selectedTrade.asset}</span>
                  <span
                    className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border ${
                      netPnl >= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {netPnl >= 0 ? '+' : ''}{formatMoney(netPnl, account?.currency)} Net
                  </span>
                  <span className="hidden sm:inline-block text-xs font-semibold text-slate-300 font-mono">
                    Strategy: {selectedTrade.setup || 'Discretionary'}
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Jump to Timeframe Pills */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-1">
              {orderedScreenshotDefs.map((def) => {
                const targetIdx = availableScreenshots.findIndex((s) => s.key === def.key);
                const isAttached = targetIdx >= 0;
                const isActive = isAttached && targetIdx === currentScreenshotIndex;
                return (
                  <button
                    key={def.key}
                    type="button"
                    onClick={() => {
                      if (isAttached) {
                        setCurrentScreenshotIndex(targetIdx);
                      }
                    }}
                    disabled={!isAttached}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md scale-105'
                        : isAttached
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'text-slate-600 cursor-not-allowed opacity-30'
                    }`}
                    title={isAttached ? `View ${def.fullName}` : `No ${def.label} screenshot attached`}
                  >
                    <span>{def.label}</span>
                    {isAttached && <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-400'}`} />}
                  </button>
                );
              })}
            </div>

            {/* Right: Mark as Reviewed + Close Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleReviewed}
                disabled={isSaving}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-sm ${
                  selectedTrade.reviewedAt
                    ? 'bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-500/50'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                <CheckCircle2 size={15} />
                <span>{selectedTrade.reviewedAt ? 'Reviewed ✓' : 'Mark Reviewed'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsZoomGalleryOpen(false)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition cursor-pointer"
                aria-label="Close zoom viewer"
              >
                <X size={16} />
                <span className="hidden sm:inline">Close (Esc)</span>
              </button>
            </div>
          </div>

          {/* Middle Screen Canvas with Left and Right Arrows in Middle Corners */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 min-h-0 overflow-hidden">
            {/* Middle Left Corner Arrow Button */}
            {availableScreenshots.length > 1 && (
              <button
                type="button"
                onClick={goToPrevScreenshot}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/90 hover:bg-purple-600 active:scale-90 text-white shadow-2xl border border-white/20 backdrop-blur-md transition-all cursor-pointer group"
                aria-label="Previous screenshot (Left arrow)"
                title="Previous screenshot (◄ Left Arrow key)"
              >
                <ChevronLeft size={32} className="transition-transform group-hover:-translate-x-0.5" />
              </button>
            )}

            {/* Middle Right Corner Arrow Button */}
            {availableScreenshots.length > 1 && (
              <button
                type="button"
                onClick={goToNextScreenshot}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/90 hover:bg-purple-600 active:scale-90 text-white shadow-2xl border border-white/20 backdrop-blur-md transition-all cursor-pointer group"
                aria-label="Next screenshot (Right arrow)"
                title="Next screenshot (► Right Arrow key)"
              >
                <ChevronRight size={32} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}

            {/* Current Active Screenshot */}
            {availableScreenshots.length > 0 && activeScreenshot ? (
              <div className="relative max-h-full max-w-full flex flex-col items-center justify-center">
                <img
                  key={activeScreenshot.key}
                  src={activeScreenshot.image}
                  alt={activeScreenshot.fullName}
                  className="max-h-[75vh] max-w-[88vw] sm:max-w-[82vw] object-contain rounded-2xl bg-black/75 shadow-2xl border border-white/10 select-none animate-in fade-in zoom-in-95 duration-150"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                <ImageIcon size={48} className="opacity-40 text-rose-400" />
                <p className="text-base font-bold text-white">No screenshots attached to this trade</p>
                <p className="text-xs text-slate-400">Attach chart screenshots in the Journal tab to view them here.</p>
              </div>
            )}
          </div>

          {/* Bottom Bar: Slide Info, Keyboard Navigation Prompt, Full Size Link */}
          {availableScreenshots.length > 0 && activeScreenshot && (
            <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/90 px-4 py-2.5 sm:px-6 backdrop-blur-md text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-black text-purple-400 text-sm">
                  {activeScreenshot.label}
                </span>
                <span className="text-slate-300 font-bold truncate">
                  {activeScreenshot.fullName}
                </span>
                <span className="hidden lg:inline text-slate-500 font-medium truncate">
                  — {activeScreenshot.description}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {availableScreenshots.length > 1 && (
                  <span className="text-3xs text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                    {currentScreenshotIndex + 1} of {availableScreenshots.length} · Use <kbd className="font-mono text-purple-300">◄</kbd> <kbd className="font-mono text-purple-300">►</kbd> Arrow keys
                  </span>
                )}
                <a
                  href={activeScreenshot.image}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-3xs font-bold text-slate-300 transition"
                  title="Open original image in new tab"
                >
                  <Maximize2 size={12} />
                  <span>Full Size</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-2xs font-extrabold uppercase tracking-[0.16em] text-clay-accent">
            <CheckCircle2 size={15} /> Focused review workspace
          </div>
          <h1 className="text-3xl tracking-tight">Trade Review</h1>
          <p className="mt-1 text-sm text-clay-muted">Inspect execution, zoom all timeframes in sequence, analyze mistakes &amp; strategy, and close the review.</p>
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
            ) : paginatedTrades.map((trade) => {
              const itemDisplay = getTradeDisplayDateTime(trade);
              const itemAccount = accounts.find((item) => item.id === trade.accountId);
              const itemNet = getTradeNetPnl(trade, itemAccount?.commissionPerLot ?? 7);
              const active = trade.id === selectedTrade?.id;
              return (
                <button key={trade.id} type="button" onClick={() => selectTrade(trade)} className={`w-full rounded-2xl p-3 text-left transition cursor-pointer ${active ? 'bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-clayButton' : 'bg-white/65 text-clay-foreground hover:-translate-y-0.5 hover:bg-white'}`}>
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
          {visibleTrades.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-white/60 pt-3">
              <span className="text-[10px] font-bold text-clay-muted">5 dates per page · {uniqueDates.length} total</span>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="rounded-xl p-1.5 text-clay-muted transition hover:bg-white hover:text-clay-accent disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed" aria-label="Previous review page"><ChevronLeft size={14} /></button>
                <span className="min-w-[46px] text-center text-[10px] font-extrabold text-clay-foreground">{safePage} / {totalPages}</span>
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="rounded-xl p-1.5 text-clay-muted transition hover:bg-white hover:text-clay-accent disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed" aria-label="Next review page"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </aside>

        {selectedTrade && display && (
          <section className="min-w-0 space-y-6">
            {/* Top Bar with PNL, Mistakes Tagged, Strategy Used, Mark as Reviewed Button, See Screenshots Button */}
            <div className="clay-surface px-5 py-4 space-y-2.5">
              {/* Row 1: Core Trade Identity + Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left: Direction Icon + Asset Symbol + Status + Net PnL */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-clayButton ${
                      selectedTrade.direction === 'BUY'
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                        : 'bg-gradient-to-br from-rose-400 to-rose-600'
                    }`}
                  >
                    {selectedTrade.direction === 'BUY' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-mono text-xl sm:text-2xl font-black text-clay-foreground tracking-tight">
                      {selectedTrade.asset}
                    </h2>

                    <span
                      className={`rounded-lg px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider ${
                        selectedTrade.status === 'WIN'
                          ? 'bg-emerald-100 text-emerald-700'
                          : selectedTrade.status === 'LOSS'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedTrade.status}
                    </span>

                    {/* Net PnL Tag */}
                    <span
                      className={`font-mono text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                        netPnl >= 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                      title={`Net: ${formatMoney(netPnl, account?.currency)} (Gross: ${formatMoney(selectedTrade.pnl, account?.currency)})`}
                    >
                      {netPnl >= 0 ? '+' : ''}{formatMoney(netPnl, account?.currency)}
                    </span>
                  </div>
                </div>

                {/* Right: Actions (Screenshots, Mark Reviewed, Prev/Next) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* See Screenshots Button */}
                  {hasScreenshots ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentScreenshotIndex(0);
                        setIsZoomGalleryOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3 py-1.5 text-xs font-bold shadow-sm transition cursor-pointer"
                      title="Inspect all screenshots in zoom mode"
                    >
                      <Eye size={14} />
                      <span>Screenshots ({availableScreenshots.length})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex items-center gap-1.5 rounded-xl bg-rose-500/80 text-white px-3 py-1.5 text-xs font-bold opacity-75 cursor-not-allowed"
                      title="No screenshots attached to this trade"
                    >
                      <ImageIcon size={14} />
                      <span>No Screenshots</span>
                    </button>
                  )}

                  {/* Mark as Reviewed Button */}
                  <button
                    type="button"
                    onClick={toggleReviewed}
                    disabled={isSaving}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      selectedTrade.reviewedAt
                        ? 'bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 shadow-sm'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-clayButton active:scale-95'
                    }`}
                    title={selectedTrade.reviewedAt ? 'Click to mark as pending' : 'Click to mark trade as reviewed'}
                  >
                    <CheckCircle2 size={14} className={selectedTrade.reviewedAt ? 'text-purple-700' : 'text-white'} />
                    <span>{isSaving ? 'Saving…' : selectedTrade.reviewedAt ? 'Reviewed' : 'Mark Reviewed'}</span>
                  </button>

                  {/* Prev / Next Chevrons */}
                  <div className="flex items-center gap-1 pl-1">
                    <button
                      type="button"
                      onClick={() => moveSelection(-1)}
                      disabled={visibleTrades.findIndex((trade) => trade.id === selectedTrade.id) <= 0}
                      className="rounded-xl bg-white/80 p-1.5 text-clay-foreground shadow-sm hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Previous trade"
                      title="Previous trade"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelection(1)}
                      disabled={visibleTrades.findIndex((trade) => trade.id === selectedTrade.id) >= visibleTrades.length - 1}
                      className="rounded-xl bg-white/80 p-1.5 text-clay-foreground shadow-sm hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Next trade"
                      title="Next trade"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Metadata (Date, Time, Session, Account) + Context (Strategy, Mistakes) */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2 border-t border-slate-200/50 text-2xs font-medium">
                {/* Left: Time and Broker Details */}
                <div className="flex items-center gap-2 text-clay-muted">
                  <span className="flex items-center gap-1 font-bold">
                    <CalendarDays size={12} className="text-clay-accent" />
                    {formatDate(display.date)}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-bold">
                    <Clock3 size={12} className="text-clay-accent" />
                    {display.time}{display.isIstConversion ? ' IST' : ''}
                  </span>
                  {Boolean(selectedTrade.session) && (
                    <>
                      <span>·</span>
                      <span className="uppercase tracking-wider font-bold">{selectedTrade.session}</span>
                    </>
                  )}
                  {Boolean(account?.name) && (
                    <>
                      <span>·</span>
                      <span className="font-bold text-clay-foreground">{account.name}</span>
                    </>
                  )}
                </div>

                {/* Right: Strategy & Mistakes in a sleek, lightweight format */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Strategy */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-clay-muted font-bold flex items-center gap-1">
                      <Target size={12} className="text-purple-600" />
                      Strategy:
                    </span>
                    <span className="font-mono font-bold text-purple-900 bg-purple-50/80 border border-purple-200/60 px-2 py-0.5 rounded-md">
                      {selectedTrade.setup || 'Discretionary'}
                    </span>
                  </div>

                  {/* Mistakes */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-clay-muted font-bold flex items-center gap-1">
                      <AlertTriangle size={12} className={activeMistakes.length > 0 ? 'text-rose-500' : 'text-emerald-500'} />
                      Mistakes:
                    </span>
                    {activeMistakes.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {activeMistakes.map((mistake) => (
                          <span key={mistake} className="rounded-md bg-rose-50 border border-rose-200/70 px-2 py-0.5 font-bold text-rose-700">
                            {mistake}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-md bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 font-bold text-emerald-700 flex items-center gap-1">
                        <Check size={10} /> None
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Screenshots grid arranged strictly in requested order: LTF, HTF, 15m, 1hr, 4hr */}
            <div className="grid gap-5 xl:grid-cols-2">
              <ScreenshotPanel
                image={selectedTrade.ltfScreenshot}
                timeframeTag="1. LTF"
                label="Entry timeframe chart"
                onOpen={() => openZoomForTimeframe('ltf')}
              />
              <ScreenshotPanel
                image={selectedTrade.htfScreenshot}
                timeframeTag="2. HTF"
                label="High timeframe chart"
                onOpen={() => openZoomForTimeframe('htf')}
              />
              <ScreenshotPanel
                image={selectedTrade.fifteenMinuteScreenshot}
                timeframeTag="3. 15m"
                label="15 minute chart"
                onOpen={() => openZoomForTimeframe('15m')}
              />
              <ScreenshotPanel
                image={selectedTrade.oneHourScreenshot}
                timeframeTag="4. 1hr"
                label="1 hour chart"
                onOpen={() => openZoomForTimeframe('1hr')}
              />
              <ScreenshotPanel
                image={selectedTrade.fourHourScreenshot}
                timeframeTag="5. 4hr"
                label="4 hour chart"
                onOpen={() => openZoomForTimeframe('4hr')}
              />
            </div>

            {/* Trade execution statistics */}
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
                    {activeMistakes.length > 0
                      ? activeMistakes.map((mistake) => (
                          <span key={mistake} className="rounded-full bg-rose-100 px-2.5 py-1 text-3xs font-bold text-rose-700">
                            {mistake}
                          </span>
                        ))
                      : <span className="text-xs font-bold text-emerald-600">No mistakes tagged</span>}
                  </div>
                </div>
                <div className="clay-pressed rounded-2xl p-4">
                  <div className="text-4xs font-extrabold uppercase tracking-[0.12em] text-clay-muted">Review completed</div>
                  <div className="mt-2 text-xs font-bold text-clay-foreground">{selectedTrade.reviewedAt ? new Date(selectedTrade.reviewedAt).toLocaleString('en-IN') : 'Still waiting for focused review'}</div>
                </div>
              </div>
            </div>

            {/* Review notes and action section */}
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
