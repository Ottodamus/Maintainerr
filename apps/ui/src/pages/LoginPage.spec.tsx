import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '../test-utils/render'
import LoginPage from './LoginPage'

const navigate = vi.fn()
const loginMutate = vi.fn()
const passwordLoginMutate = vi.fn()
let clientId: string | undefined
let isClientIdLoading = false

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('../api/auth', () => ({
  useClientId: () => ({ data: clientId, isLoading: isClientIdLoading }),
  useLoginWithPlex: () => ({ mutate: loginMutate, isPending: false }),
  useLoginWithPassword: () => ({
    mutate: passwordLoginMutate,
    isPending: false,
  }),
}))

vi.mock('../components/Login/Plex', () => ({
  default: ({
    clientIdentifier,
    onAuthToken,
    onError,
  }: {
    clientIdentifier: string
    onAuthToken: (token: string) => void
    onError: (message: string) => void
  }) => (
    <div>
      <span>client-id:{clientIdentifier}</span>
      <button type="button" onClick={() => onAuthToken('plex-token')}>
        Authenticate with Plex
      </button>
      <button type="button" onClick={() => onError('popup blocked')}>
        Trigger error
      </button>
    </div>
  ),
}))

const renderPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )

describe('LoginPage', () => {
  beforeEach(() => {
    navigate.mockReset()
    loginMutate.mockReset()
    passwordLoginMutate.mockReset()
    clientId = 'device-abc'
    isClientIdLoading = false
  })

  it('does not render the login button while the client id is still loading', () => {
    isClientIdLoading = true

    renderPage()

    expect(screen.queryByText('Authenticate with Plex')).toBeNull()
  })

  it('passes the fetched client id to the Plex login button', () => {
    renderPage()

    expect(screen.getByText('client-id:device-abc')).toBeTruthy()
  })

  it('navigates home once the Plex callback resolves', () => {
    loginMutate.mockImplementation(
      (_authToken: string, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.()
      },
    )

    renderPage()
    fireEvent.click(screen.getByText('Authenticate with Plex'))

    expect(loginMutate).toHaveBeenCalledWith(
      'plex-token',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('shows the mutation error message instead of navigating', () => {
    loginMutate.mockImplementation(
      (_authToken: string, options?: { onError?: (error: Error) => void }) => {
        options?.onError?.(new Error('Could not verify Plex account'))
      },
    )

    renderPage()
    fireEvent.click(screen.getByText('Authenticate with Plex'))

    expect(screen.getByText('Could not verify Plex account')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('keeps the password fallback form hidden until requested', () => {
    renderPage()

    expect(screen.queryByLabelText('Username')).toBeNull()

    fireEvent.click(
      screen.getByText('Having trouble? Sign in with a password instead'),
    )

    expect(screen.getByLabelText('Username')).toBeTruthy()
    expect(screen.getByLabelText('Password')).toBeTruthy()
  })

  it('submits the entered credentials and navigates home on success', () => {
    passwordLoginMutate.mockImplementation(
      (
        _credentials: { username: string; password: string },
        options?: { onSuccess?: () => void },
      ) => {
        options?.onSuccess?.()
      },
    )

    renderPage()
    fireEvent.click(
      screen.getByText('Having trouble? Sign in with a password instead'),
    )
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'recovery' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'super-secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(passwordLoginMutate).toHaveBeenCalledWith(
      { username: 'recovery', password: 'super-secret' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('shows the password login error instead of navigating', () => {
    passwordLoginMutate.mockImplementation(
      (
        _credentials: { username: string; password: string },
        options?: { onError?: (error: Error) => void },
      ) => {
        options?.onError?.(new Error('Invalid username or password'))
      },
    )

    renderPage()
    fireEvent.click(
      screen.getByText('Having trouble? Sign in with a password instead'),
    )
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'recovery' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(screen.getByText('Invalid username or password')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
  })
})
