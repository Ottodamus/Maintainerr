import { UserRole } from '@maintainerr/contracts'

export const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.APPROVER]: 'Approver',
  [UserRole.VIEWER]: 'Viewer',
}
