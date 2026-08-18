import { InviteUserDto, UserDto, UserRole } from '@maintainerr/contracts'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useInviteUser } from '../../../api/users'
import { getApiErrorMessage } from '../../../utils/ApiError'
import Alert from '../../Common/Alert'
import Modal from '../../Common/Modal'
import SaveButton from '../../Common/SaveButton'
import { Input } from '../../Forms/Input'
import { Select } from '../../Forms/Select'
import SettingsAlertSlot from '../SettingsAlertSlot'
import { roleLabels } from './roleLabels'

const emptyState: InviteUserDto = {
  plexUsername: '',
  role: UserRole.VIEWER,
}

interface InviteUserModalProps {
  onInvited: (user: UserDto) => void
  onCancel: () => void
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({
  onInvited,
  onCancel,
}) => {
  const [errorMessage, setErrorMessage] = useState<string>()
  const inviteUser = useInviteUser()

  const { register, handleSubmit, control } = useForm<InviteUserDto>({
    defaultValues: emptyState,
  })

  const plexUsername = useWatch({ control, name: 'plexUsername' }) ?? ''
  const canSave = !inviteUser.isPending && plexUsername.trim() !== ''

  const submit = async (values: InviteUserDto) => {
    setErrorMessage(undefined)

    try {
      const user = await inviteUser.mutateAsync({
        plexUsername: values.plexUsername.trim(),
        role: Number(values.role),
      })
      onInvited(user)
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Failed to invite user.'))
    }
  }

  return (
    <Modal
      loading={false}
      backgroundClickable={false}
      onCancel={onCancel}
      title="Invite User"
      iconSvg=""
      footerActions={
        <SaveButton
          className="ml-3"
          type="button"
          label="Invite"
          pendingLabel="Inviting..."
          disabled={!canSave}
          isPending={inviteUser.isPending}
          onClick={() => void handleSubmit(submit)()}
        />
      }
    >
      <SettingsAlertSlot>
        {errorMessage ? <Alert type="warning" title={errorMessage} /> : null}
      </SettingsAlertSlot>

      <div className="form-row">
        <label htmlFor="plexUsername" className="text-label">
          Plex Username
          <span className="label-tip">
            Must match their Plex account username exactly. They can sign in
            with Plex once invited.
          </span>
        </label>
        <div className="form-input">
          <div className="form-input-field">
            <Input
              id="plexUsername"
              type="text"
              {...register('plexUsername', {
                onChange: () => setErrorMessage(undefined),
              })}
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="role" className="text-label">
          Role
        </label>
        <div className="form-input">
          <div className="form-input-field">
            <Select id="role" {...register('role', { valueAsNumber: true })}>
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
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default InviteUserModal
