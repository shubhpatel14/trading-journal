import React, { useState, useEffect, useMemo } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Settings,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit3,
  Calendar as CalendarIcon,
  TrendingUp,
  Activity,
  Flame,
  Award,
  DollarSign,
  Layers,
  Brain,
  Sliders,
  Filter,
  RefreshCw,
  Info,
  ChevronRight,
  Sparkles,
  Zap,
  Clock,
  BarChart3,
  PlusCircle,
  X,
  FileText
} from 'lucide-react';
import {
  Trade,
  DisciplineSettings,
  DailyDisciplineRecord,
  DisciplineViolation,
  DisciplinePreset,
  DisciplineEmotionLevel,
  DisciplineScoreWeight,
  CustomDisciplineMetric,
  DisciplineWarningRule
} from '../types';

interface DisciplineCoachViewProps {
  trades: Trade[];
  settings: DisciplineSettings;
  records: DailyDisciplineRecord[];
  violations: DisciplineViolation[];
  onUpdateSettings: (newSettings: DisciplineSettings) => void;
  onUpdateRecords: (newRecords: DailyDisciplineRecord[]) => void;
  onUpdateViolations: (newViolations: DisciplineViolation[]) => void;
  currencySymbol?: string;
}

export default function DisciplineCoachView({
  trades,
  settings,
  records,
  violations,
  onUpdateSettings,
  onUpdateRecords,
  onUpdateViolations,
  currencySymbol = '$'
}: DisciplineCoachViewProps) {
  // Navigation sub-tab inside Discipline Coach
  const [activeSubTab, setActiveSubTab] = useState<'cockpit' | 'calendar' | 'violations' | 'analytics' | 'settings'>('cockpit');

  // --- 1. COUNTDOWN TIMER STATE ---
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(settings.session.durationSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerCompleted, setTimerCompleted] = useState<boolean>(false);
  const [showTimerEditModal, setShowTimerEditModal] = useState<boolean>(false);
  const [customTimerHours, setCustomTimerHours] = useState<number>(Math.floor(settings.session.durationSeconds / 3600));
  const [customTimerMinutes, setCustomTimerMinutes] = useState<number>(Math.floor((settings.session.durationSeconds % 3600) / 60));
  const [customTimerSeconds, setCustomTimerSeconds] = useState<number>(settings.session.durationSeconds % 60);

  // Sync timer target when settings change and timer is paused
  useEffect(() => {
    if (!isTimerRunning) {
      setTimerSecondsLeft(settings.session.durationSeconds);
    }
  }, [settings.session.durationSeconds]);

  // Countdown Interval logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setTimerCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSecondsLeft]);

  // --- TODAY'S AUTO DATA DERIVATION ---
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayTrades = useMemo(() => trades.filter((t) => t.date === todayStr), [trades, todayStr]);
  const todayNetPnl = useMemo(() => todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0), [todayTrades]);
  const todayLossAmount = useMemo(() => Math.abs(Math.min(0, todayNetPnl)), [todayNetPnl]);

  // --- LOCAL EDITABLE METERS STATE ---
  const [currentLoss, setCurrentLoss] = useState<number>(settings.loss.currentLoss);
  const [currentTradeCount, setCurrentTradeCount] = useState<number>(settings.tradeCount.currentTradeCount);
  const [currentEmotionScore, setCurrentEmotionScore] = useState<number>(settings.emotion.currentScore);
  const [customMetricValues, setCustomMetricValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    settings.customMetrics.forEach((cm) => {
      init[cm.id] = cm.defaultValue ?? 20;
    });
    return init;
  });

  // Keep meters synced with settings if settings change
  useEffect(() => {
    setCurrentLoss(settings.loss.currentLoss);
    setCurrentTradeCount(settings.tradeCount.currentTradeCount);
    setCurrentEmotionScore(settings.emotion.currentScore);
  }, [settings.loss.currentLoss, settings.tradeCount.currentTradeCount, settings.emotion.currentScore]);

  // --- LOSS SCALING & SCROLL WHEEL STATE ---
  const lossLimit = settings.loss.dailyLossLimit || 50;
  const effectiveMaxLoss = Math.max(settings.loss.maxLoss || lossLimit * 2, lossLimit * 2, 100);
  const effectiveLossStep = lossLimit <= 100 ? 1 : 5;

  // Inline edit state for Daily Loss Limit
  const [isEditingLossLimit, setIsEditingLossLimit] = useState<boolean>(false);
  const [inputLossLimit, setInputLossLimit] = useState<string>(String(lossLimit));

  // Dynamic Tick labels based on effectiveMaxLoss
  const dynamicLossLabels = useMemo(() => {
    return [
      `$0`,
      `$${Math.round(effectiveMaxLoss * 0.25)}`,
      `$${Math.round(effectiveMaxLoss * 0.5)} (Limit)`,
      `$${Math.round(effectiveMaxLoss * 0.75)}`,
      `$${Math.round(effectiveMaxLoss)}`
    ];
  }, [effectiveMaxLoss]);

  // Scroll wheel handler for Loss Meter
  const handleLossWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? 10 : (lossLimit <= 100 ? 1 : 5);
    const delta = e.deltaY < 0 ? step : -step;
    setCurrentLoss((prev) => Math.max(0, Math.min(effectiveMaxLoss, Math.round(prev + delta))));
  };

  // Auto-sync function for Loss from actual today trades
  const handleSyncTodayLoss = () => {
    setCurrentLoss(todayLossAmount);
    onUpdateSettings({
      ...settings,
      loss: { ...settings.loss, currentLoss: todayLossAmount }
    });
  };

  // Auto-sync function for Trade Count from actual today trades
  const handleSyncTodayTrades = () => {
    setCurrentTradeCount(todayTrades.length);
    onUpdateSettings({
      ...settings,
      tradeCount: { ...settings.tradeCount, currentTradeCount: todayTrades.length }
    });
  };

  // Derived current emotion object
  const currentEmotionObj = useMemo(() => {
    const sorted = [...settings.emotion.levels].sort((a, b) => a.score - b.score);
    let matched = sorted[0] || { label: 'NEUTRAL', score: 50, color: '#8b5cf6' };
    for (const lvl of sorted) {
      if (currentEmotionScore >= lvl.score - 10) {
        matched = lvl;
      }
    }
    return matched;
  }, [currentEmotionScore, settings.emotion.levels]);

  // --- DISCIPLINE SCORE CALCULATOR ---
  const computedDisciplineScore = useMemo(() => {
    const maxLoss = settings.loss.dailyLossLimit || 50;
    const lossScore = Math.max(0, Math.min(100, Math.round(((maxLoss - currentLoss) / maxLoss) * 100)));

    const maxTrades = settings.tradeCount.plannedMaxTrades || 10;
    const tradeScore = currentTradeCount <= maxTrades
      ? 100
      : Math.max(0, Math.round(100 - (currentTradeCount - maxTrades) * 20));

    const emotionScore = Math.max(0, 100 - Math.abs(currentEmotionScore - 50) * 1.5);

    const customAvg = settings.customMetrics.length > 0
      ? 100 - ((Object.values(customMetricValues) as number[]).reduce((a: number, b: number) => a + Number(b || 0), 0) / (settings.customMetrics.length || 1))
      : 80;
    const ruleComplianceScore = Math.max(0, Math.min(100, Math.round(customAvg)));

    const sessionDisciplineScore = timerCompleted ? 100 : (isTimerRunning ? 90 : 75);

    const categoryScores: Record<string, number> = {
      lossControl: lossScore,
      tradeFrequency: tradeScore,
      emotionalControl: emotionScore,
      ruleCompliance: ruleComplianceScore,
      sessionDiscipline: sessionDisciplineScore
    };

    let totalScore = 0;
    let totalWeight = 0;

    settings.scoreWeights.forEach((w) => {
      const val = categoryScores[w.key] ?? 75;
      totalScore += (val * w.weight) / 100;
      totalWeight += w.weight;
    });

    if (totalWeight <= 0) return 80;
    const finalScore = Math.round((totalScore / totalWeight) * 100);
    return Math.max(0, Math.min(100, finalScore));
  }, [currentLoss, currentTradeCount, currentEmotionScore, customMetricValues, settings, timerCompleted, isTimerRunning]);

  // Derived Warning Status Level
  const currentWarningStatusLevel = useMemo<'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL'>(() => {
    const t = settings.thresholds;
    if (computedDisciplineScore >= t.goodDisciplineMin) return 'SAFE';
    if (computedDisciplineScore >= t.cautionDisciplineMin) return 'CAUTION';
    if (computedDisciplineScore >= t.warningDisciplineMin) return 'WARNING';
    return 'CRITICAL';
  }, [computedDisciplineScore, settings.thresholds]);

  // Active Live Warnings List
  const activeLiveWarnings = useMemo(() => {
    const warnings: { title: string; message: string; level: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL'; icon: any }[] = [];

    if (currentLoss >= settings.loss.dailyLossLimit) {
      warnings.push({
        title: 'Daily Loss Limit Breached',
        message: `Current loss (${currencySymbol}${currentLoss.toLocaleString()}) has hit or exceeded your daily limit (${currencySymbol}${settings.loss.dailyLossLimit.toLocaleString()}).`,
        level: 'CRITICAL',
        icon: XCircle
      });
    } else if (currentLoss >= settings.thresholds.lossWarning) {
      warnings.push({
        title: 'Daily Loss Warning Threshold',
        message: `Current loss (${currencySymbol}${currentLoss.toLocaleString()}) is approaching daily limit (${currencySymbol}${settings.loss.dailyLossLimit.toLocaleString()}).`,
        level: 'WARNING',
        icon: AlertTriangle
      });
    }

    if (currentTradeCount >= settings.tradeCount.plannedMaxTrades) {
      warnings.push({
        title: 'Planned Max Trades Reached',
        message: settings.tradeCount.exceededWarningMessage || 'TRADE FREQUENCY WARNING — REVIEW YOUR PLAN.',
        level: 'WARNING',
        icon: AlertTriangle
      });
    } else if (currentTradeCount >= settings.thresholds.tradeWarning) {
      warnings.push({
        title: 'Trade Frequency Increasing',
        message: `You have taken ${currentTradeCount} trades. High frequency increases emotional exposure.`,
        level: 'CAUTION',
        icon: Info
      });
    }

    if (currentEmotionScore >= settings.emotion.criticalThreshold) {
      warnings.push({
        title: 'High Emotional State Detected',
        message: currentEmotionObj.warningMsg || 'HIGH RISK OF OVERTRADING — CONSIDER STOPPING.',
        level: 'CRITICAL',
        icon: ShieldAlert
      });
    } else if (currentEmotionScore >= settings.emotion.warningThreshold) {
      warnings.push({
        title: 'Elevated Emotion Level',
        message: `Current emotion level is ${currentEmotionObj.label}. Maintain strict plan adherence.`,
        level: 'CAUTION',
        icon: AlertTriangle
      });
    }

    settings.customMetrics.forEach((cm) => {
      const val = customMetricValues[cm.id] ?? 0;
      if (val >= cm.warningThreshold) {
        warnings.push({
          title: `Custom Metric Warning: ${cm.name}`,
          message: cm.warningMsg || `High metric value detected (${val}/${cm.maxScore}).`,
          level: 'WARNING',
          icon: Zap
        });
      }
    });

    if (warnings.length === 0) {
      warnings.push({
        title: 'Optimal Discipline',
        message: 'YOU ARE WITHIN YOUR PLANNED LIMITS.',
        level: 'SAFE',
        icon: CheckCircle2
      });
    }

    return warnings;
  }, [currentLoss, currentTradeCount, currentEmotionScore, customMetricValues, settings, currencySymbol, currentEmotionObj]);

  // Calendar & Breakdown Modal
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [showDailyBreakdownModal, setShowDailyBreakdownModal] = useState<boolean>(false);

  const selectedDateRecord = useMemo(() => {
    if (!selectedCalendarDate) return null;
    return records.find((r) => r.date === selectedCalendarDate) || null;
  }, [records, selectedCalendarDate]);

  const handleSaveDailyRecord = (dateToSave: string, notesText: string = '') => {
    const existingIndex = records.findIndex((r) => r.date === dateToSave);
    const dayTrades = trades.filter((t) => t.date === dateToSave);
    const dayPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    const newRecord: DailyDisciplineRecord = {
      id: existingIndex >= 0 ? records[existingIndex].id : `dr-${dateToSave}`,
      date: dateToSave,
      disciplineScore: computedDisciplineScore,
      pnl: dayPnl,
      tradeCount: dayTrades.length || currentTradeCount,
      emotionScore: currentEmotionScore,
      warningStatus: currentWarningStatusLevel,
      categoryScores: {
        lossControl: Math.max(0, Math.round(((settings.loss.dailyLossLimit - currentLoss) / settings.loss.dailyLossLimit) * 100)),
        tradeFrequency: currentTradeCount <= settings.tradeCount.plannedMaxTrades ? 100 : 60,
        emotionalControl: Math.max(0, 100 - Math.abs(currentEmotionScore - 50) * 1.5),
        ruleCompliance: 85,
        sessionDiscipline: timerCompleted ? 100 : 80
      },
      customMetricScores: { ...customMetricValues },
      violations: violations.filter((v) => v.date === dateToSave),
      notes: notesText,
      createdAt: new Date().toISOString()
    };

    let updatedList: DailyDisciplineRecord[];
    if (existingIndex >= 0) {
      updatedList = [...records];
      updatedList[existingIndex] = newRecord;
    } else {
      updatedList = [newRecord, ...records];
    }
    onUpdateRecords(updatedList);
  };

  // Violation Logging State
  const [showAddViolationModal, setShowAddViolationModal] = useState<boolean>(false);
  const [newViolationName, setNewViolationName] = useState<string>('Revenge Trading');
  const [newViolationValue, setNewViolationValue] = useState<string>('85 / 100');
  const [newViolationThreshold, setNewViolationThreshold] = useState<string>('70 / 100');
  const [newViolationPnl, setNewViolationPnl] = useState<string>('-150');
  const [newViolationSeverity, setNewViolationSeverity] = useState<'CAUTION' | 'WARNING' | 'CRITICAL'>('WARNING');
  const [newViolationNotes, setNewViolationNotes] = useState<string>('');

  const handleAddViolation = (e: React.FormEvent) => {
    e.preventDefault();
    const newV: DisciplineViolation = {
      id: `v-${Date.now()}`,
      date: todayStr,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      violationName: newViolationName,
      currentValue: newViolationValue,
      threshold: newViolationThreshold,
      pnl: parseFloat(newViolationPnl) || 0,
      severity: newViolationSeverity,
      notes: newViolationNotes
    };
    onUpdateViolations([newV, ...violations]);
    setShowAddViolationModal(false);
    setNewViolationNotes('');
  };

  const handleDeleteViolation = (id: string) => {
    onUpdateViolations(violations.filter((v) => v.id !== id));
  };

  // Custom Metrics Manager State
  const [showAddMetricModal, setShowAddMetricModal] = useState<boolean>(false);
  const [newMetricName, setNewMetricName] = useState<string>('');
  const [newMetricMaxScore, setNewMetricMaxScore] = useState<number>(100);
  const [newMetricThreshold, setNewMetricThreshold] = useState<number>(70);
  const [newMetricWarningMsg, setNewMetricWarningMsg] = useState<string>('');
  const [newMetricDesc, setNewMetricDesc] = useState<string>('');

  const handleAddCustomMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetricName.trim()) return;
    const newMetric: CustomDisciplineMetric = {
      id: `cm-${Date.now()}`,
      name: newMetricName.trim(),
      maxScore: newMetricMaxScore,
      warningThreshold: newMetricThreshold,
      warningMsg: newMetricWarningMsg || `Warning threshold breached for ${newMetricName}`,
      description: newMetricDesc,
      defaultValue: 20
    };
    onUpdateSettings({
      ...settings,
      customMetrics: [...settings.customMetrics, newMetric]
    });
    setCustomMetricValues((prev) => ({ ...prev, [newMetric.id]: 20 }));
    setShowAddMetricModal(false);
    setNewMetricName('');
    setNewMetricWarningMsg('');
    setNewMetricDesc('');
  };

  const handleDeleteCustomMetric = (id: string) => {
    onUpdateSettings({
      ...settings,
      customMetrics: settings.customMetrics.filter((m) => m.id !== id)
    });
  };

  // Analytics State
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'ALL' | 'MONTH' | 'WEEK'>('ALL');
  const filteredRecords = useMemo(() => {
    if (analyticsTimeframe === 'ALL') return records;
    const now = new Date();
    if (analyticsTimeframe === 'MONTH') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return records.filter((r) => r.date >= monthStart);
    }
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    return records.filter((r) => r.date >= weekAgo);
  }, [records, analyticsTimeframe]);

  const analyticsMetrics = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        avgScore: 0,
        avgTrades: 0,
        avgEmotion: 0,
        avgPnl: 0,
        overtradingDays: 0,
        warningDays: 0
      };
    }
    const sumScore = filteredRecords.reduce((s, r) => s + r.disciplineScore, 0);
    const sumTrades = filteredRecords.reduce((s, r) => s + r.tradeCount, 0);
    const sumEmotion = filteredRecords.reduce((s, r) => s + r.emotionScore, 0);
    const sumPnl = filteredRecords.reduce((s, r) => s + r.pnl, 0);
    const overtradingDays = filteredRecords.filter((r) => r.warningStatus === 'CRITICAL' || r.tradeCount > settings.tradeCount.plannedMaxTrades).length;
    const warningDays = filteredRecords.filter((r) => r.warningStatus === 'WARNING' || r.warningStatus === 'CAUTION').length;

    return {
      avgScore: Math.round(sumScore / filteredRecords.length),
      avgTrades: (sumTrades / filteredRecords.length).toFixed(1),
      avgEmotion: Math.round(sumEmotion / filteredRecords.length),
      avgPnl: Math.round(sumPnl / filteredRecords.length),
      overtradingDays,
      warningDays
    };
  }, [filteredRecords, settings.tradeCount.plannedMaxTrades]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getStatusBadge = (status: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL') => {
    switch (status) {
      case 'SAFE':
        return { label: 'Safe', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' };
      case 'CAUTION':
        return { label: 'Caution', color: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' };
      case 'WARNING':
        return { label: 'Warning', color: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' };
      case 'CRITICAL':
        return { label: 'Critical', color: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' };
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* TOP SUB-NAV HEADER BAR */}
      <div className="clay-surface p-4 sm:p-5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-700 text-white rounded-2xl shadow-clayButton">
            <Brain size={24} className="stroke-[2.5px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-clay-foreground">
                DISCIPLINE COACH
              </h1>
              <span className="clay-pill text-3xs font-mono font-bold bg-purple-100 text-purple-800">
                BEHAVIORAL TERMINAL
              </span>
            </div>
            <p className="text-3xs text-clay-muted font-sans mt-0.5">
              Customizable Trading Psychology & Risk Awareness Dashboard • USD (${currencySymbol})
            </p>
          </div>
        </div>

        {/* OVERALL DISCIPLINE SCORE BADGE */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-4xs font-extrabold uppercase tracking-widest text-clay-muted font-mono">
              Live Discipline Score
            </div>
            <div className="text-2xl sm:text-3xl font-black font-display tracking-tight flex items-center justify-end gap-1.5 text-clay-foreground">
              <span className={computedDisciplineScore >= 80 ? 'text-emerald-600' : computedDisciplineScore >= 60 ? 'text-amber-600' : 'text-rose-600'}>
                {computedDisciplineScore}
              </span>
              <span className="text-xs text-clay-muted font-mono font-normal">/ 100</span>
            </div>
          </div>

          <div className="clay-pressed p-2.5 rounded-2xl flex flex-col items-center justify-center min-w-[70px]">
            <span className={`h-2.5 w-2.5 rounded-full ${getStatusBadge(currentWarningStatusLevel).dot} animate-pulse`}></span>
            <span className="text-[10px] font-black uppercase tracking-wider mt-1 font-mono">
              {currentWarningStatusLevel}
            </span>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex bg-white/70 p-1.5 rounded-2xl shadow-sm border border-slate-200/80 overflow-x-auto">
        {[
          { id: 'cockpit', label: 'Psychology Cockpit', icon: Activity },
          { id: 'calendar', label: 'Discipline Calendar', icon: CalendarIcon },
          { id: 'violations', label: 'Violations Log', icon: ShieldAlert },
          { id: 'analytics', label: 'Analytics & Trends', icon: BarChart3 },
          { id: 'settings', label: 'Discipline Settings', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-2xs font-extrabold transition-all duration-200 cursor-pointer whitespace-nowrap ${isActive
                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-purple-700 hover:bg-white/80'
                }`}
            >
              <Icon size={14} className="stroke-[2.5px]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: PSYCHOLOGY COCKPIT */}
      {activeSubTab === 'cockpit' && (
        <div className="space-y-6">
          {/* SECTION 1: BIG COUNTDOWN TIMER */}
          <div className="clay-surface p-6 space-y-4 relative overflow-hidden">
            <div className="flex flex-wrap justify-between items-center gap-3 pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-purple-600 stroke-[2.5px]" />
                <h2 className="text-base font-black text-clay-foreground uppercase tracking-wide">
                  1. Trade Cool-Down & Session Countdown Timer
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTimerEditModal(true)}
                  className="clay-button clay-button-secondary min-h-0 px-3 py-1.5 text-3xs font-extrabold uppercase"
                >
                  <Edit3 size={12} />
                  <span>Edit Duration / Presets</span>
                </button>
              </div>
            </div>

            {/* Timer Display */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-2">
              <div className="flex flex-col items-center md:items-start space-y-1">
                <div className="text-4xs font-mono font-extrabold uppercase tracking-widest text-clay-muted">
                  Active Cool-Down / Session Clock
                </div>
                <div className="text-5xl sm:text-6xl font-black font-mono tracking-tighter text-slate-850 drop-shadow-sm">
                  {formatTimer(timerSecondsLeft)}
                </div>
                {timerCompleted && (
                  <div className="px-3 py-1 bg-amber-100 border border-amber-300 rounded-full text-amber-900 font-extrabold text-xs animate-bounce flex items-center gap-1.5 mt-2">
                    <Sparkles size={14} className="text-amber-600" />
                    <span>COOL-DOWN / SESSION COMPLETE — CLEAR TO TRADE.</span>
                  </div>
                )}
              </div>

              {/* Timer Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {!isTimerRunning ? (
                  <button
                    onClick={() => {
                      setIsTimerRunning(true);
                      setTimerCompleted(false);
                    }}
                    className="clay-button clay-button-primary min-h-0 px-5 py-2.5 text-xs font-black uppercase"
                  >
                    <Play size={14} className="fill-white" />
                    <span>{timerSecondsLeft < settings.session.durationSeconds ? 'Resume' : 'Start Timer'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsTimerRunning(false)}
                    className="clay-button bg-amber-500 hover:bg-amber-600 text-white min-h-0 px-5 py-2.5 text-xs font-black uppercase"
                  >
                    <Pause size={14} className="fill-white" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSecondsLeft(settings.session.durationSeconds);
                    setTimerCompleted(false);
                  }}
                  className="clay-button clay-button-secondary min-h-0 px-4 py-2.5 text-xs font-extrabold uppercase"
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Session Presets Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 max-w-xs">
                <span className="w-full text-[10px] font-bold text-clay-muted uppercase font-mono text-center md:text-right">
                  Cool-Down Presets:
                </span>
                {settings.session.presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSecondsLeft(preset.durationMinutes * 60);
                      setTimerCompleted(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-3xs font-extrabold transition-all cursor-pointer ${timerSecondsLeft === preset.durationMinutes * 60
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white/80 hover:bg-purple-100 text-slate-700 border border-slate-200/80'
                      }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GRID SECTION 2 & 3: RISK & ACTIVITY METERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SECTION 2: EDITABLE LOSS METER */}
            <div 
              className="clay-surface p-5 space-y-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-rose-300"
              onWheel={handleLossWheel}
            >
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-rose-500 stroke-[2.5px]" />
                  <h3 className="text-sm font-black text-clay-foreground uppercase tracking-wide">
                    2. Loss Meter (USD $)
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md hidden sm:inline-block">
                    🖱️ Scroll Wheel Enabled
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSyncTodayLoss}
                    className="text-3xs font-extrabold text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 flex items-center gap-1 cursor-pointer transition hover:bg-purple-100"
                    title="Auto-sync loss from logged trades today"
                  >
                    <RefreshCw size={10} />
                    <span>Sync Today (${todayLossAmount})</span>
                  </button>
                </div>
              </div>

              {/* Display Header with Editable Values */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50/80 rounded-2xl border border-slate-150">
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Current Loss</div>
                  <div className="text-base font-black text-rose-600 font-mono mt-0.5 flex items-center justify-center gap-0.5">
                    <span>{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      max={effectiveMaxLoss}
                      step={effectiveLossStep}
                      value={currentLoss}
                      onChange={(e) => setCurrentLoss(Math.max(0, Number(e.target.value) || 0))}
                      className="w-16 bg-white border border-slate-200 rounded text-center text-rose-600 font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 py-0.5"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 font-mono flex items-center justify-center gap-1">
                    <span>Loss Limit</span>
                    <button
                      onClick={() => {
                        setIsEditingLossLimit(!isEditingLossLimit);
                        setInputLossLimit(String(lossLimit));
                      }}
                      className="text-slate-400 hover:text-purple-700 transition cursor-pointer"
                      title="Edit Daily Loss Limit ($)"
                    >
                      <Edit3 size={10} />
                    </button>
                  </div>
                  {isEditingLossLimit ? (
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-xs font-mono font-bold text-slate-500">$</span>
                      <input
                        type="number"
                        min="1"
                        value={inputLossLimit}
                        onChange={(e) => setInputLossLimit(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = Math.max(1, Number(inputLossLimit) || 50);
                            onUpdateSettings({
                              ...settings,
                              loss: { ...settings.loss, dailyLossLimit: val, maxLoss: Math.max(val * 2, 100) }
                            });
                            setIsEditingLossLimit(false);
                          }
                        }}
                        className="w-16 bg-white border border-purple-300 rounded text-center text-slate-800 font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 py-0.5"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const val = Math.max(1, Number(inputLossLimit) || 50);
                          onUpdateSettings({
                            ...settings,
                            loss: { ...settings.loss, dailyLossLimit: val, maxLoss: Math.max(val * 2, 100) }
                          });
                          setIsEditingLossLimit(false);
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded text-xs font-bold"
                        title="Save Loss Limit"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        setIsEditingLossLimit(true);
                        setInputLossLimit(String(lossLimit));
                      }}
                      className="text-base font-black text-slate-800 font-mono mt-0.5 cursor-pointer hover:text-purple-700"
                      title="Click to edit limit"
                    >
                      {currencySymbol}{lossLimit.toLocaleString()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Loss Used</div>
                  <div className={`text-base font-black font-mono mt-0.5 ${(currentLoss / lossLimit) >= 1 ? 'text-rose-600' : (currentLoss / lossLimit) >= 0.75 ? 'text-orange-600' : (currentLoss / lossLimit) >= 0.5 ? 'text-amber-600' : 'text-purple-700'}`}>
                    {((currentLoss / (lossLimit || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Slider Controls with Wheel Scrolling */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-3xs font-bold text-slate-500 font-mono">
                  <span>Drag or scroll mouse wheel over slider:</span>
                  <div className="flex items-center gap-1 font-extrabold text-rose-600">
                    <span>{currencySymbol}{currentLoss}</span>
                    <span className="text-slate-400">/ {currencySymbol}{lossLimit}</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={effectiveMaxLoss}
                  step={effectiveLossStep}
                  value={currentLoss}
                  onChange={(e) => setCurrentLoss(Number(e.target.value))}
                  className="w-full h-3.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />

                {/* Dynamic Slider Scale Labels */}
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-extrabold pt-1">
                  {dynamicLossLabels.map((lbl, idx) => (
                    <span key={idx} className={lbl.includes('Limit') ? 'text-rose-600 font-black' : ''}>{lbl}</span>
                  ))}
                </div>
              </div>

              {/* Quick Increment / Decrement Steppers */}
              <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  {[-10, -5, -1, 1, 5, 10].map((delta) => (
                    <button
                      key={delta}
                      onClick={() => setCurrentLoss((prev) => Math.max(0, Math.min(effectiveMaxLoss, prev + delta)))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-3xs font-mono font-bold transition cursor-pointer"
                    >
                      {delta > 0 ? `+$${delta}` : `-$${Math.abs(delta)}`}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentLoss(0)}
                  className="text-3xs font-mono font-bold text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 transition cursor-pointer"
                >
                  Clear to $0
                </button>
              </div>

              {/* Warning Threshold Indicators */}
              <div className="flex items-center justify-between text-3xs font-extrabold pt-1">
                <span className="text-emerald-700 flex items-center gap-1">🟢 Safe (&lt;50%)</span>
                <span className="text-amber-700 flex items-center gap-1">🟡 Caution (50%)</span>
                <span className="text-orange-700 flex items-center gap-1">🟠 Warning (75%)</span>
                <span className="text-rose-700 flex items-center gap-1">🔴 Critical (100%)</span>
              </div>
            </div>

            {/* SECTION 3: EDITABLE TRADE COUNT METER */}
            <div className="clay-surface p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-indigo-500 stroke-[2.5px]" />
                  <h3 className="text-sm font-black text-clay-foreground uppercase tracking-wide">
                    3. Trade Count Meter
                  </h3>
                </div>
                <button
                  onClick={handleSyncTodayTrades}
                  className="text-3xs font-extrabold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer"
                  title="Auto-sync trade count from logged trades today"
                >
                  <RefreshCw size={10} />
                  <span>Sync Today ({todayTrades.length})</span>
                </button>
              </div>

              {/* Display Header */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50/80 rounded-2xl border border-slate-150">
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Trades Taken</div>
                  <div className="text-base font-black text-indigo-600 font-mono mt-0.5">
                    {currentTradeCount}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Planned Max</div>
                  <div className="text-base font-black text-slate-800 font-mono mt-0.5">
                    {settings.tradeCount.plannedMaxTrades}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Remaining</div>
                  <div className="text-base font-black text-emerald-600 font-mono mt-0.5">
                    {Math.max(0, settings.tradeCount.plannedMaxTrades - currentTradeCount)}
                  </div>
                </div>
              </div>

              {/* Slider Controls */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-3xs font-bold text-slate-500 font-mono">
                  <span>Drag trade frequency count:</span>
                  <span>{currentTradeCount} Trades</span>
                </div>

                <input
                  type="range"
                  min={settings.tradeCount.minTrades}
                  max={settings.tradeCount.maxTrades}
                  step={settings.tradeCount.stepSize}
                  value={currentTradeCount}
                  onChange={(e) => setCurrentTradeCount(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />

                {/* Slider Scale Labels */}
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-extrabold pt-1">
                  {settings.tradeCount.labels.map((lbl, idx) => (
                    <span key={idx}>{lbl}</span>
                  ))}
                </div>
              </div>

              {/* Excess Warning Alert if threshold reached */}
              {currentTradeCount >= settings.tradeCount.plannedMaxTrades && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-3xs font-bold flex items-center gap-2">
                  <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                  <span>{settings.tradeCount.exceededWarningMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: FULLY EDITABLE EMOTION BAR */}
          <div className="clay-surface p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-amber-500 stroke-[2.5px]" />
                <h2 className="text-base font-black text-clay-foreground uppercase tracking-wide">
                  4. Emotional State Spectrum
                </h2>
              </div>
              <div className="text-right">
                <span className="text-3xs font-mono font-bold text-slate-400 uppercase">State: </span>
                <span className="text-xs font-black text-purple-800 uppercase tracking-wider font-mono">
                  {currentEmotionObj.label} ({currentEmotionScore}/100)
                </span>
              </div>
            </div>

            {/* Spectrum Slider */}
            <div className="space-y-3 pt-2">
              <input
                type="range"
                min={settings.emotion.minScore}
                max={settings.emotion.maxScore}
                value={currentEmotionScore}
                onChange={(e) => setCurrentEmotionScore(Number(e.target.value))}
                className="w-full h-4 bg-gradient-to-r from-blue-400 via-emerald-400 via-amber-400 to-rose-500 rounded-lg appearance-none cursor-pointer accent-purple-700"
              />

              {/* Emotion Level Labels */}
              <div className="flex flex-wrap justify-between items-center gap-1 text-[10px] font-extrabold font-mono text-slate-600">
                {settings.emotion.levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setCurrentEmotionScore(lvl.score)}
                    className={`px-2 py-1 rounded-lg border transition cursor-pointer ${currentEmotionObj.id === lvl.id
                      ? 'bg-purple-700 text-white border-purple-800 scale-105 font-black'
                      : 'bg-white/80 hover:bg-purple-50 text-slate-700 border-slate-200'
                      }`}
                    style={{ borderColor: currentEmotionObj.id === lvl.id ? undefined : lvl.color }}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion Warning Context */}
            {currentEmotionObj.warningMsg && (
              <div className="p-3 bg-purple-50/80 border border-purple-200/80 rounded-2xl flex items-center gap-2.5 text-2xs text-purple-900 font-sans">
                <Info size={16} className="text-purple-600 shrink-0" />
                <div>
                  <strong className="font-extrabold uppercase font-mono mr-1">{currentEmotionObj.label} Mindset Note:</strong>
                  <span>{currentEmotionObj.warningMsg}</span>
                </div>
              </div>
            )}
          </div>

          {/* GRID SECTION 5 & 6 & 7: DISCIPLINE SCORECARD & LIVE WARNINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SECTION 5: DISCIPLINE SCORE BREAKDOWN */}
            <div className="clay-surface p-5 space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-purple-600 stroke-[2.5px]" />
                  <h2 className="text-base font-black text-clay-foreground uppercase tracking-wide">
                    5. Discipline Score Weighting Breakdown
                  </h2>
                </div>
                <button
                  onClick={() => setActiveSubTab('settings')}
                  className="text-3xs text-purple-700 font-extrabold hover:underline"
                >
                  Configure Weights &rarr;
                </button>
              </div>

              {/* Weight Factors List */}
              <div className="space-y-3">
                {settings.scoreWeights.map((weight) => (
                  <div key={weight.id} className="space-y-1">
                    <div className="flex justify-between items-center text-3xs font-extrabold font-mono text-slate-700">
                      <span>{weight.name} ({weight.weight}%)</span>
                      <span className="text-purple-700 font-bold">Factor Active</span>
                    </div>
                    <div className="w-full bg-slate-150 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, weight.weight * 2.5)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Button to Save Daily Record */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleSaveDailyRecord(todayStr)}
                  className="clay-button clay-button-primary min-h-0 px-4 py-2 text-2xs font-extrabold uppercase"
                >
                  <FileText size={12} />
                  <span>Snapshot Today&apos;s Discipline Record</span>
                </button>
              </div>
            </div>

            {/* SECTION 6 & 7: LIVE WARNINGS PANEL */}
            <div className="clay-surface p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <ShieldAlert size={20} className="text-orange-500 stroke-[2.5px]" />
                <h2 className="text-base font-black text-clay-foreground uppercase tracking-wide">
                  Live Warning Radar
                </h2>
              </div>

              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {activeLiveWarnings.map((warn, idx) => {
                  const Icon = warn.icon;
                  const badge = getStatusBadge(warn.level);
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border space-y-1 transition-all ${warn.level === 'CRITICAL'
                        ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                        : warn.level === 'WARNING'
                          ? 'bg-orange-50/80 border-orange-200 text-orange-900'
                          : warn.level === 'CAUTION'
                            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                            : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          <Icon size={14} className="shrink-0" />
                          {warn.title}
                        </span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {warn.level}
                        </span>
                      </div>
                      <p className="text-3xs leading-relaxed font-sans opacity-90">
                        {warn.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: DISCIPLINE CALENDAR */}
      {activeSubTab === 'calendar' && (
        <div className="clay-surface p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon size={20} className="text-purple-600 stroke-[2.5px]" />
              <h2 className="text-lg font-black text-clay-foreground uppercase tracking-wide">
                8. Daily Discipline Calendar
              </h2>
            </div>
            <p className="text-3xs text-clay-muted font-sans hidden sm:block">
              Click any calendar day to inspect complete discipline scorecards & logged violations.
            </p>
          </div>

          {/* CALENDAR GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {records.map((rec) => {
              const badge = getStatusBadge(rec.warningStatus);
              return (
                <div
                  key={rec.id}
                  onClick={() => {
                    setSelectedCalendarDate(rec.date);
                    setShowDailyBreakdownModal(true);
                  }}
                  className="clay-card p-4 space-y-3 cursor-pointer hover:border-purple-300 transition-all border border-slate-200/60"
                >
                  <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                    <span className="text-xs font-black font-mono text-slate-800">{rec.date}</span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {rec.warningStatus}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-3xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Discipline Score:</span>
                      <span className="font-black text-purple-700">{rec.disciplineScore} / 100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">PNL (USD):</span>
                      <span className={`font-black ${rec.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {rec.pnl >= 0 ? '+' : ''}${rec.pnl.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trade Count:</span>
                      <span className="font-bold text-slate-800">{rec.tradeCount} trades</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Emotion Score:</span>
                      <span className="font-bold text-amber-700">{rec.emotionScore} / 100</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-purple-600 font-extrabold flex items-center justify-end gap-1 pt-1">
                    <span>Inspect Scorecard</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: VIOLATIONS LOG */}
      {activeSubTab === 'violations' && (
        <div className="clay-surface p-6 space-y-5">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={20} className="text-rose-600 stroke-[2.5px]" />
              <h2 className="text-lg font-black text-clay-foreground uppercase tracking-wide">
                11. Discipline Violation Tracking Log
              </h2>
            </div>
            <button
              onClick={() => setShowAddViolationModal(true)}
              className="clay-button clay-button-primary min-h-0 px-4 py-2 text-2xs font-extrabold uppercase"
            >
              <Plus size={14} />
              <span>Log Manual Violation</span>
            </button>
          </div>

          {violations.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 text-slate-500 text-xs">
              No discipline violations logged. Keep executing your plan consistently!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Violation Type</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Current Value vs Threshold</th>
                    <th className="py-2.5 px-3">PnL Impact</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-2xs font-sans text-slate-700">
                  {violations.map((v) => {
                    const badge = getStatusBadge(v.severity);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                          {v.date} <span className="text-slate-400 text-3xs font-normal">({v.time})</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-850 whitespace-nowrap">
                          {v.violationName}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badge.color}`}>
                            {v.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-purple-900 whitespace-nowrap">
                          {v.currentValue} <span className="text-slate-400 font-normal">/ {v.threshold}</span>
                        </td>
                        <td className={`py-3 px-3 font-mono font-bold whitespace-nowrap ${v.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {v.pnl >= 0 ? '+' : ''}${v.pnl.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                          {v.notes || '—'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteViolation(v.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Delete violation entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: HISTORICAL ANALYTICS & TRENDS */}
      {activeSubTab === 'analytics' && (
        <div className="clay-surface p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-600 stroke-[2.5px]" />
              <h2 className="text-lg font-black text-clay-foreground uppercase tracking-wide">
                12. Daily Discipline History & Analytics
              </h2>
            </div>

            {/* Timeframe Filters */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-3xs font-extrabold uppercase font-mono">
              {(['ALL', 'MONTH', 'WEEK'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setAnalyticsTimeframe(tf)}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${analyticsTimeframe === tf
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* SUMMARY TREND CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            <div className="p-3.5 bg-purple-50/80 border border-purple-150 rounded-2xl">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-purple-600 font-mono">Avg Discipline</div>
              <div className="text-xl font-black text-purple-900 font-mono mt-1">
                {analyticsMetrics.avgScore} <span className="text-xs font-normal text-purple-600">/100</span>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-50/80 border border-indigo-150 rounded-2xl">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-600 font-mono">Avg Trades / Day</div>
              <div className="text-xl font-black text-indigo-900 font-mono mt-1">
                {analyticsMetrics.avgTrades}
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-150 rounded-2xl">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-amber-600 font-mono">Avg Emotion</div>
              <div className="text-xl font-black text-amber-900 font-mono mt-1">
                {analyticsMetrics.avgEmotion} <span className="text-xs font-normal text-amber-600">/100</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/80 border border-emerald-150 rounded-2xl">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600 font-mono">Avg Daily PNL</div>
              <div className={`text-xl font-black font-mono mt-1 ${analyticsMetrics.avgPnl >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                {analyticsMetrics.avgPnl >= 0 ? '+' : ''}${analyticsMetrics.avgPnl}
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/80 border border-rose-150 rounded-2xl">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-rose-600 font-mono">Overtrading Days</div>
              <div className="text-xl font-black text-rose-900 font-mono mt-1">
                {analyticsMetrics.overtradingDays}
              </div>
            </div>

            <div className="p-3.5 bg-orange-50/80 border border-orange-150 rounded-2xl">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-orange-600 font-mono">Warning Days</div>
              <div className="text-xl font-black text-orange-900 font-mono mt-1">
                {analyticsMetrics.warningDays}
              </div>
            </div>
          </div>

          {/* VISUAL HISTORICAL BAR CHART */}
          <div className="p-5 bg-slate-50/80 border border-slate-200/80 rounded-3xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 font-mono">
              Historical Discipline Score vs PNL Performance
            </h3>
            <div className="space-y-3">
              {filteredRecords.map((r) => (
                <div key={r.id} className="space-y-1">
                  <div className="flex justify-between items-center text-3xs font-mono font-bold text-slate-700">
                    <span>{r.date}</span>
                    <div className="flex gap-3">
                      <span>Score: <strong className="text-purple-700">{r.disciplineScore}/100</strong></span>
                      <span>PNL: <strong className={r.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>${r.pnl}</strong></span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all ${r.disciplineScore >= 80 ? 'bg-emerald-500' : r.disciplineScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${r.disciplineScore}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: PERSONAL SETTINGS PANEL */}
      {activeSubTab === 'settings' && (
        <div className="clay-surface p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-purple-600 stroke-[2.5px]" />
              <h2 className="text-lg font-black text-clay-foreground uppercase tracking-wide">
                13. Personal Discipline Settings Panel
              </h2>
            </div>
            <span className="text-3xs text-purple-700 font-mono font-bold bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
              EVERYTHING IS EDITABLE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Timer & Presets Settings */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 font-mono">Session Timer Configuration</h3>
              <div className="space-y-2 text-2xs">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Default Duration (Seconds)</label>
                  <input
                    type="number"
                    value={settings.session.durationSeconds}
                    onChange={(e) => onUpdateSettings({
                      ...settings,
                      session: { ...settings.session, durationSeconds: Math.max(60, Number(e.target.value) || 3600) }
                    })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 2. Loss Limits Settings */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 font-mono">Loss Limits & Currency</h3>
              <div className="grid grid-cols-2 gap-3 text-2xs">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Daily Loss Limit ($)</label>
                  <input
                    type="number"
                    value={settings.loss.dailyLossLimit}
                    onChange={(e) => onUpdateSettings({
                      ...settings,
                      loss: { ...settings.loss, dailyLossLimit: Number(e.target.value) || 50 }
                    })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Max Slider Bound ($)</label>
                  <input
                    type="number"
                    value={settings.loss.maxLoss}
                    onChange={(e) => onUpdateSettings({
                      ...settings,
                      loss: { ...settings.loss, maxLoss: Number(e.target.value) || 100 }
                    })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 3. Trade Count Settings */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 font-mono">Trade Count Limits</h3>
              <div className="grid grid-cols-2 gap-3 text-2xs">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Planned Max Trades</label>
                  <input
                    type="number"
                    value={settings.tradeCount.plannedMaxTrades}
                    onChange={(e) => onUpdateSettings({
                      ...settings,
                      tradeCount: { ...settings.tradeCount, plannedMaxTrades: Number(e.target.value) || 10 }
                    })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    value={settings.tradeCount.warningThreshold}
                    onChange={(e) => onUpdateSettings({
                      ...settings,
                      tradeCount: { ...settings.tradeCount, warningThreshold: Number(e.target.value) || 6 }
                    })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 4. Score Weightings Settings */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase text-slate-800 font-mono">Category Score Weights (%)</h3>
                <span className="text-3xs font-mono font-bold text-purple-700">
                  Total: {settings.scoreWeights.reduce((s, w) => s + w.weight, 0)}%
                </span>
              </div>
              <div className="space-y-2 text-2xs">
                {settings.scoreWeights.map((w, idx) => (
                  <div key={w.id} className="flex justify-between items-center gap-2">
                    <span className="font-bold text-slate-700 w-1/2">{w.name}</span>
                    <input
                      type="number"
                      value={w.weight}
                      onChange={(e) => {
                        const newWeights = [...settings.scoreWeights];
                        newWeights[idx] = { ...w, weight: Number(e.target.value) || 0 };
                        onUpdateSettings({ ...settings, scoreWeights: newWeights });
                      }}
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs font-bold text-right"
                    />
                    <span className="font-mono text-slate-400">%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Discipline Metrics Builder */}
          <div className="p-5 bg-purple-50/50 border border-purple-200 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase text-purple-950 font-mono">Custom Discipline Metrics Manager</h3>
                <p className="text-3xs text-purple-700">Create custom metrics like Revenge Trading, FOMO, Moving Stop Loss, Chasing Losses, etc.</p>
              </div>
              <button
                onClick={() => setShowAddMetricModal(true)}
                className="clay-button clay-button-primary min-h-0 px-3.5 py-1.5 text-3xs font-extrabold uppercase"
              >
                <Plus size={12} />
                <span>Add Custom Metric</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {settings.customMetrics.map((cm) => (
                <div key={cm.id} className="p-3 bg-white rounded-2xl border border-purple-150 space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <strong className="text-xs font-bold text-slate-800">{cm.name}</strong>
                    <button
                      onClick={() => handleDeleteCustomMetric(cm.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="text-3xs text-slate-500 font-mono">
                    Warning Threshold: <span className="font-bold text-purple-700">{cm.warningThreshold} / {cm.maxScore}</span>
                  </div>
                  <p className="text-4xs text-slate-400 leading-tight">{cm.warningMsg}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT TIMER DURATION & PRESETS */}
      {showTimerEditModal && (
        <div className="fixed inset-0 bg-[#332F3A]/35 z-50 flex items-center justify-center p-4">
          <div className="clay-surface max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Clock size={16} className="text-purple-600" />
                Configure Session Duration
              </h3>
              <button onClick={() => setShowTimerEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <label className="text-3xs font-extrabold uppercase text-slate-500 font-mono">Hours</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={customTimerHours}
                  onChange={(e) => setCustomTimerHours(Number(e.target.value))}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl py-2 font-mono font-black text-sm"
                />
              </div>
              <div>
                <label className="text-3xs font-extrabold uppercase text-slate-500 font-mono">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customTimerMinutes}
                  onChange={(e) => setCustomTimerMinutes(Number(e.target.value))}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl py-2 font-mono font-black text-sm"
                />
              </div>
              <div>
                <label className="text-3xs font-extrabold uppercase text-slate-500 font-mono">Seconds</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customTimerSeconds}
                  onChange={(e) => setCustomTimerSeconds(Number(e.target.value))}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl py-2 font-mono font-black text-sm"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowTimerEditModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-2xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const totalSecs = customTimerHours * 3600 + customTimerMinutes * 60 + customTimerSeconds;
                  onUpdateSettings({
                    ...settings,
                    session: { ...settings.session, durationSeconds: Math.max(10, totalSecs) }
                  });
                  setTimerSecondsLeft(totalSecs);
                  setShowTimerEditModal(false);
                }}
                className="px-4 py-2 bg-purple-600 text-white text-2xs font-bold rounded-xl shadow-xs"
              >
                Save Duration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG MANUAL VIOLATION */}
      {showAddViolationModal && (
        <div className="fixed inset-0 bg-[#332F3A]/35 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddViolation} className="clay-surface max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert size={16} className="text-rose-600" />
                Log Discipline Violation
              </h3>
              <button type="button" onClick={() => setShowAddViolationModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-2xs">
              <div>
                <label className="text-slate-500 font-bold block mb-1">Violation Name / Rule</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revenge Trading after Loss"
                  value={newViolationName}
                  onChange={(e) => setNewViolationName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Current Value</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 85 / 100"
                    value={newViolationValue}
                    onChange={(e) => setNewViolationValue(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Threshold</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 70 / 100"
                    value={newViolationThreshold}
                    onChange={(e) => setNewViolationThreshold(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">PnL Impact ($)</label>
                  <input
                    type="number"
                    placeholder="-150"
                    value={newViolationPnl}
                    onChange={(e) => setNewViolationPnl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Severity</label>
                  <select
                    value={newViolationSeverity}
                    onChange={(e) => setNewViolationSeverity(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  >
                    <option value="CAUTION">CAUTION</option>
                    <option value="WARNING">WARNING</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Notes & Context</label>
                <textarea
                  rows={2}
                  placeholder="What triggered this violation? What rule was broken?"
                  value={newViolationNotes}
                  onChange={(e) => setNewViolationNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddViolationModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-2xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 text-white text-2xs font-bold rounded-xl shadow-xs"
              >
                Record Violation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: ADD CUSTOM METRIC */}
      {showAddMetricModal && (
        <div className="fixed inset-0 bg-[#332F3A]/35 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddCustomMetric} className="clay-surface max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <PlusCircle size={16} className="text-purple-600" />
                Add Custom Discipline Metric
              </h3>
              <button type="button" onClick={() => setShowAddMetricModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-2xs">
              <div>
                <label className="text-slate-500 font-bold block mb-1">Metric Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revenge Trading / FOMO"
                  value={newMetricName}
                  onChange={(e) => setNewMetricName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Max Score</label>
                  <input
                    type="number"
                    value={newMetricMaxScore}
                    onChange={(e) => setNewMetricMaxScore(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    value={newMetricThreshold}
                    onChange={(e) => setNewMetricThreshold(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Warning Message</label>
                <input
                  type="text"
                  placeholder="e.g. You may be revenge trading after a loss."
                  value={newMetricWarningMsg}
                  onChange={(e) => setNewMetricWarningMsg(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddMetricModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-2xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white text-2xs font-bold rounded-xl shadow-xs"
              >
                Save Metric
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: DAILY SCORECARD BREAKDOWN */}
      {showDailyBreakdownModal && selectedDateRecord && (
        <div className="fixed inset-0 bg-[#332F3A]/35 z-50 flex items-center justify-center p-4">
          <div className="clay-surface max-w-xl w-full p-6 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-800 font-mono">
                  Daily Scorecard: {selectedDateRecord.date}
                </h3>
                <span className="text-3xs text-slate-500">
                  Status: <strong className="text-purple-700">{selectedDateRecord.warningStatus}</strong>
                </span>
              </div>
              <button onClick={() => setShowDailyBreakdownModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Scorecard Overview Cards */}
            <div className="grid grid-cols-4 gap-2 text-center p-3 bg-slate-50 rounded-2xl font-mono text-3xs">
              <div>
                <span className="text-slate-400 block">Discipline</span>
                <span className="text-base font-black text-purple-700">{selectedDateRecord.disciplineScore}/100</span>
              </div>
              <div>
                <span className="text-slate-400 block">PNL (USD)</span>
                <span className={`text-base font-black ${selectedDateRecord.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${selectedDateRecord.pnl}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Trades</span>
                <span className="text-base font-black text-slate-800">{selectedDateRecord.tradeCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Emotion</span>
                <span className="text-base font-black text-amber-600">{selectedDateRecord.emotionScore}/100</span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-2">
              <span className="text-3xs font-extrabold uppercase text-slate-400 font-mono">Category Scores Breakdown</span>
              <div className="space-y-1.5 text-2xs font-mono">
                {Object.entries(selectedDateRecord.categoryScores || {}).map(([catKey, val]) => (
                  <div key={catKey} className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-150">
                    <span className="capitalize text-slate-700 font-bold">{catKey.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-black text-purple-800">{val} / 100</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selectedDateRecord.notes && (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl space-y-1">
                <span className="text-3xs font-bold uppercase text-purple-800 font-mono">Daily Notes & Reflections</span>
                <p className="text-xs text-slate-700 font-sans">{selectedDateRecord.notes}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDailyBreakdownModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-2xs font-bold rounded-xl"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
