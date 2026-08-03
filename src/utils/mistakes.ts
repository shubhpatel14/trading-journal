export const DEFAULT_MISTAKES = [
  'None',
  'FOMO',
  'Overtrading',
  'Chased Trade',
  'Left Early',
  'Wide Stop Loss',
  'Overleveraged',
  'No Plan Execution'
];

export const getStoredMistakes = (): string[] => {
  try {
    const saved = localStorage.getItem('tradeforge_custom_mistakes');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure 'None' is always the first item if not present
        if (!parsed.includes('None')) {
          return ['None', ...parsed];
        }
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_MISTAKES;
};

export const saveStoredMistakes = (list: string[]) => {
  try {
    localStorage.setItem('tradeforge_custom_mistakes', JSON.stringify(list));
  } catch (e) {}
};
