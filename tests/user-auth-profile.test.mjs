import assert from 'node:assert/strict';

const {
  formatUserLabel,
  mapAuthUserToProfileRow,
  resolveAuthReturnTo,
} = await import('../lib/auth/profile.ts');
const {
  applySupabaseAuthCookieExpiryToResponse,
  applySupabaseSetAllToResponse,
  getSupabaseAuthCookieNamesFromNames,
} = await import('../lib/auth/response.ts');

assert.equal(resolveAuthReturnTo('http://localhost:3000', '/experts'), '/experts');
assert.equal(resolveAuthReturnTo('http://localhost:3000', 'http://localhost:3000/result'), '/result');
assert.equal(resolveAuthReturnTo('http://localhost:3000', 'https://evil.example/phish'), '/');
assert.equal(resolveAuthReturnTo('http://localhost:3000', 'javascript:alert(1)'), '/');

const row = mapAuthUserToProfileRow({
  id: 'user-1',
  email: 'person@example.com',
  user_metadata: {
    full_name: '홍길동',
    avatar_url: 'https://example.com/avatar.png',
  },
});

assert.deepEqual(row, {
  id: 'user-1',
  role: 'user',
  display_name: '홍길동',
  email: 'person@example.com',
  avatar_url: 'https://example.com/avatar.png',
});

assert.equal(formatUserLabel({ display_name: '홍길동', email: 'person@example.com' }), '홍길동');
assert.equal(formatUserLabel({ display_name: null, email: 'person@example.com' }), 'person');
assert.equal(formatUserLabel({ display_name: null, email: null }), '계정');

const setCookies = [];
const response = {
  headers: new Headers(),
  cookies: {
    set: (name, value, options) => setCookies.push({ name, value, options }),
  },
};

applySupabaseSetAllToResponse(
  response,
  [{ name: 'sb-test-auth-token', value: 'token-value', options: { path: '/', maxAge: 3600 } }],
  {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
    Expires: '0',
    Pragma: 'no-cache',
  },
);

assert.deepEqual(setCookies, [
  { name: 'sb-test-auth-token', value: 'token-value', options: { path: '/', maxAge: 3600 } },
]);
assert.equal(response.headers.get('Cache-Control'), 'private, no-cache, no-store, must-revalidate, max-age=0');
assert.equal(response.headers.get('Expires'), '0');
assert.equal(response.headers.get('Pragma'), 'no-cache');

assert.deepEqual(
  getSupabaseAuthCookieNamesFromNames('sb-project-auth-token', [
    'sb-project-auth-token',
    'sb-project-auth-token.0',
    'sb-project-auth-token.1',
    'sb-project-auth-token-code-verifier',
    'unrelated',
  ]),
  [
    'sb-project-auth-token',
    'sb-project-auth-token.0',
    'sb-project-auth-token.1',
    'sb-project-auth-token-code-verifier',
  ],
);

const expiredCookies = [];
applySupabaseAuthCookieExpiryToResponse(
  {
    headers: new Headers(),
    cookies: {
      set: (name, value, options) => expiredCookies.push({ name, value, options }),
    },
  },
  ['sb-project-auth-token', 'sb-project-auth-token.0'],
);

assert.deepEqual(expiredCookies, [
  {
    name: 'sb-project-auth-token',
    value: '',
    options: { path: '/', sameSite: 'lax', maxAge: 0 },
  },
  {
    name: 'sb-project-auth-token.0',
    value: '',
    options: { path: '/', sameSite: 'lax', maxAge: 0 },
  },
]);

const proxySource = await import('node:fs').then(({ readFileSync }) =>
  readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8'),
);
assert.match(proxySource, /matcher:\s*\[[^\]]*['"`]\/['"`]/s);
assert.match(proxySource, /req\.cookies\.set/);
assert.match(proxySource, /applySupabaseAuthCookieExpiryToResponse/);
assert.match(proxySource, /const isAdminPage = path\.startsWith\('\/admin'\)/);
assert.match(proxySource, /const isAdminApi = path\.startsWith\('\/api\/admin'\)/);
assert.match(proxySource, /if \(!user && !isLoginPage && !isAuthApi && \(isAdminPage \|\| isAdminApi\)\)/);
