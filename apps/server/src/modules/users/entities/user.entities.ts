import { UserRole } from '@maintainerr/contracts';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // Null until the invited person completes Plex login for the first time.
  // SQLite treats NULL as distinct from every other value in a UNIQUE index,
  // so multiple not-yet-claimed invites can coexist without a partial index.
  @Index({ unique: true })
  @Column({ nullable: true })
  plexId: string | null;

  // Lowercased invite/match key. Set by an admin on invite, backfilled from
  // the live Plex account on first login if it has since changed.
  @Index({ unique: true })
  @Column()
  plexUsername: string;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  thumb: string | null;

  @Column({ default: UserRole.VIEWER })
  role: number;

  @Column({ default: false })
  allowed: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // Only ever set on the single break-glass admin account, upserted from
  // BREAK_GLASS_USERNAME/BREAK_GLASS_PASSWORD at startup - never set for a
  // Plex-invited user. Its presence is what excludes a row from the
  // Plex-claim path (claimOrCreateOnLogin) and from the first-login
  // bootstrap count, so a Plex account can never take over this row by
  // username collision.
  @Column({ nullable: true })
  passwordHash: string | null;
}
