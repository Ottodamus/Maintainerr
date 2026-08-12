import z from 'zod'
import { serviceUrlSchema } from '../serviceUrl'

export const plexMirrorSiteSettingSchema = z.object({
  siteName: z.string().trim().min(1, 'Site name is required'),
  url: serviceUrlSchema,
  token: z.string().trim().min(1, 'Plex token is required'),
  librarySectionId: z.string().trim().min(1, 'Library section id is required'),
})

export type PlexMirrorSiteSetting = z.infer<typeof plexMirrorSiteSettingSchema>
