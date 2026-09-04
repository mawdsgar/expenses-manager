import { monthRange } from './seed';
import type {
  ForecastMonth,
  RenovationContribution,
  RenovationSettings,
  RenovationTask,
} from './types';

export const taskTotal = (task: RenovationTask) =>
  task.estimatedCost * (1 + task.contingencyPercent / 100);

export const compareTasksByTimeline = (a: RenovationTask, b: RenovationTask) =>
  a.scheduledMonth.localeCompare(b.scheduledMonth) ||
  a.sortOrder - b.sortOrder ||
  a.id.localeCompare(b.id);

const paymentInMonth = (task: RenovationTask, month: string) => {
  if (task.status === 'complete') return 0;
  const total = taskTotal(task);
  const validDeposit = Math.max(0, Math.min(task.depositAmount, total));
  let payment = 0;
  if (task.depositMonth === month) payment += validDeposit;
  if (task.scheduledMonth === month) {
    payment += task.depositMonth ? total - validDeposit : total;
  }
  return payment;
};

export const buildForecast = (
  currentSavings: number,
  tasks: RenovationTask[],
  contributions: RenovationContribution[],
  settings: RenovationSettings,
): ForecastMonth[] => {
  let balance = currentSavings;
  return monthRange(settings.planStart, settings.planEnd).map((month) => {
    const contribution = contributions
      .filter((item) => item.month === month && item.status === 'planned')
      .reduce((sum, item) => sum + item.amount, 0);
    const monthTasks = tasks
      .filter((item) => item.scheduledMonth === month)
      .sort(compareTasksByTimeline);
    const spending = tasks.reduce((sum, item) => sum + paymentInMonth(item, month), 0);
    balance += contribution - spending;
    return { month, contribution, spending, endingBalance: balance, tasks: monthTasks };
  });
};

export const lowestForecast = (forecast: ForecastMonth[], currentSavings: number) =>
  forecast.length ? Math.min(currentSavings, ...forecast.map((item) => item.endingBalance)) : currentSavings;

export const rebuildTimelineFromOrder = (
  tasks: RenovationTask[],
  settings: RenovationSettings,
) => {
  const ordered = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  const remaining = ordered.filter((task) => task.status !== 'complete');
  let placed = remaining.filter((task) => task.pinned);

  for (const task of remaining.filter((item) => !item.pinned)) {
    let scheduledTask: RenovationTask | null = null;
    for (const month of monthRange(settings.planStart, settings.planEnd)) {
      const dependency = task.dependsOn
        ? placed.find((item) => item.id === task.dependsOn) ??
          remaining.find((item) => item.id === task.dependsOn)
        : null;
      if (dependency && dependency.scheduledMonth > month) continue;

      const candidateTask = { ...task, scheduledMonth: month };
      scheduledTask = candidateTask;
      break;
    }
    placed = [...placed, scheduledTask ?? task];
  }

  const placedById = new Map(placed.map((task) => [task.id, task]));
  return ordered.map((task) =>
    task.status === 'complete' ? task : (placedById.get(task.id) ?? task),
  );
};

export const formatMonth = (month: string, compact = false) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    month: compact ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};
