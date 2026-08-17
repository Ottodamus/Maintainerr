import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { PostApiHandler, PutApiHandler } from '../../../utils/ApiHandler'
import Alert from '../../Common/Alert'
import Modal from '../../Common/Modal'
import SaveButton from '../../Common/SaveButton'
import TestingButton, { getTestingButtonType } from '../../Common/TestingButton'
import { Input } from '../../Forms/Input'
import SettingsAlertSlot from '../SettingsAlertSlot'
import { IPlexMirrorSite } from './index'

interface PlexMirrorFormState {
  siteName: string
  url: string
  token: string
  librarySectionId: string
}

interface SaveResponse {
  status: 'OK' | 'NOK'
  code: 0 | 1
  message: string
  data?: IPlexMirrorSite
}

interface TestResponse {
  status: 'OK' | 'NOK'
  code: 0 | 1
  message: string
}

const emptyState: PlexMirrorFormState = {
  siteName: '',
  url: '',
  token: '',
  librarySectionId: '',
}

const buildInitialState = (settings?: IPlexMirrorSite): PlexMirrorFormState =>
  settings
    ? {
        siteName: settings.siteName,
        url: settings.url,
        token: settings.token,
        librarySectionId: settings.librarySectionId,
      }
    : emptyState

const hasAllRequiredFields = (state: PlexMirrorFormState) =>
  state.siteName !== '' &&
  state.url !== '' &&
  state.token !== '' &&
  state.librarySectionId !== ''

interface PlexMirrorSiteModalProps {
  settings?: IPlexMirrorSite
  onUpdate: (setting: IPlexMirrorSite) => void
  onCancel: () => void
}

const PlexMirrorSiteModal: React.FC<PlexMirrorSiteModalProps> = ({
  settings,
  onUpdate,
  onCancel,
}) => {
  const initialState = useMemo(() => buildInitialState(settings), [settings])
  const [errorMessage, setErrorMessage] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    status: boolean
    message: string
  }>()

  const { register, handleSubmit, control, getValues } =
    useForm<PlexMirrorFormState>({
      defaultValues: initialState,
      values: initialState,
    })

  const siteName = useWatch({ control, name: 'siteName' }) ?? ''
  const url = useWatch({ control, name: 'url' }) ?? ''
  const token = useWatch({ control, name: 'token' }) ?? ''
  const librarySectionId = useWatch({ control, name: 'librarySectionId' }) ?? ''

  const currentState = { siteName, url, token, librarySectionId }
  const canSave = !saving && hasAllRequiredFields(currentState)

  const clearFeedback = () => {
    setErrorMessage(undefined)
    setTestResult(undefined)
  }

  const saveSettings = async (values: PlexMirrorFormState) => {
    clearFeedback()

    if (!hasAllRequiredFields(values)) {
      setErrorMessage('Please fill in all fields.')
      return
    }

    const endpoint = settings?.id
      ? `/settings/plex-mirror/${settings.id}`
      : '/settings/plex-mirror'
    const handler = settings?.id ? PutApiHandler : PostApiHandler

    setSaving(true)

    try {
      const response = await handler<SaveResponse>(endpoint, values)

      if (response.code === 1 && response.data) {
        onUpdate(response.data)
      } else {
        setErrorMessage('Failed to save mirror site.')
      }
    } catch {
      setErrorMessage('Failed to save mirror site.')
    } finally {
      setSaving(false)
    }
  }

  const performTest = async () => {
    if (testing) {
      return
    }

    const values = getValues()
    setTesting(true)

    try {
      const response = await PostApiHandler<TestResponse>(
        '/settings/plex-mirror/test',
        { url: values.url, token: values.token },
      )
      setTestResult({
        status: response.code === 1,
        message: response.message,
      })
    } catch {
      setTestResult({
        status: false,
        message: 'Failed to connect to the mirror site.',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal
      loading={false}
      backgroundClickable={false}
      onCancel={onCancel}
      title="Plex Mirror Site"
      iconSvg=""
      footerActions={
        <>
          <SaveButton
            className="ml-3"
            type="button"
            disabled={!canSave}
            isPending={saving}
            onClick={() => void handleSubmit(saveSettings)()}
          />
          <TestingButton
            buttonType={getTestingButtonType(
              'success',
              testResult?.status,
              testing,
            )}
            className="ml-3"
            type="button"
            onClick={() => void performTest()}
            disabled={testing || url === '' || token === ''}
            label="Test Connection"
            isPending={testing}
            feedbackStatus={testResult?.status}
          />
        </>
      }
    >
      <SettingsAlertSlot>
        {errorMessage || testResult ? (
          <div className="space-y-4">
            {errorMessage ? (
              <Alert type="warning" title={errorMessage} />
            ) : null}
            {testResult ? (
              <Alert
                type={testResult.status ? 'success' : 'error'}
                title={
                  testResult.status
                    ? 'Successfully connected to the mirror site'
                    : testResult.message || 'Failed to connect'
                }
              />
            ) : null}
          </div>
        ) : null}
      </SettingsAlertSlot>

      <div className="form-row">
        <label htmlFor="siteName" className="text-label">
          Site Name
        </label>
        <div className="form-input">
          <div className="form-input-field">
            <Input
              id="siteName"
              type="text"
              {...register('siteName', { onChange: clearFeedback })}
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="url" className="text-label">
          URL
          <span className="label-tip">e.g. http://10.0.0.5:32400</span>
        </label>
        <div className="form-input">
          <div className="form-input-field">
            <Input
              id="url"
              type="text"
              {...register('url', { onChange: clearFeedback })}
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="token" className="text-label">
          Plex Token
        </label>
        <div className="form-input">
          <div className="form-input-field">
            <Input
              id="token"
              type="password"
              {...register('token', { onChange: clearFeedback })}
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="librarySectionId" className="text-label">
          Library Section ID
          <span className="label-tip">
            The library section on this site that mirrors your primary library
          </span>
        </label>
        <div className="form-input">
          <div className="form-input-field">
            <Input
              id="librarySectionId"
              type="text"
              {...register('librarySectionId', { onChange: clearFeedback })}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PlexMirrorSiteModal
