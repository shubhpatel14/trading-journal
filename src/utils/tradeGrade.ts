import { Trade, TradeGrade } from '../types';

export const TRADE_GRADES: readonly TradeGrade[] = ['A+', 'A', 'B', 'C', 'Gamble'];

const GRADE_QUALITY: Record<TradeGrade, number> = {
  'A+': 100,
  A: 85,
  B: 70,
  C: 50,
  Gamble: 20,
};

export const isTradeGrade = (value: unknown): value is TradeGrade =>
  typeof value === 'string' && TRADE_GRADES.includes(value as TradeGrade);

/** Maps historical generic checklist percentages onto the new grade scale. */
export const getTradeGrade = (trade: Partial<Trade>): TradeGrade | undefined => {
  if (isTradeGrade(trade.tradeGrade)) return trade.tradeGrade;
  if (typeof trade.checklistScore !== 'number' || !trade.maxChecklistScore || trade.maxChecklistScore <= 0) {
    return undefined;
  }

  const percentage = (trade.checklistScore / trade.maxChecklistScore) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 75) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 40) return 'C';
  return 'Gamble';
};

export const getTradeGradeQuality = (trade: Partial<Trade>): number | undefined => {
  const grade = getTradeGrade(trade);
  return grade ? GRADE_QUALITY[grade] : undefined;
};

export const getTradeGradeIndex = (grade?: TradeGrade): number => {
  const index = grade ? TRADE_GRADES.indexOf(grade) : -1;
  return index >= 0 ? index : 2;
};
