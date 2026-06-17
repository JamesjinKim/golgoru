import assert from 'node:assert/strict';

const {
  formatUserLabel,
  mapAuthUserToProfileRow,
  resolveAuthReturnTo,
} = await import('../lib/auth/profile.ts');

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
