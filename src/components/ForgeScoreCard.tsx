import React, { useState, useEffect } from 'react';
import { Info, X, Shield, Sparkles, Award, ArrowLeft } from 'lucide-react';
import { Trade, PerformanceMetrics, getTradeNetPnl } from '../types';

interface ForgeScoreCardProps {
  trades: Trade[];
  metrics: PerformanceMetrics;
}

interface MetricDetail {
  name: string;
  score: number;
  rawValue: string;
  description: string;
}

export default function ForgeScoreCard({ trades, metrics }: ForgeScoreCardProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Close breakdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInfo(false);
      }
    };
    if (showInfo) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInfo]);

  // 1. Win %
  const winRateScore = Math.min(100, Math.max(0, metrics.winRate));
  const winRateRaw = `${metrics.winRate.toFixed(1)}%`;

  // 2. Profit factor
  let pfScore = 0;
  if (metrics.totalTrades > 0) {
    if (metrics.profitFactor === 99.9) {
      pfScore = 100;
    } else {
      pfScore = Math.min(100, Math.max(0, (metrics.profitFactor / 2.5) * 100));
    }
  }
  const pfRaw = metrics.profitFactor === 99.9 ? 'INF' : metrics.profitFactor.toFixed(2);

  // 3. Avg win/loss
  const avgWinLossRatio =
    metrics.avgLoss > 0
      ? metrics.avgWin / metrics.avgLoss
      : metrics.avgWin > 0
      ? 3.0
      : 0;
  const avgWinLossScore = Math.min(100, Math.max(0, (avgWinLossRatio / 2.0) * 100));
  const avgWinLossRaw = `${avgWinLossRatio.toFixed(2)}x`;

  // 4. Recovery factor
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

  const recFactor =
    maxDdUSD > 0
      ? metrics.totalPnl / maxDdUSD
      : metrics.totalPnl > 0
      ? 4.0
      : 0;
  const recoveryScore = Math.min(100, Math.max(0, (recFactor / 3.0) * 100));
  const recoveryRaw = recFactor > 0 ? recFactor.toFixed(2) : '0.00';

  // 5. Max drawdown score (0% DD = 100 score, >25% = 0 score)
  const maxDdScore = Math.max(0, Math.min(100, 100 - metrics.maxDrawdown * 4));
  const maxDdRaw = `${metrics.maxDrawdown.toFixed(1)}%`;

  // 6. Consistency score
  let consistencyScore = 50;
  if (trades.length > 0) {
    const checklistScores = trades.map((t) => {
      if (t.journalingStatus === 'COMPLETE' && t.maxChecklistScore && t.maxChecklistScore > 0) {
        return ((t.checklistScore || 0) / t.maxChecklistScore) * 100;
      }
      return 60;
    });
    const avgChecklist = checklistScores.reduce((a, b) => a + b, 0) / checklistScores.length;
    const winRatioFactor = Math.min(100, metrics.winRate * 1.1);
    consistencyScore = Math.min(100, Math.max(0, Math.round(avgChecklist * 0.5 + winRatioFactor * 0.5)));
  }
  const consistencyRaw = `${consistencyScore}%`;

  // Overall Forge Score
  const overallScore =
    trades.length === 0
      ? 0
      : Math.round(
          (winRateScore + pfScore + avgWinLossScore + recoveryScore + maxDdScore + consistencyScore) / 6
        );

  const axes: MetricDetail[] = [
    { name: 'Win %', score: winRateScore, rawValue: winRateRaw, description: 'Percentage of winning trades out of total executions.' },
    { name: 'Profit factor', score: pfScore, rawValue: pfRaw, description: 'Gross profits divided by gross losses. 2.0+ is target.' },
    { name: 'Avg win/loss', score: avgWinLossScore, rawValue: avgWinLossRaw, description: 'Ratio of average winning trade amount vs average loss.' },
    { name: 'Recovery factor', score: recoveryScore, rawValue: recoveryRaw, description: 'Net PnL divided by maximum drawdown in capital.' },
    { name: 'Max drawdown', score: maxDdScore, rawValue: maxDdRaw, description: 'Peak-to-trough equity risk pressure. Lower is better.' },
    { name: 'Consistency', score: consistencyScore, rawValue: consistencyRaw, description: 'Journal discipline, rule adherence & execution stability.' },
  ];

  // SVG Geometry setup
  const width = 310;
  const height = 215;
  const cx = width / 2;
  const cy = 108;
  const radius = 64;

  // 6 Angles starting from top (-90 degrees)
  const angles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6, (7 * Math.PI) / 6];

  // Radar web concentric hexagons
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridHexagons = gridLevels.map((lvl) => {
    return angles
      .map((angle) => {
        const x = cx + radius * lvl * Math.cos(angle);
        const y = cy + radius * lvl * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  // Data polygon coordinates
  const dataPoints = axes.map((axis, i) => {
    const normScore = axis.score / 100;
    const r = Math.max(radius * 0.08, radius * normScore);
    const x = cx + r * Math.cos(angles[i]);
    const y = cy + r * Math.sin(angles[i]);
    return { x, y, score: axis.score, name: axis.name };
  });

  const polygonString = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Label placements for 6 vertices
  const labelOffsets = [
    { x: cx, y: cy - radius - 10, anchor: 'middle' }, // Top: Win %
    { x: cx + radius * Math.cos(angles[1]) + 8, y: cy + radius * Math.sin(angles[1]) - 2, anchor: 'start' }, // Top Right: Profit factor
    { x: cx + radius * Math.cos(angles[2]) + 8, y: cy + radius * Math.sin(angles[2]) + 10, anchor: 'start' }, // Bottom Right: Avg win/loss
    { x: cx, y: cy + radius + 16, anchor: 'middle' }, // Bottom: Recovery factor
    { x: cx + radius * Math.cos(angles[4]) - 8, y: cy + radius * Math.sin(angles[4]) + 10, anchor: 'end' }, // Bottom Left: Max drawdown
    { x: cx + radius * Math.cos(angles[5]) - 8, y: cy + radius * Math.sin(angles[5]) - 2, anchor: 'end' }, // Top Left: Consistency
  ];

  return (
    <div className="clay-surface relative p-6 flex flex-col justify-between h-full min-h-[340px] overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#7C3AED]/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-[#DB2777]/15 blur-3xl" />

      {showInfo ? (
        /* In-Card Breakdown View (Covers 100% of Card with Zero Margin/Clipping) */
        <div className="absolute inset-0 z-20 bg-[#fbf9fe]/95 backdrop-blur-xl p-5 flex flex-col justify-between rounded-[40px] shadow-clayCard border border-white/80 animate-fade-in">
          {/* Breakdown Header */}
          <div className="flex items-center justify-between border-b border-purple-100/80 pb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="clay-orb flex h-8 w-8 items-center justify-center bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white">
                <Shield size={16} className="stroke-[3px]" />
              </div>
              <div>
                <h4 className="font-display text-base font-black text-clay-foreground leading-tight">
                  Forge Score Matrix
                </h4>
                <p className="text-[10px] font-bold text-clay-muted">6 Core Performance Vectors</p>
              </div>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="clay-button clay-button-secondary min-h-0 h-8 w-8 p-0 rounded-full text-clay-muted hover:text-clay-foreground flex items-center justify-center cursor-pointer"
              title="Close Breakdown"
            >
              <X size={15} className="stroke-[2.5px]" />
            </button>
          </div>

          {/* Scrollable Metric List (Fills 100% of Card Middle) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 py-2 pr-1">
            <div className="clay-pressed p-2.5 text-[11px] font-semibold leading-relaxed text-clay-muted rounded-xl">
              Overall <strong className="text-clay-foreground font-black">Score ({overallScore}/100)</strong> calculated from your live trading performance:
            </div>

            {axes.map((axis) => (
              <div key={axis.name} className="clay-card p-2.5 space-y-1 rounded-xl border border-white/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs font-black text-clay-accent">{axis.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-clay-foreground">{axis.rawValue}</span>
                    <span className="clay-pill bg-purple-100 text-[#7C3AED] text-[10px] font-extrabold px-1.5 py-0.5">
                      {Math.round(axis.score)} pts
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-medium text-clay-muted leading-tight">{axis.description}</p>
                <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] transition-all duration-300"
                    style={{ width: `${Math.max(4, axis.score)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown Footer */}
          <div className="flex items-center justify-between border-t border-purple-100/80 pt-2 shrink-0">
            <span className="clay-pill bg-white text-clay-foreground shadow-clayCard font-mono font-black text-xs px-2.5 py-1">
              Score: <span className="text-[#7C3AED] font-extrabold">{overallScore}</span> / 100
            </span>
            <button
              onClick={() => setShowInfo(false)}
              className="clay-button clay-button-primary px-3.5 py-1.5 min-h-[2.25rem] text-xs flex items-center gap-1.5"
            >
              <ArrowLeft size={14} className="stroke-[3px]" />
              Back to Chart
            </button>
          </div>
        </div>
      ) : (
        /* Normal Radar Chart Card Content */
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="clay-orb flex h-9 w-9 items-center justify-center bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white">
                <Award size={18} className="stroke-[3px]" />
              </div>
              <h3 className="font-display text-xl font-black tracking-tight text-clay-foreground flex items-center gap-1.5">
                Forge Score
              </h3>
              <button
                onClick={() => setShowInfo(true)}
                className="text-clay-muted hover:text-clay-accent transition-colors p-1.5 rounded-full hover:bg-white/70 flex items-center justify-center cursor-pointer"
                title="View Forge Score breakdown"
                aria-label="Forge Score information"
              >
                <Info size={17} className="stroke-[2.5px]" />
              </button>
            </div>

            <span className="clay-pill bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white font-mono shadow-clayCard px-3 py-1.5 text-xs font-black">
              <Sparkles size={13} className="fill-white stroke-[3px]" />
              <span>{overallScore}</span>
              <span className="opacity-70 text-[10px]">/ 100</span>
            </span>
          </div>

          {/* Radar Chart SVG */}
          <div className="relative flex justify-center items-center my-2">
            <svg width={width} height={height} className="overflow-visible">
              <defs>
                <linearGradient id="clayForgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#DB2777" stopOpacity="0.30" />
                </linearGradient>
                <filter id="clayShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#7C3AED" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Radial Spokes */}
              {angles.map((angle, idx) => {
                const x2 = cx + radius * Math.cos(angle);
                const y2 = cy + radius * Math.sin(angle);
                return (
                  <line
                    key={`spoke-${idx}`}
                    x1={cx}
                    y1={cy}
                    x2={x2}
                    y2={y2}
                    stroke="#CBD5E1"
                    strokeDasharray="3 3"
                    strokeWidth="1.2"
                  />
                );
              })}

              {/* Hexagon Grid */}
              {gridHexagons.map((points, idx) => (
                <polygon
                  key={`grid-${idx}`}
                  points={points}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1.2"
                />
              ))}

              {/* Filled Data Polygon */}
              <polygon
                points={polygonString}
                fill="url(#clayForgeGrad)"
                stroke="#7C3AED"
                strokeWidth="2.5"
                strokeLinejoin="round"
                filter="url(#clayShadow)"
                className="transition-all duration-500 ease-out"
              />

              {/* Vertex Dots */}
              {dataPoints.map((pt, idx) => (
                <g key={`dot-${idx}`}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="#7C3AED"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="transition-all duration-500 ease-out shadow-lg"
                  />
                </g>
              ))}

              {/* Labels around Vertices */}
              {axes.map((axis, idx) => {
                const pos = labelOffsets[idx];
                return (
                  <text
                    key={`label-${idx}`}
                    x={pos.x}
                    y={pos.y}
                    textAnchor={pos.anchor as any}
                    className="fill-clay-foreground text-[11px] font-bold tracking-tight font-display"
                    style={{ fontSize: '11px', fontWeight: 800 }}
                  >
                    {axis.name}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Score Progress Bar & Pointer */}
          <div className="mt-3 space-y-1.5">
            <div className="clay-pressed relative flex h-3.5 w-full overflow-visible p-0.5 rounded-full">
              {/* Gradient Track */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 via-amber-400 to-emerald-400 shadow-sm transition-all duration-500"
                style={{ width: `${Math.max(5, overallScore)}%` }}
              />

              {/* Slider Pointer Handle */}
              <div
                className="clay-orb absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-white border-2 border-[#7C3AED] shadow-clayButton flex items-center justify-center transition-all duration-500"
                style={{ left: `${overallScore}%` }}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
              </div>
            </div>

            {/* Axis scale ticks */}
            <div className="flex justify-between items-center text-[10px] font-extrabold text-clay-muted px-1">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
