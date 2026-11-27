import type { Expense } from '../types/expense';
import { addMonthsClamped, toDateKey } from './payday';

/** Return the next scheduled date for a recurring expense without month-end overflow. */
export const advanceExpenseDueDate = (expense: Expense) => {
  const nextDate = new Date(`${expense.dueDate}T00:00:00`);
  if (expense.frequency === 'One-time') return expense.dueDate;

  if (expense.frequency === 'Weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (expense.frequency === 'Monthly') {
    return toDateKey(addMonthsClamped(nextDate, 1));
  } else if (expense.frequency === 'Yearly') {
    return toDateKey(addMonthsClamped(nextDate, 12));
  } else if (expense.frequency === 'Custom') {
    const interval = Math.max(1, Math.floor(Number(expense.intervalCount) || 1));
    if (expense.intervalUnit === 'Months') return toDateKey(addMonthsClamped(nextDate, interval));
    nextDate.setDate(nextDate.getDate() + 7 * interval);
  }

  return toDateKey(nextDate);
};
