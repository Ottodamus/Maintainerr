import { UserRole } from '@maintainerr/contracts';
import { User } from './entities/user.entities';
import { toUserDto } from './user.mapper';

describe('toUserDto', () => {
  it('never includes passwordHash, even when the entity carries one', () => {
    const user = {
      id: 9,
      plexId: null,
      plexUsername: 'recovery',
      email: null,
      thumb: null,
      role: UserRole.ADMIN,
      allowed: true,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: 'salt:hash',
    } as User;

    const dto = toUserDto(user);

    expect(dto).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(dto)).not.toContain('passwordHash');
    expect(dto).toEqual({
      id: 9,
      plexId: null,
      plexUsername: 'recovery',
      email: null,
      thumb: null,
      role: UserRole.ADMIN,
      allowed: true,
      lastLoginAt: null,
      createdAt: user.createdAt,
    });
  });
});
