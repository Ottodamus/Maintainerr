import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useLoginWithPlex } from '../api/auth'
import { useSettings } from '../api/settings'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import PlexLoginButton from '../components/Login/Plex'

const LoginPage = () => {
  const navigate = useNavigate()
  const { data: settings, isLoading: isSettingsLoading } = useSettings()
  const loginMutation = useLoginWithPlex()
  const [error, setError] = useState<string | null>(null)

  const handleAuthToken = (authToken: string) => {
    setError(null)
    loginMutation.mutate(authToken, {
      onSuccess: () => navigate('/'),
      onError: (mutationError) => setError(mutationError.message),
    })
  }

  return (
    <>
      <title>Sign In - Maintainerr</title>
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-2xl font-bold text-zinc-100">Maintainerr</h1>
        {isSettingsLoading ? (
          <LoadingSpinner />
        ) : (
          <PlexLoginButton
            clientIdentifier={settings?.clientId ?? ''}
            isProcessing={loginMutation.isPending}
            onAuthToken={handleAuthToken}
            onError={(message) => {
              setError(message)
              toast.error(message)
            }}
          />
        )}
        {error && <p className="text-sm text-error-500">{error}</p>}
      </div>
    </>
  )
}

export default LoginPage
