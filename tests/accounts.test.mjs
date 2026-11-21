import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeUsername, readLoginIdentifier } from '../lib/accounts.ts';

test('usernames are case-insensitive and use only supported characters', () => {
  assert.equal(normalizeUsername('  Alex-Weed_2  '), 'alex-weed_2');
  for (const value of ['ab', '_alex', 'alex weed', 'alex@example.test', 'a'.repeat(25), 'Ａlex', null]) {
    assert.equal(normalizeUsername(value), null, JSON.stringify(value));
  }
});

test('sign-in separates email addresses from normalized usernames', () => {
  assert.deepEqual(readLoginIdentifier(' Alex@example.test '), { kind: 'email', value: 'Alex@example.test' });
  assert.deepEqual(readLoginIdentifier(' Alex_123 '), { kind: 'username', value: 'alex_123' });
  assert.equal(readLoginIdentifier('bad username'), null);
});
