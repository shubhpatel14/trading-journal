import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  BarChart3,
  BrainCircuit,
  Loader2,
  ShieldAlert,
  Award,
  Activity,
  Check,
  Flame,
  LockKeyhole,
  Shield,
  Layers,
  ChevronRight,
  Heart
} from 'lucide-react';
import BrandLogo from './BrandLogo';

interface LoginPageProps {
  onEmailAuth: (mode: 'signin' | 'signup', email: string, pass: string, name?: string) => Promise<void>;
  onGoogleAuth: () => Promise<void>;
  onGuestAuth: () => Promise<void>;
  authError: string | null;
  authSubmitting: boolean;
  isFirebaseConfigured: boolean;
}

export default function LoginPage({
  onEmailAuth,
  onGoogleAuth,
  onGuestAuth,
  authError,
  authSubmitting,
  isFirebaseConfigured
}: LoginPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'analytics' | 'discipline' | 'playbook'>('analytics');
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Password strength calculation for registration mode
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 33, label: 'Weak Password', color: 'bg-rose-500' };
    if (score <= 4) return { score: 66, label: 'Good Password', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong Security', color: 'bg-emerald-500' };
  };

  const passStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email.trim() || !password.trim()) {
      setValidationError('Please fill in both email and password.');
      return;
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setValidationError('Please enter your display name.');
        return;
      }
      if (password.length < 6) {
        setValidationError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return;
      }
    }

    try {
      await onEmailAuth(mode, email, password, displayName);
    } catch (err: any) {
      // Error handled by parent state
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen w-full bg-[#070a13] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-purple-500 selection:text-white"
    >
      {/* Interactive Ambient Spotlight Glow Effect */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(168, 85, 247, 0.15), rgba(56, 189, 248, 0.1), rgba(244, 114, 182, 0.05), transparent 75%)`
        }}
      />
      
      {/* Explicit High-Frequency CSS Keyframes */}
      <style>{`
        @keyframes tf-laser-sweep {
          0% { top: -10%; opacity: 0; }
          20% { opacity: 0.95; }
          80% { opacity: 0.95; }
          100% { top: 110%; opacity: 0; }
        }

        @keyframes tf-bob-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-24px) rotate(3deg); }
        }

        @keyframes tf-bob-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(24px) rotate(-3deg); }
        }

        @keyframes tf-bob-3 {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.06); }
        }

        @keyframes tf-pulse-glow-ring {
          0%, 100% {
            box-shadow: 0 0 25px rgba(124, 58, 237, 0.4), 0 0 50px rgba(56, 189, 248, 0.3);
          }
          50% {
            box-shadow: 0 0 50px rgba(124, 58, 237, 0.85), 0 0 95px rgba(236, 72, 153, 0.65);
          }
        }

        @keyframes tf-shimmer-text {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes tf-star-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.6); }
        }

        @keyframes tf-cute-pastel-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .tf-animated-rainbow-text {
          background: linear-gradient(
            90deg,
            #38bdf8 0%,
            #818cf8 33%,
            #c084fc 66%,
            #38bdf8 100%
          );
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: tf-cute-pastel-flow 6s ease-in-out infinite !important;
          filter: drop-shadow(0 2px 10px rgba(124, 58, 237, 0.3));
        }

        .tf-animate-laser {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #38bdf8, #c084fc, #38bdf8, transparent);
          box-shadow: 0 0 15px #38bdf8, 0 0 30px #c084fc;
          animation: tf-laser-sweep 4s linear infinite;
          pointer-events: none;
          z-index: 10;
        }

        .tf-bob-1 { animation: tf-bob-1 3.5s ease-in-out infinite !important; }
        .tf-bob-2 { animation: tf-bob-2 4.2s ease-in-out infinite !important; }
        .tf-bob-3 { animation: tf-bob-3 4.8s ease-in-out infinite !important; }
        .tf-glow-ring { animation: tf-pulse-glow-ring 3s ease-in-out infinite !important; }
        .tf-shimmer-title { background-size: 200% 200%; animation: tf-shimmer-text 3.5s ease infinite !important; }
        .tf-star { animation: tf-star-twinkle 2.5s ease-in-out infinite !important; }

        @keyframes tf-google-laser-trace {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }

        .tf-google-laser-path {
          stroke-dasharray: 28 72;
          animation: tf-google-laser-trace 6.5s linear infinite !important;
          filter: drop-shadow(0 0 4px #4285f4) drop-shadow(0 0 8px #34a853);
        }
      `}</style>

      {/* Dynamic Cosmic Aurora Borealis Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Laser Scanning Beam Line */}
        <div className="tf-animate-laser" />

        {/* Multi-layered Aurora Borealis Glowing Mesh Orbs */}
        <div className="absolute -top-[30%] -left-[20%] w-[80rem] h-[80rem] rounded-full bg-gradient-to-br from-purple-600/40 via-indigo-600/30 to-transparent blur-[160px] animate-aurora" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[85rem] h-[85rem] rounded-full bg-gradient-to-tl from-cyan-500/35 via-blue-600/30 to-transparent blur-[170px] animate-aurora" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[20%] left-[32%] w-[50rem] h-[50rem] rounded-full bg-gradient-to-tr from-pink-600/25 via-purple-600/20 to-transparent blur-[160px] animate-aurora" style={{ animationDelay: '6s' }} />
        <div className="absolute bottom-[15%] left-[10%] w-[40rem] h-[40rem] rounded-full bg-emerald-500/20 blur-[140px] animate-aurora" style={{ animationDelay: '9s' }} />

        {/* Cyber Grid & Perspective Hologram Grid */}
        <div 
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.5) 1.2px, transparent 1.2px), linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: '40px 40px, 40px 40px'
          }}
        />

        {/* Twinkling Starfield Particles */}
        <div className="absolute top-[12%] left-[18%] w-2 h-2 rounded-full bg-cyan-300 blur-[0.5px] tf-star" />
        <div className="absolute top-[28%] left-[72%] w-2.5 h-2.5 rounded-full bg-purple-300 blur-[0.5px] tf-star" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[65%] left-[22%] w-2 h-2 rounded-full bg-emerald-300 blur-[0.5px] tf-star" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[82%] left-[60%] w-3 h-3 rounded-full bg-indigo-300 blur-[0.5px] tf-star" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-[40%] left-[85%] w-2 h-2 rounded-full bg-pink-300 blur-[0.5px] tf-star" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[75%] left-[40%] w-2.5 h-2.5 rounded-full bg-cyan-300 blur-[0.5px] tf-star" style={{ animationDelay: '1.2s' }} />

        {/* Dual Animated Wave Polyline Overlay SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cyberLineGlow1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="cyberLineGlow2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Primary Indigo/Cyan Wave */}
          <path
            d="M -100,550 Q 300,300 600,480 T 1200,260 T 1800,380 T 2400,160"
            fill="none"
            stroke="url(#cyberLineGlow1)"
            strokeWidth="3.5"
            className="animate-pulse"
            style={{ animationDuration: '7s' }}
          />
          {/* Secondary Emerald/Cyan Wave */}
          <path
            d="M -100,600 Q 250,400 550,520 T 1150,340 T 1750,420 T 2400,240"
            fill="none"
            stroke="url(#cyberLineGlow2)"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            className="animate-pulse"
            style={{ animationDuration: '9s' }}
          />
        </svg>

        {/* Floating Badges (Positioned in Outer Margins to Avoid Text Overlap) */}
        <div className="hidden xl:block absolute top-[11%] left-[1%] 2xl:left-[3%] tf-bob-1">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp size={16} />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono font-bold">Win Rate Target</div>
              <div className="text-xs font-black text-emerald-400 font-mono">+68.4% Average</div>
            </div>
          </div>
        </div>

        <div className="hidden xl:block absolute bottom-[8%] left-[1%] 2xl:left-[3%] tf-bob-2">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
            <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300">
              <BrainCircuit size={16} />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono font-bold">AI Discipline Index</div>
              <div className="text-xs font-black text-purple-300 font-mono">98.5 / 100 Score</div>
            </div>
          </div>
        </div>

        <div className="hidden xl:block absolute top-[18%] right-[1%] 2xl:right-[3%] tf-bob-3">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Flame size={16} />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono font-bold">Discipline Streak</div>
              <div className="text-xs font-black text-amber-400 font-mono">14 Days Zero Overtrades</div>
            </div>
          </div>
        </div>

        <div className="hidden xl:block absolute bottom-[12%] right-[1%] 2xl:right-[3%] tf-bob-1" style={{ animationDelay: '1.8s' }}>
          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Activity size={16} />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono font-bold">Institutional Sharpe</div>
              <div className="text-xs font-black text-cyan-400 font-mono">2.45 Ratio</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Navbar Header */}
      <header className="relative z-20 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size={44} showText={true} theme="dark" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Sparkles size={11} className="text-amber-400" />
            PRO TRADING SUITE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGuestAuth}
            className="group px-4.5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-bold transition-all duration-200 flex items-center gap-2 shadow-xl cursor-pointer hover:border-purple-500/60 active:scale-95"
          >
            <Sparkles size={14} className="text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
            <span>Instant Demo Sandbox</span>
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-4 xl:py-6 my-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* Left Side: Feature Showcase */}
        <div className="hidden lg:flex lg:col-span-6 flex-col space-y-6 pr-2 pt-2 xl:pt-4">
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-black font-display tracking-tight text-white leading-[1.15]">
              Turn Raw Trade Data Into{' '}
              <span className="tf-animated-rainbow-text font-black">
                Flawless Discipline
              </span>
            </h1>
            
            <p className="text-slate-400 text-sm xl:text-base leading-relaxed max-w-xl">
              Track execution setups, evaluate risk & reward ratios, enforce discipline rules, and optimize your trading equity curve.
            </p>
          </div>

          {/* Interactive Live Feature Preview Card */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-2xl shadow-2xl space-y-5 glow-card-border">
            
            {/* Tab Selector */}
            <div className="flex gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setActivePreviewTab('analytics')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  activePreviewTab === 'analytics'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 size={15} />
                <span>Tactical Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewTab('discipline')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  activePreviewTab === 'discipline'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BrainCircuit size={15} />
                <span>AI Discipline Engine</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewTab('playbook')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  activePreviewTab === 'playbook'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers size={15} />
                <span>Setup Playbook</span>
              </button>
            </div>

            {/* Dynamic Content Display */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/60 min-h-[170px] flex flex-col justify-center">
              {activePreviewTab === 'analytics' ? (
                <div className="space-y-3.5 animate-fadeIn">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Live Equity Growth Curve</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-extrabold text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      +$5,420.00 (+18.4%)
                    </span>
                  </div>

                  {/* SVG Chart curve graphic */}
                  <div className="h-20 w-full relative pt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 60" fill="none">
                      <defs>
                        <linearGradient id="previewArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 50 Q 50 35 100 42 T 200 20 T 300 5"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3"
                      />
                      <path
                        d="M 0 50 Q 50 35 100 42 T 200 20 T 300 5 L 300 60 L 0 60 Z"
                        fill="url(#previewArea)"
                      />
                      {/* Pulse point at peak */}
                      <circle cx="300" cy="5" r="4" fill="#38bdf8" className="animate-ping" />
                      <circle cx="300" cy="5" r="3" fill="#ffffff" />
                    </svg>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-1">
                    <span>Sharpe Ratio: <strong className="text-purple-300">2.45</strong></span>
                    <span>Profit Factor: <strong className="text-emerald-400">2.18</strong></span>
                    <span>Max DD: <strong className="text-slate-300">3.2%</strong></span>
                  </div>
                </div>
              ) : activePreviewTab === 'discipline' ? (
                <div className="space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      <span>Rule Compliance Scorecard</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      100% COMPLIANT
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                      <span className="text-slate-300 flex items-center gap-2">
                        <Check size={14} className="text-emerald-400" />
                        Max Risk Per Trade &le; 1%
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">PASSED</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                      <span className="text-slate-300 flex items-center gap-2">
                        <Check size={14} className="text-emerald-400" />
                        Hard Stop Loss Always Enforced
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">PASSED</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                      <span className="text-slate-300 flex items-center gap-2">
                        <Check size={14} className="text-emerald-400" />
                        HTF Structure & Liquidity Confluence
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">PASSED</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                      <span className="text-slate-300 flex items-center gap-2">
                        <Check size={14} className="text-emerald-400" />
                        No Overtrading (Max 3 Trades / Day)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">PASSED</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                      <span className="text-slate-300 flex items-center gap-2">
                        <Check size={14} className="text-emerald-400" />
                        Psychology & FOMO Risk Index
                      </span>
                      <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">LOW (OPTIMAL)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Layers size={16} className="text-cyan-400" />
                      <span>Strategy Setup Performance</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      OPTIMIZED PLAYBOOK
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                      <span className="text-slate-300 font-medium">Liquidity Sweep & Rejection</span>
                      <span className="text-xs text-emerald-400 font-mono font-bold">78.2% Win Rate (+2.4 R:R)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                      <span className="text-slate-300 font-medium">EMA Dynamic Retest</span>
                      <span className="text-xs text-emerald-400 font-mono font-bold">66.4% Win Rate (+1.9 R:R)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                      <span className="text-slate-300 font-medium">Break of Structure (BoS) Shift</span>
                      <span className="text-xs text-indigo-300 font-mono font-bold">71.0% Win Rate (+2.1 R:R)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Social & Telemetry proof footer grid */}
          <div className="grid grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md">
              <div className="text-xl font-black text-white font-mono">100%</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cloud Encrypted</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md">
              <div className="text-xl font-black text-emerald-400 font-mono">0.0ms</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Client Latency</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md">
              <div className="text-xl font-black text-purple-300 font-mono">Multi-Acc</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prop Support</div>
            </div>
          </div>
        </div>

        {/* Right Side: High-End Glassmorphic Auth Card */}
        <div className="col-span-1 lg:col-span-6 max-w-md w-full mx-auto lg:-mt-4 xl:-mt-8">
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-700/70 backdrop-blur-2xl shadow-2xl relative overflow-hidden transition-all duration-300 glow-card-border animate-ring-glow">
            
            {/* Glowing Accent Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500" />

            {/* Card Header & Tab Switcher */}
            <div className="space-y-4 mb-4.5">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-black font-display text-white tracking-tight">
                  {mode === 'signin' ? 'Welcome Back, Trader' : 'Create Trader Account'}
                </h2>
                <p className="text-xs text-slate-400">
                  {mode === 'signin'
                    ? 'Enter your credentials to launch your trading workspace'
                    : 'Start logging trades & tracking discipline in under 60 seconds'}
                </p>
              </div>

              {/* Segmented Auth Mode Switcher */}
              <div className="p-1 bg-slate-950/90 rounded-2xl border border-slate-800 flex relative">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setValidationError(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer relative z-10 ${
                    mode === 'signin'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setValidationError(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer relative z-10 ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register Account
                </button>
              </div>
            </div>

            {/* Error Feedback Banners */}
            {(validationError || authError) && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <ShieldAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{validationError || authError}</div>
              </div>
            )}

            {/* Main Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Display Name field (Signup Mode Only) */}
              {mode === 'signup' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Trader Name / Alias</span>
                    <span className="text-[10px] text-slate-500 font-mono">Required</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required={mode === 'signup'}
                      placeholder="e.g. Alex Morgan"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="trader@tradeforge.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => alert("Password reset instructions: Please verify your email or use Guest mode to access your local workspace.")}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Live Password Strength Meter (Signup Mode Only) */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="pt-1.5 space-y-1 animate-fadeIn">
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passStrength.color}`}
                        style={{ width: `${passStrength.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Security Score:</span>
                      <span className="font-bold text-slate-200 font-mono">{passStrength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password (Signup Mode Only) */}
              {mode === 'signup' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-xs font-bold text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={mode === 'signup'}
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-xl transition-all duration-200 shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.98]"
              >
                {authSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Authenticating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Alternative Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800/80" />
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">or access via</span>
              <div className="flex-1 h-px bg-slate-800/80" />
            </div>

            {/* Social & Guest Access Buttons */}
            <div className="space-y-2.5">
              {/* Google Button with Precision SVG Border Light Beam */}
              <div className="relative group rounded-xl overflow-hidden shadow-xl transition-all duration-300 hover:scale-[1.015] active:scale-[0.985]">
                {/* Precision SVG Perimeter Laser Beam Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" overflow="visible">
                  <defs>
                    <linearGradient id="googleLaserMultiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4285F4" />
                      <stop offset="33%" stopColor="#EA4335" />
                      <stop offset="66%" stopColor="#FBBC05" />
                      <stop offset="100%" stopColor="#34A853" />
                    </linearGradient>
                  </defs>
                  {/* Base Dark Border Track */}
                  <rect x="0.5" y="0.5" width="calc(100% - 1px)" height="calc(100% - 1px)" rx="11.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" />
                  {/* Animated Traveling Neon Light Beam */}
                  <rect
                    x="0.5"
                    y="0.5"
                    width="calc(100% - 1px)"
                    height="calc(100% - 1px)"
                    rx="11.5"
                    fill="none"
                    stroke="url(#googleLaserMultiGrad)"
                    strokeWidth="2.2"
                    pathLength="100"
                    className="tf-google-laser-path"
                  />
                </svg>

                {/* Inner Button Content */}
                <button
                  type="button"
                  onClick={onGoogleAuth}
                  disabled={authSubmitting}
                  className="relative z-10 w-full py-2.5 px-4 bg-[#080d1a] hover:bg-[#0e152a] text-slate-100 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google Account</span>
                </button>
              </div>

              {/* Guest Mode Direct Access */}
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={onGuestAuth}
                  disabled={authSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 hover:from-purple-900/60 hover:to-indigo-900/60 text-purple-200 border border-purple-400/40 hover:border-purple-400/70 font-extrabold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Sparkles size={15} className="text-amber-400 fill-amber-400/30 animate-pulse" />
                  <span>Instant Demo Access (No Sign In Required)</span>
                </button>
                <div className="text-[10px] text-center text-slate-400 font-mono flex items-center justify-center gap-1 pt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block animate-ping" />
                  <span>Temporary Sandbox Mode — Data resets once browser tab is closed</span>
                </div>
              </div>
            </div>

            {/* Security Footer Note */}
            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-500">
              <LockKeyhole size={12} className="text-slate-400" />
              <span>AES-256 SSL Encrypted • Zero Data Exposure</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer info bar */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-900/80 gap-2">
        <div>&copy; {new Date().getFullYear()} TradeForge Analytics Inc. All Rights Reserved.</div>
        
        <div className="flex items-center gap-1.5 font-bold text-slate-200 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800/90 shadow-md">
          <span>Made By Shubh Patel</span>
          <Heart size={13} className="text-rose-500 fill-rose-500 animate-pulse" />
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            Cloud Session Engine Active
          </span>
          <span>&bull;</span>
          <span>Security Protocol v2.4</span>
        </div>
      </footer>
    </div>
  );
}
