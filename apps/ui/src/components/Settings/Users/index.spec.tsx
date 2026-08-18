import { UserDto, UserRole } from '@maintainerr/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../../test-utils/render'
import UsersSettings from './index'

const updateUserMutateAsync = vi.fn()
const showError = vi.fn()
const clear = vi.fn()

let currentUser: UserDto | undefined
let users: UserDto[]

const admin: UserDto = {
  id: 1,
  plexId: '111',
  plexUsername: 'admin-user',
  email: 'admin@example.com',
  thumb: null,
  role: UserRole.ADMIN,
  allowed: true,
  lastLoginAt: new Date('2026-08-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const invitedApprover: UserDto = {
  id: 2,
  plexId: null,
  plexUsername: 'approver-user',
  email: null,
  thumb: null,
  role: UserRole.APPROVER,
  allowed: true,
  lastLoginAt: null,
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
}

vi.mock('../../../api/auth', () => ({
  useCurrentUser: () => ({ data: currentUser, isLoading: false }),
}))

vi.mock('../../../api/users', () => ({
  useUsers: () => ({ data: users, isLoading: false }),
  useUpdateUser: () => ({
    mutateAsync: updateUserMutateAsync,
    isPending: false,
  }),
}))

vi.mock('../useSettingsFeedback', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../useSettingsFeedback')>()
  return {
    ...actual,
    useSettingsFeedback: () => ({
      feedback: null,
      clear,
      showError,
    }),
  }
})

vi.mock('./InviteUserModal', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div>
      <p>Invite modal</p>
      <button type="button" onClick={onCancel}>
        Close invite modal
      </button>
    </div>
  ),
}))

describe('UsersSettings', () => {
  beforeEach(() => {
    updateUserMutateAsync.mockReset()
    showError.mockReset()
    clear.mockReset()
    currentUser = admin
    users = [admin, invitedApprover]
  })

  it('tells a signed-out visitor to sign in', () => {
    currentUser = undefined

    render(<UsersSettings />)

    expect(
      screen.getByText('Sign in as an admin to manage users.'),
    ).toBeTruthy()
  })

  it('tells a non-admin they cannot manage users', () => {
    currentUser = { ...admin, id: 2, role: UserRole.VIEWER }

    render(<UsersSettings />)

    expect(screen.getByText('Only admins can manage users.')).toBeTruthy()
  })

  it('lists users and marks the current user and pending invites', () => {
    render(<UsersSettings />)

    expect(screen.getByText('admin-user')).toBeTruthy()
    expect(screen.getByText('approver-user')).toBeTruthy()
    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.getByText('Pending invite')).toBeTruthy()
  })

  it("disables the current user's own role and access controls", () => {
    render(<UsersSettings />)

    const rows = screen.getAllByRole('row')
    const ownRow = rows.find((row) => row.textContent?.includes('admin-user'))
    expect(ownRow).toBeDefined()

    const select = ownRow!.querySelector('select')
    const checkbox = ownRow!.querySelector('input[type="checkbox"]')
    expect(select?.disabled).toBe(true)
    expect((checkbox as HTMLInputElement | null)?.disabled).toBe(true)
  })

  it('updates a role when a non-self row is changed', async () => {
    updateUserMutateAsync.mockResolvedValue({
      ...invitedApprover,
      role: UserRole.VIEWER,
    })

    render(<UsersSettings />)

    const rows = screen.getAllByRole('row')
    const targetRow = rows.find((row) =>
      row.textContent?.includes('approver-user'),
    )
    const select = targetRow!.querySelector('select')!

    fireEvent.change(select, { target: { value: String(UserRole.VIEWER) } })

    await waitFor(() => {
      expect(updateUserMutateAsync).toHaveBeenCalledWith({
        id: invitedApprover.id,
        body: { role: UserRole.VIEWER },
      })
    })
  })

  it('revokes access when the allowed checkbox is unchecked', async () => {
    updateUserMutateAsync.mockResolvedValue({
      ...invitedApprover,
      allowed: false,
    })

    render(<UsersSettings />)

    const rows = screen.getAllByRole('row')
    const targetRow = rows.find((row) =>
      row.textContent?.includes('approver-user'),
    )
    const checkbox = targetRow!.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement

    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(updateUserMutateAsync).toHaveBeenCalledWith({
        id: invitedApprover.id,
        body: { allowed: false },
      })
    })
  })

  it('surfaces a failed update instead of silently doing nothing', async () => {
    updateUserMutateAsync.mockRejectedValue(new Error('nope'))

    render(<UsersSettings />)

    const rows = screen.getAllByRole('row')
    const targetRow = rows.find((row) =>
      row.textContent?.includes('approver-user'),
    )
    const select = targetRow!.querySelector('select')!

    fireEvent.change(select, { target: { value: String(UserRole.VIEWER) } })

    await waitFor(() => {
      expect(showError).toHaveBeenCalled()
    })
  })

  it('opens and closes the invite modal', () => {
    render(<UsersSettings />)

    fireEvent.click(screen.getByRole('button', { name: 'Invite User' }))
    expect(screen.getByText('Invite modal')).toBeTruthy()

    fireEvent.click(screen.getByText('Close invite modal'))
    expect(screen.queryByText('Invite modal')).toBeNull()
  })
})
