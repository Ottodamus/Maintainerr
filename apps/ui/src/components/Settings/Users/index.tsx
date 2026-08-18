import { UserDto, UserRole } from '@maintainerr/contracts'
import { useState } from 'react'
import { useCurrentUser } from '../../../api/auth'
import { useUpdateUser, useUsers } from '../../../api/users'
import { getApiErrorMessage } from '../../../utils/ApiError'
import Badge from '../../Common/Badge'
import Button from '../../Common/Button'
import LoadingSpinner from '../../Common/LoadingSpinner'
import Table from '../../Common/Table'
import { Select } from '../../Forms/Select'
import {
  SettingsFeedbackAlert,
  useSettingsFeedback,
} from '../useSettingsFeedback'
import InviteUserModal from './InviteUserModal'
import { roleLabels } from './roleLabels'

const formatLastLogin = (lastLoginAt: Date | string | null) => {
  if (!lastLoginAt) {
    return 'Never'
  }

  return new Date(lastLoginAt).toLocaleString()
}

const UsersSettings = () => {
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentUser()
  const isAdmin = currentUser?.role === UserRole.ADMIN
  const { data: users, isLoading: isUsersLoading } = useUsers({
    enabled: isAdmin,
  })
  const updateUser = useUpdateUser()
  const { feedback, clear, showError } = useSettingsFeedback()
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [pendingRowId, setPendingRowId] = useState<number | null>(null)

  const handleRoleChange = async (user: UserDto, role: UserRole) => {
    clear()
    setPendingRowId(user.id)

    try {
      await updateUser.mutateAsync({ id: user.id, body: { role } })
    } catch (error: unknown) {
      showError(
        getApiErrorMessage(
          error,
          `Failed to update ${user.plexUsername}'s role.`,
        ),
      )
    } finally {
      setPendingRowId(null)
    }
  }

  const handleAllowedChange = async (user: UserDto, allowed: boolean) => {
    clear()
    setPendingRowId(user.id)

    try {
      await updateUser.mutateAsync({ id: user.id, body: { allowed } })
    } catch (error: unknown) {
      showError(
        getApiErrorMessage(
          error,
          `Failed to update ${user.plexUsername}'s access.`,
        ),
      )
    } finally {
      setPendingRowId(null)
    }
  }

  if (isCurrentUserLoading) {
    return <LoadingSpinner />
  }

  if (!currentUser) {
    return (
      <>
        <title>Users - Maintainerr</title>
        <div className="section">
          <h3 className="heading">Users</h3>
          <p className="description">Sign in as an admin to manage users.</p>
        </div>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <title>Users - Maintainerr</title>
        <div className="section">
          <h3 className="heading">Users</h3>
          <p className="description">Only admins can manage users.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <title>Users - Maintainerr</title>
      <div className="h-full w-full">
        <div className="section flex items-start justify-between gap-4">
          <div>
            <h3 className="heading">Users</h3>
            <p className="description">
              People allowed to sign in with Plex. Approvers can vote on pending
              deletions; only admins can invite or manage other users.
            </p>
          </div>
          <Button
            buttonType="primary"
            buttonSize="md"
            className="shrink-0"
            onClick={() => {
              clear()
              setInviteModalOpen(true)
            }}
          >
            Invite User
          </Button>
        </div>

        <SettingsFeedbackAlert feedback={feedback} />

        {isUsersLoading ? (
          <LoadingSpinner />
        ) : (
          <Table>
            <thead>
              <tr>
                <Table.TH>Plex Username</Table.TH>
                <Table.TH>Email</Table.TH>
                <Table.TH>Role</Table.TH>
                <Table.TH>Access</Table.TH>
                <Table.TH>Last Login</Table.TH>
              </tr>
            </thead>
            <Table.TBody>
              {(users ?? []).map((user) => {
                const isSelf = user.id === currentUser.id
                const isRowPending =
                  updateUser.isPending && pendingRowId === user.id

                return (
                  <tr key={user.id}>
                    <Table.TD>
                      {user.plexUsername}
                      {isSelf ? (
                        <Badge badgeType="dark" className="ml-2">
                          You
                        </Badge>
                      ) : null}
                      {!user.plexId ? (
                        <Badge badgeType="warning" className="ml-2">
                          Pending invite
                        </Badge>
                      ) : null}
                    </Table.TD>
                    <Table.TD className="text-gray-300">
                      {user.email ?? '-'}
                    </Table.TD>
                    <Table.TD>
                      <Select
                        value={user.role}
                        disabled={isSelf || isRowPending}
                        onChange={(event) =>
                          void handleRoleChange(
                            user,
                            Number(event.target.value),
                          )
                        }
                      >
                        <option value={UserRole.ADMIN}>
                          {roleLabels[UserRole.ADMIN]}
                        </option>
                        <option value={UserRole.APPROVER}>
                          {roleLabels[UserRole.APPROVER]}
                        </option>
                        <option value={UserRole.VIEWER}>
                          {roleLabels[UserRole.VIEWER]}
                        </option>
                      </Select>
                    </Table.TD>
                    <Table.TD>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={user.allowed}
                        disabled={isSelf || isRowPending}
                        onChange={(event) =>
                          void handleAllowedChange(user, event.target.checked)
                        }
                      />
                    </Table.TD>
                    <Table.TD className="text-gray-300">
                      {formatLastLogin(user.lastLoginAt)}
                    </Table.TD>
                  </tr>
                )
              })}
            </Table.TBody>
          </Table>
        )}
      </div>

      {inviteModalOpen ? (
        <InviteUserModal
          onInvited={() => setInviteModalOpen(false)}
          onCancel={() => setInviteModalOpen(false)}
        />
      ) : null}
    </>
  )
}

export default UsersSettings
