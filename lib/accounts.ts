export const usernamePattern = '[A-Za-z0-9][A-Za-z0-9_\\-]{2,23}';
export const usernameHint = 'Use 3–24 letters, numbers, underscores, or hyphens. Start with a letter or number.';

const validUsername = new RegExp(`^${usernamePattern}$`);

export function normalizeUsername(input: unknown) {
  const value = typeof input === 'string' ? input.trim() : '';
  return validUsername.test(value) ? value.toLowerCase() : null;
}

export function readLoginIdentifier(input: unknown): { kind: 'email' | 'username'; value: string } | null {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!value || value.length > 254) return null;
  if (value.includes('@')) return { kind: 'email', value };

  const username = normalizeUsername(value);
  return username ? { kind: 'username', value: username } : null;
}
