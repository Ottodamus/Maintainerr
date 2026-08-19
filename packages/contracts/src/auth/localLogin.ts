import z from 'zod'

export const localLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export type LocalLoginDto = z.infer<typeof localLoginSchema>
