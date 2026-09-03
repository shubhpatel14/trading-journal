import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { DailyReview, SetupDefinition, Trade, TradePlan, TradingAccount, WeeklyReview } from '../types';
import { buildTradingContext } from '../utils/tradingContext';

interface AIChatViewProps {
  trades: Trade[];
  plans: TradePlan[];
  setups: SetupDefinition[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  accounts: TradingAccount[];
  selectedAccountId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kind?: 'overview' | 'answer' | 'error';
}

interface GeminiConfig {
  configured: boolean;
  source: 'session' | 'environment' | 'none';
  model: string;
}

const suggestions = [
  'How did I do on Gold trades last week?',
  'Which setup has the strongest evidence?',
  'What mistakes are costing me the most?',
  'Compare my London and New York sessions.',
];

const inlineText = (text: string) => text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
  part.startsWith('**') && part.endsWith('**')
    ? <strong key={`${part}-${index}`} className="font-black text-slate-900">{part.slice(2, -2)}</strong>
    : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>,
);

function FormattedMessage({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
      {content.split('\n').map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <div key={`space-${index}`} className="h-1" />;
        if (line.startsWith('### ')) return <h4 key={index} className="pt-1 text-sm font-black text-slate-900">{inlineText(line.slice(4))}</h4>;
        if (line.startsWith('## ')) return <h3 key={index} className="pt-1 font-display text-base font-black text-slate-900">{inlineText(line.slice(3))}</h3>;
        if (line.startsWith('# ')) return <h2 key={index} className="pt-1 font-display text-lg font-black text-slate-900">{inlineText(line.slice(2))}</h2>;
        if (/^[-*] /.test(line)) {
          return <div key={index} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" /><p>{inlineText(line.slice(2))}</p></div>;
        }
        if (/^\d+\. /.test(line)) {
          const [number] = line.match(/^\d+/) || ['1'];
          return <div key={index} className="flex gap-2"><span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-100 px-1 text-4xs font-black text-violet-700">{number}</span><p>{inlineText(line.replace(/^\d+\. /, ''))}</p></div>;
        }
        return <p key={index}>{inlineText(line)}</p>;
      })}
    </div>
  );
}

export default function AIChatView({
  trades,
  plans,
  setups,
  dailyReviews,
  weeklyReviews,
  accounts,
  selectedAccountId,
}: AIChatViewProps) {
  const [config, setConfig] = useState<GeminiConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [configError, setConfigError] = useState('');
  const overviewRequested = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const tradingContext = useMemo(() => buildTradingContext({
    trades,
    plans,
    setups,
    dailyReviews,
    weeklyReviews,
    accounts,
    selectedAccountId,
  }), [accounts, dailyReviews, plans, selectedAccountId, setups, trades, weeklyReviews]);

  const performance = tradingContext.performance;
  const scopeName = tradingContext.scope.account;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isResponding, messages]);

  const requestGemini = async (
    mode: 'overview' | 'chat',
    prompt = '',
    history: ChatMessage[] = messages,
  ) => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        question: prompt,
        context: tradingContext,
        history: history.filter(message => message.kind !== 'error').slice(-10).map(message => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || 'Gemini could not answer right now.') as Error & { code?: string };
      error.code = result.code;
      throw error;
    }
    return String(result.answer || 'Gemini returned an empty response.');
  };

  const generateOverview = async (replace = false) => {
    if (!config?.configured && config !== null) return;
    setIsResponding(true);
    try {
      const answer = await requestGemini('overview', '', replace ? [] : messages);
      const overview: ChatMessage = {
        id: `overview-${Date.now()}`,
        role: 'assistant',
        content: answer,
        kind: 'overview',
      };
      setMessages(current => replace
        ? [overview]
        : current.some(message => message.kind === 'overview') ? current : [overview, ...current]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate the overview.';
      setMessages(current => [...current, { id: `error-${Date.now()}`, role: 'assistant', content: message, kind: 'error' }]);
    } finally {
      setIsResponding(false);
    }
  };

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const response = await fetch('/api/ai/config', { cache: 'no-store' });
        const result = await response.json();
        if (!active) return;
        const nextConfig = result as GeminiConfig;
        setConfig(nextConfig);
        setShowKeyPanel(!nextConfig.configured);
        if (nextConfig.configured && !overviewRequested.current) {
          overviewRequested.current = true;
          setIsResponding(true);
          try {
            const answer = await requestGemini('overview', '', []);
            if (active) setMessages([{ id: `overview-${Date.now()}`, role: 'assistant', content: answer, kind: 'overview' }]);
          } catch (error) {
            if (active) {
              const typedError = error as Error & { code?: string };
              const message = typedError.message || 'Could not generate the overview.';
              if (typedError.code === 'GEMINI_KEY_INVALID') {
                setConfig(current => current ? { ...current, configured: false } : current);
                setShowKeyPanel(true);
                setConfigError(message);
              }
              setMessages([{ id: `error-${Date.now()}`, role: 'assistant', content: message, kind: 'error' }]);
            }
          } finally {
            if (active) setIsResponding(false);
          }
        }
      } catch {
        if (active) {
          setConfig({ configured: false, source: 'none', model: 'Unavailable' });
          setShowKeyPanel(true);
          setConfigError('The local AI service is not reachable. Restart the app server and try again.');
        }
      }
    };
    initialize();
    return () => { active = false; };
  }, []);

  const saveApiKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setConfigError('');
    setIsSavingKey(true);
    try {
      const response = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not configure Gemini.');
      setApiKey('');
      setConfig(result as GeminiConfig);
      setShowKeyPanel(false);
      setMessages([]);
      overviewRequested.current = true;
      setIsResponding(true);
      try {
        const answer = await requestGemini('overview', '', []);
        setMessages([{ id: `overview-${Date.now()}`, role: 'assistant', content: answer, kind: 'overview' }]);
      } catch (error) {
        const typedError = error as Error & { code?: string };
        setConfig(current => current ? { ...current, configured: typedError.code !== 'GEMINI_KEY_INVALID' } : current);
        setShowKeyPanel(true);
        setConfigError(typedError.message || 'The key was saved, but Gemini could not generate the overview.');
        setMessages([{ id: `error-${Date.now()}`, role: 'assistant', content: typedError.message, kind: 'error' }]);
      } finally {
        setIsResponding(false);
      }
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Could not configure Gemini.');
    } finally {
      setIsSavingKey(false);
    }
  };

  const clearSessionKey = async () => {
    setConfigError('');
    try {
      const response = await fetch('/api/ai/config', { method: 'DELETE' });
      const result = await response.json();
      setConfig(result as GeminiConfig);
      setApiKey('');
      setShowKeyPanel(!result.configured);
    } catch {
      setConfigError('Could not clear the session key.');
    }
  };

  const sendQuestion = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isResponding || !config?.configured) return;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: cleanQuestion };
    const previousMessages = messages;
    setMessages(current => [...current, userMessage]);
    setQuestion('');
    setIsResponding(true);
    try {
      const answer = await requestGemini('chat', cleanQuestion, previousMessages);
      setMessages(current => [...current, { id: `answer-${Date.now()}`, role: 'assistant', content: answer, kind: 'answer' }]);
    } catch (error) {
      const typedError = error as Error & { code?: string };
      if (typedError.code === 'GEMINI_NOT_CONFIGURED' || typedError.code === 'GEMINI_KEY_INVALID') {
        setConfig(current => current ? { ...current, configured: false, source: 'none' } : current);
        setShowKeyPanel(true);
        setConfigError(typedError.message);
      }
      setMessages(current => [...current, { id: `error-${Date.now()}`, role: 'assistant', content: typedError.message, kind: 'error' }]);
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="space-y-6" id="ai-chat-tab">
      <section className="clay-surface relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="clay-pill bg-white/80 text-violet-700"><Sparkles size={14} className="stroke-[3px]" /> Grounded journal intelligence</span>
            <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Ask your trading data.</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">Gemini answers from the journal snapshot currently visible in this app—not from generic assumptions about your performance.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <div className="rounded-2xl border border-white/80 bg-white/70 p-3 shadow-sm"><div className="text-4xs font-black uppercase tracking-wider text-slate-400">Scope</div><div className="mt-1 truncate text-xs font-black text-violet-700" title={scopeName}>{scopeName}</div></div>
            <div className="rounded-2xl border border-white/80 bg-white/70 p-3 shadow-sm"><div className="text-4xs font-black uppercase tracking-wider text-slate-400">Closed</div><div className="mt-1 text-xs font-black text-slate-900">{performance.closedTrades} trades</div></div>
            <div className="rounded-2xl border border-white/80 bg-white/70 p-3 shadow-sm"><div className="text-4xs font-black uppercase tracking-wider text-slate-400">Win rate</div><div className="mt-1 text-xs font-black text-emerald-700">{performance.winRate.toFixed(1)}%</div></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="clay-surface flex min-h-[620px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/80 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-clayButton"><Bot size={17} /></div>
              <div><h2 className="text-xs font-black text-slate-900">TradeForge AI</h2><p className="text-4xs font-bold text-slate-400">{config?.configured ? `${config.model} · grounded context ready` : 'Gemini setup required'}</p></div>
            </div>
            <div className="flex items-center gap-2">
              {config?.configured && <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-4xs font-black uppercase tracking-wider text-emerald-700 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected</span>}
              <button type="button" onClick={() => setShowKeyPanel(value => !value)} className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-violet-700" title="Gemini settings"><Settings2 size={16} /></button>
              <button type="button" onClick={() => { setMessages([]); overviewRequested.current = false; }} className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-rose-600" title="Clear conversation"><Trash2 size={16} /></button>
            </div>
          </div>

          {showKeyPanel && (
            <form onSubmit={saveApiKey} className="border-b border-violet-100 bg-violet-50/65 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm"><KeyRound size={17} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-black text-slate-900">Gemini API key</h3><p className="mt-0.5 text-4xs leading-relaxed text-slate-500">Sent once to the local backend and kept only in server memory. It is never saved in browser storage or returned by the API.</p></div>{config?.source === 'environment' && <span className="rounded-full bg-emerald-100 px-2 py-1 text-4xs font-black text-emerald-700">Using local .env</span>}</div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <LockKeyhole size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showApiKey ? 'text' : 'password'} value={apiKey} onChange={event => setApiKey(event.target.value)} autoComplete="off" spellCheck={false} placeholder={config?.configured ? 'Paste a replacement key' : 'Paste your Gemini API key'} className="w-full rounded-2xl border border-violet-200 bg-white py-2.5 pl-9 pr-10 text-xs font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                      <button type="button" onClick={() => setShowApiKey(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-700" aria-label={showApiKey ? 'Hide API key' : 'Show API key'}>{showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    </div>
                    <button type="submit" disabled={isSavingKey || apiKey.trim().length < 20} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={14} /> {isSavingKey ? 'Saving…' : config?.configured ? 'Replace key' : 'Connect Gemini'}</button>
                    {config?.source === 'session' && <button type="button" onClick={clearSessionKey} className="rounded-2xl px-3 py-2 text-3xs font-black text-rose-600 transition hover:bg-rose-50">Clear session key</button>}
                  </div>
                  {configError && <p className="mt-2 flex items-center gap-1.5 text-3xs font-bold text-rose-600"><AlertCircle size={12} />{configError}</p>}
                </div>
              </div>
            </form>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto px-3 py-5 sm:px-5">
            {!config?.configured && config !== null && messages.length === 0 && (
              <div className="mx-auto flex max-w-lg flex-col items-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-violet-100 text-violet-700"><MessageSquareText size={25} /></div>
                <h3 className="mt-4 font-display text-lg font-black text-slate-900">Connect Gemini to begin</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">Your journal context is ready. Add a key above and Gemini will automatically create your opening performance overview.</p>
              </div>
            )}

            {messages.map(message => (
              <div key={message.id} className={`flex items-start gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${message.role === 'user' ? 'bg-slate-800 text-white' : message.kind === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-violet-100 text-violet-700'}`}>{message.role === 'user' ? <User size={14} /> : message.kind === 'error' ? <AlertCircle size={14} /> : <Bot size={15} />}</div>
                <div className={`max-w-[88%] rounded-[24px] px-4 py-3.5 shadow-sm ${message.role === 'user' ? 'rounded-tr-md bg-gradient-to-br from-violet-500 to-violet-700 text-white' : message.kind === 'error' ? 'rounded-tl-md border border-rose-100 bg-rose-50' : 'rounded-tl-md border border-white bg-white/80'}`}>
                  {message.kind === 'overview' && <div className="mb-2 flex items-center gap-1.5 text-4xs font-black uppercase tracking-[0.16em] text-violet-600"><Sparkles size={11} /> Automatic performance overview</div>}
                  {message.role === 'user' ? <p className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">{message.content}</p> : <FormattedMessage content={message.content} />}
                </div>
              </div>
            ))}

            {isResponding && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Bot size={15} /></div>
                <div className="flex items-center gap-1.5 rounded-[24px] rounded-tl-md border border-white bg-white/80 px-4 py-4 shadow-sm"><span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" /><span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:240ms]" /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendQuestion} className="border-t border-white/80 bg-white/45 p-3 backdrop-blur-sm sm:p-4">
            <div className="flex items-end gap-2 rounded-[24px] border border-violet-100 bg-white p-2 shadow-[0_10px_30px_rgba(124,58,237,0.09)]">
              <textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendQuestion(); } }} disabled={!config?.configured || isResponding} rows={1} placeholder={config?.configured ? 'Ask about your trades, setups, sessions, or reviews…' : 'Configure Gemini to start asking questions'} className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-xs leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed sm:text-sm" />
              <button type="submit" disabled={!question.trim() || !config?.configured || isResponding} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"><Send size={16} /></button>
            </div>
            <p className="mt-2 text-center text-4xs font-medium text-slate-400">Enter to send · Shift + Enter for a new line · Verify important decisions against your journal</p>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="clay-card p-5">
            <div className="flex items-center gap-2 text-violet-700"><Database size={16} /><h2 className="text-xs font-black">Grounding snapshot</h2></div>
            <div className="mt-4 space-y-2">
              {[['Closed trades', performance.closedTrades], ['Open positions', performance.openPositions], ['Active plans', tradingContext.activePlans.length], ['Daily reviews', tradingContext.recentReviews.daily.length], ['Weekly reviews', tradingContext.recentReviews.weekly.length]].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between rounded-xl bg-white/65 px-3 py-2 text-3xs"><span className="font-bold text-slate-500">{label}</span><span className="font-black text-slate-900">{value}</span></div>)}
            </div>
            <p className="mt-3 text-4xs leading-relaxed text-slate-400">Compact trade records: {tradingContext.contextCoverage.includedCompactTrades} of {tradingContext.contextCoverage.totalTradeRecords}. Aggregate metrics always cover every closed trade in scope.</p>
          </section>

          <section className="clay-card p-5">
            <div className="flex items-center justify-between gap-2"><h2 className="text-xs font-black text-slate-900">Try asking</h2>{config?.configured && <button type="button" onClick={() => generateOverview(true)} disabled={isResponding} className="rounded-xl p-1.5 text-violet-600 transition hover:bg-violet-50 disabled:opacity-40" title="Regenerate overview"><RefreshCw size={14} className={isResponding ? 'animate-spin' : ''} /></button>}</div>
            <div className="mt-3 space-y-2">{suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => setQuestion(suggestion)} disabled={!config?.configured} className="w-full rounded-2xl border border-violet-100 bg-white/70 px-3 py-2.5 text-left text-3xs font-bold leading-relaxed text-slate-600 transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{suggestion}</button>)}</div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-2 text-emerald-700"><ShieldCheck size={15} /><h2 className="text-3xs font-black uppercase tracking-wider">Privacy</h2></div>
            <p className="mt-2 text-4xs leading-relaxed text-emerald-800/75">Only the compact journal snapshot and recent chat turns are sent to Gemini. Screenshots and credentials are excluded.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
