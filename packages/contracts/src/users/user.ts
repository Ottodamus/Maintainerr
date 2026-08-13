import z from 'zod'
import { UserRole } from './userRole'

export interface UserDto {
  id: number
  plexId: string | null
  plexUsername: string
  email: string | null
  thumb: string | null
  role: UserRole
  allowed: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

export const inviteUserSchema = z.object({
  plexUsername: z.string().trim().min(1, 'Plex username is required'),
  role: z.enum(UserRole),
})

export type InviteUserDto = z.infer<typeof inviteUserSchema>

export const updateUserSchema = z.object({
  role: z.enum(UserRole).optional(),
  allowed: z.boolean().optional(),
})

export type UpdateUserDto = z.infer<typeof updateUserSchema>
