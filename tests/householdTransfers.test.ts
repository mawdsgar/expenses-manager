import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateHouseholdTransfers, type HouseholdWeek } from '../src/utils/householdTransfers.ts';

const weeks: HouseholdWeek[] = [
  ['2026-10-28', '2026-11-03', 490], ['2026-11-04', '2026-11-10', 490],
  ['2026-11-11', '2026-11-17', 490], ['2026-11-18', '2026-11-24', 490],
  ['2026-11-25', '2026-11-26', 140],
].map(([start, end, amount], index) => ({ week: index + 1, start: new Date(`${start}T00:00:00`), end: new Date(`${end}T00:00:00`), amount: Number(amount) }));
const transfer = (amount: number, date = '2026-10-28') => ({ id: `${amount}-${date}`, transferred_on: date, amount });

test('unchanged weekly amounts with no current transfers', () => {
  const result = calculateHouseholdTransfers(weeks, [], '2026-10-28');
  assert.deepEqual(result.rows.map(w => w.target), [49000, 49000, 49000, 49000, 14000]);
  assert.equal(result.remaining, 210000);
});
test('multiple transfers overspend immediately reduces future weeks by day weight', () => {
  const result = calculateHouseholdTransfers(weeks, [transfer(490), transfer(100)], '2026-10-28');
  assert.equal(result.rows[0].over, 10000);
  assert.deepEqual(result.rows.slice(1).map(w => w.target), [45957, 45957, 45957, 13129]);
  assert.equal(result.totalUsed + result.rows.slice(1).reduce((sum, w) => sum + w.target, 0), result.budget);
});
test('underspend is held during the week then carried forward when the week closes', () => {
  assert.equal(calculateHouseholdTransfers(weeks, [transfer(400)], '2026-11-03').rows[1].target, 49000);
  const result = calculateHouseholdTransfers(weeks, [transfer(400)], '2026-11-04');
  assert.deepEqual(result.rows.slice(1).map(w => w.target), [51739, 51739, 51739, 14783]);
  assert.equal(result.totalUsed + result.rows.slice(1).reduce((sum, w) => sum + w.target, 0), result.budget);
});
test('a transfer on a week boundary belongs only to the new week', () => {
  const result = calculateHouseholdTransfers(weeks, [transfer(490), transfer(500, '2026-11-04')], '2026-11-04');
  assert.deepEqual(result.rows.slice(0, 2).map(w => w.used), [49000, 50000]);
  assert.equal(result.rows[1].over, 1000);
});
test('monthly excess leaves no negative future allowances', () => {
  const result = calculateHouseholdTransfers(weeks, [transfer(2200)], '2026-10-28');
  assert.equal(result.shortfall, 10000);
  assert.deepEqual(result.rows.slice(1).map(w => w.target), [0, 0, 0, 0]);
});
test('removing a transfer restores the original projection', () => {
  const result = calculateHouseholdTransfers(weeks, [], '2026-10-28');
  assert.equal(result.rows[0].over, 0);
  assert.equal(result.rows[1].target, 49000);
});
test('out-of-period records are excluded from totals', () => {
  assert.equal(calculateHouseholdTransfers(weeks, [transfer(200, '2026-11-27')], '2026-10-28').totalUsed, 0);
});
