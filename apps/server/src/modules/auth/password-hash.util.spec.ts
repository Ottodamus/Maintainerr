import { hashPassword, verifyPassword } from './password-hash.util';

describe('password-hash.util', () => {
  it('verifies a password against its own hash', () => {
    const hash = hashPassword('correct horse battery staple');

    expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rejects the wrong password', () => {
    const hash = hashPassword('correct horse battery staple');

    expect(verifyPassword('wrong password', hash)).toBe(false);
  });

  it('salts each hash differently, even for the same password', () => {
    const first = hashPassword('same password');
    const second = hashPassword('same password');

    expect(first).not.toBe(second);
    expect(verifyPassword('same password', first)).toBe(true);
    expect(verifyPassword('same password', second)).toBe(true);
  });

  it('rejects a malformed stored hash instead of throwing', () => {
    expect(verifyPassword('anything', 'not-a-real-hash')).toBe(false);
    expect(verifyPassword('anything', '')).toBe(false);
  });
});
