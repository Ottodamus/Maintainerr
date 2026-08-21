import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  useClientId,
  useLoginWithPassword,
  useLoginWithPlex,
} from '../api/auth'
import Button from '../components/Common/Button'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import { Input } from '../components/Forms/Input'
import PlexLoginButton from '../components/Login/Plex'
import { getApiErrorMessage } from '../utils/ApiError'

const LoginPage = () => {
  const navigate = useNavigate()
  const basePath = import.meta.env.VITE_BASE_PATH ?? ''
  const { data: clientId, isLoading: isClientIdLoading } = useClientId()
  const loginMutation = useLoginWithPlex()
  const passwordLoginMutation = useLoginWithPassword()
  const [error, setError] = useState<string | null>(null)
  const [showPasswordLogin, setShowPasswordLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleAuthToken = (authToken: string) => {
    setError(null)
    loginMutation.mutate(authToken, {
      onSuccess: () => navigate('/'),
      onError: (mutationError) =>
        setError(getApiErrorMessage(mutationError, 'Sign-in failed.')),
    })
  }

  const handlePasswordLogin = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    passwordLoginMutation.mutate(
      { username, password },
      {
        onSuccess: () => navigate('/'),
        onError: (mutationError) =>
          setError(getApiErrorMessage(mutationError, 'Sign-in failed.')),
      },
    )
  }

  return (
    <>
      <title>Sign In - Maintainerr</title>
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-3">
          <img
            className="h-16 w-16"
            src={`${basePath}/logo_icon.svg`}
            alt="Maintainerr logo"
            width={64}
            height={64}
            decoding="sync"
            fetchPriority="high"
          />
          <h1 className="text-2xl font-bold text-zinc-100">Maintainerr</h1>
        </div>
        {isClientIdLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="w-full max-w-xs">
            <PlexLoginButton
              clientIdentifier={clientId ?? ''}
              isProcessing={loginMutation.isPending}
              onAuthToken={handleAuthToken}
              onError={(message) => {
                setError(message)
                toast.error(message)
              }}
            />
          </div>
        )}
        {error && <p className="text-sm text-error-500">{error}</p>}

        {showPasswordLogin ? (
          <form
            onSubmit={handlePasswordLogin}
            className="flex w-full max-w-xs flex-col gap-3"
          >
            <div>
              <label
                htmlFor="username"
                className="mb-1 block text-sm text-zinc-400"
              >
                Username
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm text-zinc-400"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              buttonType="default"
              disabled={
                passwordLoginMutation.isPending || !username || !password
              }
            >
              {passwordLoginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        ) : (
          <button
            type="button"
            className="text-sm text-zinc-500 underline hover:text-zinc-300"
            onClick={() => setShowPasswordLogin(true)}
          >
            Having trouble? Sign in with a password instead
          </button>
        )}
      </div>
    </>
  )
}

export default LoginPage
