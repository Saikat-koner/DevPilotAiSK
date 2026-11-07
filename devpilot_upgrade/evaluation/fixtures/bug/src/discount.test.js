import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscount } from './discount.js';
test('20 percent discount on 100 is 80', () => assert.equal(applyDiscount(100, 0.2), 80));
