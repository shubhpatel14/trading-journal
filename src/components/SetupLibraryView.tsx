import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Copy,
  FileText,
  Layers3,
  Pencil,
  Play,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { Trade, TradePlan, SetupDefinition, getTradeNetPnl } from '../types';

interface SetupLibraryViewProps {
  setups: SetupDefinition[];
  trades: Trade[];
  /** Optional daily plans make the setup library a useful bridge into planning. */
  plans?: TradePlan[];
  onAddSetup: (setup: Omit<SetupDefinition, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateSetup: (id: string, changes: Partial<SetupDefinition>) => void;
  onArchiveSetup?: (id: string) => void;
  onDeleteSetup: (id: string) => void;
  /** Opens a prefilled journal entry for this playbook. */
  onStartTrade?: (setup: SetupDefinition) => void;
  /** Opens the daily plan workspace with this playbook as the starting context. */
  onStartPlan?: (setup: SetupDefinition) => void;
  /** Lets the parent use account-specific fee logic when available. */
  getNetPnl?: (trade: Trade) => number;
}

interface SetupFormState {
  name: string;
  description: string;
  direction: SetupDefinition['direction'];
  marketConditions: string;
  entryRules: string[];
  invalidationRules: string[];
  managementRules: string[];
  tags: string;
  preferredAssets: string;
  preferredSessions: Array<Trade['session']>;
  minChecklistScore: string;
  riskPerTrade: string;
  maxTradesPerDay: string;
}

interface LinkedTrade extends Trade {
  // setupId is deliberately optional while existing journals migrate to the new model.
  setupId?: string;
}

interface SetupAnalytics {
  setup: SetupDefinition;
  linkedTrades: Trade[];
  closedTrades: Trade[];
  openTrades: Trade[];
  netPnl: number;
  grossWins: number;
  grossLosses: number;
  winRate: number;
  profitFactor: number;
  averagePnl: number;
  cleanExecutionRate: number;
  journalCompletionRate: number;
  ruleEvaluatedTrades: number;
  ruleAdherenceRate: number;
  qualityGateEvaluatedTrades: number;
  qualityGatePassRate: number;
  contextFitRate: number;
  dailyLimitExcessTrades: number;
  dailyLimitBreachDays: number;
  latestTrade?: Trade;
  activePlans: TradePlan[];
}

const SESSIONS: Array<Trade['session']> = ['ASIA', 'LONDON', 'NEW YORK'];

const formatMoney = (value: number, options?: { showSign?: boolean; compact?: boolean }) => {
  const absolute = Math.abs(Number.isFinite(value) ? value : 0);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: options?.compact ? 0 : 2,
  }).format(absolute);
  const sign = value < 0 ? '−' : options?.showSign && value > 0 ? '+' : '';
  return `${sign}${formatted}`;
};

const normalize = (value?: string) => (value || '').trim().toLocaleLowerCase();

const listFromText = (value: string) =>
  Array.from(new Set(value.split(',').map(item => item.trim()).filter(Boolean)));

const toSafeList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];

const emptyForm = (): SetupFormState => ({
  name: '',
  description: '',
  direction: 'BOTH',
  marketConditions: '',
  entryRules: [],
  invalidationRules: [],
  managementRules: [],
  tags: '',
  preferredAssets: '',
  preferredSessions: [],
  minChecklistScore: '',
  riskPerTrade: '',
  maxTradesPerDay: '',
});

const formFromSetup = (setup: SetupDefinition): SetupFormState => ({
  name: setup.name || '',
  description: setup.description || '',
  direction: setup.direction || 'BOTH',
  marketConditions: setup.marketConditions || '',
  entryRules: toSafeList(setup.entryRules),
  invalidationRules: toSafeList(setup.invalidationRules),
  managementRules: toSafeList(setup.managementRules),
  tags: toSafeList(setup.tags).join(', '),
  preferredAssets: toSafeList(setup.preferredAssets).join(', '),
  preferredSessions: Array.isArray(setup.preferredSessions) ? setup.preferredSessions : [],
  minChecklistScore: setup.minChecklistScore === undefined ? '' : String(setup.minChecklistScore),
  riskPerTrade: setup.riskPerTrade === undefined ? '' : String(setup.riskPerTrade),
  maxTradesPerDay: setup.maxTradesPerDay === undefined ? '' : String(setup.maxTradesPerDay),
});

const parseOptionalNumber = (value: string, min = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min ? parsed : undefined;
};

const getTradeDate = (trade: Trade) => {
  const value = new Date(`${trade.date || '1970-01-01'}T${trade.time || '00:00'}`).getTime();
  return Number.isFinite(value) ? value : 0;
};

const hasMeaningfulMistake = (trade: Trade) =>
  Array.isArray(trade.mistakes) && trade.mistakes.some(mistake => normalize(mistake) && normalize(mistake) !== 'none');

const isJournalComplete = (trade: Trade) =>
  trade.journalingStatus === 'COMPLETE' ||
  (typeof trade.checklistScore === 'number' && trade.checklistScore > 0) ||
  Boolean(trade.notes?.trim());

const sampleLabel = (count: number) => {
  if (count === 0) return { label: 'No evidence yet', tone: 'slate' };
  if (count < 10) return { label: 'Exploratory sample', tone: 'amber' };
  if (count < 20) return { label: 'Developing sample', tone: 'blue' };
  return { label: 'Useful sample', tone: 'emerald' };
};

const toneClasses: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function RuleEditor({
  title,
  hint,
  items,
  onChange,
  accent = 'violet',
}: {
  title: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
  accent?: 'violet' | 'rose' | 'emerald';
}) {
  const [draft, setDraft] = useState('');
  const accentClasses = {
    violet: 'focus:border-violet-300 focus:ring-violet-100 bg-violet-50/45 border-violet-100',
    rose: 'focus:border-rose-300 focus:ring-rose-100 bg-rose-50/45 border-rose-100',
    emerald: 'focus:border-emerald-300 focus:ring-emerald-100 bg-emerald-50/45 border-emerald-100',
  }[accent];

  const addRule = () => {
    const cleaned = draft.trim();
    if (!cleaned || items.some(item => normalize(item) === normalize(cleaned))) return;
    onChange([...items, cleaned]);
    setDraft('');
  };

  return (
    <section className={`rounded-2xl border p-3.5 ${accentClasses}`}>
      <div className="mb-2.5">
        <h4 className="text-xs font-black text-slate-800">{title}</h4>
        <p className="mt-0.5 text-3xs leading-relaxed text-slate-500">{hint}</p>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="group flex items-start gap-2 rounded-xl bg-white/85 px-2.5 py-2 text-2xs text-slate-700 shadow-sm">
            <Check size={13} className="mt-0.5 shrink-0 text-emerald-500 stroke-[3px]" />
            <span className="min-w-0 flex-1 leading-relaxed">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              className="shrink-0 rounded-lg p-1 text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
              title={`Remove ${title.toLowerCase()} item`}
            >
              <X size={13} />
            </button>
          </div>
        ))}
        {!items.length && <div className="rounded-xl border border-dashed border-slate-200 bg-white/45 px-3 py-2.5 text-3xs text-slate-400">No rules added yet.</div>}
      </div>
      <div className="mt-2.5 flex gap-2">
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addRule();
            }
          }}
          placeholder="Write a clear, observable rule"
          className="min-w-0 flex-1 rounded-xl border border-white bg-white px-3 py-2 text-2xs text-slate-700 shadow-sm outline-none transition focus:ring-2"
        />
        <button
          type="button"
          onClick={addRule}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-2xs font-bold text-white transition hover:bg-slate-700 active:scale-95"
        >
          <Plus size={13} /> Add
        </button>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'emerald' | 'rose' | 'violet';
}) {
  const toneMap = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    violet: 'text-violet-700',
  };

  return (
    <div className="min-w-0 rounded-xl bg-white/72 px-3 py-2.5 shadow-[inset_1px_1px_0_rgba(255,255,255,0.85)]">
      <div className="text-4xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 truncate text-sm font-black tabular-nums ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}

function SetupEditor({
  setup,
  onClose,
  onSave,
}: {
  setup: SetupDefinition | null;
  onClose: () => void;
  onSave: (form: SetupFormState) => void;
}) {
  const [form, setForm] = useState<SetupFormState>(() => (setup ? formFromSetup(setup) : emptyForm()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(setup ? formFromSetup(setup) : emptyForm());
    setError(null);
  }, [setup]);

  const update = <K extends keyof SetupFormState>(key: K, value: SetupFormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const applyStarterChecklist = () => {
    setForm(current => ({
      ...current,
      entryRules: current.entryRules.length ? current.entryRules : [
        'Higher-timeframe context agrees with the trade direction.',
        'Defined trigger is present; do not enter on anticipation alone.',
        'Planned reward is at least 1.5× the defined risk.',
      ],
      invalidationRules: current.invalidationRules.length ? current.invalidationRules : [
        'Exit if the defining structure closes beyond invalidation.',
        'Skip the entry when scheduled news changes the trade premise.',
      ],
      managementRules: current.managementRules.length ? current.managementRules : [
        'Risk is fixed before entry and never widened after entry.',
        'Record the outcome and any deviation before the next trade.',
      ],
    }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Give this playbook a clear setup name.');
      return;
    }
    if (!form.entryRules.length) {
      setError('Add at least one entry rule so the setup can be executed consistently.');
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={setup ? 'Edit setup playbook' : 'Create setup playbook'}>
      <form onSubmit={submit} className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-[30px] bg-[#faf9fd] shadow-2xl custom-scrollbar sm:rounded-[32px]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-violet-100 bg-[#faf9fd]/95 px-5 py-4 backdrop-blur sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-violet-700 text-white shadow-lg shadow-violet-200">
              <Target size={19} className="stroke-[2.7px]" />
            </div>
            <div>
              <h2 className="font-display text-xl font-black tracking-tight text-slate-900">{setup ? 'Refine setup playbook' : 'Build a setup playbook'}</h2>
              <p className="mt-0.5 text-3xs leading-relaxed text-slate-500">Turn your discretionary idea into a repeatable, measurable process.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700" title="Close editor">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-2xs text-rose-700">
              <ShieldAlert size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <section className="grid gap-4 lg:grid-cols-6">
            <div className="space-y-1.5 lg:col-span-3">
              <label className="text-3xs font-black uppercase tracking-wider text-slate-500">Setup name <span className="text-rose-500">*</span></label>
              <input
                autoFocus
                value={form.name}
                onChange={event => update('name', event.target.value)}
                placeholder="e.g. London liquidity sweep"
                className="w-full rounded-2xl border border-violet-100 bg-white px-3.5 py-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            </div>
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-3xs font-black uppercase tracking-wider text-slate-500">Direction</label>
              <select
                value={form.direction}
                onChange={event => update('direction', event.target.value as SetupDefinition['direction'])}
                className="w-full rounded-2xl border border-violet-100 bg-white px-3.5 py-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="BOTH">Both</option>
                <option value="BUY">Buy only</option>
                <option value="SELL">Sell only</option>
              </select>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-3xs font-black uppercase tracking-wider text-slate-500">Risk cap per trade (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.riskPerTrade}
                  onChange={event => update('riskPerTrade', event.target.value)}
                  placeholder="e.g. 0.5"
                  className="w-full rounded-2xl border border-violet-100 bg-white px-3.5 py-3 pr-9 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
            <div className="space-y-1.5 lg:col-span-6">
              <label className="text-3xs font-black uppercase tracking-wider text-slate-500">One-sentence edge</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={event => update('description', event.target.value)}
                placeholder="What inefficiency or repeatable behaviour does this setup capture?"
                className="w-full resize-y rounded-2xl border border-violet-100 bg-white px-3.5 py-3 text-2xs leading-relaxed text-slate-700 shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-3xs font-black uppercase tracking-wider text-slate-500">When it is allowed</label>
                <textarea
                  rows={4}
                  value={form.marketConditions}
                  onChange={event => update('marketConditions', event.target.value)}
                  placeholder="Market regime, volatility, higher-timeframe bias, scheduled news limits…"
                  className="w-full resize-y rounded-2xl border border-sky-100 bg-white px-3.5 py-3 text-2xs leading-relaxed text-slate-700 shadow-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </div>
              <div className="grid content-start gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-3xs font-black uppercase tracking-wider text-slate-500">Preferred assets</label>
                  <input
                    value={form.preferredAssets}
                    onChange={event => update('preferredAssets', event.target.value)}
                    placeholder="XAUUSD, EURUSD, NAS100"
                    className="w-full rounded-2xl border border-sky-100 bg-white px-3.5 py-3 text-2xs text-slate-700 shadow-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-3xs font-black uppercase tracking-wider text-slate-500">Preferred sessions</label>
                  <div className="flex flex-wrap gap-2">
                    {SESSIONS.map(session => {
                      const selected = form.preferredSessions.includes(session);
                      return (
                        <button
                          type="button"
                          key={session}
                          onClick={() => update('preferredSessions', selected ? form.preferredSessions.filter(value => value !== session) : [...form.preferredSessions, session])}
                          className={`rounded-xl border px-3 py-2 text-3xs font-black transition ${selected ? 'border-sky-500 bg-sky-600 text-white shadow-sm' : 'border-sky-100 bg-white text-slate-500 hover:border-sky-300'}`}
                        >
                          {session}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-3xs font-black uppercase tracking-wider text-slate-500">Tags</label>
                  <input
                    value={form.tags}
                    onChange={event => update('tags', event.target.value)}
                    placeholder="continuation, reversal, A+"
                    className="w-full rounded-2xl border border-sky-100 bg-white px-3.5 py-3 text-2xs text-slate-700 shadow-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-violet-100 bg-violet-50/45 p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 border-b border-violet-100 pb-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800">Execution checklist</h3>
                <p className="mt-0.5 text-3xs text-slate-500">Rules should be observable enough to mark true or false in the journal.</p>
              </div>
              <button type="button" onClick={applyStarterChecklist} className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-3xs font-black text-violet-700 shadow-sm ring-1 ring-violet-100 transition hover:bg-violet-50">
                <Sparkles size={13} /> Add a starter checklist
              </button>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <RuleEditor title="Entry rules" hint="Evidence required before you enter." items={form.entryRules} onChange={items => update('entryRules', items)} />
              <RuleEditor title="Invalidation" hint="What cancels the idea before or after entry." items={form.invalidationRules} onChange={items => update('invalidationRules', items)} accent="rose" />
              <RuleEditor title="Management" hint="How risk, partials, and exits are handled." items={form.managementRules} onChange={items => update('managementRules', items)} accent="emerald" />
            </div>
          </section>

          <section className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/65 p-4 sm:flex-row sm:items-end">
            <div>
              <h3 className="text-xs font-black text-amber-900">Quality gate</h3>
              <p className="mt-1 max-w-2xl text-3xs leading-relaxed text-amber-800/80">Optional. Set how many of this playbook&apos;s rules must be true before it is considered eligible. It is a reminder and review benchmark, not an automated order block.</p>
            </div>
            <div className="grid w-full shrink-0 gap-2 sm:w-[25rem] sm:grid-cols-2">
              <div>
                <label className="text-4xs font-black uppercase tracking-wider text-amber-700">Minimum rules met</label>
                <input
                  type="number"
                  min="0"
                  max={Math.max(form.entryRules.length + form.invalidationRules.length + form.managementRules.length, 1)}
                  value={form.minChecklistScore}
                  onChange={event => update('minChecklistScore', event.target.value)}
                  placeholder={form.entryRules.length + form.invalidationRules.length + form.managementRules.length ? `0–${form.entryRules.length + form.invalidationRules.length + form.managementRules.length}` : '0'}
                  className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-2xs font-bold text-amber-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="text-4xs font-black uppercase tracking-wider text-amber-700">Max trades / day</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxTradesPerDay}
                  onChange={event => update('maxTradesPerDay', event.target.value)}
                  placeholder="e.g. 2"
                  className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-2xs font-bold text-amber-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-violet-100 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-7">
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100">Cancel</button>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-violet-300 active:scale-[0.98]">
            <CheckCircle2 size={15} /> {setup ? 'Save playbook' : 'Create playbook'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteDialog({ setup, onCancel, onDelete }: { setup: SetupDefinition; onCancel: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="delete-setup-title">
      <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><Trash2 size={20} /></div>
        <h2 id="delete-setup-title" className="mt-4 font-display text-xl font-black text-slate-900">Delete “{setup.name}”?</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">The playbook will be removed, but its historical journal trades remain intact. Archive it instead if you may want to compare it later.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100">Keep playbook</button>
          <button type="button" onClick={onDelete} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-rose-700"><Trash2 size={14} /> Delete playbook</button>
        </div>
      </div>
    </div>
  );
}

export default function SetupLibraryView({
  setups,
  trades,
  plans = [],
  onAddSetup,
  onUpdateSetup,
  onArchiveSetup,
  onDeleteSetup,
  onStartTrade,
  onStartPlan,
  getNetPnl,
}: SetupLibraryViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'RECENT' | 'PERFORMANCE' | 'TRADES' | 'NAME'>('RECENT');
  const [editorSetup, setEditorSetup] = useState<SetupDefinition | null | undefined>(undefined);
  const [selectedSetupId, setSelectedSetupId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<SetupDefinition | null>(null);

  const analytics = useMemo<SetupAnalytics[]>(() => {
    return setups.map(setup => {
      const linkedTrades = trades.filter(trade => {
        const setupId = (trade as LinkedTrade).setupId;
        return setupId === setup.id || (!setupId && normalize(trade.setup) === normalize(setup.name));
      });
      const closedTrades = linkedTrades.filter(trade => trade.status !== 'OPEN');
      const openTrades = linkedTrades.filter(trade => trade.status === 'OPEN');
      const netResults = closedTrades.map(trade => {
        const value = getNetPnl ? getNetPnl(trade) : getTradeNetPnl(trade);
        return Number.isFinite(value) ? value : 0;
      });
      const netPnl = netResults.reduce((sum, value) => sum + value, 0);
      const grossWins = netResults.filter(value => value > 0).reduce((sum, value) => sum + value, 0);
      const grossLosses = Math.abs(netResults.filter(value => value < 0).reduce((sum, value) => sum + value, 0));
      const wins = netResults.filter(value => value > 0).length;
      const completed = closedTrades.filter(isJournalComplete).length;
      const clean = closedTrades.filter(trade => !hasMeaningfulMistake(trade)).length;
      const preferredAssets = toSafeList(setup.preferredAssets).map(normalize);
      const preferredSessions = Array.isArray(setup.preferredSessions) ? setup.preferredSessions : [];
      const ruleEvaluatedTrades = closedTrades.filter(trade =>
        typeof trade.setupRuleScore === 'number' &&
        typeof trade.setupRuleMaxScore === 'number' &&
        trade.setupRuleMaxScore > 0,
      );
      const totalRulesMet = ruleEvaluatedTrades.reduce((sum, trade) => sum + (trade.setupRuleScore || 0), 0);
      const totalRulesEvaluated = ruleEvaluatedTrades.reduce((sum, trade) => sum + (trade.setupRuleMaxScore || 0), 0);
      const qualityGateTrades = ruleEvaluatedTrades.filter(trade =>
        (trade.setupMinChecklistScore ?? setup.minChecklistScore) !== undefined,
      );
      const qualityGatePasses = qualityGateTrades.filter(trade =>
        (trade.setupRuleScore || 0) >= (trade.setupMinChecklistScore ?? setup.minChecklistScore ?? 0),
      ).length;
      const contextMatched = closedTrades.filter(trade =>
        (preferredAssets.length === 0 || preferredAssets.includes(normalize(trade.asset))) &&
        (preferredSessions.length === 0 || preferredSessions.includes(trade.session)) &&
        (setup.direction === 'BOTH' || setup.direction === trade.direction),
      ).length;
      const tradesByDay = linkedTrades.reduce((byDay, trade) => {
        const day = trade.date || 'unknown';
        const existing = byDay.get(day) || [];
        existing.push(trade);
        byDay.set(day, existing);
        return byDay;
      }, new Map<string, Trade[]>());
      let dailyLimitExcessTrades = 0;
      let dailyLimitBreachDays = 0;
      tradesByDay.forEach(dayTrades => {
        const caps = dayTrades
          .map(trade => trade.setupMaxTradesPerDay ?? setup.maxTradesPerDay)
          .filter((cap): cap is number => typeof cap === 'number' && cap > 0);
        if (!caps.length) return;
        const cap = Math.min(...caps);
        const excess = Math.max(0, dayTrades.length - cap);
        if (excess) {
          dailyLimitBreachDays += 1;
          dailyLimitExcessTrades += excess;
        }
      });
      const activePlans = plans.filter(plan => plan.status === 'ACTIVE' && plan.setupId === setup.id);

      return {
        setup,
        linkedTrades,
        closedTrades,
        openTrades,
        netPnl,
        grossWins,
        grossLosses,
        winRate: closedTrades.length ? (wins / closedTrades.length) * 100 : 0,
        profitFactor: grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0,
        averagePnl: closedTrades.length ? netPnl / closedTrades.length : 0,
        cleanExecutionRate: closedTrades.length ? (clean / closedTrades.length) * 100 : 0,
        journalCompletionRate: closedTrades.length ? (completed / closedTrades.length) * 100 : 0,
        ruleEvaluatedTrades: ruleEvaluatedTrades.length,
        ruleAdherenceRate: totalRulesEvaluated ? (totalRulesMet / totalRulesEvaluated) * 100 : 0,
        qualityGateEvaluatedTrades: qualityGateTrades.length,
        qualityGatePassRate: qualityGateTrades.length ? (qualityGatePasses / qualityGateTrades.length) * 100 : 0,
        contextFitRate: closedTrades.length ? (contextMatched / closedTrades.length) * 100 : 0,
        dailyLimitExcessTrades,
        dailyLimitBreachDays,
        latestTrade: [...linkedTrades].sort((a, b) => getTradeDate(b) - getTradeDate(a))[0],
        activePlans,
      };
    });
  }, [getNetPnl, plans, setups, trades]);

  const analyticsById = useMemo(() => new Map(analytics.map(item => [item.setup.id, item])), [analytics]);

  const visibleSetups = useMemo(() => {
    const needle = normalize(search);
    const matchesSearch = (setup: SetupDefinition) => {
      if (!needle) return true;
      return [
        setup.name,
        setup.description,
        setup.marketConditions,
        ...toSafeList(setup.tags),
        ...toSafeList(setup.preferredAssets),
      ].some(value => normalize(value).includes(needle));
    };

    return setups
      .filter(setup => (statusFilter === 'ALL' || setup.status === statusFilter) && matchesSearch(setup))
      .slice()
      .sort((left, right) => {
        const leftAnalytics = analyticsById.get(left.id);
        const rightAnalytics = analyticsById.get(right.id);
        if (sortBy === 'PERFORMANCE') return (rightAnalytics?.netPnl || 0) - (leftAnalytics?.netPnl || 0);
        if (sortBy === 'TRADES') return (rightAnalytics?.closedTrades.length || 0) - (leftAnalytics?.closedTrades.length || 0);
        if (sortBy === 'NAME') return left.name.localeCompare(right.name);
        const leftUpdated = new Date(left.updatedAt || left.createdAt || 0).getTime();
        const rightUpdated = new Date(right.updatedAt || right.createdAt || 0).getTime();
        return rightUpdated - leftUpdated;
      });
  }, [analyticsById, search, setups, sortBy, statusFilter]);

  const selectedAnalytics = selectedSetupId ? analyticsById.get(selectedSetupId) : undefined;
  const activeSetups = setups.filter(setup => setup.status === 'ACTIVE');
  const totalClosedTrades = analytics.reduce((sum, item) => sum + item.closedTrades.length, 0);
  const tradeLinkedCount = analytics.reduce((sum, item) => sum + item.linkedTrades.length, 0);
  const unlinkedTradeCount = trades.filter(trade => trade.status !== 'OPEN' && !(trade as LinkedTrade).setupId && !setups.some(setup => normalize(setup.name) === normalize(trade.setup))).length;
  const strongest = analytics.filter(item => item.closedTrades.length > 0).slice().sort((a, b) => b.netPnl - a.netPnl)[0];

  useEffect(() => {
    if (selectedSetupId && !setups.some(setup => setup.id === selectedSetupId)) setSelectedSetupId(null);
  }, [selectedSetupId, setups]);

  const saveSetup = (form: SetupFormState) => {
    const payload: Omit<SetupDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
      name: form.name.trim(),
      description: form.description.trim(),
      direction: form.direction,
      marketConditions: form.marketConditions.trim(),
      entryRules: toSafeList(form.entryRules),
      invalidationRules: toSafeList(form.invalidationRules),
      managementRules: toSafeList(form.managementRules),
      tags: listFromText(form.tags),
      preferredAssets: listFromText(form.preferredAssets).map(asset => asset.toUpperCase()),
      preferredSessions: form.preferredSessions,
      minChecklistScore: parseOptionalNumber(form.minChecklistScore, 0),
      riskPerTrade: parseOptionalNumber(form.riskPerTrade, 0),
      maxTradesPerDay: parseOptionalNumber(form.maxTradesPerDay, 1),
      status: editorSetup && editorSetup !== undefined ? editorSetup.status : 'ACTIVE',
    };

    if (editorSetup) {
      onUpdateSetup(editorSetup.id, payload);
    } else {
      onAddSetup(payload);
    }
    setEditorSetup(undefined);
  };

  const archiveSetup = (setup: SetupDefinition) => {
    if (setup.status === 'ARCHIVED') {
      onUpdateSetup(setup.id, { status: 'ACTIVE' });
      return;
    }
    if (onArchiveSetup) onArchiveSetup(setup.id);
    else onUpdateSetup(setup.id, { status: 'ARCHIVED' });
  };

  const duplicateSetup = (setup: SetupDefinition) => {
    onAddSetup({
      name: `${setup.name} (copy)`,
      description: setup.description || '',
      direction: setup.direction || 'BOTH',
      marketConditions: setup.marketConditions || '',
      entryRules: toSafeList(setup.entryRules),
      invalidationRules: toSafeList(setup.invalidationRules),
      managementRules: toSafeList(setup.managementRules),
      tags: toSafeList(setup.tags),
      preferredAssets: toSafeList(setup.preferredAssets),
      preferredSessions: Array.isArray(setup.preferredSessions) ? setup.preferredSessions : [],
      minChecklistScore: setup.minChecklistScore,
      riskPerTrade: setup.riskPerTrade,
      maxTradesPerDay: setup.maxTradesPerDay,
      status: 'ACTIVE',
    });
  };

  return (
    <div className="space-y-7 sm:space-y-9" id="setups-tab">
      {editorSetup !== undefined && <SetupEditor setup={editorSetup || null} onClose={() => setEditorSetup(undefined)} onSave={saveSetup} />}
      {deleteCandidate && <DeleteDialog setup={deleteCandidate} onCancel={() => setDeleteCandidate(null)} onDelete={() => { onDeleteSetup(deleteCandidate.id); setDeleteCandidate(null); if (selectedSetupId === deleteCandidate.id) setSelectedSetupId(null); }} />}

      <section className="clay-surface relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="clay-pill bg-white/80 text-violet-700"><Layers3 size={14} className="stroke-[3px]" /> Playbook Library</span>
            <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Make your edge repeatable.</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Define what qualifies, invalidates, and manages each setup—then let the journal show whether the process holds up in real executions.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => setEditorSetup(null)} className="clay-button clay-button-primary px-4 py-2.5 text-xs"><Plus size={16} className="stroke-[3px]" /> New setup</button>
            {onStartPlan && activeSetups.length > 0 && (
              <button onClick={() => onStartPlan(activeSetups[0])} className="clay-button clay-button-secondary px-4 py-2.5 text-xs"><FileText size={15} /> Plan from playbook</button>
            )}
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active playbooks" value={String(activeSetups.length)} tone="violet" />
          <Metric label="Linked journal trades" value={`${tradeLinkedCount}/${trades.length}`} tone={tradeLinkedCount ? 'emerald' : 'slate'} />
          <Metric label="Closed evidence" value={`${totalClosedTrades} trades`} tone="slate" />
          <Metric label="Strongest right now" value={strongest ? strongest.setup.name : 'Awaiting data'} tone={strongest && strongest.netPnl >= 0 ? 'emerald' : 'slate'} />
        </div>

        {unlinkedTradeCount > 0 && (
          <div className="relative mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-2xs leading-relaxed text-amber-800">
            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <span><strong>{unlinkedTradeCount} closed {unlinkedTradeCount === 1 ? 'trade is' : 'trades are'}</strong> not linked to a saved playbook yet. Use the same setup name in the Journal, or select a playbook when logging future trades, to complete the evidence trail.</span>
          </div>
        )}
      </section>

      <section className="clay-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search setup, asset, tag, or condition…" className="w-full rounded-2xl border border-slate-100 bg-white px-10 py-2.5 text-xs text-slate-700 shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(['ACTIVE', 'ARCHIVED', 'ALL'] as const).map(value => (
                <button key={value} onClick={() => setStatusFilter(value)} className={`rounded-lg px-2.5 py-1.5 text-4xs font-black tracking-wide transition ${statusFilter === value ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{value === 'ALL' ? 'ALL' : value === 'ACTIVE' ? 'LIVE' : 'ARCHIVE'}</button>
              ))}
            </div>
            <select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-3xs font-bold text-slate-600 shadow-sm outline-none focus:border-violet-300">
              <option value="RECENT">Recently updated</option>
              <option value="PERFORMANCE">Net performance</option>
              <option value="TRADES">Most evidence</option>
              <option value="NAME">Name A–Z</option>
            </select>
          </div>
        </div>
      </section>

      {!visibleSetups.length ? (
        <section className="clay-surface flex min-h-[340px] flex-col items-center justify-center p-7 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-violet-400 to-violet-700 text-white shadow-xl shadow-violet-200"><Target size={28} /></div>
          <h2 className="mt-5 font-display text-2xl font-black text-slate-900">{setups.length ? 'No matching playbooks' : 'Build your first repeatable setup'}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{setups.length ? 'Try a different filter or search phrase.' : 'Start with the conditions, entry trigger, invalidation, and management rules you want to execute consistently.'}</p>
          <button onClick={() => { setSearch(''); setStatusFilter('ACTIVE'); setEditorSetup(null); }} className="clay-button clay-button-primary mt-5 px-4 py-2.5 text-xs"><Plus size={15} /> Create playbook</button>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {visibleSetups.map(setup => {
            const item = analyticsById.get(setup.id)!;
            const sample = sampleLabel(item.closedTrades.length);
            const rules = [...toSafeList(setup.entryRules), ...toSafeList(setup.invalidationRules), ...toSafeList(setup.managementRules)];
            const isPositive = item.netPnl >= 0;
            const activePlanLabel = item.activePlans.length === 1 ? `${item.activePlans[0].asset} plan active` : item.activePlans.length > 1 ? `${item.activePlans.length} linked daily plans` : null;

            return (
              <article key={setup.id} className={`group relative overflow-hidden rounded-[28px] border p-5 shadow-[0_12px_32px_rgba(124,58,237,0.07)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(124,58,237,0.14)] ${setup.status === 'ARCHIVED' ? 'border-slate-200 bg-slate-50/75 opacity-85' : 'border-violet-100 bg-white/78'}`}>
                <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl ${isPositive ? 'bg-emerald-300/20' : 'bg-violet-300/20'}`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => setSelectedSetupId(selectedSetupId === setup.id ? null : setup.id)} className="min-w-0 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-display text-xl font-black text-slate-900">{setup.name}</h2>
                        <span className={`rounded-full border px-2 py-1 text-4xs font-black uppercase tracking-wider ${setup.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{setup.status}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-2xs leading-relaxed text-slate-500">{setup.description || 'No edge description added yet.'}</p>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => setEditorSetup(setup)} className="rounded-xl p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700" title="Edit playbook"><Pencil size={14} /></button>
                      <button type="button" onClick={() => duplicateSetup(setup)} className="rounded-xl p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-700" title="Duplicate playbook"><Copy size={14} /></button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {toSafeList(setup.preferredAssets).map(asset => <span key={asset} className="rounded-lg bg-sky-50 px-2 py-1 text-4xs font-black text-sky-700">{asset}</span>)}
                    {toSafeList(setup.tags).map(tag => <span key={tag} className="rounded-lg bg-violet-50 px-2 py-1 text-4xs font-bold text-violet-700"><Tag size={9} className="mr-0.5 inline" />{tag}</span>)}
                    {Array.isArray(setup.preferredSessions) && setup.preferredSessions.map(session => <span key={session} className="rounded-lg bg-slate-100 px-2 py-1 text-4xs font-bold text-slate-600">{session}</span>)}
                    {!toSafeList(setup.preferredAssets).length && !toSafeList(setup.tags).length && !setup.preferredSessions?.length && <span className="text-4xs font-medium italic text-slate-400">No context tags yet</span>}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Metric label="Net P&L" value={formatMoney(item.netPnl, { showSign: true, compact: true })} tone={item.netPnl > 0 ? 'emerald' : item.netPnl < 0 ? 'rose' : 'slate'} />
                    <Metric label="Win rate" value={item.closedTrades.length ? `${item.winRate.toFixed(0)}%` : '—'} tone={item.winRate >= 50 ? 'emerald' : 'slate'} />
                    <Metric label="Profit factor" value={item.profitFactor === Infinity ? '∞' : item.profitFactor.toFixed(2)} tone={item.profitFactor >= 1.2 ? 'emerald' : 'slate'} />
                    <Metric label="Evidence" value={`${item.closedTrades.length} closed`} tone="violet" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-3xs">
                    <span className={`rounded-full border px-2 py-1 font-black ${toneClasses[sample.tone]}`}>{sample.label}</span>
                    {item.openTrades.length > 0 && <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 font-bold text-sky-700">{item.openTrades.length} open</span>}
                    <span className="font-medium text-slate-500"><ClipboardCheck size={11} className="mr-1 inline text-slate-400" />{item.journalCompletionRate.toFixed(0)}% journalled</span>
                    {activePlanLabel && <span className="font-medium text-violet-700"><FileText size={11} className="mr-1 inline" />{activePlanLabel}</span>}
                  </div>

                  {selectedSetupId === setup.id && (
                    <div className="mt-4 space-y-4 border-t border-violet-100 pt-4 animate-popover-up">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-violet-50/70 p-3.5">
                          <div className="flex items-center gap-1.5 text-3xs font-black uppercase tracking-wider text-violet-700"><Target size={13} /> Entry protocol</div>
                          <ul className="mt-2.5 space-y-2">
                            {toSafeList(setup.entryRules).slice(0, 4).map((rule, index) => <li key={`${rule}-${index}`} className="flex gap-2 text-2xs leading-relaxed text-slate-700"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-violet-500" />{rule}</li>)}
                            {!toSafeList(setup.entryRules).length && <li className="text-2xs italic text-slate-400">No entry rules yet.</li>}
                          </ul>
                        </div>
                        <div className="rounded-2xl bg-rose-50/70 p-3.5">
                          <div className="flex items-center gap-1.5 text-3xs font-black uppercase tracking-wider text-rose-700"><ShieldAlert size={13} /> Invalidation & management</div>
                          <ul className="mt-2.5 space-y-2">
                            {[...toSafeList(setup.invalidationRules), ...toSafeList(setup.managementRules)].slice(0, 4).map((rule, index) => <li key={`${rule}-${index}`} className="flex gap-2 text-2xs leading-relaxed text-slate-700"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-rose-500" />{rule}</li>)}
                            {!toSafeList(setup.invalidationRules).length && !toSafeList(setup.managementRules).length && <li className="text-2xs italic text-slate-400">No protection rules yet.</li>}
                          </ul>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5"><div className="text-4xs font-black uppercase tracking-wider text-slate-400">Average outcome</div><div className={`mt-1 text-sm font-black ${item.averagePnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{item.closedTrades.length ? formatMoney(item.averagePnl, { showSign: true }) : '—'}</div></div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5"><div className="text-4xs font-black uppercase tracking-wider text-slate-400">Clean execution</div><div className="mt-1 text-sm font-black text-slate-800">{item.closedTrades.length ? `${item.cleanExecutionRate.toFixed(0)}%` : '—'}</div></div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5"><div className="text-4xs font-black uppercase tracking-wider text-slate-400">Risk guardrail</div><div className="mt-1 text-sm font-black text-slate-800">{setup.riskPerTrade !== undefined ? `${setup.riskPerTrade}%` : 'Not set'}</div></div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5"><div className="text-4xs font-black uppercase tracking-wider text-slate-400">Rule adherence</div><div className="mt-1 text-sm font-black text-slate-800">{item.ruleEvaluatedTrades ? `${item.ruleAdherenceRate.toFixed(0)}%` : 'Not scored'}</div><div className="mt-0.5 text-4xs text-slate-400">{item.ruleEvaluatedTrades} evaluated</div></div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5"><div className="text-4xs font-black uppercase tracking-wider text-slate-400">Quality gate</div><div className={`mt-1 text-sm font-black ${item.qualityGateEvaluatedTrades && item.qualityGatePassRate >= 80 ? 'text-emerald-700' : 'text-slate-800'}`}>{setup.minChecklistScore === undefined ? 'Not set' : item.qualityGateEvaluatedTrades ? `${item.qualityGatePassRate.toFixed(0)}%` : 'Awaiting'}</div><div className="mt-0.5 text-4xs text-slate-400">{setup.minChecklistScore === undefined ? 'Set in playbook' : `${setup.minChecklistScore} rules required`}</div></div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5"><div className="text-4xs font-black uppercase tracking-wider text-slate-400">Daily trade cap</div><div className={`mt-1 text-sm font-black ${item.dailyLimitExcessTrades ? 'text-rose-700' : 'text-emerald-700'}`}>{setup.maxTradesPerDay === undefined ? 'Not set' : item.dailyLimitExcessTrades ? `${item.dailyLimitExcessTrades} over` : 'On track'}</div><div className="mt-0.5 text-4xs text-slate-400">{setup.maxTradesPerDay === undefined ? 'Set in playbook' : `${item.dailyLimitBreachDays} breach day(s)`}</div></div>
                      </div>
                      <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-3.5 py-3 text-2xs leading-relaxed text-sky-900"><strong className="mr-1 font-black">Context fit:</strong>{item.closedTrades.length ? `${item.contextFitRate.toFixed(0)}% of closed executions match the current asset, session, and direction guardrails.` : 'Log a closed execution to check alignment with this playbook.'}</div>
                      {setup.marketConditions && <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-3.5 py-3 text-2xs leading-relaxed text-sky-900"><strong className="mr-1 font-black">Allowed when:</strong>{setup.marketConditions}</div>}
                      {item.latestTrade && <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-3.5 py-3 text-2xs text-white"><div className="min-w-0"><span className="font-black">Latest evidence:</span> <span className="text-white/70">{item.latestTrade.date} · {item.latestTrade.asset} · {item.latestTrade.status}</span></div><span className={item.latestTrade.pnl >= 0 ? 'font-black text-emerald-300' : 'font-black text-rose-300'}>{formatMoney(getNetPnl ? getNetPnl(item.latestTrade) : getTradeNetPnl(item.latestTrade), { showSign: true })}</span></div>}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <button type="button" onClick={() => setSelectedSetupId(selectedSetupId === setup.id ? null : setup.id)} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-3xs font-black text-slate-600 transition hover:bg-slate-100"><Activity size={13} /> {selectedSetupId === setup.id ? 'Hide protocol' : 'View protocol'} <ChevronRight size={12} className={selectedSetupId === setup.id ? 'rotate-90 transition-transform' : 'transition-transform'} /></button>
                    {setup.status === 'ACTIVE' && onStartTrade && <button type="button" onClick={() => onStartTrade(setup)} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-3xs font-black text-white transition hover:bg-violet-700"><Play size={12} fill="currentColor" /> Log trade</button>}
                    {setup.status === 'ACTIVE' && onStartPlan && <button type="button" onClick={() => onStartPlan(setup)} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 text-3xs font-black text-sky-700 transition hover:bg-sky-100"><FileText size={12} /> Plan</button>}
                    <div className="ml-auto flex items-center gap-1">
                      <button type="button" onClick={() => archiveSetup(setup)} className="rounded-xl p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700" title={setup.status === 'ACTIVE' ? 'Archive playbook' : 'Restore playbook'}><Archive size={14} /></button>
                      <button type="button" onClick={() => setDeleteCandidate(setup)} className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete playbook"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="clay-card p-5 lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><BarChart3 size={19} /></div>
            <div>
              <h2 className="text-sm font-black text-slate-900">How the evidence is read</h2>
              <p className="mt-1 text-2xs leading-relaxed text-slate-500">Performance uses closed-trade net P&amp;L. Open positions remain visible but never improve or reduce a setup’s statistics. Less than 20 closed trades is a signal to collect more evidence—not to increase risk.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-3xs leading-relaxed text-amber-800"><strong className="block font-black">0–9 trades</strong>Exploratory: log consistently.</div>
            <div className="rounded-xl bg-sky-50 px-3 py-2.5 text-3xs leading-relaxed text-sky-800"><strong className="block font-black">10–19 trades</strong>Developing: compare conditions.</div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-3xs leading-relaxed text-emerald-800"><strong className="block font-black">20+ trades</strong>Useful: review edge and risk.</div>
          </div>
        </article>
        <article className="clay-card p-5">
          <div className="flex items-center gap-2 text-violet-700"><CircleDollarSign size={18} /><h2 className="text-sm font-black">Next best action</h2></div>
          <p className="mt-3 text-2xs leading-relaxed text-slate-600">
            {activeSetups.length === 0
              ? 'Create one focused playbook before the next session so your setup field has a consistent source of truth.'
              : strongest && strongest.closedTrades.length >= 10 && strongest.netPnl < 0
                ? `Review ${strongest.setup.name} before adding size. Its current evidence is negative, so check context and rule adherence first.`
                : `${Math.max(0, 20 - Math.max(...analytics.map(item => item.closedTrades.length), 0))} more closed trade(s) are needed for your most-tested setup to reach a 20-trade review sample.`}
          </p>
          <button onClick={() => setEditorSetup(null)} className="mt-4 inline-flex items-center gap-1.5 text-3xs font-black text-violet-700 transition hover:text-violet-900"><Plus size={13} /> Build another playbook <ArrowRight size={12} /></button>
        </article>
      </section>
    </div>
  );
}
