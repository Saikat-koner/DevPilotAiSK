import test from 'node:test';
import assert from 'node:assert/strict';
import { formatName } from './format.js';
test('formats a full name', () => assert.equal(formatName('Ada', 'Lovelace'), 'Ada Lovelace'));
