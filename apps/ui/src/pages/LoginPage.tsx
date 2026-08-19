import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useClientId, useLoginWithPlex } from '../api/auth'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import PlexLoginButton from '../components/Login/Plex'

const LoginPage = () => {
  const navigate = useNavigate()
  const { data: clientId, isLoading: isClientIdLoading } = useClientId()
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
        {isClientIdLoading ? (
          <LoadingSpinner />
        ) : (
          <PlexLoginButton
            clientIdentifier={clientId ?? ''}
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
