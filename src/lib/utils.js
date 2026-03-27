// Filename: src/lib/utils.js

/**
 * Formats large numbers into K or M notation.
 */
export const formatNum = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
};

/**
 * Formats minute durations into human readable strings.
 */
export const formatTimeLatency = (mins) => {
  if (mins < 60) return `${Math.round(mins)} min`;
  if (mins < 1440) return `${Math.round(mins / 60)} hrs`;
  return `${Math.round(mins / 1440)} days`;
};

/**
 * ISO Language mapping dictionary.
 */
export const langMap = { 
  en: 'English', ja: 'Japanese', es: 'Spanish', fr: 'French', 
  pt: 'Portuguese', de: 'German', zh: 'Chinese', ru: 'Russian', 
  ko: 'Korean', it: 'Italian', nl: 'Dutch', tr: 'Turkish', 
  sv: 'Swedish', id: 'Indonesian', th: 'Thai', ar: 'Arabic' 
};