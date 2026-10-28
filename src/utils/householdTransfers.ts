export type HouseholdWeek = { week: number; start: Date; end: Date; amount: number };
export type HouseholdTransfer = { id: string; transferred_on: string; amount: number };

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayNumber = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
const cents = (amount: number) => Math.round(amount * 100);

// Allocate in pennies, retaining the existing final-week rounding convention.
function allocate(pool: number, weeks: HouseholdWeek[]) {
  const days = weeks.map(w => dayNumber(w.end) - dayNumber(w.start) + 1);
  const totalDays = days.reduce((sum, count) => sum + count, 0);
  let allocated = 0;
  return weeks.map((_, index) => {
    const amount = index === weeks.length - 1
      ? Math.max(0, pool) - allocated
      : Math.min(Math.max(0, pool) - allocated, Math.round(Math.max(0, pool) * days[index] / totalDays));
    allocated += amount;
    return amount;
  });
}

export function calculateHouseholdTransfers(weeks: HouseholdWeek[], transfers: HouseholdTransfer[], today: string) {
  const budget = weeks.reduce((sum, w) => sum + cents(w.amount), 0);
  const amounts = weeks.map(w => transfers.filter(t => t.transferred_on >= dateKey(w.start) && t.transferred_on <= dateKey(w.end))
    .reduce((sum, t) => sum + cents(t.amount), 0));
  let targets = weeks.map(w => cents(w.amount));
  let usedBefore = 0;
  const rows = weeks.map((w, index) => {
    const target = targets[index];
    const used = amounts[index];
    const closed = dateKey(w.end) < today;
    const current = dateKey(w.start) <= today && !closed;
    const over = Math.max(0, used - target);
    const remaining = Math.max(0, target - used);
    if (closed || current) {
      // Keep the current week's unused allowance available until the week closes.
      const reserved = closed ? used : Math.max(used, target);
      const future = allocate(budget - usedBefore - reserved, weeks.slice(index + 1));
      targets = [...targets.slice(0, index + 1), ...future];
      usedBefore += used;
    }
    return { ...w, original: cents(w.amount), target, used, over, remaining, closed, current };
  });
  const totalUsed = amounts.reduce((sum, amount) => sum + amount, 0);
  return { rows, budget, totalUsed, remaining: Math.max(0, budget - totalUsed), shortfall: Math.max(0, totalUsed - budget) };
}
