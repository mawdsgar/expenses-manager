const parseLocalDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addMonthsClamped = (date: Date, months: number) => {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
};

const getEasterSunday = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const getLastWeekdayOfMonth = (year: number, month: number, weekday: number) => {
  const date = new Date(year, month + 1, 0);
  date.setDate(date.getDate() - ((date.getDay() - weekday + 7) % 7));
  return date;
};

const getFirstWeekdayOfMonth = (year: number, month: number, weekday: number) => {
  const date = new Date(year, month, 1);
  date.setDate(date.getDate() + ((weekday - date.getDay() + 7) % 7));
  return date;
};

/** Standard England and Wales bank holidays, including substitute days. */
export const getStandardEnglandWalesBankHolidays = (year: number) => {
  const easterSunday = getEasterSunday(year);
  const goodFriday = new Date(year, easterSunday.getMonth(), easterSunday.getDate() - 2);
  const easterMonday = new Date(year, easterSunday.getMonth(), easterSunday.getDate() + 1);
  const fixedHolidays = [new Date(year, 0, 1), new Date(year, 11, 25), new Date(year, 11, 26)];
  const holidays = new Set<string>();

  // Reserve fixed holidays that already fall on a working day before assigning
  // substitute days for weekend dates (for example Christmas and Boxing Day).
  for (const date of fixedHolidays) {
    if (date.getDay() !== 0 && date.getDay() !== 6) holidays.add(toDateKey(date));
  }

  for (const date of fixedHolidays) {
    if (date.getDay() !== 0 && date.getDay() !== 6) continue;
    const substitute = new Date(date);
    do substitute.setDate(substitute.getDate() + 1);
    while (substitute.getDay() === 0 || substitute.getDay() === 6 || holidays.has(toDateKey(substitute)));
    holidays.add(toDateKey(substitute));
  }

  [goodFriday, easterMonday, getFirstWeekdayOfMonth(year, 4, 1), getLastWeekdayOfMonth(year, 4, 1), getLastWeekdayOfMonth(year, 7, 1)]
    .forEach((date) => holidays.add(toDateKey(date)));

  return holidays;
};

export const loadEnglandWalesBankHolidays = async () => {
  const year = new Date().getFullYear();
  const dates = new Set<string>();
  for (let holidayYear = year - 1; holidayYear <= year + 10; holidayYear += 1) {
    for (const date of getStandardEnglandWalesBankHolidays(holidayYear)) dates.add(date);
  }

  try {
    const response = await fetch('https://www.gov.uk/bank-holidays.json', { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json() as { 'england-and-wales'?: { events?: Array<{ date: string }> } };
      for (const event of data['england-and-wales']?.events ?? []) dates.add(event.date);
    }
  } catch {
    // The standard calendar remains available if GOV.UK is temporarily offline.
  }

  return dates;
};

export const getAdjustedPayDate = (scheduledDate: string, isSalary: boolean, bankHolidays: ReadonlySet<string>) => {
  const date = parseLocalDate(scheduledDate);
  if (!isSalary) return date;
  while (date.getDay() === 0 || date.getDay() === 6 || bankHolidays.has(toDateKey(date))) {
    date.setDate(date.getDate() - 1);
  }
  return date;
};

export const formatPayDate = (date: Date) => date.toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric',
});
