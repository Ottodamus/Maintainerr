import { UserRole } from '@maintainerr/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../../test-utils/render'
import InviteUserModal from './InviteUserModal'

const inviteUserMutateAsync = vi.fn()

vi.mock('../../../api/users', () => ({
  useInviteUser: () => ({
    mutateAsync: inviteUserMutateAsync,
    isPending: false,
  }),
}))

describe('InviteUserModal', () => {
  beforeEach(() => {
    inviteUserMutateAsync.mockReset()
  })

  it('keeps the invite action disabled until a username is entered', () => {
    render(<InviteUserModal onInvited={vi.fn()} onCancel={vi.fn()} />)

    expect(
      (screen.getByRole('button', { name: 'Invite' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    fireEvent.change(screen.getByLabelText('Plex Username', { exact: false }), {
      target: { value: 'newuser' },
    })

    expect(
      (screen.getByRole('button', { name: 'Invite' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)
  })

  it('invites with a trimmed username and the selected role', async () => {
    const onInvited = vi.fn()
    inviteUserMutateAsync.mockResolvedValue({
      id: 3,
      plexId: null,
      plexUsername: 'newuser',
      email: null,
      thumb: null,
      role: UserRole.APPROVER,
      allowed: true,
      lastLoginAt: null,
      createdAt: new Date(),
    })

    render(<InviteUserModal onInvited={onInvited} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Plex Username', { exact: false }), {
      target: { value: '  newuser  ' },
    })
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: String(UserRole.APPROVER) },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() => {
      expect(inviteUserMutateAsync).toHaveBeenCalledWith({
        plexUsername: 'newuser',
        role: UserRole.APPROVER,
      })
    })
    expect(onInvited).toHaveBeenCalled()
  })

  it('shows an error instead of closing when the invite fails', async () => {
    inviteUserMutateAsync.mockRejectedValue(
      new Error('This Plex account is not allowed to access Maintainerr.'),
    )
    const onInvited = vi.fn()

    render(<InviteUserModal onInvited={onInvited} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Plex Username', { exact: false }), {
      target: { value: 'someone' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'This Plex account is not allowed to access Maintainerr.',
        ),
      ).toBeTruthy()
    })
    expect(onInvited).not.toHaveBeenCalled()
  })
})
