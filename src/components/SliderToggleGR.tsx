import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';

export interface SliderToggleGROption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
}

interface SliderToggleGRProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options?: [SliderToggleGROption<T>, SliderToggleGROption<T>];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export default function SliderToggleGR<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className = '',
  disabled = false,
}: SliderToggleGRProps<T>) {
  // Default to Bullish / Bearish if not provided
  const opts = options || ([
    {
      value: 'BULLISH' as T,
      label: 'Bullish',
      shortLabel: 'Bull',
      icon: <TrendingUp size={size === 'sm' ? 11 : 13} className="stroke-[3px] shrink-0" />
    },
    {
      value: 'BEARISH' as T,
      label: 'Bearish',
      shortLabel: 'Bear',
      icon: <TrendingDown size={size === 'sm' ? 11 : 13} className="stroke-[3px] shrink-0" />
    }
  ] as [SliderToggleGROption<T>, SliderToggleGROption<T>]);

  const [opt1, opt2] = opts;
  const isFirst = value === opt1.value;

  const handleToggle = () => {
    if (disabled) return;
    onChange(isFirst ? opt2.value : opt1.value);
  };

  const containerSizes = {
    sm: 'h-8 min-w-[145px] max-w-[180px] p-0.5 text-[11px]',
    md: 'h-9.5 min-w-[170px] max-w-[210px] p-1 text-xs',
    lg: 'h-11 min-w-[200px] max-w-[240px] p-1 text-sm',
  }[size];

  return (
    <div
      onClick={handleToggle}
      className={`relative inline-flex items-center rounded-full bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700 cursor-pointer select-none transition-all duration-300 shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] ${containerSizes} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400'
      } ${className}`}
      role="switch"
      aria-checked={isFirst}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      {/* Sliding Active Pill Background - uses smooth transform translate */}
      <div
        style={{
          width: 'calc(50% - 2px)',
          transform: isFirst ? 'translateX(0%)' : 'translateX(calc(100% + 4px))',
        }}
        className={`absolute top-0.5 bottom-0.5 left-0.5 rounded-full transition-transform duration-300 ease-out shadow-md pointer-events-none flex items-center justify-center border ${
          isFirst
            ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 border-emerald-400/50 shadow-[0_3px_12px_rgba(16,185,129,0.5)]'
            : 'bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 border-rose-400/50 shadow-[0_3px_12px_rgba(244,63,94,0.5)]'
        }`}
      >
        {/* Subtle glossy glass shine highlight */}
        <div className="absolute inset-x-2 top-0.5 h-[1.5px] bg-white/40 rounded-full" />
      </div>

      {/* Option 1 Button (Green side) */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange(opt1.value);
        }}
        className={`relative z-10 flex-1 h-full flex items-center justify-center gap-1 font-black uppercase tracking-wide transition-colors duration-200 px-2 min-w-0 overflow-hidden cursor-pointer ${
          isFirst
            ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {opt1.icon}
        <span className="truncate">
          <span className="hidden sm:inline">{opt1.label}</span>
          <span className="sm:hidden">{opt1.shortLabel || opt1.label}</span>
        </span>
      </button>

      {/* Option 2 Button (Red side) */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange(opt2.value);
        }}
        className={`relative z-10 flex-1 h-full flex items-center justify-center gap-1 font-black uppercase tracking-wide transition-colors duration-200 px-2 min-w-0 overflow-hidden cursor-pointer ${
          !isFirst
            ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {opt2.icon}
        <span className="truncate">
          <span className="hidden sm:inline">{opt2.label}</span>
          <span className="sm:hidden">{opt2.shortLabel || opt2.label}</span>
        </span>
      </button>
    </div>
  );
}

// Preset helper for GO / NO GO decision slider
export function GoNoGoSlider({
  value,
  onChange,
  size = 'md',
  className = '',
  disabled = false,
}: {
  value: 'GO' | 'NO_GO';
  onChange: (value: 'GO' | 'NO_GO') => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SliderToggleGR<'GO' | 'NO_GO'>
      value={value}
      onChange={onChange}
      size={size}
      className={className}
      disabled={disabled}
      options={[
        {
          value: 'GO',
          label: 'GO',
          shortLabel: 'GO',
          icon: <CheckCircle2 size={size === 'sm' ? 11 : 13} className="stroke-[3px] shrink-0" />
        },
        {
          value: 'NO_GO',
          label: 'NO GO',
          shortLabel: 'NO',
          icon: <XCircle size={size === 'sm' ? 11 : 13} className="stroke-[3px] shrink-0" />
        }
      ]}
    />
  );
}
