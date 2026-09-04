import type { RenovationContribution, RenovationData, RenovationTask } from './types';

const task = (
  id: string,
  title: string,
  area: string,
  estimatedCost: number,
  scheduledMonth: string,
  sortOrder: number,
): RenovationTask => ({
  id,
  title,
  area,
  estimatedCost,
  scheduledMonth,
  status: 'planning',
  sortOrder,
  pinned: false,
  contingencyPercent: 0,
  depositAmount: 0,
  depositMonth: null,
  dependsOn: null,
  notes: '',
});

export const seedTasks: RenovationTask[] = [
  task('seed-windows-one', 'Windows — phase 1', 'Windows', 1055, '2026-07', 0),
  task('seed-wall-pillar', 'Rebuild wall & pillar', 'Outside', 850, '2026-08', 1),
  task('seed-front-decorating', 'Front room decorating', 'Front room', 300, '2026-08', 2),
  task('seed-front-carpet', 'Front room carpet', 'Front room', 500, '2026-08', 3),
  task('seed-kitchen-tiles', 'Kitchen tiles', 'Kitchen', 200, '2026-08', 4),
  task('seed-windows-final', 'Windows — final payment', 'Windows', 527.5, '2026-08', 5),
  task('seed-back-decorating', 'Back room / kitchen / utility decorating', 'Downstairs', 1500, '2026-09', 6),
  task('seed-labour', 'Warren & Stuart — labour', 'Downstairs', 3800, '2026-09', 7),
  task('seed-bedroom-decorating', 'Decorate bedroom', 'Bedroom', 700, '2026-10', 8),
  task('seed-stained-glass', 'Stained glass window', 'Windows', 1000, '2026-10', 9),
  task('seed-shutters', 'Upstairs shutters', 'Upstairs', 1300, '2026-10', 10),
  task('seed-bedroom-carpet', 'Carpet — 2 bedrooms', 'Bedrooms', 750, '2026-11', 11),
  task('seed-paint-outside', 'Paint outside', 'Outside', 2000, '2027-05', 12),
  task('seed-stairs-carpet', 'Carpet stairs / landing', 'Upstairs', 900, '2027-08', 13),
  task('seed-gate', 'New gate', 'Outside', 750, '2027-08', 14),
  task('seed-loft', 'Loft improvements', 'Loft', 2000, '2027-09', 15),
];

export const monthRange = (start: string, end: string): string[] => {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  const months: string[] = [];
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const last = new Date(Date.UTC(endYear, endMonth - 1, 1));

  while (cursor <= last) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
};

export const makeSeedContributions = (): RenovationContribution[] =>
  monthRange('2026-07', '2028-06').map((month) => {
    const isDecember = month.endsWith('-12');
    const amount = month === '2026-07' ? 1000 : isDecember ? 0 : 1800;
    return {
      id: `seed-contribution-${month}`,
      month,
      amount,
      status: 'planned',
    };
  });

export const seedRenovationData: RenovationData = {
  tasks: seedTasks,
  contributions: makeSeedContributions(),
  settings: {
    safetyBuffer: 2500,
    planStart: '2026-07',
    planEnd: '2028-06',
  },
};
