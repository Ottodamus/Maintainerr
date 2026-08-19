import { UserDto, UserRole } from '@maintainerr/contracts';
import { User } from './entities/user.entities';

// passwordHash must never reach a client - it's only ever set on the
// break-glass account, but every response that serializes a User has to go
// through here rather than risk a raw entity (and whatever it's carrying)
// getting JSON-serialized as-is.
export const toUserDto = (user: User): UserDto => ({
  id: user.id,
  plexId: user.plexId,
  plexUsername: user.plexUsername,
  email: user.email,
  thumb: user.thumb,
  role: user.role as UserRole,
  allowed: user.allowed,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});
