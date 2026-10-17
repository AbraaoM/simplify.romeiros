const BRAZIL_TZ = "America/Sao_Paulo";

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function todayInBrazil(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function nextSaturdayOnOrAfter(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const delta = (6 - weekday + 7) % 7;
  return addDays(isoDate, delta);
}

export function calendarDateInBrazil(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoTimestamp));
}

export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

export function formatExcursionRange(
  departureAt: string,
  returnAt: string | null,
): string {
  const start = calendarDateInBrazil(departureAt);
  if (!returnAt) return formatDayMonth(start);
  const end = calendarDateInBrazil(returnAt);
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay}–${endDay} ${MONTHS[startMonth - 1]}`;
  }
  if (startYear === endYear) {
    return `${formatDayMonth(start)}–${formatDayMonth(end)}`;
  }
  return `${formatDayMonth(start)} ${startYear}–${formatDayMonth(end)} ${endYear}`;
}
