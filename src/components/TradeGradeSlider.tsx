import React from 'react';
import { TradeGrade } from '../types';
import { getTradeGradeIndex, TRADE_GRADES } from '../utils/tradeGrade';

interface TradeGradeSliderProps {
  value?: TradeGrade;
  onChange: (grade: TradeGrade) => void;
  compact?: boolean;
}

export default function TradeGradeSlider({ value, onChange, compact = false }: TradeGradeSliderProps) {
  const selectedIndex = getTradeGradeIndex(value);

  return (
    <div className={`rounded-2xl border border-purple-200/80 bg-purple-50/50 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-800">Trade grade</p>
          <p className="mt-0.5 text-3xs text-slate-500">Rate the quality of this execution.</p>
        </div>
        <span className="min-w-16 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-center text-lg font-black text-purple-700 shadow-3xs">
          {value || 'B'}
        </span>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={TRADE_GRADES.length - 1}
          step={1}
          value={selectedIndex}
          onChange={(event) => onChange(TRADE_GRADES[Number(event.target.value)])}
          aria-label="Trade grade"
          aria-valuetext={value || 'B'}
          style={{
            background: `linear-gradient(to right, #9333ea 0%, #9333ea ${selectedIndex * 25}%, #cbd5e1 ${selectedIndex * 25}%, #cbd5e1 100%)`,
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600"
        />
        <div className="relative mx-2 mt-2 h-5">
          {TRADE_GRADES.map((grade, index) => (
            <button
              key={grade}
              type="button"
              onClick={() => onChange(grade)}
              style={{ left: `${index * 25}%` }}
              className={`absolute -translate-x-1/2 whitespace-nowrap text-3xs font-extrabold transition ${index === selectedIndex ? 'text-purple-700' : 'text-slate-400 hover:text-slate-600'}`}
              aria-pressed={index === selectedIndex}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
