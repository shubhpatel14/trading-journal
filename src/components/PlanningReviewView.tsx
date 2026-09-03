import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers3,
  Route,
  Sparkles,
} from 'lucide-react';
import { DailyReview, SetupDefinition, Trade, TradePlan, WeeklyReview } from '../types';
import ReviewView from './ReviewView';
import TradePlanView from './TradePlanView';

type WorkspaceMode = 'PLAN' | 'EOD' | 'EOW';

interface PlanningReviewViewProps {
  trades: Trade[];
  plans: TradePlan[];
  setups: SetupDefinition[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  onAddPlan: (plan: Omit<TradePlan, 'id' | 'createdAt'>) => void;
  onDeletePlan: (id: string) => void;
  onArchivePlan: (id: string) => void;
  onExecutePlan: (plan: TradePlan) => void;
  onAddDailyReview: (review: Omit<DailyReview, 'id' | 'createdAt'>) => void;
  onDeleteDailyReview: (id: string) => void;
  onAddWeeklyReview: (review: Omit<WeeklyReview, 'id' | 'createdAt'>) => void;
  onDeleteWeeklyReview: (id: string) => void;
  prefillSetup?: SetupDefinition | null;
  onClearPrefillSetup?: () => void;
}

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekStart = (date = new Date()) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return getLocalDate(start);
};

const workspaceTabs = [
  {
    id: 'PLAN' as const,
    label: 'Setup Plans',
    shortLabel: 'Plans',
    description: 'Prepare the trade',
    icon: FileText,
  },
  {
    id: 'EOD' as const,
    label: 'Daily Review',
    shortLabel: 'EOD',
    description: 'Close the session',
    icon: CalendarCheck2,
  },
  {
    id: 'EOW' as const,
    label: 'Weekly Review',
    shortLabel: 'EOW',
    description: 'Refine the process',
    icon: Layers3,
  },
];

export default function PlanningReviewView({
  trades,
  plans,
  setups,
  dailyReviews,
  weeklyReviews,
  onAddPlan,
  onDeletePlan,
  onArchivePlan,
  onExecutePlan,
  onAddDailyReview,
  onDeleteDailyReview,
  onAddWeeklyReview,
  onDeleteWeeklyReview,
  prefillSetup,
  onClearPrefillSetup,
}: PlanningReviewViewProps) {
  const [mode, setMode] = useState<WorkspaceMode>('PLAN');
  const today = useMemo(() => getLocalDate(), []);
  const currentWeekStart = useMemo(() => getWeekStart(), []);
  const activePlans = plans.filter(plan => plan.status === 'ACTIVE').length;
  const todayReviewed = dailyReviews.some(review => review.date === today);
  const weekReviewed = weeklyReviews.some(review => review.weekStartDate === currentWeekStart);

  useEffect(() => {
    if (prefillSetup) setMode('PLAN');
  }, [prefillSetup]);

  const reviewProps = {
    trades,
    dailyReviews,
    weeklyReviews,
    onAddDailyReview,
    onDeleteDailyReview,
    onAddWeeklyReview,
    onDeleteWeeklyReview,
  };

  return (
    <div className="space-y-6 sm:space-y-8" id="planning-reviews-tab">
      <section className="clay-surface relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <span className="clay-pill bg-white/80 text-violet-700">
              <Route size={14} className="stroke-[3px]" /> Trading workflow
            </span>
            <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Plan. Execute. Review.
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm">
              Build your setup blueprint before the session, then turn daily and weekly outcomes into a sharper process—all in one workspace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:min-w-[430px]">
            <div className="rounded-2xl border border-white/80 bg-white/65 p-3 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-violet-600"><FileText size={14} /><span className="text-4xs font-black uppercase tracking-wider">Active</span></div>
              <p className="mt-2 font-display text-xl font-black text-slate-900">{activePlans}</p>
              <p className="text-4xs font-bold text-slate-500">setup plans</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/65 p-3 shadow-sm backdrop-blur-sm">
              <div className={`flex items-center gap-1.5 ${todayReviewed ? 'text-emerald-600' : 'text-amber-600'}`}><CalendarCheck2 size={14} /><span className="text-4xs font-black uppercase tracking-wider">Today</span></div>
              <p className={`mt-2 text-xs font-black ${todayReviewed ? 'text-emerald-700' : 'text-slate-800'}`}>{todayReviewed ? 'Reviewed' : 'Pending'}</p>
              <p className="mt-1 text-4xs font-bold text-slate-500">daily closeout</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/65 p-3 shadow-sm backdrop-blur-sm">
              <div className={`flex items-center gap-1.5 ${weekReviewed ? 'text-emerald-600' : 'text-sky-600'}`}><ClipboardCheck size={14} /><span className="text-4xs font-black uppercase tracking-wider">Week</span></div>
              <p className={`mt-2 text-xs font-black ${weekReviewed ? 'text-emerald-700' : 'text-slate-800'}`}>{weekReviewed ? 'Reviewed' : 'Open'}</p>
              <p className="mt-1 text-4xs font-bold text-slate-500">weekly review</p>
            </div>
          </div>
        </div>
      </section>

      <section className="clay-pressed grid grid-cols-3 gap-1.5 p-1.5 sm:gap-2 sm:p-2" aria-label="Planning and review workspace">
        {workspaceTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              aria-pressed={isActive}
              className={`group flex min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-3 text-left transition-all sm:justify-start sm:px-4 ${isActive
                ? 'bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-clayButton'
                : 'text-slate-500 hover:bg-white/70 hover:text-violet-700'
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-white/18' : 'bg-white/70'}`}>
                <Icon size={16} className="stroke-[2.5px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-2xs font-black sm:hidden">{tab.shortLabel}</span>
                <span className="hidden truncate text-xs font-black sm:block">{tab.label}</span>
                <span className={`mt-0.5 hidden truncate text-4xs font-bold sm:block ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{tab.description}</span>
              </span>
              {isActive && <CheckCircle2 size={14} className="ml-auto hidden shrink-0 sm:block" />}
            </button>
          );
        })}
      </section>

      <div className="rounded-[32px] border border-white/70 bg-white/30 p-2 shadow-[0_16px_45px_rgba(94,74,130,0.08)] sm:p-4">
        {mode === 'PLAN' ? (
          <TradePlanView
            plans={plans}
            setups={setups}
            onAddPlan={onAddPlan}
            onDeletePlan={onDeletePlan}
            onArchivePlan={onArchivePlan}
            onExecutePlan={onExecutePlan}
            prefillSetup={prefillSetup}
            onClearPrefillSetup={onClearPrefillSetup}
            hideHeader
          />
        ) : (
          <ReviewView {...reviewProps} mode={mode} hideHeader />
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-center text-4xs font-bold uppercase tracking-[0.18em] text-slate-400">
        <Sparkles size={12} className="text-violet-400" /> One continuous improvement loop
      </div>
    </div>
  );
}
