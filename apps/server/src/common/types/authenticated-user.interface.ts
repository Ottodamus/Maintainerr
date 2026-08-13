import { UserRole } from '@maintainerr/contracts';

export interface AuthenticatedUser {
  id: number;
  role: UserRole;
}
