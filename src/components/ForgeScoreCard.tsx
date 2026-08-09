import React, { useState, useEffect } from 'react';
import { Info, X, Shield, Sparkles, Award, ArrowLeft, HelpCircle } from 'lucide-react';
import { Trade, PerformanceMetrics } from '../types';
import { computeForgeScore } from '../utils/forgeScoreEngine';

interface ForgeScoreCardProps {
  trades: Trade[];
  metrics: PerformanceMetrics;
}

export default function ForgeScoreCard({ trades, metrics }: ForgeScoreCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute normalized scores and raw metrics via the scoring engine
  const forgeData = React.useMemo(() => computeForgeScore(trades, metrics), [trades, metrics]);
  const { overallScore, scores, raw, tier } = forgeData;

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

  // 6 Metric Dimensions with descriptions, rule scales, and score values
  const axisDetails = [
    {
      name: 'Win %',
      weight: '15%',
      score: scores.winRateScore,
      rawValue: `${raw.winRate.toFixed(1)}%`,
      description: 'Percentage of winning trade executions smoothly normalized to reward positive hit rate.',
      ruleScale: '<30%: 0-10 | 30-40%: 20-35 | 40-50%: 35-50 | 50-60%: 50-70 | 60-70%: 70-85 | 70-80%: 85-95 | >80%: 95-100',
    },
    {
      name: 'Profit Factor',
      weight: '25%',
      score: scores.profitFactorScore,
      rawValue: raw.profitFactor >= 99.9 ? 'INF' : raw.profitFactor.toFixed(2),
      description: 'Gross profits divided by gross losses. Core metric weighted highest (25%) in overall score.',
      ruleScale: '<0.75: 0 | 0.75-1.0: 10-25 | 1.0-1.25: 25-45 | 1.25-1.5: 45-65 | 1.5-2.0: 65-85 | 2.0-2.5: 85-95 | >2.5: 95-100',
    },
    {
      name: 'Avg Win/Loss',
      weight: '15%',
      score: scores.avgWinLossScore,
      rawValue: `${raw.avgWinLossRatio.toFixed(2)}x`,
      description: 'Ratio of average winning trade amount vs average loss amount.',
      ruleScale: '<0.75: 0-15 | 0.75-1.0: 15-30 | 1.0-1.25: 30-50 | 1.25-1.5: 50-65 | 1.5-2.0: 65-85 | 2.0-3.0: 85-95 | >3.0: 95-100',
    },
    {
      name: 'Recovery Factor',
      weight: '15%',
      score: scores.recoveryFactorScore,
      rawValue: raw.recoveryFactor > 0 ? raw.recoveryFactor.toFixed(2) : '0.00',
      description: 'Net profit relative to peak equity drawdown pressure in USD.',
      ruleScale: '<0: 0 | 0-0.5: 10-25 | 0.5-1.0: 25-40 | 1.0-1.5: 40-55 | 1.5-2.0: 55-70 | 2.0-3.0: 70-85 | 3.0-5.0: 85-95 | >5.0: 95-100',
    },
    {
      name: 'Max Drawdown',
      weight: '15%',
      score: scores.maxDrawdownScore,
      rawValue: `${raw.maxDrawdownPct.toFixed(1)}%`,
      description: 'Peak-to-trough risk pressure. Inverse-scored so lower drawdown receives higher score.',
      ruleScale: '0-2%: 95-100 | 2-4%: 85-95 | 4-6%: 70-85 | 6-10%: 50-70 | 10-15%: 25-50 | 15-20%: 10-25 | >20%: 0-10',
    },
    {
      name: 'Consistency',
      weight: '15%',
      score: scores.consistencyScore,
      rawValue: `${raw.consistencyPct}%`,
      description: 'Multi-factor stability: profitable days (40%), equity curve stability (25%), low return volatility (20%), streak control (15%).',
      ruleScale: 'Multi-Factor Model (Profitable Days 40% + Equity Curve 25% + Volatility 20% + Streaks 15%)',
    },
  ];

  // SVG Geometry setup
  const width = 310;
  const height = 215;
  const cx = width / 2;
  const cy = 108;
  const radius = 64;

  // 6 Angles starting from top (-90 degrees / -PI/2)
  const angles = [
    -Math.PI / 2, // Top: Win %
    -Math.PI / 6, // Top Right: Profit Factor
    Math.PI / 6,  // Bottom Right: Avg Win/Loss
    Math.PI / 2,   // Bottom: Recovery Factor
    (5 * Math.PI) / 6, // Bottom Left: Max Drawdown
    (7 * Math.PI) / 6, // Top Left: Consistency
  ];

  // Radar web concentric hexagons (5 levels: 20%, 40%, 60%, 80%, 100%)
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

  // Data polygon points
  const dataPoints = axisDetails.map((axis, i) => {
    const normScore = axis.score / 100;
    const r = Math.max(radius * 0.08, radius * normScore);
    const x = cx + r * Math.cos(angles[i]);
    const y = cy + r * Math.sin(angles[i]);
    return { x, y, score: axis.score, name: axis.name, rawValue: axis.rawValue };
  });

  const polygonString = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Label offsets around vertices
  const labelOffsets = [
    { x: cx, y: cy - radius - 10, anchor: 'middle' }, // Top: Win %
    { x: cx + radius * Math.cos(angles[1]) + 8, y: cy + radius * Math.sin(angles[1]) - 2, anchor: 'start' }, // Top Right: Profit Factor
    { x: cx + radius * Math.cos(angles[2]) + 8, y: cy + radius * Math.sin(angles[2]) + 10, anchor: 'start' }, // Bottom Right: Avg Win/Loss
    { x: cx, y: cy + radius + 16, anchor: 'middle' }, // Bottom: Recovery Factor
    { x: cx + radius * Math.cos(angles[4]) - 8, y: cy + radius * Math.sin(angles[4]) + 10, anchor: 'end' }, // Bottom Left: Max Drawdown
    { x: cx + radius * Math.cos(angles[5]) - 8, y: cy + radius * Math.sin(angles[5]) - 2, anchor: 'end' }, // Top Left: Consistency
  ];

  return (
    <div className="relative p-6 flex flex-col justify-between h-full min-h-[350px] bg-[#FAF8FC] border border-purple-100/60 rounded-[32px] shadow-[0_10px_30px_rgba(124,58,237,0.06)] text-[#332F3A] overflow-hidden select-none">
      {/* Subtle Ambient Background Gradient Lighting */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7C3AED]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#DB2777]/10 blur-3xl" />

      {showInfo ? (
        /* In-Card Matrix & Scoring Rules Breakdown (Fills 100% of Card with Zero Margin/Clipping) */
        <div className="absolute inset-0 z-20 bg-[#FAF8FC] p-5 flex flex-col justify-between rounded-[32px] shadow-sm border border-purple-100 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-purple-100/80 pb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-sm">
                <Shield size={16} className="stroke-[3px]" />
              </div>
              <div>
                <h4 className="font-display text-base font-black text-[#332F3A] leading-tight">
                  Forge Scoring Rules & Matrix
                </h4>
                <p className="text-[10px] font-bold text-gray-500">6 Normalized Edge Vectors & Score Rules</p>
              </div>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="h-8 w-8 rounded-full bg-white border border-purple-100 text-gray-500 hover:text-[#332F3A] flex items-center justify-center transition-colors cursor-pointer shadow-sm"
              title="Close Breakdown"
            >
              <X size={15} className="stroke-[2.5px]" />
            </button>
          </div>

          {/* Metric Cards & Scoring Rules List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 py-2 pr-1">
            <div className="p-2.5 text-[11px] font-semibold leading-relaxed text-gray-600 bg-white border border-purple-100/60 rounded-xl shadow-2xs">
              Overall <strong className="text-[#332F3A] font-black">Forge Score ({overallScore}/100)</strong> — Performance Rating: <span className="font-black text-[#7C3AED]">{tier.label}</span>
            </div>

            {/* Score Tier Table */}
            <div className="p-2.5 bg-white border border-purple-100/60 rounded-xl shadow-2xs space-y-1.5">
              <div className="text-[11px] font-black text-[#7C3AED] flex items-center gap-1">
                <HelpCircle size={12} />
                Forge Score Tiers
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-[#332F3A]">
                <div className="bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 text-rose-700">0-20: Critical</div>
                <div className="bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 text-orange-700">21-40: Weak</div>
                <div className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 text-amber-800">41-60: Developing</div>
                <div className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-emerald-700">61-75: Strong</div>
                <div className="bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 text-purple-700">76-90: Excellent</div>
                <div className="bg-violet-100 px-1.5 py-0.5 rounded border border-violet-300 text-violet-800 font-extrabold">91-100: Elite</div>
              </div>
            </div>

            {axisDetails.map((axis) => (
              <div key={axis.name} className="p-2.5 space-y-1.5 rounded-xl bg-white border border-purple-100/60 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-xs font-black text-[#7C3AED]">{axis.name}</span>
                    <span className="text-[10px] font-bold text-gray-400">({axis.weight} weight)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-[#332F3A]">Raw: {axis.rawValue}</span>
                    <span className="bg-purple-50 text-[#7C3AED] text-[10px] font-black px-1.5 py-0.5 rounded-full border border-purple-100">
                      Score: {Math.round(axis.score)}/100
                    </span>
                  </div>
                </div>

                <p className="text-[10px] font-medium text-gray-500 leading-tight">{axis.description}</p>
                
                {/* Scoring Rule Scale */}
                <div className="p-1.5 bg-purple-50/60 border border-purple-100/50 rounded-lg text-[9.5px] font-mono text-purple-900 leading-snug">
                  <strong className="text-[#7C3AED]">Scoring Scale:</strong> {axis.ruleScale}
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-purple-50 overflow-hidden mt-1 border border-purple-100/40">
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
            <span className="inline-flex items-center gap-1 bg-white border border-purple-100 text-[#332F3A] font-mono font-black text-xs px-2.5 py-1 rounded-full shadow-2xs">
              <span>✨ {overallScore}</span>
              <span className="text-gray-400 text-[10px]">/ 100</span>
            </span>
            <button
              onClick={() => setShowInfo(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white font-black text-xs shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
            >
              <ArrowLeft size={14} className="stroke-[3px]" />
              Back to Chart
            </button>
          </div>
        </div>
      ) : (
        /* Normal Radar Chart Main View */
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-sm">
                <Award size={18} className="stroke-[3px]" />
              </div>
              <h3 className="font-display text-xl font-black tracking-tight text-[#332F3A] flex items-center gap-1.5">
                Forge Score
              </h3>
              <button
                onClick={() => setShowInfo(true)}
                className="text-gray-400 hover:text-[#7C3AED] transition-colors p-1 rounded-full hover:bg-purple-50 flex items-center justify-center cursor-pointer"
                title="View Score breakdown & rules"
                aria-label="Forge Score info"
              >
                <Info size={16} className="stroke-[2.5px]" />
              </button>
            </div>

            {/* Score Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-purple-100 text-[#7C3AED] font-mono text-xs font-black shadow-2xs">
              <Sparkles size={13} className="fill-[#7C3AED] stroke-[3px]" />
              <span>{overallScore}</span>
              <span className="text-gray-400 font-normal text-[10px]">/ 100</span>
            </span>
          </div>

          {/* Hexagonal Radar Chart SVG */}
          <div className="relative flex justify-center items-center my-1">
            <svg width={width} height={height} className="overflow-visible">
              <defs>
                <linearGradient id="forgePolyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.40" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.20" />
                </linearGradient>
                <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#7C3AED" floodOpacity="0.22" />
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
                    stroke="#E2E8F0"
                    strokeDasharray="3 3"
                    strokeWidth="1.2"
                  />
                );
              })}

              {/* Concentric Hexagon Grid */}
              {gridHexagons.map((points, idx) => (
                <polygon
                  key={`grid-${idx}`}
                  points={points}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="1.2"
                />
              ))}

              {/* Polygon Data Fill */}
              <polygon
                points={polygonString}
                fill="url(#forgePolyGradient)"
                stroke="#7C3AED"
                strokeWidth="2.2"
                strokeLinejoin="round"
                filter="url(#purpleGlow)"
                className="transition-all duration-500 ease-out"
              />

              {/* Vertex Nodes with White Center Border */}
              {dataPoints.map((pt, idx) => {
                const isHovered = hoveredIdx === idx;
                return (
                  <g
                    key={`dot-${idx}`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? '6' : '4.5'}
                      fill="#7C3AED"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      className="transition-all duration-200 shadow-md"
                    />
                  </g>
                );
              })}

              {/* Vertex Axis Labels */}
              {axisDetails.map((axis, idx) => {
                const pos = labelOffsets[idx];
                const isHovered = hoveredIdx === idx;
                return (
                  <text
                    key={`label-${idx}`}
                    x={pos.x}
                    y={pos.y}
                    textAnchor={pos.anchor as any}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`font-display text-[11px] font-extrabold cursor-pointer transition-colors ${
                      isHovered ? 'fill-[#7C3AED]' : 'fill-[#332F3A]'
                    }`}
                    style={{ fontSize: '11px' }}
                  >
                    {axis.name}
                  </text>
                );
              })}
            </svg>

            {/* Hover Tooltip showing both Raw Value and Normalized Score */}
            {hoveredIdx !== null && (
              <div
                className="absolute z-30 pointer-events-none p-2 bg-[#1E1B26] text-white rounded-xl shadow-xl border border-purple-400/30 text-xs font-sans animate-fade-in"
                style={{
                  top: `${Math.max(10, dataPoints[hoveredIdx].y - 35)}px`,
                  left: `${Math.min(width - 120, Math.max(10, dataPoints[hoveredIdx].x - 60))}px`,
                }}
              >
                <div className="font-bold text-purple-300">{axisDetails[hoveredIdx].name}</div>
                <div className="flex items-center gap-2 text-[11px] text-gray-200 mt-0.5 font-mono">
                  <span>Raw: <strong>{axisDetails[hoveredIdx].rawValue}</strong></span>
                  <span className="text-purple-400 font-bold">Score: {Math.round(axisDetails[hoveredIdx].score)}/100</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Score Bar */}
          <div className="mt-2 space-y-1">
            <div className="relative h-2.5 w-full rounded-full bg-gray-200/80 overflow-visible p-0.5 border border-slate-200/60">
              {/* Multi-stop color gradient track */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F43F5E] via-[#FB923C] via-[#FACC15] via-[#10B981] to-[#7C3AED] shadow-2xs transition-all duration-500"
                style={{ width: `${Math.max(4, overallScore)}%` }}
              />

              {/* Pin Indicator Dot at overall score position */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white border-2 border-[#7C3AED] shadow-md flex items-center justify-center transition-all duration-500"
                style={{ left: `${overallScore}%` }}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
              </div>
            </div>

            {/* Axis Ticks */}
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 px-0.5">
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
