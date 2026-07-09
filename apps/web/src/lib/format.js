export { describeActivity } from '@gitjira/shared/activity';

// LEARN: relative timestamps ("3m ago") are friendlier than absolute ones for
// recent activity. Intl.RelativeTimeFormat does the localization for free — no
// hand-rolled "minutes/hours/days" ladder that breaks in other languages.
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

export function timeAgo(iso) {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  for (const [unit, secs] of UNITS) {
    if (Math.abs(seconds) >= secs || unit === 'second') {
      return rtf.format(-Math.round(seconds / secs), unit);
    }
  }
  return 'just now';
}
