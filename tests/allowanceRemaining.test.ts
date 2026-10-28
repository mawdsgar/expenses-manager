import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowanceRemaining } from '../src/utils/allowanceRemaining.ts';
test('left to go out includes each unpaid allowance once', () => {
  assert.equal(4738.92 + allowanceRemaining(650, 150) + allowanceRemaining(650, 0) + allowanceRemaining(2100, 490), 7498.92);
});
test('overpaid allowances cannot offset outstanding bills or another allowance', () => {
  assert.equal(allowanceRemaining(650, 700), 0);
  assert.equal(allowanceRemaining(2100, 2200), 0);
});
test('penny arithmetic and fully paid allowances', () => {
  assert.equal(allowanceRemaining(650.25, 150.15), 500.1);
  assert.equal(allowanceRemaining(650, 650), 0);
});
