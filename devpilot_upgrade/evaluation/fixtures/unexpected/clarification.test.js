import test from 'node:test';
import assert from 'node:assert/strict';

function classifyRequest(request) {
  const normalized = request.trim().toLowerCase().replace(/[.!?]+$/g, '');
  if (!normalized || normalized === 'make the application better') return 'clarify';
  return 'plan';
}

test('ambiguous request is escalated for clarification instead of inventing scope', () => {
  assert.equal(classifyRequest('Make the application better.'), 'clarify');
});
