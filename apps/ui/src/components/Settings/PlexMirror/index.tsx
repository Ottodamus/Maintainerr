import {
  DocumentAddIcon,
  PlusCircleIcon,
  TrashIcon,
} from '@heroicons/react/solid'
import { useEffect, useState } from 'react'
import GetApiHandler, { DeleteApiHandler } from '../../../utils/ApiHandler'
import { logClientError } from '../../../utils/ClientLogger'
import Button from '../../Common/Button'
import {
  SettingsFeedbackAlert,
  useSettingsFeedback,
} from '../useSettingsFeedback'
import PlexMirrorSiteModal from './PlexMirrorSiteModal'

export interface IPlexMirrorSite {
  id: number
  siteName: string
  url: string
  token: string
  librarySectionId: string
}

interface DeleteResponse {
  status: 'OK' | 'NOK'
  code: 0 | 1
  message: string
}

const PlexMirrorSettings = () => {
  const [loaded, setLoaded] = useState(false)
  const [settings, setSettings] = useState<IPlexMirrorSite[]>([])
  const [settingsModalActive, setSettingsModalActive] = useState<
    IPlexMirrorSite | boolean
  >()
  const { feedback, clear, showError, showInfo } = useSettingsFeedback(
    'Plex mirror site settings',
  )

  const handleSettingsSaved = (setting: IPlexMirrorSite) => {
    const newSettings = [...settings]
    const index = newSettings.findIndex((s) => s.id === setting.id)
    if (index !== -1) {
      newSettings[index] = setting
    } else {
      newSettings.push(setting)
    }

    setSettings(newSettings)
    setSettingsModalActive(undefined)
  }

  const confirmedDelete = async (id: number) => {
    try {
      const resp = await DeleteApiHandler<DeleteResponse>(
        `/settings/plex-mirror/${id}`,
      )

      if (resp.code === 1) {
        setSettings((currentSettings) =>
          currentSettings.filter((setting) => setting.id !== id),
        )
        setSettingsModalActive(undefined)
        showInfo('Mirror site removed')
        return true
      }

      showError('Failed to delete mirror site.')
    } catch (error: unknown) {
      void logClientError(
        'Failed to delete mirror site',
        error,
        'Settings.PlexMirror.confirmedDelete',
      )
      showError('Failed to delete mirror site. Check logs for details.')
    }

    return false
  }

  useEffect(() => {
    GetApiHandler<IPlexMirrorSite[]>('/settings/plex-mirror').then((resp) => {
      setSettings(resp)
      setLoaded(true)
    })
  }, [])

  const showAddModal = () => {
    clear()
    setSettingsModalActive(true)
  }

  return (
    <>
      <title>Mirror Sites - Maintainerr</title>
      <div className="h-full w-full">
        <div className="section h-full w-full">
          <h3 className="heading">Mirror Sites</h3>
          <p className="description">
            Independent Plex servers at other sites whose libraries mirror this
            one. Maintainerr reflects &quot;Leaving Soon&quot; state on each one
            and confirms it's reachable on a schedule; it never drives rule
            evaluation or *arr actions.
          </p>
        </div>

        <SettingsFeedbackAlert feedback={feedback} />

        <ul className="grid min-h-39 max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {loaded
            ? settings.map((setting) => (
                <li
                  key={setting.id}
                  className="h-full rounded-xl bg-zinc-800 p-4 text-zinc-400 shadow-sm ring-1 ring-zinc-700"
                >
                  <div className="mb-2 flex items-center gap-x-3 text-base font-medium text-white sm:text-lg">
                    {setting.siteName}
                  </div>
                  <p className="mb-4 space-x-2 truncate text-gray-300">
                    <span className="font-semibold">Address</span>
                    <a href={setting.url} className="hover:underline">
                      {setting.url}
                    </a>
                  </p>
                  <div>
                    <Button
                      buttonType="twin-primary-l"
                      buttonSize="md"
                      className="h-10 w-1/2"
                      onClick={() => {
                        clear()
                        setSettingsModalActive(setting)
                      }}
                    >
                      {<DocumentAddIcon className="m-auto" />}{' '}
                      <p className="m-auto font-semibold">Edit</p>
                    </Button>
                    <DeleteButton
                      onDeleteRequested={() => {
                        void confirmedDelete(setting.id)
                      }}
                    />
                  </div>
                </li>
              ))
            : null}

          {loaded ? (
            <li className="flex h-full min-h-39 items-center justify-center rounded-xl border-2 border-dashed border-gray-400 bg-zinc-800 p-4 text-zinc-400 shadow-sm">
              <button
                type="button"
                className="add-button m-auto flex h-9 rounded-md bg-maintainerr-600 px-4 text-zinc-200 shadow-md hover:bg-maintainerr"
                onClick={showAddModal}
              >
                {<PlusCircleIcon className="m-auto h-5" />}
                <p className="m-auto ml-1 font-semibold">Add site</p>
              </button>
            </li>
          ) : null}
        </ul>
      </div>
      {settingsModalActive && (
        <PlexMirrorSiteModal
          settings={
            typeof settingsModalActive === 'boolean'
              ? undefined
              : settingsModalActive
          }
          onUpdate={handleSettingsSaved}
          onCancel={() => {
            setSettingsModalActive(undefined)
          }}
        />
      )}
    </>
  )
}

const DeleteButton = ({
  onDeleteRequested,
}: {
  onDeleteRequested: () => void
}) => {
  const [showSureDelete, setShowSureDelete] = useState(false)

  return (
    <Button
      buttonSize="md"
      buttonType="twin-secondary-r"
      className="h-10 w-1/2"
      onClick={() => {
        if (showSureDelete) {
          onDeleteRequested()
          setShowSureDelete(false)
        } else {
          setShowSureDelete(true)
        }
      }}
    >
      {<TrashIcon className="m-auto" />}{' '}
      <p className="m-auto font-semibold">
        {showSureDelete ? <>Are you sure?</> : <>Delete</>}
      </p>
    </Button>
  )
}

export default PlexMirrorSettings
