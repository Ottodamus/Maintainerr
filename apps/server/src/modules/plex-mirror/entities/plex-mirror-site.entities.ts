import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// A read-mostly mirror target: an independent Plex server at another site
// whose library is a Syncthing-replicated copy of the primary server's
// content. Deliberately has no relation to Collection/RadarrSettings - the
// primary server (via SettingsDataService/MediaServerFactory) stays the only
// server rules evaluate against or *arr actions fire against. Mirror sites
// only need enough to resolve their own local rating key for a title and
// reflect the primary's collection state locally.
@Entity()
export class PlexMirrorSite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  siteName: string;

  @Column()
  url: string;

  @Column()
  token: string;

  @Column()
  librarySectionId: string;
}
