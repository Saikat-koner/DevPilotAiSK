import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

test('security fixture contains a detectable SQL interpolation vulnerability', async () => {
  const sourcePath = fileURLToPath(new URL('./query.js', import.meta.url));
  const source = await readFile(sourcePath, 'utf8');
  assert.match(source, /\$\{\s*userInput\s*\}/, 'expected planted untrusted interpolation');
  assert.match(source, /SELECT\s+\*\s+FROM\s+users/i);
});
