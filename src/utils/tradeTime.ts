import { Trade } from '../types';

const IST_OFFSET_MINUTES = 5.5 * 60;

/**
 * Blueberry MT5 exports broker-server time: GMT+2 in winter and GMT+3 in
 * summer. This utility returns an IST display-only value; it never mutates a
 * trade or its stored fields.
 */
export const isMt5Trade = (trade: Pick<Trade, 'source'>) =>
  typeof trade.source === 'string' && /^mt5(?:\b|\s)/i.test(trade.source.trim());

const parseBrokerTradeTime = (date: string, time: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time || '');
  if (!match || !timeMatch) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = timeMatch[3] === undefined ? 0 : Number(timeMatch[3]);
  const value = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day ||
    value.getUTCHours() !== hour ||
    value.getUTCMinutes() !== minute ||
    value.getUTCSeconds() !== second
  ) return null;

  return value;
};

const getLastSunday = (year: number, monthIndex: number) => {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  return lastDay.getUTCDate() - lastDay.getUTCDay();
};

/** Blueberry uses GMT+3 from the last Sunday in March through the last Sunday in October. */
const isBlueberrySummerTime = (brokerTime: Date) => {
  const month = brokerTime.getUTCMonth();
  const day = brokerTime.getUTCDate();
  const hour = brokerTime.getUTCHours();
  const year = brokerTime.getUTCFullYear();

  if (month > 2 && month < 9) return true; // April through September
  if (month < 2 || month > 9) return false; // January–February or November–December

  if (month === 2) {
    const transitionDay = getLastSunday(year, month);
    return day > transitionDay || (day === transitionDay && hour >= 3);
  }

  const transitionDay = getLastSunday(year, month);
  return day < transitionDay || (day === transitionDay && hour < 4);
};

export interface TradeDisplayDateTime {
  date: string;
  time: string;
  isIstConversion: boolean;
}

export const getTradeDisplayDateTime = (trade: Pick<Trade, 'date' | 'time' | 'source'>): TradeDisplayDateTime => {
  if (!isMt5Trade(trade)) return { date: trade.date, time: trade.time, isIstConversion: false };

  const brokerTime = parseBrokerTradeTime(trade.date, trade.time);
  if (!brokerTime) return { date: trade.date, time: trade.time, isIstConversion: false };

  // IST is GMT+05:30, so the display offset is +03:30 in Blueberry winter
  // and +02:30 in its summer DST. UTC getters keep the browser timezone out
  // of the calculation.
  const brokerOffsetMinutes = isBlueberrySummerTime(brokerTime) ? 3 * 60 : 2 * 60;
  const ist = new Date(brokerTime.getTime() + (IST_OFFSET_MINUTES - brokerOffsetMinutes) * 60 * 1000);
  const date = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
  const time = `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;
  return { date, time, isIstConversion: true };
};
