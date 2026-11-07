import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from './math.js';
test('add preserves existing arithmetic behavior', () => assert.equal(add(2, 3), 5));
