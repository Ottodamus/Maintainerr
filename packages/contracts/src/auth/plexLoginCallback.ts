import z from 'zod'

export const plexLoginCallbackSchema = z.object({
  authToken: z.string().trim().min(1, 'Plex auth token is required'),
})

export type PlexLoginCallbackDto = z.infer<typeof plexLoginCallbackSchema>
